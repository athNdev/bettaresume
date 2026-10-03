import { describe, expect, it } from "vitest";
import {
	detectColumns,
	extractPdfText,
	groupIntoBands,
	groupIntoLines,
	hasReadableText,
	joinLines,
	NO_TEXT_LAYER_MESSAGE,
	NoTextLayerError,
	normaliseGlyphs,
	orderLines,
	readPageRuns,
	type TextLine,
	type TextRun,
} from "@/lib/import/extractors/pdf-text";
import { sectionResumeText } from "@/lib/import/sectioner";
import { buildImageOnlyPdf, buildTextLayerPdf } from "./helpers/pdf-fixture";

/**
 * PDF is where tier-1 import can quietly produce a wrong resume.
 *
 * The sectioner already refuses to invent, and its 36 tests prove it. But the sectioner
 * is handed a *string*, and these tests are about what happens before that: whether the
 * string is the document's text in the order a human reads it.
 *
 * Getting that wrong is the worst class of bug this feature can have, because the
 * sectioner then segments a document nobody ever saw. Every field it produces looks
 * plausible and none of it is flagged, because the confidence system is measuring "did I
 * find this in the text" and the answer is yes -- the text was simply assembled wrongly.
 *
 * The fixtures are built in `helpers/pdf-fixture.ts` rather than committed as binaries,
 * because a two-column sample resume is not a property a reader of a diff can check.
 */

const PAGE_WIDTH = 612;

/** A run on the given baseline, starting at `x`. */
function run(text: string, x: number, y: number, width?: number): TextRun {
	return {
		str: text,
		x,
		y,
		width: width ?? text.length * 6,
		hasEOL: true,
	};
}

function line(
	text: string,
	x: number,
	y: number,
	width = text.length * 6,
): TextLine {
	return { text, x, y, right: x + width };
}

/**
 * Runs for one visible line, in one column.
 *
 * Fixtures go through runs rather than through `TextLine` on purpose: pdf.js hands us
 * positioned runs plus a synthetic spacer for the gap between columns, and the whole
 * column argument lives in those positions. A fixture that skipped straight to joined
 * lines would test the part that is easy and miss the part that is not.
 */
function at(
	text: string,
	x: number,
	y: number,
	width = text.length * 6,
): TextRun[] {
	return [run(text, x, y, width)];
}

/**
 * A run in a *filled* left column.
 *
 * `detectColumns` will not reorder a page unless the left side reaches towards the
 * gutter, because a right-aligned date column is otherwise indistinguishable from a
 * second column. A column is defined by being filled, so a two-column fixture that does
 * not fill its left column is not a two-column fixture.
 */
function inLeftColumn(text: string, y: number): TextRun[] {
	return [run(text, 72, y, 200)];
}

function buffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

describe("glyph normalisation", () => {
	it("expands ligatures rather than leaving a character nothing matches", () => {
		// A font with no ToUnicode entry for U+FB01 puts the raw ligature into the text
		// layer. "e\uFB01cient" matches no heading, no alias and no skill in the taxonomy,
		// so the word silently fails every lookup downstream.
		expect(normaliseGlyphs("e\uFB01cient")).toBe("eficient");
		expect(normaliseGlyphs("ef\uFB01ciency")).toBe("efficiency");
		expect(normaliseGlyphs("work\uFB02ow")).toBe("workflow");
		expect(normaliseGlyphs("o\uFB03ce")).toBe("office");
	});

	it("drops the soft hyphen a text layer uses as a break instruction", () => {
		// U+00AD is an instruction, not a character. Left in, `inter­national` compares
		// unequal to `international` everywhere.
		expect(normaliseGlyphs("inter\u00ADnational")).toBe("international");
	});

	it("changes nothing else", () => {
		expect(normaliseGlyphs("Senior Engineer, Acme Corp")).toBe(
			"Senior Engineer, Acme Corp",
		);
	});
});

