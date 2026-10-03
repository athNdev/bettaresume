import { describe, expect, it } from "vitest";
import {
	buildAliasIndex,
	canonicalizeSkill,
	expandSkillVariants,
	findConfidentSkills,
	findSkillMentions,
	SKILL_ENTRIES,
} from "../src/lib/analysis/skills";

/**
 * The dangerous error here is a confident WRONG match.
 *
 * A false negative costs the user a missed suggestion. A false positive asserts the
 * resume claims a skill it does not — the same failure mode as the commercial parser
 * reported to have invented "AWS" on a resume that never mentioned it. So the
 * false-positive cases get the most attention, especially the ambiguous aliases.
 */

describe("confident detection", () => {
	it.each([
		["Built services on AWS Lambda and S3", "Amazon Web Services"],
		["Ran workloads in GCP BigQuery", "Google Cloud Platform"],
		["Deployed to Azure with IaC", "Microsoft Azure"],
		["Orchestrated workloads with Kubernetes", "Kubernetes"],
		["Containerised everything with Docker", "Docker"],
		["Built the UI in React.js", "React"],
		["Wrote the API in NodeJS", "Node.js"],
		["Migrated the schema to Postgres", "PostgreSQL"],
		["Provisioned infra with Terraform", "Terraform"],
	])("detects %j", (text, canonical) => {
		const hits = findConfidentSkills(text);
		expect(
			hits.map((h) => h.canonical),
			text,
		).toContain(canonical);
	});

	it("reports the exact surface form it found", () => {
		const hits = findConfidentSkills("Built services on AWS Lambda");
		const aws = hits.find((h) => h.canonical === "Amazon Web Services");
		expect(aws?.surface).toBe("AWS");
	});
});

describe("ambiguous aliases must not fire without context", () => {
	it("does not read 'AWS' as cloud when the context is welding", () => {
		// The documented ambiguity. Asserting a cloud skill here would be inventing one.
		const text = "Held an AWS certified welding inspector qualification";
		const confident = findConfidentSkills(text);
		expect(confident.map((h) => h.canonical)).not.toContain(
			"Amazon Web Services",
		);
	});

	it("still surfaces it as low-confidence rather than hiding it", () => {
		// The caller decides. Silently dropping a real mention would be as wrong as
		// asserting a false one.
		const all = findSkillMentions(
			"Held an AWS certified welding qualification",
		);
		const aws = all.find((h) => h.canonical === "Amazon Web Services");
		expect(aws).toBeDefined();
		expect(aws?.confident).toBe(false);
	});

	it("reads 'AWS' as cloud once a disambiguator is nearby", () => {
		const hits = findConfidentSkills(
			"Migrated workloads from EC2 to AWS Lambda",
		);
		expect(hits.map((h) => h.canonical)).toContain("Amazon Web Services");
	});

	it("does not read 'TS' inside HTML or 'documents'", () => {
		// The failure mode is inventing a skill the resume never claimed.
		const hits = findConfidentSkills(
			"Worked on the HTML timeline and documents",
		);
		expect(hits.map((h) => h.canonical)).not.toContain("TypeScript");
	});

	it("reads 'CI' as Continuous Integration once pipeline/build context is present", () => {
		// CI is ambiguous, but "pipeline" and "build" are exactly its
		// disambiguators, so this should match.
		const hits = findConfidentSkills("Owned the CI pipeline build steps");
		expect(hits.map((h) => h.canonical)).toContain("Continuous Integration");
	});

	it("matches 'CI' on a bare mention, because a bounded acronym is unambiguous", () => {
		// Deliberate change of behaviour. CI was previously in the word-ambiguous set,
		// which meant a resume listing "CI" with no surrounding context silently lost
		// the match. `\\bCI\\b` cannot match inside another word, so the ambiguity
		// guard was protecting against nothing while costing a real match.
		const hits = findConfidentSkills("Attended a CI conference talk");
		expect(hits.map((h) => h.canonical)).toContain("Continuous Integration");
	});

	it("reads 'ML' as Machine Learning when a disambiguator is present", () => {
		const hits = findConfidentSkills("Trained an ML model on a dataset");
		expect(hits.map((h) => h.canonical)).toContain("Machine Learning");
	});

	it("does not match a bare 'Node' inside a longer word", () => {
		// "timeline" must not become Node.js.
		const hits = findSkillMentions(
			"Reviewed the project timeline and milestones",
		);
		expect(hits.map((h) => h.canonical)).not.toContain("Node.js");
	});
});

