import { describe, expect, it } from "vitest";
import {
	REVIEW_THRESHOLD,
	sectionResumeText,
	sectionScore,
} from "@/lib/import/sectioner";

/**
 * Tier-1 import must never invent anything.
 *
 * The product constraint is blunt: a hallucinated skill in a resume is worse than a
 * missing one, because the user cannot see the difference on the page and an
 * interviewer can. So the tests here are mostly about what the sectioner refuses to do
 * -- it does not guess a heading it does not recognise, it does not invent a date, and
 * it reports low confidence rather than presenting a guess as extracted fact.
 */

const RESUME = `Jane Doe
jane.doe@example.com | +1 555 123 4567 | https://linkedin.com/in/janedoe

SUMMARY
Backend engineer with eight years building payment systems in Python and Go.

WORK EXPERIENCE
Senior Engineer, Acme Corp
Jan 2020 - Present
- Rebuilt the settlement pipeline, cutting reconciliation time from 6 hours to 20 minutes
- Led the migration of 40 services to event-driven payments
- Mentored four engineers

Software Engineer, Initech
2016 - 2019
- Built the reporting service used by 12 teams

EDUCATION
University of Melbourne
Bachelor of Engineering, 2012 - 2015

SKILLS
Python, Go, PostgreSQL, Kubernetes, Terraform

CERTIFICATIONS
AWS Certified Solutions Architect, 2021
`;

describe("heading detection", () => {
	it("recognises canonical headings", () => {
		const { sections } = sectionResumeText(RESUME);
		expect(sections.map((s) => s.title)).toEqual(
			expect.arrayContaining([
				"Summary",
				"Work Experience",
				"Education",
				"Skills",
			]),
		);
	});

	it("scores an exact canonical heading higher than an alias", () => {
		const { sections } = sectionResumeText(RESUME);
		const summary = sections.find((s) => s.title === "Summary");
		const experience = sections.find((s) => s.title === "Work Experience");
		expect(summary?.confidence).toBe(0.95);
		expect(experience?.confidence).toBe(0.95);
	});

	it("resolves aliases to the parser-safe form", () => {
		// Import must not accept a heading the parse audit would later flag.
		const { sections } = sectionResumeText(
			"PROFESSIONAL SUMMARY\nA summary.\n\nVOLUNTEER EXPERIENCE\nHelped out.",
		);
		expect(sections.map((s) => s.title)).toEqual(
			expect.arrayContaining(["Summary", "Volunteer"]),
		);
	});

	it("keeps the original spelling for review", () => {
		const { sections } = sectionResumeText(RESUME);
		const skills = sections.find((s) => s.title === "Skills");
		expect(skills?.rawHeading).toBe("SKILLS");
	});

	it("does not treat body text as headings", () => {
		const { sections } = sectionResumeText(RESUME);
		for (const line of [
			// A loose heading rule used to claim these, which shredded every section.
			"Senior Engineer, Acme Corp",
			"Jan 2020 - Present",
			"University of Melbourne",
			"Rebuilt the settlement pipeline, cutting reconciliation time from 6 hours to 20 minutes",
			"Python, Go, PostgreSQL, Kubernetes, Terraform",
		]) {
			expect(sections.some((s) => s.rawHeading === line)).toBe(false);
		}
	});

	it("keeps bullet text as bullets rather than as headings", () => {
		const { sections } = sectionResumeText(RESUME);
		const experience = sections.find((s) => s.title === "Work Experience");
		const bullets =
			experience?.entries.flatMap((e) => e.bullets.map((b) => b.value)) ?? [];
		expect(bullets.some((b) => /Rebuilt the settlement pipeline/.test(b))).toBe(
			true,
		);
	});

	it("does not split a resume with no headings into invented ones", () => {
		const result = sectionResumeText("Some prose with no headings whatsoever.");
		expect(result.sections).toHaveLength(0);
		expect(result.warnings.join(" ")).toMatch(/no section headings/i);
	});

	it("flags an unrecognised ALL-CAPS heading as low confidence", () => {
		// Recoverable: the text is preserved, the user renames it.
		const result = sectionResumeText("SELECTED TALKS\nSome content here.");
		const guessed = result.sections.find(
			(s) => s.rawHeading === "SELECTED TALKS",
		);
		expect(guessed).toBeDefined();
		expect(guessed?.confidence).toBeLessThan(REVIEW_THRESHOLD);
		expect(result.warnings.join(" ")).toMatch(/not on the parser-safe list/i);
	});

	it("leaves an unrecognised Title Case line as body text rather than a heading", () => {
		// "Achieving Great Things" is indistinguishable from a role line without a
		// whitelist, so it must stay content. Missing a heading is recoverable; inventing
		// one is not.
		const result = sectionResumeText(
			"Achieving Great Things\nSome content here.",
		);
		expect(result.sections).toHaveLength(0);
		expect(result.warnings.join(" ")).toMatch(/no section headings/i);
	});
});

