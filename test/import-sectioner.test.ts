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
 *
 * ## The fixture is deliberately awkward
 *
 * The original fixture was tidy: a Title Case name, canonical ALL-CAPS headings, one
 * blank line between every role, and every employer carrying a legal suffix. Real
 * resumes violate all four, and every one of those violations hid a confirmed defect --
 * the tidy fixture passed against code that lost the name, filed two thirds of the
 * skills nowhere, and swallowed a suffix-less employer into `title`. So this fixture
 * breaks each convention on purpose, and the tests below say which defect each break
 * guards.
 */
const RESUME = `JANE DOE
Senior Backend Engineer
jane.doe@example.com | +1 555 123 4567 | https://linkedin.com/in/janedoe

PROFESSIONAL SUMMARY
Backend engineer with eight years building payment systems in Python and Go.

WORK EXPERIENCE
Senior Engineer, Acme Corp
Jan 2020 - Present
- Rebuilt the settlement pipeline, cutting reconciliation time from 6 hours to 20 minutes
- Led the migration of 40 services to event-driven payments
Software Engineer, Initech
2016 - 2019
- Built the reporting service used by 12 teams

EDUCATION
University of Melbourne
Bachelor of Engineering, 2012 - 2015

TECHNICAL SKILLS
Languages: Python, Go, TypeScript
Infrastructure: Kubernetes, Terraform, AWS
Data: PostgreSQL, Redis

CERTIFICATIONS
AWS Certified Solutions Architect, 2021

SELECTED TALKS
Payments correctness in distributed systems
`;

/** Every line of the skills block, which must all survive extraction. */
const SKILL_LINES = [
	"Languages: Python, Go, TypeScript",
	"Infrastructure: Kubernetes, Terraform, AWS",
	"Data: PostgreSQL, Redis",
];

const skillsSection = () =>
	sectionResumeText(RESUME).sections.find((s) => s.title === "Skills");

