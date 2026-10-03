import { describe, expect, it } from "vitest";
import type { Resume } from "../src/features/resume-editor/types";
import {
	analyzeJobMatch,
	extractKeywords,
	REQUIRED_WEIGHT,
} from "../src/lib/analysis/ats-match";

/**
 * Two properties matter more than coverage numbers here.
 *
 * 1. **No overall score.** A single headline number is the documented credibility
 *    failure of this category. A test pins that the report has no such field, so the
 *    temptation cannot quietly return.
 * 2. **False "covered" is worse than false "missing".** Telling a user their skill is
 *    evidenced when it is not sends them to an interview unready. Every alias path is
 *    therefore checked against a real negative.
 */

const resume = (sections: unknown[], settings = {}) =>
	({
		id: "r1",
		name: "Test",
		template: "minimal",
		sections,
		metadata: { personalInfo: { fullName: "A", email: "a@b.c" }, settings },
	}) as unknown as Resume;

const exp = (highlights: string[], title = "Work Experience") => ({
	id: "s1",
	type: "experience",
	order: 0,
	visible: true,
	content: { title, data: [{ company: "Acme", highlights }] },
});

describe("the report has no headline score", () => {
	it("exposes no overall/total/rating field", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Reduced latency by 40%"])]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r).not.toHaveProperty("overall");
		expect(r).not.toHaveProperty("score");
		expect(r).not.toHaveProperty("rating");
		// The only numbers are the discrete counts a user can argue with.
		expect(Object.keys(r).sort()).toEqual(
			[
				"brevity",
				"impact",
				"keywords",
				"preferredCovered",
				"preferredTotal",
				"requiredCovered",
				"requiredTotal",
				"style",
				"suggestions",
			].sort(),
		);
	});

	it("keeps required and preferred counts separate rather than weighted into one", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: {
				description: "Required: Kubernetes\nPreferred: GraphQL",
			},
		});
		expect(r.requiredTotal).toBe(1);
		expect(r.preferredTotal).toBe(1);
		// The weight constant exists for ordering the report only.
		expect(REQUIRED_WEIGHT).toBeGreaterThan(1);
	});
});

describe("required versus preferred", () => {
	it("classifies by the marker in the phrase", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: {
				description: [
					"Required: 5+ years TypeScript",
					"Preferred: GraphQL experience",
					"Must have: Docker",
					"Nice to have: Kubernetes",
					"Bonus: Terraform",
				].join("\n"),
			},
		});
		const byKeyword = Object.fromEntries(
			r.keywords.map((k) => [k.keyword, k.requirement]),
		);
		expect(byKeyword["5+ years TypeScript"]).toBe("required");
		expect(byKeyword["GraphQL experience"]).toBe("preferred");
		expect(byKeyword.Docker).toBe("required");
		expect(byKeyword.Kubernetes).toBe("preferred");
		expect(byKeyword.Terraform).toBe("preferred");
	});

	it("defaults an unmarked requirement to preferred, the safer claim", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: { description: "Some experience with Rust" },
		});
		expect(r.keywords[0]?.requirement).toBe("preferred");
	});

	it("prefers the softer reading when both markers appear", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: { description: "Required: Python (pytest preferred)" },
		});
		expect(r.keywords[0]?.requirement).toBe("preferred");
	});

	it("honours an explicit keyword list over the description", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: {
				description: "Required: Java",
				keywords: ["Required: Rust"],
			},
		});
		expect(r.keywords).toHaveLength(1);
		expect(r.keywords[0]?.keyword).toBe("Rust");
	});
});

