import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
	buildParseAuditInput,
	collectBulletFindings,
	collectDates,
	renderedHeading,
	TEMPLATE_SECTION_HEADINGS,
} from "../src/features/resume-editor/lib/review-input";
import type {
	Resume,
	ResumeSection,
} from "../src/features/resume-editor/types";

/**
 * The audit is only as good as its input.
 *
 * Its whole premise is that we report what a parser will actually see. That means
 * reporting the heading the Typst template **renders**, not the label the UI happens
 * to show. The templates use:
 *
 *     section-title(if section.title != "" { section.title } else { "Work Experience" })
 *
 * so a user-supplied title overrides the default -- which is precisely how a resume
 * ends up with a heading no parser recognises. Auditing the UI label would miss every
 * one of those.
 */

const sectionsTyp = readFileSync(
	"src/features/resume-editor/typst_templates/sections.typ",
	"utf8",
);

function section(partial: Partial<ResumeSection> = {}): ResumeSection {
	return {
		id: "s1",
		type: "experience",
		order: 0,
		visible: true,
		content: {} as never,
		...partial,
	} as ResumeSection;
}

function resume(partial: Partial<Resume> = {}): Resume {
	return {
		id: "r1",
		name: "Test",
		template: "minimal",
		sections: [],
		metadata: { personalInfo: { fullName: "A", email: "a@b.c" }, settings: {} },
		...partial,
	} as unknown as Resume;
}

describe("the heading map matches what the templates actually render", () => {
	it("every mapped heading appears verbatim in sections.typ", () => {
		// The point of the map. If someone edits a heading in Typst and forgets to
		// update it here, the audit silently stops checking the real string.
		for (const [type, heading] of Object.entries(TEMPLATE_SECTION_HEADINGS)) {
			expect(
				sectionsTyp.includes(`"${heading}"`),
				`${type}: template no longer renders "${heading}"`,
			).toBe(true);
		}
	});

	it("finds no heading in the template that the map has forgotten", () => {
		// The reverse direction: a new section heading added to Typst must be added
		// here, or it would never be audited at all.
		const inTemplate = [
			...sectionsTyp.matchAll(/else \{ "([A-Z][A-Za-z &]+)" \}/g),
		]
			.map((m) => m[1])
			.filter(Boolean);
		expect(inTemplate.length).toBeGreaterThan(0);

		const known = new Set(Object.values(TEMPLATE_SECTION_HEADINGS));
		const forgotten = inTemplate.filter((h) => !known.has(h as string));
		expect(
			forgotten,
			"headings rendered by the template but absent from TEMPLATE_SECTION_HEADINGS",
		).toEqual([]);
	});

	it("the number of mapped headings matches the number rendered", () => {
		const inTemplate = [
			...new Set(
				[...sectionsTyp.matchAll(/else \{ "([A-Z][A-Za-z &]+)" \}/g)].map(
					(m) => m[1],
				),
			),
		];
		expect(Object.keys(TEMPLATE_SECTION_HEADINGS).length).toBe(
			inTemplate.length,
		);
	});
});

describe("renderedHeading", () => {
	it("uses the template default when the user has not renamed the section", () => {
		expect(renderedHeading(section({ type: "summary" }))).toBe(
			"Professional Summary",
		);
		expect(renderedHeading(section({ type: "volunteer" }))).toBe(
			"Volunteer Experience",
		);
	});

	it("honours a user override, because the template does", () => {
		// This is the failure mode the whole audit exists to catch.
		const s = section({
			type: "experience",
			content: { title: "Professional Journey" } as never,
		});
		expect(renderedHeading(s)).toBe("Professional Journey");
	});

	it("falls back when the override is blank", () => {
		for (const blank of ["", "   "]) {
			const s = section({ type: "skills", content: { title: blank } as never });
			expect(renderedHeading(s)).toBe("Skills");
		}
	});

	it("has no entry for personal-info, whose heading is not load-bearing", () => {
		expect(TEMPLATE_SECTION_HEADINGS["personal-info"]).toBeUndefined();
	});
});