const experienceSection = () =>
	sectionResumeText(RESUME).sections.find((s) => s.title === "Work Experience");

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
		// A real comparison, not 0.95 === 0.95. "WORK EXPERIENCE" is on the whitelist
		// verbatim; "PROFESSIONAL SUMMARY" resolves through the alias map. The gap is the
		// whole point: it is how a user can tell a recognised heading from a mapped one.
		const { sections } = sectionResumeText(RESUME);
		const alias = sections.find((s) => s.rawHeading === "PROFESSIONAL SUMMARY");
		const canonical = sections.find((s) => s.rawHeading === "WORK EXPERIENCE");
		expect(canonical?.confidence).toBe(0.95);
		expect(alias?.confidence).toBe(0.8);
		expect(canonical?.confidence).toBeGreaterThan(alias?.confidence ?? 0);
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
		expect(skillsSection()?.rawHeading).toBe("TECHNICAL SKILLS");
	});

	it("does not treat body text as headings", () => {
		const { sections } = sectionResumeText(RESUME);
		for (const line of [
			// A loose heading rule used to claim these, which shredded every section.
			"Senior Engineer, Acme Corp",
			"Jan 2020 - Present",
			"University of Melbourne",
			"Rebuilt the settlement pipeline, cutting reconciliation time from 6 hours to 20 minutes",
			"Languages: Python, Go, TypeScript",
		]) {
			expect(sections.some((s) => s.rawHeading === line)).toBe(false);
		}
	});

	it("keeps bullet text as bullets rather than as headings", () => {
		const bullets =
			experienceSection()?.entries.flatMap((e) =>
				e.bullets.map((b) => b.value),
			) ?? [];
		expect(bullets.some((b) => /Rebuilt the settlement pipeline/.test(b))).toBe(
			true,
		);
	});

	it("does not split a resume with no headings into invented ones", () => {
		const result = sectionResumeText("Some prose with no headings whatsoever.");
		expect(result.sections).toHaveLength(0);
		expect(result.warnings.join(" ")).toMatch(/no section headings/i);
	});

	it("does not treat an ALL-CAPS name as a heading", () => {
		// "JOHN DOE" satisfies every clause of the structural fallback: ALL-CAPS, under 40
		// characters, with a non-empty line after it. Treating it as a heading made the
		// preamble empty and threw away the name, the email and the phone. The fallback is
		// now gated on a whitelist heading having been seen, so an unrecognised line above
		// the first heading is header text.
		const result = sectionResumeText(
			"JOHN DOE\njane@example.com\n+1 555 123 4567\n\nSUMMARY\nA summary line.",
		);
		expect(result.sections.map((s) => s.rawHeading)).toEqual(["SUMMARY"]);
		expect(result.preamble).toMatch(/JOHN DOE/);
	});

	it("still flags an unrecognised ALL-CAPS heading once a heading is known", () => {
		// The gate must not disable the fallback outright: after the document has shown it
		// has a heading vocabulary, an ALL-CAPS line really is a candidate heading and is
		// reported at low confidence rather than accepted as fact.
		const result = sectionResumeText(
			"SUMMARY\nA summary.\n\nSELECTED TALKS\nSome content here.",
		);
		const guessed = result.sections.find(
			(s) => s.rawHeading === "SELECTED TALKS",
		);
		expect(guessed).toBeDefined();
		expect(guessed?.confidence).toBeLessThan(REVIEW_THRESHOLD);
		expect(result.warnings.join(" ")).toMatch(/not on the parser-safe list/i);
	});

	it("keeps a real ALL-CAPS heading below a caps name as preamble-free content", () => {
		// The fixture's own "SELECTED TALKS" proves both halves at once: the caps name at
		// the top stays in the preamble, and the unrecognised caps heading further down is
		// still caught.
		const result = sectionResumeText(RESUME);
		expect(result.preamble).toMatch(/JANE DOE/);
		expect(result.sections.some((s) => s.rawHeading === "SELECTED TALKS")).toBe(
			true,
		);
		expect(result.sections.some((s) => s.rawHeading === "JANE DOE")).toBe(
			false,
		);
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
		expect(result.preamble).toMatch(/JANE DOE/);
	});

	it("extracts email, phone and link from the header", () => {
		const { contact } = sectionResumeText(RESUME);
		expect(contact.email?.value).toBe("jane.doe@example.com");
		expect(contact.phone?.value).toMatch(/555/);
		expect(contact.url?.value).toMatch(/linkedin/);
	});

	it("surfaces a header name with a confidence that admits it is a guess", () => {
		const { contact } = sectionResumeText(RESUME);
		expect(contact.name?.value).toBe("JANE DOE");
		// A short capitalised header line is weak evidence, so it must sit below the
		// review threshold rather than be presented as an extracted fact.
		expect(contact.name?.confidence).toBeLessThan(REVIEW_THRESHOLD);
	});

	it("recovers name, email and phone from an ALL-CAPS header", () => {
		const { contact } = sectionResumeText(
			"JOHN DOE\nEMAIL\njane@example.com\n+1 555 123 4567\n\nSUMMARY\nA summary.",
		);
		expect(contact.name?.value).toBe("JOHN DOE");
		expect(contact.email?.value).toBe("jane@example.com");
		expect(contact.phone?.value).toBe("+1 555 123 4567");
	});

	it("reports no contact details when the document has none", () => {
		expect(sectionResumeText("SUMMARY\nA summary.").contact).toEqual({});
	});

	it("returns an empty preamble when the document starts with a heading", () => {
		expect(sectionResumeText("SUMMARY\nJust a summary.").preamble).toBe("");
	});
});

describe("phone numbers", () => {
	it("does not report a year range as a phone number", () => {
		// The character class included the range separator, so "2015 - 2020" matched and
		// was published as a phone at 0.85 -- above the review threshold, so the UI showed
		// a date range as an extracted phone number with no review flag.
		const { contact } = sectionResumeText(
			"2015 - 2020\n\nSUMMARY\nA summary line here.",
		);
		expect(contact.phone).toBeUndefined();
	});

	it("does not report a month-bearing date as a phone number", () => {
		const { contact } = sectionResumeText(
			"Mar 2015 - 2020\n\nSUMMARY\nA summary line here.",
		);
		expect(contact.phone).toBeUndefined();
	});

	it("rejects an implausible digit count", () => {
		// Below 7 digits is not dialable.
		expect(
			sectionResumeText("12345\n\nSUMMARY\nA summary.").contact.phone,
		).toBeUndefined();
	});

	it("still finds a real number on a line that also contains a year range", () => {
		// The candidate must not be allowed to consume the slot: an implausible leading
		// run has to leave the rest of the line searchable.
		const { contact } = sectionResumeText(
			"2015 - 2020\n+1 555 123 4567\n\nSUMMARY\nA summary.",
		);
		expect(contact.phone?.value).toBe("+1 555 123 4567");
	});
});

