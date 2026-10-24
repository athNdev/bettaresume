import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RubricChecklist } from "../src/features/resume-editor/components/rubric-panel";
import type {
	Resume,
	ResumeSection,
} from "../src/features/resume-editor/types";
import {
	plainTextVerdict,
	runPlainTextTest,
} from "../src/lib/analysis/plain-text-test";
import {
	buildRubric,
	LENGTH_RULES,
	repeatedPhrase,
} from "../src/lib/analysis/rubric";
import { buildPlainText } from "../src/lib/export/text";

/**
 * The rubric and the Plain Text Test, each with a fixture that fails it.
 *
 * A check that has never been seen failing is a decoration. Every check below is
 * exercised in both directions against a document that is otherwise fine, so a
 * regression in the check itself is visible rather than silent.
 *
 * The most important assertion in this file is the one about what is *not* here:
 * there is no composite score, and there is no field that could grow one.
 */

function section(overrides: Partial<ResumeSection> = {}): ResumeSection {
	return {
		id: overrides.id ?? "s1",
		type: "experience",
		order: 0,
		visible: true,
		content: {
			title: "Work Experience",
			data: [
				{
					id: "e1",
					position: "Senior Engineer",
					company: "Acme",
					startDate: "March 2022",
					endDate: "Present",
					highlights: [
						"Cut p99 checkout latency 41% by rewriting the reservation path",
						"Raised deploy frequency from weekly to daily across 12 services",
						"Led a migration of 300 services with zero downtime",
					],
				},
			],
		},
		...overrides,
	} as ResumeSection;
}

function resume(overrides: Partial<Resume> = {}): Resume {
	return {
		id: "r1",
		userId: "u1",
		name: "Avery Chen",
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "minimal",
		tags: [],
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		metadata: {
			personalInfo: {
				fullName: "Avery Chen",
				professionalTitle: "Senior Engineer",
				email: "avery@example.test",
				phone: "+49 30 555 0142",
				location: "Berlin",
				linkedin: "",
				github: "",
				website: "",
			} as never,
			settings: {
				layout: "single-column",
				fontScale: 1,
				dateFormat: "MMMM YYYY",
				typography: {
					name: 15,
					title: 14,
					sectionHeading: 12,
					itemTitle: 12,
					body: 11,
					small: 9,
				},
			} as never,
		},
		sections: [section()],
		...overrides,
	} as Resume;
}

/** A resume that passes everything the rubric can see without a page count. */
function goodResume(): Resume {
	const base = resume();
	// Pad the body so the word count lands inside the range.
	const summary = section({
		id: "s0",
		type: "summary",
		order: 0,
		content: {
			title: "Summary",
			html: `<p>${"Engineer with a decade of experience. ".repeat(30)}</p>`,
		},
	});
	return { ...base, sections: [summary, section({ order: 1 })] } as Resume;
}