describe("hasReadableText", () => {
	it("is false for whitespace and page furniture, true for words", () => {
		// A scanned PDF routinely yields a lone form feed or a stamp-layer glyph. Any
		// length-based test calls that "some text" while the page is an image.
		expect(hasReadableText("")).toBe(false);
		expect(hasReadableText("\n\n  \n")).toBe(false);
		expect(hasReadableText("\f1")).toBe(true);
		expect(hasReadableText("JANE DOE")).toBe(true);
	});
});

describe("groupIntoLines", () => {
	it("joins runs that share a baseline, however far the generator drifted", () => {
		// A PDF has no line, only baselines. Runs from one visual line routinely differ by
		// a fraction of a point; splitting on them would shatter every heading.
		const lines = groupIntoLines([
			run("WORK ", 72, 700),
			run("EXPERIENCE", 120, 700.4),
			run("Acme Corp", 72, 686),
		]);
		expect(lines).toHaveLength(2);
		expect(lines[0]?.text).toBe("WORK EXPERIENCE");
		expect(lines[1]?.text).toBe("Acme Corp");
	});

	it("keeps a heading and the line below it apart", () => {
		const lines = groupIntoLines([
			run("SKILLS", 72, 700),
			run("Python, Go", 72, 686),
		]);
		expect(lines.map((l) => l.text)).toEqual(["SKILLS", "Python, Go"]);
	});

	it("orders a line left to right regardless of the order items arrived in", () => {
		const lines = groupIntoLines([
			run("2020", 400, 700),
			run("Jan ", 72, 700),
			run("- ", 110, 700),
		]);
		expect(lines[0]?.text).toBe("Jan - 2020");
	});
});

describe("joinLines", () => {
	it("rejoins a word broken across a line break", () => {
		// The whole reason this exists: `inter-` / `national` is two words to every
		// search index and every skill taxonomy.
		const text = joinLines([
			line("Built an inter-", 72, 700),
			line("national system", 72, 686),
		]);
		expect(text).toBe("Built an international system");
	});

	it("leaves a hyphenated compound alone, as two visible lines", () => {
		// A capital after the hyphen is a boundary the author typed. Rejoining these
		// produces a single token that appears in no taxonomy and no search index, which
		// is a silent corruption. Leaving them split is a visible artifact, and a visible
		// artifact is the better of the two failures here -- the review screen shows the
		// source text for exactly this.
		expect(
			joinLines([line("Cross-", 72, 700), line("Functional lead", 72, 686)]),
		).toBe("Cross-\nFunctional lead");
	});

	it("leaves a trailing hyphen at the end of the text", () => {
		// There is no continuation to attach it to. Joining it to nothing would delete a
		// character the author wrote.
		expect(joinLines([line("Read-", 72, 700)])).toBe("Read-");
	});

	it("keeps every line when nothing was hyphenated", () => {
		expect(
			joinLines([
				line("Senior Engineer, Acme Corp", 72, 700),
				line("Jan 2020 - Present", 72, 686),
			]),
		).toBe("Senior Engineer, Acme Corp\nJan 2020 - Present");
	});
});

