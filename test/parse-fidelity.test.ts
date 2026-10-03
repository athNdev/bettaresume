import { describe, expect, it } from "vitest";
import {
	auditParseFidelity,
	checkDateConsistency,
	checkDateFormat,
	checkHeading,
	checkLayout,
	DATE_FORMATS,
	PARSER_SAFE_HEADINGS,
} from "../src/lib/analysis/parse-fidelity";

/**
 * Two rules govern this file.
 *
 * **No headline score, ever.** A single 0-100 number is the failure mode of every
 * incumbent "ATS score" — users report 94/100 on resumes human reviewers reject. Findings
 * stay discrete and actionable.
 *
 * **False positives are the real risk.** Telling someone their resume is fine when it is
 * not costs them a job; telling them it is broken when it is fine costs them ten seconds.
 * The second is recoverable, so the bias is deliberately toward fewer findings.
 */

describe("heading checks", () => {
	it.each(PARSER_SAFE_HEADINGS)("accepts %j", (heading) => {
		expect(checkHeading(heading)).toBeNull();
	});

	it("is case-insensitive on safe headings", () => {
		expect(checkHeading("work experience")).toBeNull();
		expect(checkHeading("  WORK   EXPERIENCE  ")).toBeNull();
	});

	it("flags the two headings this codebase actually emits", () => {
		// Both are hardcoded in the Typst templates, so these are live findings, not
		// hypotheticals. "Professional Summary" and "Volunteer Experience" read fine to
		// a person and have been observed to cost a parser the section.
		for (const heading of ["Professional Summary", "Volunteer Experience"]) {
			const d = checkHeading(heading);
			expect(d, heading).not.toBeNull();
			expect(d?.id).toBe("heading-alias");
			expect(d?.fix).toMatch(/Rename the section to/);
		}
	});

	it("suggests the parser-safe form for known aliases", () => {
		expect(checkHeading("Awards & Honors")?.fix).toContain('"Awards"');
		expect(checkHeading("Technical Skills")?.fix).toContain('"Skills"');
		expect(checkHeading("Work History")?.fix).toContain('"Work Experience"');
	});

	it("warns on any unrecognised heading, whoever wrote it", () => {
		// My first expectation here was wrong: I assumed a user-authored heading
		// should be softer than a non-standard default. It should not. A parser does
		// not care who typed it, and "My Favourite Things" costs the section just as
		// much as "Professional Summary" does.
		const d = checkHeading("My Favourite Things");
		expect(d?.severity).toBe("warning");
		expect(d?.id).toBe("heading-unknown");
		expect(d?.detail).toMatch(/not one of them|may be filed as unstructured/);
	});

	it("drops to info when there is genuinely nothing to suggest", () => {
		// Only the placeholder heading a brand-new custom section starts with.
		const d = checkHeading("Custom Section");
		expect(d?.severity).toBe("info");
		expect(d?.id).toBe("heading-custom");
	});

	it("ignores an empty heading rather than reporting noise", () => {
		expect(checkHeading("")).toBeNull();
		expect(checkHeading("   ")).toBeNull();
	});

	it("never returns a numeric score", () => {
		const d = checkHeading("Whatever");
		expect(JSON.stringify(d)).not.toMatch(/score|overall|percent\b/i);
	});
});

describe("date format checks", () => {
	it("accepts MMMM YYYY as the safest form", () => {
		expect(checkDateFormat("MMMM YYYY")).toBeNull();
	});

	it("accepts MMM YYYY as still tolerable", () => {
		expect(checkDateFormat("MMM YYYY")).toBeNull();
	});

	it("warns on numeric and bare-year formats", () => {
		for (const format of ["MM/YYYY", "YYYY"]) {
			const d = checkDateFormat(format);
			expect(d, format).not.toBeNull();
			expect(d?.fix).toContain("MMMM YYYY");
		}
	});

	it("has documented examples for every format it knows", () => {
		// Guards against adding a format to the enum and forgetting the metadata.
		for (const [key, meta] of Object.entries(DATE_FORMATS)) {
			expect(meta.example, key).toBeTruthy();
		}
	});

	it("ignores an unset format", () => {
		expect(checkDateFormat(undefined)).toBeNull();
	});
});

describe("date consistency", () => {
	it("accepts a fully consistent resume", () => {
		expect(
			checkDateConsistency([
				{ startDate: "March 2020", endDate: "March 2024" },
				{ startDate: "March 2024", current: true },
			]),
		).toBeNull();
	});

	it("flags mixed formats as an error, not a warning", () => {
		// This is the highest-severity finding in the module: a parser infers the
		// pattern from the first date and then fails on the rest, so one stray format
		// corrupts the entire timeline.
		const d = checkDateConsistency([
			{ startDate: "March 2020", endDate: "March 2022" },
			{ startDate: "Jan 2023", endDate: "2024" },
		]);
		expect(d?.id).toBe("date-mixed-formats");
		expect(d?.severity).toBe("error");
		expect(d?.detail).toMatch(/month-year.*year|year.*month-year/s);
	});

	it("ignores endDate on a current role", () => {
		expect(
			checkDateConsistency([
				{ startDate: "March 2020", endDate: "March 2024" },
				{ startDate: "March 2020", endDate: "2026", current: true },
			]),
		).toBeNull();
	});

	it("flags free-text dates that no parser will read", () => {
		expect(checkDateConsistency([{ startDate: "last summer" }])?.id).toBe(
			"date-unrecognised",
		);
	});

	it("accepts a consistent numeric resume without complaining", () => {
		// Consistency is what matters; the format setting check reports the risk
		// separately. Reporting both would double-count one problem.
		expect(
			checkDateConsistency([
				{ startDate: "03/2020", endDate: "03/2024" },
				{ startDate: "03/2024", current: true },
			]),
		).toBeNull();
	});

	it("handles an empty resume without a false positive", () => {
		expect(checkDateConsistency([])).toBeNull();
	});
});