describe("preamble", () => {
	it("keeps the header instead of discarding it", () => {
		// A resume's name and contact details sit above the first heading, so dropping
		// the preamble would lose the most important fields on the page.
		const result = sectionResumeText(RESUME);
		expect(result.preamble).toMatch(/Jane Doe/);
	});

	it("extracts email, phone and link from the header", () => {
		const { contact } = sectionResumeText(RESUME);
		expect(contact.email?.value).toBe("jane.doe@example.com");
		expect(contact.phone?.value).toMatch(/555/);
		expect(contact.url?.value).toMatch(/linkedin/);
	});

	it("surfaces a header name with a confidence that admits it is a guess", () => {
		const { contact } = sectionResumeText(RESUME);
		expect(contact.name?.value).toBe("Jane Doe");
		// A short capitalised header line is weak evidence, so it must sit below the
		// review threshold rather than be presented as an extracted fact.
		expect(contact.name?.confidence).toBeLessThan(REVIEW_THRESHOLD);
	});

	it("reports no contact details when the document has none", () => {
		expect(sectionResumeText("SUMMARY\nA summary.").contact).toEqual({});
	});

	it("returns an empty preamble when the document starts with a heading", () => {
		expect(sectionResumeText("SUMMARY\nJust a summary.").preamble).toBe("");
	});
});

describe("work experience entries", () => {
	const experience = () =>
		sectionResumeText(RESUME).sections.find(
			(s) => s.title === "Work Experience",
		);

	it("splits repeated roles into separate entries", () => {
		expect(experience()?.entries).toHaveLength(2);
	});

	it("reads a date range as the entry start", () => {
		const entries = experience()?.entries ?? [];
		expect(entries[0]?.fields.startDate?.value).toMatch(/Jan 2020 - Present/);
		expect(entries[1]?.fields.startDate?.value).toMatch(/2016 - 2019/);
	});

	it("treats an explicit current end as high confidence", () => {
		const first = experience()?.entries?.[0];
		expect(first?.fields.startDate?.confidence).toBeGreaterThan(0.85);
	});

	it("keeps bullets with their own entry", () => {
		const entries = experience()?.entries ?? [];
		expect(entries[0]?.bullets.length).toBeGreaterThanOrEqual(3);
		expect(entries[1]?.bullets.length).toBeGreaterThanOrEqual(1);
		// The second role's bullet must not leak into the first.
		expect(entries[0]?.bullets.map((b) => b.value).join(" ")).not.toMatch(
			/reporting service/,
		);
	});

	it("identifies an organisation by its legal suffix", () => {
		const entries = experience()?.entries ?? [];
		expect(
			entries.some((e) =>
				/Acme Corp/i.test(e.fields.organization?.value ?? ""),
			),
		).toBe(true);
	});

	it("identifies a role by its title wording", () => {
		const entries = experience()?.entries ?? [];
		expect(
			entries.some((e) => /Engineer/i.test(e.fields.title?.value ?? "")),
		).toBe(true);
	});

	it("keeps the raw text of the whole section", () => {
		// Nothing should be lost in translation; the user can always read the source.
		expect(experience()?.raw).toMatch(/Initech/);
	});
});