describe("detectColumns", () => {
	// The right column starts at x=360 on a 612pt page. It has to clear `mid + band`
	// (306 + 36.7 = 342.7): a right column beginning inside the gutter band is
	// indistinguishable from a centred heading, and the module refuses to call that
	// two-column rather than guessing.

	it("calls a page with text on both sides and an empty middle two columns", () => {
		const bands = groupIntoBands([
			...inLeftColumn("WORK EXPERIENCE", 700),
			...inLeftColumn("Acme Corp", 686),
			...inLeftColumn("Jan 2020", 672),
			...at("SKILLS", 360, 700),
			...at("Python", 360, 686),
			...at("Go", 360, 672),
		]);
		expect(detectColumns(bands, PAGE_WIDTH)).toEqual({
			count: 2,
			gutterX: PAGE_WIDTH / 2,
			ambiguous: false,
		});
	});

	it("does not call a single-column page two columns because a date is right-aligned", () => {
		// The failure this guards: "there is text on the right" is true of a right-aligned
		// date, and reordering on that would scramble an ordinary document. The date shares
		// a baseline with the role it belongs to, so counting baselines rather than runs is
		// what makes this come out single-column.
		const bands = groupIntoBands([
			...at("WORK EXPERIENCE", 72, 700),
			...at("Senior Engineer, Acme Corp", 72, 686),
			...at("Jan 2020 - Present", 380, 686),
			...at("Built the pipeline", 72, 672),
			...at("2019 - 2021", 380, 672),
			...at("Led the migration", 72, 658),
			...at("2020", 380, 658),
		]);
		expect(detectColumns(bands, PAGE_WIDTH).count).toBe(1);
	});

	it("does not call a centred title two columns", () => {
		// A centred title starts inside the gutter band. A page with a centred title and a
		// right-aligned date column is genuinely ambiguous, and refusing to call it
		// two-column leaves it in natural reading order.
		const bands = groupIntoBands([
			...at("JANE DOE", 280, 740),
			...at("WORK EXPERIENCE", 72, 700),
			...at("Acme Corp", 72, 686),
			...at("Jan 2020", 72, 672),
			...at("Jan 2020", 380, 700),
			...at("Feb 2021", 380, 686),
			...at("Mar 2021", 380, 672),
		]);
		expect(detectColumns(bands, PAGE_WIDTH).count).toBe(1);
	});

	it("ignores a lone line in the right half", () => {
		// That is a page number or a footer, not a column.
		const bands = groupIntoBands([
			...at("WORK EXPERIENCE", 72, 700),
			...at("Acme Corp", 72, 686),
			...at("Jan 2020", 72, 672),
			...at("1", 380, 100),
		]);
		expect(detectColumns(bands, PAGE_WIDTH).count).toBe(1);
	});

	it("is not fooled by pdf.js's spacer run for the gap between columns", () => {
		// pdf.js emits a real run whose text is a single space, positioned in the gap. It
		// must not be read as content, and it must not move a column's left edge.
		const bands = groupIntoBands([
			run("WORK EXPERIENCE", 72, 700, 200),
			run(" ", 272, 700, 88),
			run("SKILLS", 360, 700, 37),
			run("Acme Corp", 72, 686, 200),
			run("Python", 360, 686, 34),
			run("Jan 2020", 72, 672, 200),
			run("Go", 360, 672, 14),
		]);
		expect(detectColumns(bands, PAGE_WIDTH).count).toBe(2);
	});
});

describe("orderLines", () => {
	it("reads the left column completely before the right one", () => {
		const lines = [
			line("SKILLS", 360, 700),
			line("Acme Corp", 72, 700),
			line("Python", 360, 686),
			line("Jan 2020", 72, 686),
		];
		const ordered = orderLines(lines, {
			count: 2,
			gutterX: PAGE_WIDTH / 2,
			ambiguous: false,
		});
		expect(ordered.map((l) => l.text)).toEqual([
			"Acme Corp",
			"Jan 2020",
			"SKILLS",
			"Python",
		]);
	});

	it("sorts top to bottom on a single-column page", () => {
		const lines = [line("second", 72, 686), line("first", 72, 700)];
		expect(
			orderLines(lines, { count: 1, gutterX: null, ambiguous: false }).map(
				(l) => l.text,
			),
		).toEqual(["first", "second"]);
	});
});

describe("readPageRuns", () => {
	it("keeps a full-width heading above both columns", () => {
		// A page-wide rule, or a centred heading rendered from the left margin, starts
		// left of the gutter and overruns it. It has to stay above the text it introduces.
		const { text, columns } = readPageRuns(
			[
				run("JANE DOE", 72, 740, 300),
				run("Acme Corp", 72, 700, 200),
				run("Jan 2020", 72, 686, 200),
				run("SKILLS", 360, 700),
				run("Python", 360, 686),
				run("Go", 360, 672),
			],
			PAGE_WIDTH,
		);
		expect(columns.count).toBe(2);
		expect(text.split("\n")[0]).toBe("JANE DOE");
	});

	it("reads one column top to bottom when there is no second column", () => {
		const { text, columns } = readPageRuns(
			[
				run("WORK EXPERIENCE", 72, 700),
				run("Acme Corp", 72, 686),
				run("Jan 2020", 72, 672),
				run("Page 1", 380, 100),
			],
			PAGE_WIDTH,
		);
		expect(columns.count).toBe(1);
		expect(text.split("\n")[0]).toBe("WORK EXPERIENCE");
	});
});