describe("keyword coverage", () => {
	it("marks a keyword covered when the resume states it", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Built services with Kubernetes and Docker"])]),
			jobTarget: { description: "Required: Kubernetes" },
		});
		expect(r.requiredCovered).toBe(1);
		expect(r.keywords[0]?.surface).toBe("Kubernetes");
	});

	it("matches an acronym against its spelled-out form", () => {
		// The reason the alias map exists.
		const r = analyzeJobMatch({
			resume: resume([exp(["Ran workloads on Amazon Web Services"])]),
			jobTarget: { description: "Required: AWS" },
		});
		expect(r.keywords[0]?.covered).toBe(true);
		expect(r.keywords[0]?.canonical).toBe("Amazon Web Services");
	});

	it("matches a spelled-out form against the acronym", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Deployed to GCP BigQuery"])]),
			jobTarget: { description: "Required: Google Cloud Platform" },
		});
		expect(r.keywords[0]?.covered).toBe(true);
	});

	it("does NOT claim coverage for an absent skill", () => {
		// The dangerous direction: a false "covered" sends someone to an interview
		// without the skill.
		const r = analyzeJobMatch({
			resume: resume([exp(["Wrote unit tests in Jest"])]),
			jobTarget: { description: "Required: Kubernetes" },
		});
		expect(r.keywords[0]?.covered).toBe(false);
		expect(r.requiredCovered).toBe(0);
	});

	it("does not match a keyword that only appears inside another word", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Reviewed the project timeline"])]),
			jobTarget: { description: "Required: Node" },
		});
		expect(r.keywords[0]?.covered).toBe(false);
	});

	it("matches plain-English keywords that no taxonomy covers", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Led team leadership and mentoring initiatives"])]),
			jobTarget: { description: "Required: team leadership" },
		});
		expect(r.keywords[0]?.covered).toBe(true);
	});

	it("does NOT report an ambiguous alias as covered without supporting context", () => {
		// The literal-regex-first bug. `findCoverage` matched `\bAWS\b` and returned
		// `covered: true` before ever asking `skills.ts`, so this resume was reported
		// as covering AWS while `findConfidentSkills` on the same text returns `[]`.
		// A false "covered" sends someone to an interview without the skill.
		const r = analyzeJobMatch({
			resume: resume([
				exp(["Held an AWS certified welding inspector qualification"]),
			]),
			jobTarget: { description: "Required: AWS" },
		});
		expect(r.keywords[0]?.covered).toBe(false);
		expect(r.keywords[0]?.uncertain).toBe(true);
		expect(r.requiredCovered).toBe(0);
		expect(r.requiredTotal).toBe(1);
		// The match is reported, not hidden — the caller can see what matched.
		expect(r.keywords[0]?.surface).toBe("AWS");
	});

	it("treats Azure the same way when it is a colour", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Designed posters in an Azure blue palette"])]),
			jobTarget: { description: "Required: Azure" },
		});
		expect(r.keywords[0]?.covered).toBe(false);
		expect(r.keywords[0]?.uncertain).toBe(true);
	});

	it("does not let an ambiguous hit on one variant vouch for the spelled-out form", () => {
		// Inverse direction: the JD asks for "Amazon Web Services", the only evidence is
		// the bare word "AWS" in a welding context.
		const r = analyzeJobMatch({
			resume: resume([
				exp(["Held an AWS certified welding inspector qualification"]),
			]),
			jobTarget: { description: "Required: Amazon Web Services" },
		});
		expect(r.keywords[0]?.covered).toBe(false);
		expect(r.keywords[0]?.uncertain).toBe(true);
	});

	it("still covers an ambiguous alias once the context supports it", () => {
		// The fix must not become a false-negative machine.
		const r = analyzeJobMatch({
			resume: resume([exp(["Ran serverless jobs on AWS Lambda"])]),
			jobTarget: { description: "Required: AWS" },
		});
		expect(r.keywords[0]?.covered).toBe(true);
		expect(r.keywords[0]?.uncertain).toBeUndefined();
		expect(r.requiredCovered).toBe(1);
	});

	it("counts a repeated skill once, not once per marker", () => {
		// Deduping on the raw line kept the marker, so "Required: Docker" and
		// "Must have: Docker" were two entries: "2 of 2" for one skill, and two <li>
		// sharing the React key `Required-Docker`.
		const r = analyzeJobMatch({
			resume: resume([exp(["Containerised everything with Docker"])]),
			jobTarget: { description: "Required: Docker\nMust have: Docker" },
		});
		expect(r.keywords).toHaveLength(1);
		expect(r.keywords[0]?.keyword).toBe("Docker");
		expect(r.requiredTotal).toBe(1);
		expect(r.requiredCovered).toBe(1);
		expect(
			new Set(r.keywords.map((k) => `${k.requirement}-${k.keyword}`)).size,
		).toBe(r.keywords.length);
	});

	it("counts a repeated skill once in an explicit keyword list too", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: { keywords: ["Docker", "Required: Docker"] },
		});
		expect(r.keywords).toHaveLength(1);
	});
});