describe("never invents content", () => {
	it("emits nothing for an empty document", () => {
		const result = sectionResumeText("");
		expect(result.sections).toHaveLength(0);
		expect(result.warnings).toHaveLength(1);
	});

	it("survives whitespace-only input", () => {
		expect(() => sectionResumeText("   \n\n  \n")).not.toThrow();
	});

	it("does not attach content to a heading it did not find", () => {
		const result = sectionResumeText(
			"SUMMARY\n\n\n\nWORK EXPERIENCE\nAcme Corp",
		);
		const summary = result.sections.find((s) => s.title === "Summary");
		expect(summary).toBeDefined();
		expect(summary ? sectionScore(summary) : 1).toBe(0);
	});

	it("marks a structural guess as needing review", () => {
		const result = sectionResumeText("SELECTED TALKS\nA line of prose.");
		const guessed = result.sections[0];
		expect(guessed).toBeDefined();
		// Below threshold means the UI must present it as a question, not a fact.
		expect(guessed ? sectionScore(guessed) : 1).toBeLessThan(REVIEW_THRESHOLD);
	});

	it("attaches no date when the text has none", () => {
		const result = sectionResumeText(
			"WORK EXPERIENCE\nAcme Corp\nBuilt things",
		);
		const dates = result.sections
			.flatMap((s) => s.entries)
			.map((e) => e.fields.startDate)
			.filter(Boolean);
		expect(dates).toHaveLength(0);
	});
});

describe("other section types", () => {
	it("treats education as entries with a date range", () => {
		const education = sectionResumeText(RESUME).sections.find(
			(s) => s.title === "Education",
		);
		expect(education?.entries.length).toBeGreaterThanOrEqual(1);
		expect(education?.entries[0]?.fields.startDate?.value).toMatch(
			/2012 - 2015/,
		);
	});

	it("keeps skills as one block rather than one entry per skill", () => {
		const skills = sectionResumeText(RESUME).sections.find(
			(s) => s.title === "Skills",
		);
		expect(skills?.entries).toHaveLength(0);
		expect(skills?.raw).toMatch(/PostgreSQL/);
	});

	it("reads certifications as a list", () => {
		const certs = sectionResumeText(RESUME).sections.find(
			(s) => s.title === "Certifications",
		);
		expect(certs?.entries.length).toBeGreaterThanOrEqual(1);
	});
});

describe("sectionScore", () => {
	it("is bounded to one", () => {
		const { sections } = sectionResumeText(RESUME);
		for (const s of sections) {
			expect(sectionScore(s)).toBeLessThanOrEqual(1);
			expect(sectionScore(s)).toBeGreaterThanOrEqual(0);
		}
	});

	it("is not higher than its heading confidence", () => {
		const { sections } = sectionResumeText(RESUME);
		for (const s of sections) {
			expect(sectionScore(s)).toBeLessThanOrEqual(s.confidence);
		}
	});
});

describe("empty and unusual input", () => {
	it("returns a result for a heading with no body", () => {
		const result = sectionResumeText("SKILLS\n\n\n\nEDUCATION\nSome school");
		const skills = result.sections.find((s) => s.title === "Skills");
		expect(skills).toBeDefined();
		expect(skills ? sectionScore(skills) : 1).toBe(0);
	});

	it("does not treat a bullet list with no headings as sections", () => {
		const result = sectionResumeText("- one\n- two\n- three");
		expect(result.sections).toHaveLength(0);
	});

	it("handles CRLF line endings", () => {
		const result = sectionResumeText(
			"SUMMARY\r\nA summary.\r\n\r\nSKILLS\r\nPython",
		);
		expect(result.sections.map((s) => s.title)).toEqual(
			expect.arrayContaining(["Summary", "Skills"]),
		);
	});

	it("handles a very long single line without hanging", () => {
		const long = "x".repeat(200_000);
		expect(() => sectionResumeText(`SUMMARY\n${long}`)).not.toThrow();
	});

	it("does not blow up on a document that is only headings", () => {
		expect(() => sectionResumeText("SUMMARY\nSKILLS\nEDUCATION")).not.toThrow();
	});
});