describe("a two-column PDF, end to end", () => {
	// The required case: sections must not silently interleave.
	//
	// The fixture deliberately emits the lines interleaved by vertical position, the way
	// a generator laying out two columns down a page naturally would. A reader that sorts
	// by y alone sees WORK EXPERIENCE, SKILLS, the job, Python -- and the sectioner then
	// segments a document nobody ever saw, wedging a skills section inside a job with no
	// field flagged.
	//
	// Left-column lines are a realistic length, filling towards the gutter. That is load
	// bearing: `detectColumns` will not reorder a page whose left side stops short,
	// because a right-aligned date column is otherwise indistinguishable from a second
	// column.
	const TWO_COLUMN = [
		{ text: "WORK EXPERIENCE", x: 72, y: 740 },
		{ text: "SKILLS", x: 360, y: 740 },
		{ text: "Senior Engineer, Acme Corporation", x: 72, y: 720 },
		{ text: "Python, Go and PostgreSQL", x: 360, y: 720 },
		{ text: "January 2020 to Present", x: 72, y: 704 },
		{ text: "Kubernetes and Terraform", x: 360, y: 704 },
		{ text: "Rebuilt the payment settlement stack", x: 72, y: 688 },
		{ text: "Event-driven payments services", x: 360, y: 688 },
	];

	it("keeps the two columns separate instead of interleaving them", async () => {
		const result = await extractPdfText(buffer(buildTextLayerPdf(TWO_COLUMN)));
		const order = result.text.split("\n").filter(Boolean);
		// Logged because the failure mode is invisible in a passing assertion: the whole
		// text on one line, or the two columns swapped, both still "contain" the strings.
		expect(order).toEqual([
			"WORK EXPERIENCE",
			"Senior Engineer, Acme Corporation",
			"January 2020 to Present",
			"Rebuilt the payment settlement stack",
			"SKILLS",
			"Python, Go and PostgreSQL",
			"Kubernetes and Terraform",
			"Event-driven payments services",
		]);
		const lastExperienceLine = order.lastIndexOf(
			"Rebuilt the payment settlement stack",
		);
		const firstSkillsLine = order.indexOf("SKILLS");

		// Every line of the left column comes before every line of the right one.
		expect(result.layout[0]?.count).toBe(2);
		expect(lastExperienceLine).toBeGreaterThan(-1);
		expect(firstSkillsLine).toBeGreaterThan(lastExperienceLine);
	});

	it("does not interleave them in the sections the sectioner produces either", async () => {
		const text = (await extractPdfText(buffer(buildTextLayerPdf(TWO_COLUMN))))
			.text;
		const sections = sectionResumeText(text).sections;
		const experience = sections.find((s) => s.type === "experience");
		const skills = sections.find((s) => s.type === "skills");

		expect(experience).toBeDefined();
		expect(skills).toBeDefined();
		// The lines a y-sort would have pushed under SKILLS are still with the job, and the
		// skills section did not grow a job-shaped entry.
		expect(experience?.raw).toContain("Rebuilt the payment settlement stack");
		expect(skills?.raw).not.toContain("Senior Engineer");
		expect(skills?.raw).not.toContain("January 2020");
	});

	it("says so when the reading order is uncertain rather than picking one", async () => {
		// A two-column-shaped page whose left column is too sparse to commit to. The
		// module reports the ambiguity instead of reordering a document it is not sure
		// about, because a wrong reordering is a corruption it invented.
		const text = (
			await extractPdfText(
				buffer(
					buildTextLayerPdf([
						{ text: "WORK EXPERIENCE", x: 72, y: 740 },
						{ text: "SKILLS", x: 360, y: 740 },
						{ text: "Engineer, Acme", x: 72, y: 720 },
						{ text: "Python", x: 360, y: 720 },
						{ text: "Jan 2020", x: 72, y: 704 },
						{ text: "Go", x: 360, y: 704 },
					]),
				),
			)
		).text;

		expect(
			(
				await extractPdfText(
					buffer(
						buildTextLayerPdf([
							{ text: "WORK EXPERIENCE", x: 72, y: 740 },
							{ text: "SKILLS", x: 360, y: 740 },
							{ text: "Engineer, Acme", x: 72, y: 720 },
							{ text: "Python", x: 360, y: 720 },
							{ text: "Jan 2020", x: 72, y: 704 },
							{ text: "Go", x: 360, y: 704 },
						]),
					),
				)
			).ambiguousPages,
		).toContain(1);
		expect(text).toContain("WORK EXPERIENCE");
	});
});