describe("flat sections", () => {
	it("keeps every body line, not only the ones with a bullet glyph", () => {
		// The old path kept only glyph-prefixed lines, so on this block one line became a
		// 0.5-confidence `summary` and the other two survived nowhere an importer would
		// apply. Dropping content is the same failure from the user's side as inventing it.
		expect(skillsSection()?.bullets.map((b) => b.value)).toEqual(SKILL_LINES);
	});

	it("gives glyph-prefixed lines more confidence than bare ones", () => {
		const { sections } = sectionResumeText(
			"LANGUAGES\n- English (Native)\nSpanish (Fluent)\nPortuguese (Basic)",
		);
		const bullets = sections[0]?.bullets ?? [];
		expect(bullets.map((b) => b.confidence)).toEqual([0.8, 0.6, 0.6]);
		expect(bullets[0]?.reason).toMatch(/explicit bullet/i);
		expect(bullets[1]?.reason).toMatch(/kept so no content is dropped/i);
	});

	it("never presents a kept line as a clean extraction", () => {
		// An unlabelled line is a guess by definition, so it must not clear the bar that
		// means "do not show this to the user for review".
		for (const bullet of skillsSection()?.bullets ?? []) {
			expect(bullet.confidence).toBeLessThanOrEqual(REVIEW_THRESHOLD);
		}
	});

	it("strips the bullet glyph out of the summary field", () => {
		// `summary` ran on raw body lines, so it re-published the first bullet with its
		// glyph still attached.
		const { sections } = sectionResumeText(
			"LANGUAGES\n- English (Native)\n- Spanish (Fluent)",
		);
		expect(sections[0]?.fields.summary?.value).toBe("English (Native)");
	});

	it("does not set summary to the same string already captured as dateRange", () => {
		// When a flat section's first line is its date line, one string used to land in
		// two fields with two confidences.
		const { sections } = sectionResumeText("LANGUAGES\nJan 2020 - Present");
		const fields = sections[0]?.fields ?? {};
		expect(fields.dateRange?.value).toBe("Jan 2020 - Present");
		expect(fields.summary).toBeUndefined();
	});
});

describe("work experience entries", () => {
	it("splits repeated roles into separate entries", () => {
		expect(experienceSection()?.entries).toHaveLength(2);
	});

	it("reads a date range as the entry start", () => {
		const entries = experienceSection()?.entries ?? [];
		expect(entries[0]?.fields.startDate?.value).toMatch(/Jan 2020 - Present/);
		expect(entries[1]?.fields.startDate?.value).toMatch(/2016 - 2019/);
	});

	it("treats an explicit current end as high confidence", () => {
		const first = experienceSection()?.entries?.[0];
		expect(first?.fields.startDate?.confidence).toBeGreaterThan(0.85);
	});

	it("keeps bullets with their own entry", () => {
		const entries = experienceSection()?.entries ?? [];
		expect(entries[0]?.bullets.length).toBeGreaterThanOrEqual(2);
		expect(entries[1]?.bullets.length).toBeGreaterThanOrEqual(1);
		// The second role's bullet must not leak into the first.
		expect(entries[0]?.bullets.map((b) => b.value).join(" ")).not.toMatch(
			/reporting service/,
		);
	});

	it("identifies an organisation by its legal suffix", () => {
		const entries = experienceSection()?.entries ?? [];
		const acme = entries.find((e) =>
			/Acme Corp/i.test(e.fields.organization?.value ?? ""),
		);
		expect(acme).toBeDefined();
		// A legal suffix is independent corroboration, so this can clear the bar.
		expect(acme?.fields.organization?.confidence).toBeGreaterThan(
			REVIEW_THRESHOLD,
		);
	});

	it("identifies a role by its title wording", () => {
		const entries = experienceSection()?.entries ?? [];
		expect(
			entries.some((e) => /Engineer/i.test(e.fields.title?.value ?? "")),
		).toBe(true);
	});

	it("keeps the raw text of the whole section", () => {
		// Nothing should be lost in translation; the user can always read the source.
		expect(experienceSection()?.raw).toMatch(/Initech/);
	});
});