describe("collectDates", () => {
	it("walks nested list data", () => {
		const s = section({
			type: "experience",
			content: {
				data: [
					{ startDate: "March 2020", endDate: "March 2024", current: false },
					{ startDate: "April 2024", current: true },
				],
			} as never,
		});
		expect(collectDates([s])).toEqual([
			{
				startDate: "March 2020",
				endDate: "March 2024",
				current: false,
				graduationDate: null,
			},
			{
				startDate: "April 2024",
				endDate: null,
				current: true,
				graduationDate: null,
			},
		]);
	});

	it("covers every section type without per-type code", () => {
		// A newly added section with dates must be covered automatically.
		const sections = [
			section({
				type: "experience",
				content: { data: [{ startDate: "2020" }] } as never,
			}),
			section({
				type: "education",
				content: { data: [{ graduationDate: "2019" }] } as never,
			}),
			section({
				type: "volunteer",
				content: { data: [{ startDate: "2018", endDate: "2019" }] } as never,
			}),
		];
		const dates = collectDates(sections);
		expect(dates).toHaveLength(3);
		expect(dates.some((d) => d.graduationDate === "2019")).toBe(true);
	});

	it("tolerates missing, empty and malformed content", () => {
		expect(collectDates([section({ content: undefined as never })])).toEqual(
			[],
		);
		expect(
			collectDates([section({ content: { data: null } as never })]),
		).toEqual([]);
		expect(
			collectDates([section({ content: { data: "nope" } as never })]),
		).toEqual([]);
		expect(collectDates([])).toEqual([]);
	});
});

describe("buildParseAuditInput", () => {
	it("passes through the settings the audit needs", () => {
		const input = buildParseAuditInput(
			resume({
				sections: [section({ type: "summary" })],
				metadata: {
					personalInfo: { fullName: "A", email: "a@b.c" },
					settings: { dateFormat: "MM/YYYY", layout: "sidebar" },
				} as never,
			}),
		);
		expect(input.dateFormat).toBe("MM/YYYY");
		expect(input.layout).toBe("sidebar");
		expect(input.sections[0]?.title).toBe("Professional Summary");
	});

	it("carries visibility so hidden sections are not audited", () => {
		const input = buildParseAuditInput(
			resume({
				sections: [section({ type: "summary", visible: false })],
			}),
		);
		expect(input.sections[0]?.visible).toBe(false);
	});

	it("handles a resume with no sections", () => {
		expect(buildParseAuditInput(resume()).sections).toEqual([]);
	});
});

describe("collectBulletFindings", () => {
	const withHighlights = (highlights: string[]) =>
		section({
			type: "experience",
			content: { data: [{ highlights }] } as never,
		});

	it("reports which bullets need work", () => {
		const { bullets, totalNeedingWork } = collectBulletFindings(
			resume({
				sections: [
					withHighlights([
						"Reduced p99 latency by 40%",
						"Designed the notification system",
					]),
				],
			}),
		);
		expect(totalNeedingWork).toBe(1);
		expect(bullets[0]?.report.total).toBe(2);
	});

	it("does not analyse the summary, which is prose", () => {
		// Flagging prose for "no number" would fire on literally every resume and
		// train the user to ignore the panel.
		const { bullets } = collectBulletFindings(
			resume({
				sections: [
					section({
						type: "summary",
						content: { data: {}, html: "<p>Senior engineer.</p>" } as never,
					}),
				],
			}),
		);
		expect(bullets).toEqual([]);
	});

	it("skips hidden sections", () => {
		const { bullets } = collectBulletFindings(
			resume({
				sections: [
					section({ ...withHighlights(["Did things"]), visible: false }),
				],
			}),
		);
		expect(bullets).toEqual([]);
	});

	it("ignores entries with no highlights array", () => {
		const { bullets } = collectBulletFindings(
			resume({
				sections: [
					section({
						type: "experience",
						content: { data: [{ company: "X" }] } as never,
					}),
					section({
						type: "education",
						content: { data: [{ school: "Y" }] } as never,
					}),
				],
			}),
		);
		expect(bullets).toEqual([]);
	});

	it("returns zero rather than throwing on an empty resume", () => {
		expect(collectBulletFindings(resume())).toEqual({
			bullets: [],
			totalNeedingWork: 0,
		});
	});
});