describe("the rubric", () => {
	it("reports no composite score, and has no field that could grow one", () => {
		const report = buildRubric(goodResume());
		const keys = Object.keys(report).sort();
		// If someone adds a `score`, this fails and forces the decision to be made
		// explicitly rather than in a diff nobody reads.
		expect(keys).toEqual(["checks", "counts", "ranked"]);
		expect(JSON.stringify(report)).not.toMatch(/"score"|"rating"|"grade"/i);
		expect(report.counts).toEqual({
			pass: expect.any(Number),
			fail: expect.any(Number),
			advice: expect.any(Number),
		});
	});

	it("ranks failures before advice before passes, quick before deep", () => {
		const report = buildRubric(goodResume());
		const rank = { fail: 0, advice: 1, pass: 2 } as const;
		const statuses = report.ranked.map((c) => rank[c.status]);
		expect([...statuses].sort((a, b) => a - b)).toEqual(statuses);

		const firstNonPass = report.ranked.findIndex((c) => c.status !== "pass");
		if (firstNonPass >= 0) {
			const band = report.ranked.filter((c) => c.status !== "pass");
			const effort = { quick: 0, medium: 1, deep: 2 } as const;
			const efforts = band.map((c) => effort[c.effort]);
			expect([...efforts].sort((a, b) => a - b)).toEqual(efforts);
		}
	});

	it.each([
		[
			"typography-body",
			"body text outside the parser-friendly range",
			(r: Resume) =>
				({
					...r,
					metadata: {
						...r.metadata,
						settings: {
							...r.metadata?.settings,
							typography: {
								...(r.metadata?.settings?.typography as object),
								body: 6,
							},
						},
					},
				}) as Resume,
		],
		[
			"typography-name",
			"a name outside the parser-friendly range",
			(r: Resume) =>
				({
					...r,
					metadata: {
						...r.metadata,
						settings: {
							...r.metadata?.settings,
							typography: {
								...(r.metadata?.settings?.typography as object),
								name: 40,
							},
						},
					},
				}) as Resume,
		],
		[
			"contact-complete",
			"missing contact details",
			(r: Resume) =>
				({
					...r,
					metadata: {
						...r.metadata,
						personalInfo: { ...r.metadata?.personalInfo, email: "" },
					},
				}) as Resume,
		],
		[
			"bullets-per-role",
			"a role with too few bullets",
			(r: Resume) =>
				({
					...r,
					sections: [
						section({
							content: {
								title: "Work Experience",
								data: [
									{
										position: "Engineer",
										company: "Acme",
										startDate: "March 2022",
										highlights: ["One bullet only"],
									},
								],
							},
						}),
					],
				}) as Resume,
		],
		[
			"bullet-length",
			"a bullet that runs on",
			(r: Resume) =>
				({
					...r,
					sections: [
						section({
							content: {
								title: "Work Experience",
								data: [
									{
										position: "Engineer",
										company: "Acme",
										startDate: "March 2022",
										highlights: ["x".repeat(LENGTH_RULES.maxBulletChars + 1)],
									},
								],
							},
						}),
					],
				}) as Resume,
		],
		[
			"every-entry-dated",
			"an entry with no date",
			(r: Resume) =>
				({
					...r,
					sections: [
						section({
							content: {
								title: "Work Experience",
								data: [
									{
										position: "Engineer",
										company: "Acme",
										highlights: ["Did a thing"],
									},
								],
							},
						}),
					],
				}) as Resume,
		],
		[
			"quantified-bullets",
			"bullets with no evidence",
			(r: Resume) =>
				({
					...r,
					sections: [
						section({
							content: {
								title: "Work Experience",
								data: [
									{
										position: "Engineer",
										company: "Acme",
										startDate: "March 2022",
										highlights: [
											"Responsible for the platform",
											"Helped with the migration",
											"Worked on the roadmap",
										],
									},
								],
							},
						}),
					],
				}) as Resume,
		],
	])("%s fails on %s", (id, _description, mutate) => {
		const report = buildRubric(mutate(goodResume()));
		const found = report.checks.find((c) => c.id === id);
		expect(found, `check ${id} is missing`).toBeDefined();
		expect(found?.status, `${id} should not pass`).not.toBe("pass");
	});

	it("reports the page count as advice when the preview has not compiled", () => {
		const unknown = buildRubric(goodResume()).checks.find(
			(c) => c.id === "page-count",
		);
		expect(unknown?.status).toBe("advice");

		const tooMany = buildRubric(goodResume(), { pageCount: 4 }).checks.find(
			(c) => c.id === "page-count",
		);
		expect(tooMany?.status).toBe("fail");

		const right = buildRubric(goodResume(), { pageCount: 2 }).checks.find(
			(c) => c.id === "page-count",
		);
		expect(right?.status).toBe("pass");
	});

	it("detects a phrase repeated into filler", () => {
		// Real words: the detector ignores tokens shorter than three characters,
		// which is what keeps "of the" style glue out of the results.
		const filler = "alpha bravo charlie ".repeat(4);
		expect(repeatedPhrase(filler)).toBe("alpha bravo charlie");
		expect(
			repeatedPhrase("one two three four five six seven eight"),
		).toBeNull();
	});

	it("renders named checks and no score", () => {
		// The constraint that is not up for debate, asserted on the rendered surface
		// rather than on the type: a composite number must not appear anywhere a user
		// can see it, and the panel must say out loud that it is not scoring.
		const markup = renderToStaticMarkup(
			createElement(RubricChecklist, { resume: goodResume() }),
		);
		expect(markup).toContain("There is no score here");
		expect(markup).not.toMatch(/\d+\s*\/\s*100|\d+%|score:\s*\d/i);
		// And it renders the four dimensions the research converges on.
		for (const label of ["Parse fit", "Impact", "Brevity", "Style"]) {
			expect(markup).toContain(label);
		}
	});
});

describe("the Plain Text Test", () => {
	it("passes all five checks on a document built by the exporter", () => {
		const r = goodResume();
		const checks = runPlainTextTest(buildPlainText(r), r);
		const verdict = plainTextVerdict(checks);
		expect(verdict.failed, verdict.failed.join("; ")).toEqual([]);
		expect(verdict.passed).toBe(5);
	});

	it("fails name-first when the name is not at the top", () => {
		const r = goodResume();
		const text = `Some other line\n${buildPlainText(r)}`;
		const check = runPlainTextTest(text, r).find(
			(c) => c.id === "plain-text-name-first",
		);
		expect(check?.pass).toBe(false);
	});

	it("fails headers-visible when a heading is missing from the text", () => {
		const r = goodResume();
		const text = buildPlainText(r).replace(
			"Work Experience",
			"Where I Have Worked",
		);
		const check = runPlainTextTest(text, r).find(
			(c) => c.id === "plain-text-headers-visible",
		);
		expect(check?.pass).toBe(false);
		expect(check?.detail).toContain("Work Experience");
	});

	it("fails order when a heading appears out of sequence", () => {
		const r = goodResume();
		const text = buildPlainText(r);
		// Move the summary heading to the end, which is what a two-column
		// interleaving would look like in a text layer.
		const reordered = `${text.replace("Summary", "Summarised")}Work Experience\nSummary`;
		const check = runPlainTextTest(reordered, r).find(
			(c) => c.id === "plain-text-order",
		);
		expect(check?.pass).toBe(false);
	});

	it("fails dates-attached when a date has not survived the export", () => {
		const r = goodResume();
		const text = buildPlainText(r).replace("March 2022", "");
		const check = runPlainTextTest(text, r).find(
			(c) => c.id === "plain-text-dates-attached",
		);
		expect(check?.pass).toBe(false);
	});

	it("fails bullets-intact when a bullet is missing", () => {
		const r = goodResume();
		const text = buildPlainText(r).replace(
			"Cut p99 checkout latency 41% by rewriting the reservation path",
			"",
		);
		const check = runPlainTextTest(text, r).find(
			(c) => c.id === "plain-text-bullets-intact",
		);
		expect(check?.pass).toBe(false);
	});
});