describe("emit both forms", () => {
	it("expands a canonical skill to every surface form", () => {
		expect(expandSkillVariants("Amazon Web Services").sort()).toEqual(
			["AWS", "Amazon Web Service", "Amazon Web Services"].sort(),
		);
	});

	it("returns an empty list for an unknown skill rather than guessing", () => {
		expect(expandSkillVariants("Nonexistent Skill")).toEqual([]);
	});

	it("includes both the acronym and the expansion, which is the whole point", () => {
		// Workday matched the acronym and not the expansion. Writing both is the fix.
		const variants = expandSkillVariants("Google Cloud Platform");
		expect(variants).toContain("GCP");
		expect(variants).toContain("Google Cloud Platform");
	});
});

describe("canonicalizeSkill", () => {
	it.each([
		["aws", "Amazon Web Services"],
		["AWS", "Amazon Web Services"],
		["Amazon Web Services", "Amazon Web Services"],
		["postgres", "PostgreSQL"],
		["k8s", "Kubernetes"],
		["reactjs", "React"],
		[" nodejs ", "Node.js"],
	])("resolves %j", (input, expected) => {
		expect(canonicalizeSkill(input)).toBe(expected);
	});

	it("returns null for something unknown, not a near-match", () => {
		// A near-match here would silently rewrite a user's keyword.
		expect(canonicalizeSkill("React Native")).toBeNull();
		expect(canonicalizeSkill("")).toBeNull();
		expect(canonicalizeSkill("   ")).toBeNull();
	});
});

describe("map integrity", () => {
	it("every canonical is unique", () => {
		const seen = new Set(SKILL_ENTRIES.map((e) => e.canonical));
		expect(seen.size).toBe(SKILL_ENTRIES.length);
	});

	it("every entry lists its canonical as one of its own aliases", () => {
		// Otherwise expandSkillVariants can omit the display name and a writer
		// following it would drop the canonical form entirely.
		for (const entry of SKILL_ENTRIES) {
			expect(
				entry.aliases,
				`${entry.canonical} does not list itself`,
			).toContain(entry.canonical);
		}
	});

	it("an alias never maps to two different canonicals", () => {
		// A collision would make normalisation non-deterministic.
		const owners = new Map<string, string>();
		const clashes: string[] = [];
		for (const entry of SKILL_ENTRIES) {
			for (const alias of [...entry.aliases, entry.canonical]) {
				const key = alias.toLowerCase();
				const prior = owners.get(key);
				if (prior && prior !== entry.canonical) {
					clashes.push(`${key}: ${prior} vs ${entry.canonical}`);
				}
				owners.set(key, entry.canonical);
			}
		}
		expect(clashes).toEqual([]);
	});

	it("the alias index resolves every alias to its canonical", () => {
		const index = buildAliasIndex();
		for (const entry of SKILL_ENTRIES) {
			for (const alias of entry.aliases) {
				expect(index.get(alias.toLowerCase()), alias).toBe(entry.canonical);
			}
		}
	});

	it("every ambiguous alias has disambiguators, or it would never match", () => {
		// An ambiguous alias with no disambiguators is permanently unusable: either it
		// fires on everything or it never fires at all.
		//
		// Only WORD-like aliases belong in this set. `TS`, `ML`, `CI`, `SQL` and `HCL`
		// are deliberately excluded: once bounded they cannot match inside a longer
		// word, and a standalone `TS` in a resume means TypeScript. Demanding context
		// there would trade a real match for a false positive that cannot happen.
		const ambiguous = new Set([
			"Node",
			"Azure",
			"Go",
			"R",
			"C",
			"REST",
			"Rust",
		]);
		for (const entry of SKILL_ENTRIES) {
			const needs = entry.aliases.filter((a) => ambiguous.has(a));
			if (needs.length > 0) {
				expect(
					entry.disambiguators?.length ?? 0,
					`${entry.canonical} has ambiguous aliases ${needs.join(", ")} but no disambiguators`,
				).toBeGreaterThan(0);
			}
		}
	});
});

describe("robustness", () => {
	it("handles empty input", () => {
		expect(findSkillMentions("")).toEqual([]);
		expect(findSkillMentions("")).toEqual([]);
		expect(findConfidentSkills(undefined as unknown as string)).toEqual([]);
	});

	it("does not loop forever on a pathological string", () => {
		const long = "React ".repeat(5000);
		expect(() => findSkillMentions(long)).not.toThrow();
	});
});