describe("prose is not a keyword", () => {
	it("drops a sentence that merely contains a requirement phrase", () => {
		// `/\bwe are looking for\b/i` used to classify this line as `required`, and the
		// report then advised: Required but not evidenced: "We are looking for someone
		// who can ship." Advice generated from a sentence, not from a skill.
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: {
				description: "We are looking for someone who can ship.\nRequired: Docker",
			},
		});
		expect(r.keywords.map((k) => k.keyword)).toEqual(["Docker"]);
		expect(r.suggestions.join("\n")).not.toMatch(/can ship/);
	});

	it("drops the same sentence via `you have`", () => {
		expect(
			extractKeywords("You have probably never heard of this tool before."),
		).toEqual([]);
	});

	it("keeps a marked requirement that happens to end in a full stop", () => {
		// Marker lines are exempt from the prose filter: this is a requirement, not a
		// sentence the writer is saying out loud.
		expect(extractKeywords("Nice to have: some Kubernetes exposure.")).toEqual([
			"Nice to have: some Kubernetes exposure.",
		]);
	});

	it("keeps a short unmarked fragment", () => {
		// "Some experience with Rust" is the existing unmarked-is-preferred case.
		expect(extractKeywords("Some experience with Rust")).toEqual([
			"Some experience with Rust",
		]);
	});
});