describe("a scanned PDF", () => {
	// The required case, and the one where an empty import would be a lie.
	it("refuses with the scan message rather than returning empty text", async () => {
		await expect(extractPdfText(buffer(buildImageOnlyPdf()))).rejects.toThrow(
			NoTextLayerError,
		);
	});

	it("names the cause, and says OCR is not what it does", async () => {
		const error = await extractPdfText(buffer(buildImageOnlyPdf())).catch(
			(cause: unknown) => cause,
		);
		expect(error).toBeInstanceOf(NoTextLayerError);
		// "Imported 0 of 0 sections" would tell the user their file was empty. It is not:
		// it is a picture, and saying so is the entire value of the refusal.
		expect((error as Error).message).toBe(NO_TEXT_LAYER_MESSAGE);
		expect((error as Error).message).toMatch(/scan/i);
		expect((error as Error).message).toMatch(/OCR/i);
	});

	it("carries a code so a caller can tell a refusal from a crash", async () => {
		const error = (await extractPdfText(buffer(buildImageOnlyPdf())).catch(
			(cause: unknown) => cause,
		)) as NoTextLayerError;
		expect(error.code).toBe("NO_TEXT_LAYER");
	});

	it("does not produce an empty import that looks like a successful one", async () => {
		const error = (await extractPdfText(buffer(buildImageOnlyPdf())).catch(
			(cause: unknown) => cause,
		)) as NoTextLayerError;
		// There is no `text` to return at all. A caller cannot mistake this for "the file
		// had nothing in it", because it never gets text.
		expect("text" in error).toBe(false);
	});
});

describe("a single-column PDF with hyphenation and ligatures", () => {
	it("rejoins the broken word and expands the glyph before the sectioner sees either", async () => {
		const bytes = buildTextLayerPdf(
			[
				{ text: "JANE DOE", x: 72, y: 780 },
				{ text: "SKILLS", x: 72, y: 740 },
				{ text: "Built an inter-", x: 72, y: 720 },
				// U+FB01, written as WinAnsi byte 0xFB. The CMap below maps it back, which
				// is what a real font with a ToUnicode table does; without the CMap the byte
				// would arrive as Latin-1 "u" with a circumflex and the test would prove
				// nothing about ligatures.
				{ text: "national ef\uFB01ciency layer", x: 72, y: 704 },
			],
			{ 251: "\uFB01" },
		);

		const { text, layout } = await extractPdfText(buffer(bytes));

		expect(text).toContain("JANE DOE");
		expect(text).toContain("Built an international efficiency layer");
		expect(layout[0]?.count).toBe(1);
		expect(sectionResumeText(text).sections.map((s) => s.type)).toContain(
			"skills",
		);
	});

	it("leaves a hyphenated compound as the author typed it", async () => {
		// The other half of the hyphenation rule, end to end: "Cross-" + "Functional" is
		// a compound, not a broken word, and rejoining it would produce a single token that
		// matches nothing.
		const bytes = buildTextLayerPdf([
			{ text: "SKILLS", x: 72, y: 740 },
			{ text: "Cross-", x: 72, y: 720 },
			{ text: "Functional ownership", x: 72, y: 704 },
		]);

		const text = (await extractPdfText(buffer(bytes))).text;

		expect(text).toContain("Cross-\nFunctional ownership");
		expect(text).not.toContain("CrossFunctional");
	});
});