describe("layout check", () => {
	it("accepts single-column and an unset layout", () => {
		expect(checkLayout("single-column")).toBeNull();
		expect(checkLayout(undefined)).toBeNull();
	});

	it("explains that a stored non-single-column value is inert", () => {
		const d = checkLayout("sidebar");
		expect(d?.severity).toBe("error");
		expect(d?.detail).toMatch(/no Typst template reads/i);
		expect(d?.detail).toMatch(/inert and misleading/i);
	});
});

describe("auditParseFidelity", () => {
	it("returns findings most-severe first", () => {
		const results = auditParseFidelity({
			sections: [
				{ type: "summary", title: "Professional Summary" },
				{ type: "custom", title: "My Favourite Things" },
			],
			dates: [
				{ startDate: "March 2020", endDate: "March 2022" },
				{ startDate: "Jan 2023", endDate: "2024" },
			],
			dateFormat: "MM/YYYY",
			layout: "sidebar",
		});

		const severities = results.map((r) => r.severity);
		expect(severities).toEqual(
			[...severities].sort(
				(a, b) =>
					({ error: 0, warning: 1, info: 2 })[a] -
					{ error: 0, warning: 1, info: 2 }[b],
			),
		);
		// Both errors present.
		expect(results.filter((r) => r.severity === "error")).toHaveLength(2);
	});

	it("returns nothing for a clean resume", () => {
		expect(
			auditParseFidelity({
				sections: [
					{ type: "summary", title: "Summary" },
					{ type: "experience", title: "Work Experience" },
					{ type: "education", title: "Education" },
					{ type: "skills", title: "Skills" },
				],
				dates: [
					{ startDate: "March 2020", endDate: "March 2024" },
					{ startDate: "September 2024", current: true },
				],
				dateFormat: "MMMM YYYY",
				layout: "single-column",
			}),
		).toEqual([]);
	});

	it("reports a repeated identical heading once, not once per section", () => {
		const results = auditParseFidelity({
			sections: [
				{ type: "summary", title: "Professional Summary" },
				{ type: "custom", title: "Professional Summary" },
				{ type: "custom", title: "Professional Summary" },
			],
			dates: [],
		});
		expect(results.filter((r) => r.id === "heading-alias")).toHaveLength(1);
	});

	it("reports DISTINCT non-standard headings separately, each with its own fix", () => {
		// Dedupe-once-by-id hid these three behind one message, so a user with all
		// three problems saw only the first and fixed one.
		const results = auditParseFidelity({
			sections: [
				{ type: "summary", title: "Professional Summary" },
				{ type: "volunteer", title: "Volunteer Experience" },
				{ type: "awards", title: "Awards & Honors" },
			],
			dates: [],
		});
		expect(results).toHaveLength(3);
		expect(results.map((r) => r.fix)).toEqual([
			'Rename the section to "Summary".',
			'Rename the section to "Volunteer".',
			'Rename the section to "Awards".',
		]);
	});

	it("does not flag the contact block heading", () => {
		// Parsers locate email/phone/URL by regex. The heading is not load-bearing,
		// so flagging it would be a false positive that trains users to ignore us.
		expect(
			auditParseFidelity({
				sections: [{ type: "personal-info", title: "Personal Information" }],
				dates: [],
			}),
		).toEqual([]);
	});

	it("skips hidden sections", () => {
		const results = auditParseFidelity({
			sections: [
				{ type: "custom", title: "My Favourite Things", visible: false },
			],
			dates: [],
		});
		expect(results).toEqual([]);
	});

	it("every diagnostic carries an actionable fix", () => {
		const results = auditParseFidelity({
			sections: [
				{ type: "summary", title: "Professional Summary" },
				{ type: "volunteer", title: "Volunteer Experience" },
				{ type: "custom", title: "My Favourite Things" },
			],
			dates: [{ startDate: "sometime" }],
			dateFormat: "MM/YYYY",
			layout: "two-column",
		});

		for (const d of results) {
			expect(d.fix, `${d.id} has no fix`).toBeTruthy();
			expect(d.detail.length, `${d.id} has no detail`).toBeGreaterThan(20);
		}
	});

	it("gives every diagnostic a stable id", () => {
		const results = auditParseFidelity({
			sections: [{ type: "summary", title: "Professional Summary" }],
			dates: [],
			layout: "sidebar",
		});
		const ids = results.map((r) => r.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});