describe("employers without a legal suffix", () => {
	// "Initech" is not a word-boundary `inc` match and "Google" is not a company either,
	// so requiring the organisation hint to corroborate meant the employer of most real
	// jobs was filed under `title`. Blank lines here because these role lines are only
	// entry openers when an entry is already open; see the known-limitation test below.
	const SUFFIX_LESS = `WORK EXPERIENCE
Software Engineer, Initech
2016 - 2019

Engineer, Google
2012 - 2014
`;

	it("reads the second half of a 'Role, Company' line as the organisation", () => {
		const entries = sectionResumeText(SUFFIX_LESS).sections[0]?.entries ?? [];
		expect(entries[0]?.fields.organization?.value).toBe("Initech");
		expect(entries[1]?.fields.organization?.value).toBe("Google");
	});

	it("splits on ' at ' as well as a comma", () => {
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nEngineer at Stripe\n2020 - 2022",
		);
		expect(sections[0]?.entries[0]?.fields.title?.value).toBe("Engineer");
		expect(sections[0]?.entries[0]?.fields.organization?.value).toBe("Stripe");
	});

	it("flags a suffix-less employer for review rather than asserting it", () => {
		// The role half is the evidence; the second half is a structural inference with
		// nothing to confirm it, so it must sit below the review threshold.
		const entries = sectionResumeText(SUFFIX_LESS).sections[0]?.entries ?? [];
		expect(entries[0]?.fields.organization?.confidence).toBeLessThan(
			REVIEW_THRESHOLD,
		);
		// The role itself is still well evidenced.
		expect(entries[0]?.fields.title?.confidence).toBeGreaterThan(
			REVIEW_THRESHOLD,
		);
	});

	it("invents no employer when there is no separator", () => {
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nSenior Engineer\n2020 - 2022",
		);
		const entry = sections[0]?.entries[0];
		expect(entry?.fields.title?.value).toBe("Senior Engineer");
		expect(entry?.fields.organization).toBeUndefined();
	});

	it("does not file a bare year as an employer", () => {
		// Accepting the second half of any comma split also accepted the second half of
		// "AWS Certified Solutions Architect, 2021" and filed `2021` as the employer.
		const { sections } = sectionResumeText(
			"CERTIFICATIONS\nAWS Certified Solutions Architect, 2021",
		);
		expect(sections[0]?.entries[0]?.fields.organization).toBeUndefined();
	});

	it("does not file a date as an employer", () => {
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nEngineer, Mar 2020 - Present",
		);
		expect(sections[0]?.entries[0]?.fields.organization).toBeUndefined();
	});
});