describe("suggestions", () => {
	it("puts missing required keywords first and tells the user to write both forms", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Improved reporting"])]),
			jobTarget: { description: "Preferred: GraphQL\nRequired: AWS" },
		});
		expect(r.suggestions[0]).toContain("Required but not evidenced");
		expect(r.suggestions[0]).toContain("AWS");
		expect(r.suggestions[0]).toMatch(/both/i);
	});

	it("reports unevidenced bullets", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Designed the thing", "Reduced latency by 40%"])]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.suggestions.some((s) => s.includes("no number"))).toBe(true);
	});

	it("surfaces parse errors as suggestions", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Did work"], "Professional Summary")], {
				layout: "sidebar",
			}),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.style.errors).toBeGreaterThan(0);
		expect(r.suggestions.some((s) => s.startsWith("Fix:"))).toBe(true);
	});

	it("propagates a date error this test did not set up itself", () => {
		// The heading-alias and layout errors above are enough to make
		// `style.errors > 0` pass on their own, so this case is pinned on the specific
		// diagnostic id. `dates: []` used to be hardcoded here, which made
		// `checkDateConsistency` structurally unreachable in this path: the Review sheet
		// (which passes real dates to the same engine) caught mixed date formats and
		// this tab could not, while still calling the count "parser-fit issues".
		const dated = (id: string, data: unknown[]) => ({
			id,
			type: "experience",
			order: 0,
			visible: true,
			content: { title: "Work Experience", data },
		});
		const r = analyzeJobMatch({
			resume: resume([
				dated("s1", [
					{ company: "Acme", startDate: "March 2020", endDate: "2021" },
				]),
				dated("s2", [{ company: "Globex", startDate: "03/2022" }]),
			]),
			jobTarget: { description: "Required: TypeScript" },
		});
		const ids = r.style.diagnostics.map((d) => d.id);
		expect(ids).toContain("date-mixed-formats");
		// It is an error, so it reaches the user rather than just the diagnostics list.
		expect(r.suggestions).toContain("Fix: Dates use more than one format");
	});

	it("stays quiet about dates when they are consistent", () => {
		// A date check that fires on everything is as useless as one that never fires.
		const r = analyzeJobMatch({
			resume: resume([
				{
					id: "s1",
					type: "experience",
					order: 0,
					visible: true,
					content: {
						title: "Work Experience",
						data: [{ company: "Acme", startDate: "March 2020" }],
					},
				},
			]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.style.diagnostics.map((d) => d.id)).not.toContain(
			"date-mixed-formats",
		);
	});

	it("explains an empty required bucket instead of dropping it silently", () => {
		// The panel keeps required and preferred as separate lists — the whole point of
		// it — so a job description with no markers produced "Preferred" only, with no
		// way to tell that from "this resume satisfies nothing". The UI branch that
		// returns null for an empty list lives outside this module; the report has to
		// carry the explanation.
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: { description: "Kubernetes\nDocker\n5+ years React" },
		});
		expect(r.requiredTotal).toBe(0);
		expect(r.preferredTotal).toBe(3);
		expect(r.suggestions.some((s) => /marked as required/i.test(s))).toBe(true);
	});

	it("does not explain an empty bucket when the job description was empty", () => {
		const r = analyzeJobMatch({ resume: resume([]), jobTarget: {} });
		expect(r.suggestions).toEqual([]);
	});

	it("returns an empty suggestion list for a genuinely clean resume", () => {
		const r = analyzeJobMatch({
			resume: resume([
				exp(
					["Reduced p99 latency by 40% across 12,000 users"],
					"Work Experience",
				),
			]),
			jobTarget: { description: "Required: latency" },
		});
		expect(r.suggestions).toEqual([]);
	});
});

describe("dimensions", () => {
	it("counts impact as evidenced vs total bullets", () => {
		const r = analyzeJobMatch({
			resume: resume([exp(["Cut costs 20%", "Designed the thing"])]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.impact).toEqual({ quantified: 1, total: 2 });
	});

	it("records bullets per entry so an outlier role is visible", () => {
		const r = analyzeJobMatch({
			resume: resume([
				exp(["Cut costs 20%"]),
				{ ...exp(["a", "b", "c", "d", "e", "f", "g"]), id: "s2" },
			]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.brevity.bulletsPerEntry).toEqual([1, 7]);
		expect(r.brevity.totalWords).toBeGreaterThan(0);
	});

	it("skips hidden sections", () => {
		const hidden = { ...exp(["Designed the thing"]), visible: false };
		const r = analyzeJobMatch({
			resume: resume([hidden]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.impact.total).toBe(0);
	});
});

describe("robustness", () => {
	it("handles a resume with no sections", () => {
		const r = analyzeJobMatch({
			resume: resume([]),
			jobTarget: { description: "Required: TypeScript" },
		});
		expect(r.requiredTotal).toBe(1);
		expect(r.impact.total).toBe(0);
	});

	it("handles an empty job target", () => {
		const r = analyzeJobMatch({ resume: resume([]), jobTarget: {} });
		expect(r.keywords).toEqual([]);
		expect(r.suggestions).toEqual([]);
	});

	it("extractKeywords returns nothing for an empty description", () => {
		expect(extractKeywords("")).toEqual([]);
		expect(extractKeywords("   \n  \n")).toEqual([]);
	});

	it("strips bullet markers but keeps the requirement prefix", () => {
		const out = extractKeywords("- Required: TypeScript\n• Preferred: React");
		expect(out.some((k) => k.startsWith("Required:"))).toBe(true);
		expect(out.some((k) => k.startsWith("Preferred:"))).toBe(true);
	});
});