describe("date ranges inside bullets", () => {
	it("does not open a new entry for a year range inside a bullet", () => {
		// Any line matching DATE_RANGE was treated as an entry boundary, bullets included,
		// so a bullet mentioning 2016-2019 fabricated a second "job" whose only field was a
		// date lifted out of the middle of a sentence.
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nEngineer, Acme Corp\nJan 2020 - Present\n- Rebuilt the 2016-2019 legacy stack",
		);
		expect(sections[0]?.entries).toHaveLength(1);
	});

	it("keeps the bullet intact rather than splitting it on its own date", () => {
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nEngineer, Acme Corp\nJan 2020 - Present\n- Rebuilt the 2016-2019 legacy stack",
		);
		const bullets = sections[0]?.entries[0]?.bullets ?? [];
		expect(bullets.map((b) => b.value)).toEqual([
			"Rebuilt the 2016-2019 legacy stack",
		]);
		expect(bullets[0]?.confidence).toBeGreaterThan(REVIEW_THRESHOLD);
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
		const result = sectionResumeText(
			"SUMMARY\nA summary.\n\nSELECTED TALKS\nA line of prose.",
		);
		const guessed = result.sections[1];
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
		const skills = skillsSection();
		expect(skills?.entries).toHaveLength(0);
		expect(skills?.raw).toMatch(/PostgreSQL/);
	});

	it("keeps every line of a multi-line skills block", () => {
		// The old assertion could not fail on the bug that mattered, because the fixture
		// had a single-line skills block -- which is exactly why two thirds of a real one
		// were being dropped went unnoticed.
		const values = skillsSection()?.bullets.map((b) => b.value) ?? [];
		for (const line of SKILL_LINES) {
			expect(values).toContain(line);
		}
		expect(values).toHaveLength(SKILL_LINES.length);
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

	it("is zero for a section with nothing in it", () => {
		const { sections } = sectionResumeText("SUMMARY\n\n\n\nSKILLS\nSome skill");
		const summary = sections.find((s) => s.title === "Summary");
		expect(summary).toBeDefined();
		expect(summary ? sectionScore(summary) : 1).toBe(0);
	});

	it("is not laundered upward by one confident field in a guessed section", () => {
		// Two unlabelled guesses at 0.6 plus one real date at 0.9. `Math.max` scored this
		// 0.9 -- above the review threshold -- because a maximum is the one aggregate a
		// single field can set on its own, so the field that was found most confidently
		// spoke for the ones that were invented.
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nMar 2019 - Present\nSome prose one\nSome prose two",
		);
		const section = sections[0];
		expect(section).toBeDefined();
		expect(section).toBeDefined();
		expect(section ? sectionScore(section) : 1).not.toBe(0.9);
		expect(section ? sectionScore(section) : 1).toBeLessThanOrEqual(
			REVIEW_THRESHOLD,
		);
	});

	it("still scores a well-extracted section above the guessed one", () => {
		// A median must not be a way of flattening everything to the same low number.
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nSenior Engineer, Acme Corp\nJan 2020 - Present\n- Did a\n- Did b",
		);
		const section = sections[0];
		expect(section).toBeDefined();
		if (!section) throw new Error("expected a Work Experience section");
		expect(sectionScore(section)).toBeGreaterThan(REVIEW_THRESHOLD);
	});

	it("is not dragged down by a single weak field in a rich section", () => {
		// The mirror of the laundering test: one shaky field must not discredit twenty good
		// ones, which is the failure a `Math.min` would introduce.
		const lines = [
			"Senior Engineer, Acme Corp",
			"Jan 2020 - Present",
			"A loose unlabelled line",
		];
		for (let i = 0; i < 20; i++) lines.push(`- Achievement number ${i}`);
		const { sections } = sectionResumeText(
			["WORK EXPERIENCE", ...lines].join("\n"),
		);
		const entry = sections[0]?.entries[0];
		// The weak field is genuinely there, at the guess tier.
		expect(entry?.bullets.some((b) => b.confidence <= REVIEW_THRESHOLD)).toBe(
			true,
		);
		const section = sections[0];
		expect(section).toBeDefined();
		if (!section) throw new Error("expected a Work Experience section");
		expect(sectionScore(section)).toBeGreaterThan(REVIEW_THRESHOLD);
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

	it("handles a very long single line, keeping the content and finishing promptly", () => {
		// `not.toThrow()` alone is a weak assertion: it passes on a result that silently
		// dropped 200 KB. Assert the content came back, and bound the time so a quadratic
		// blow-up in the normalisers fails rather than hangs the suite.
		const long = "x".repeat(200_000);
		const started = performance.now();
		const { sections } = sectionResumeText(`SUMMARY\n${long}`);
		const elapsed = performance.now() - started;

		const summary = sections.find((s) => s.title === "Summary");
		expect(summary).toBeDefined();
		expect(summary?.bullets.map((b) => b.value)).toEqual([long]);
		expect(elapsed).toBeLessThan(5_000);
	});

	it("handles deeply nested content, keeping every line and finishing promptly", () => {
		// Many short entries, which exercises the per-entry allocation and the section
		// aggregate rather than a single regex over one huge string.
		const roles = Array.from(
			{ length: 300 },
			(_, i) =>
				`Engineer, Company ${i}\n20${10 + (i % 9)} - 20${11 + (i % 8)}\n- Did thing ${i}`,
		).join("\n\n");
		const started = performance.now();
		const { sections } = sectionResumeText(`WORK EXPERIENCE\n${roles}`);
		const elapsed = performance.now() - started;

		const entries = sections[0]?.entries ?? [];
		expect(entries).toHaveLength(300);
		expect(entries[299]?.bullets.map((b) => b.value)).toEqual([
			"Did thing 299",
		]);
		expect(elapsed).toBeLessThan(5_000);
	});

	it("does not blow up on a document that is only headings", () => {
		const result = sectionResumeText("SUMMARY\nSKILLS\nEDUCATION");
		expect(result.sections.length).toBeGreaterThan(0);
	});
});

/**
 * A defect found while building the realistic fixture, recorded rather than papered over.
 *
 * Entries are opened by a date line or a blank line, never by a role line. So in a block
 * with no blank lines between roles -- which is the commonest real layout, and the reason
 * the fixture above drops them -- every role line after the first is absorbed as a bullet
 * of the entry above it, and the following date then attaches to the wrong role.
 *
 * This is a real defect and it is not fixed here: it is a change to how entries are
 * delimited, which is outside the scope of this pass. The test exists so the behaviour is
 * pinned and visible rather than rediscovered, and so that fixing it is a deliberate,
 * breaking change to an assertion someone reads.
 */
describe("known limitation: a role line does not open a new entry", () => {
	it("absorbs an undelimited second role into the entry above it", () => {
		const { sections } = sectionResumeText(
			"WORK EXPERIENCE\nSenior Engineer, Acme Corp\nJan 2020 - Present\n- Did work\nSoftware Engineer, Initech\n2016 - 2019\n- Did more",
		);
		const entries = sections[0]?.entries ?? [];
		// "Software Engineer, Initech" is content of entry 0, not a header of entry 1.
		expect(entries[0]?.bullets.map((b) => b.value)).toContain(
			"Software Engineer, Initech",
		);
		expect(entries[1]?.fields.title).toBeUndefined();
		expect(entries[1]?.fields.startDate?.value).toMatch(/2016 - 2019/);
	});
});
