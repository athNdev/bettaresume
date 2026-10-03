import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
	buildImportPayload,
	countLowConfidence,
	ImportReviewView,
	reviewFieldsFor,
} from "@/features/resume-editor/components/import-review-view";
import {
	isUnreviewed,
	readImportMeta,
	withReviewed,
} from "@/lib/import/library-item";
import { REVIEW_THRESHOLD, sectionResumeText } from "@/lib/import/sectioner";

/**
 * The review screen is where "never invent" either holds or does not.
 *
 * ## These assert on rendered output, not on state
 *
 * A confidence value sitting in a React state object is a claim about the code. What the
 * user meets is markup. So every assertion below runs `renderToStaticMarkup` and looks at
 * the HTML: if a `data-confidence` attribute says `low` but the row renders identically to
 * a confident one, these fail -- which is the whole point, because the attributes are
 * easy to keep and the distinction is easy to lose.
 *
 * ## Why `react-dom/server` and not a DOM
 *
 * The root vitest config is `environment: "node"` with no jsdom and no testing-library,
 * and `test/review-panel.test.ts` records why: the Typst WASM is CDN-loaded and the repo
 * has never had a DOM in CI. Static rendering is a real render -- React runs, the
 * components run, the conditional branches are taken -- and it needs nothing installed.
 * What it cannot do is fire events, so interaction is covered by the pure helpers and by
 * source-level assertions, and this file says which is which.
 */

const SOURCE = {
	kind: "pdf" as const,
	fileName: "jane-doe.pdf",
	notes: [] as string[],
};

/**
 * A document chosen so the confidences genuinely differ.
 *
 * The email is a 0.95 exact match. The organisation is the second half of a
 * "Role, Company" line with no legal suffix, which the sectioner scores 0.55 -- below
 * `REVIEW_THRESHOLD`, and therefore a question rather than a fact. If a change ever makes
 * both come out the same, this fixture stops testing anything.
 */
const RESUME = `JANE DOE
jane.doe@example.com

WORK EXPERIENCE
Senior Engineer, Acme
- Rebuilt the settlement pipeline
`;

const result = sectionResumeText(RESUME);

function render(overrides: Record<string, string> = {}, removed: Record<string, true> = {}) {
	return renderToStaticMarkup(
		<ImportReviewView
			added={{}}
			// Handlers are passed so the fields render as inputs rather than as plain
			// text. Without them the markup under test is not the markup a user meets.
			onAddToLibrary={() => {}}
			onFieldChange={() => {}}
			onFieldRemove={() => {}}
			overrides={overrides}
			removed={removed}
			result={result}
			source={SOURCE}
		/>,
	);
}

/** The rendered `<li>` for one field, found by the field name it displays. */
function rowForField(html: string, name: string): string {
	const marker = `data-field-name="${name}"`;
	const at = html.indexOf(marker);
	if (at === -1) throw new Error(`no row for field ${name}`);
	const open = html.lastIndexOf("<li", at);
	const close = html.indexOf("</li>", at);
	if (open === -1 || close === -1) throw new Error(`unterminated row for ${name}`);
	return html.slice(open, close);
}

describe("the fixture really does span both sides of the threshold", () => {
	it("has a high-confidence field and a low-confidence one", () => {
		const fields = reviewFieldsFor(result);
		const confidences = fields.map((f) => f.field.confidence);
		expect(confidences.some((c) => c >= REVIEW_THRESHOLD)).toBe(true);
		expect(confidences.some((c) => c < REVIEW_THRESHOLD)).toBe(true);
		expect(countLowConfidence(fields)).toBeGreaterThan(0);
	});
});

describe("low confidence is presented as a question, not a fact", () => {
	// The required case. Asserted on the rendered HTML.
	it("marks the low-confidence field differently from the high-confidence one", () => {
		const html = render();

		expect(html).toContain('data-confidence="low"');
		expect(html).toContain('data-confidence="high"');
	});

	it("says 'Needs checking' on the guessed field and 'Extracted' on the read one", () => {
		const html = render();

		// Both words must be present, and they must belong to different rows.
		expect(html).toContain("Needs checking");
		expect(html).toContain("Extracted");

		const lowRow = rowContaining(html, 'data-confidence="low"');
		const highRow = rowContaining(html, 'data-confidence="high"');
		expect(lowRow).toContain("Needs checking");
		expect(lowRow).not.toContain("Extracted");
		expect(highRow).toContain("Extracted");
		expect(highRow).not.toContain("Needs checking");
	});

	it("gives the two rows different styling, not only different words", () => {
		// Words alone would pass if the styling were dropped. A user who never notices the
		// label still has to be able to see which row is the guess.
		const lowRow = rowContaining(render(), 'data-confidence="low"');
		const highRow = rowContaining(render(), 'data-confidence="high"');

		expect(classOf(lowRow)).not.toBe(classOf(highRow));
		expect(lowRow).toContain("border-dashed");
		expect(highRow).not.toContain("border-dashed");
	});

	it("explains why each confidence is what it is", () => {
		// The reason is the only thing that lets the user decide between correcting the
		// value and deleting it. Without it the badge is a shrug.
		const html = render();

		// The name is the important one: 0.5, because "a short capitalised line in the
		// header" is exactly that, and it is the single field nobody can afford to get
		// wrong.
		const name = rowForField(html, "name");
		expect(name).toContain('data-confidence="low"');
		expect(name).toMatch(/Guessed: /);
		expect(name).toMatch(/capitalised line in the header/i);

		// The organisation: 0.55, because it is the second half of a "Role, Company" line
		// with nothing to corroborate it.
		const org = rowForField(html, "organization");
		expect(org).toContain('data-confidence="low"');
		expect(org).toMatch(/no legal suffix/i);

		// And a field that was read, not guessed, states its evidence without the prefix.
		const title = rowForField(html, "title");
		expect(title).toContain('data-confidence="high"');
		expect(title).not.toMatch(/Guessed: /);
		expect(title).toMatch(/Role before the organisation/);
	});

	it("marks the input itself, not just the row around it", () => {
		// A screen reader announces the input, not the row's styling.
		const html = render();
		expect(html).toMatch(/aria-label="[^"]*\(needs checking\)"/);
		expect(html).toContain("aria-describedby=");
	});

	it("flags a heading the sectioner only guessed at", () => {
		// A real resume writes "PROJECTS AND AWARDS" or "PROFESSIONAL EXPERIENCE", and
		// those are not on the parser-safe list. The sectioner still sections them -- it has
		// to, or the text is lost -- but at 0.35, with a warning. The screen has to say the
		// heading was inferred, or the user reads an invented section name as an extracted
		// one.
		const structural = sectionResumeText(`Summary
A backend engineer.

PROJECTS AND AWARDS
Engineer, Acme
- Shipped things
`);
		const guessed = structural.sections.find(
			(s) => s.rawHeading === "PROJECTS AND AWARDS",
		);
		expect(guessed).toBeDefined();
		expect(guessed?.confidence).toBeLessThan(REVIEW_THRESHOLD);
		expect(structural.warnings.join(" ")).toMatch(/not on the parser-safe list/);

		const html = renderToStaticMarkup(
			<ImportReviewView
				added={{}}
				onAddToLibrary={() => {}}
				overrides={{}}
				removed={{}}
				result={structural}
				source={SOURCE}
			/>,
		);
		expect(html).toContain("Heading needs checking");
		expect(html).toContain("Heading read");
		expect(html).toMatch(/not on the parser-safe list/);
	});
});

describe("what is rendered is what was extracted", () => {
	it("shows the source text for every section", () => {
		// The check on every value above: if the screen disagrees with the file, the file
		// wins. Without this the user is asked to check our work against our own summary.
		const html = render();
		expect(html).toContain("Source text for this section");
		expect(html).toContain("Rebuilt the settlement pipeline");
	});

	it("counts what needs checking, and does not produce a score", () => {
		const html = render();
		expect(html).toMatch(/need(s|) checking/);
		// The category's credibility failure, and a hard product constraint.
		expect(html).not.toMatch(/\b\d{1,3}\s?%/);
		expect(html).not.toMatch(/\b(out of 100|score)\b/i);
	});

	it("states that nothing is saved and nothing goes to a resume", () => {
		const html = render();
		expect(html).toContain("Nothing has been saved yet");
		expect(html).toContain(
			"They do not appear in any resume until you choose to add them there",
		);
	});
});

describe("an import writes to the content library and nowhere else", () => {
	// The required case. Three independent statements, because each can break alone:
	// the payload, the panel's only mutation, and the library's report of the flag.
	it("marks every imported item unreviewed", () => {
		const section = result.sections[0];
		expect(section).toBeDefined();
		if (!section) return;

		const payload = buildImportPayload({
			overrides: {},
			removed: {},
			section,
			sectionIndex: 0,
			source: SOURCE,
		});

		expect(payload.importMeta?.reviewed).toBe(false);
		expect(isUnreviewed(payload)).toBe(true);
	});

	it("records the provenance and the per-field confidences with it", () => {
		const section = result.sections[0];
		if (!section) return;
		const payload = buildImportPayload({
			overrides: {},
			removed: {},
			section,
			sectionIndex: 0,
			source: SOURCE,
		});

		expect(payload.importMeta?.source).toBe("pdf");
		expect(payload.importMeta?.sourceName).toBe("jane-doe.pdf");
		expect(payload.importMeta?.raw).toContain("Rebuilt the settlement pipeline");
		// A confidence note for every field the sectioner emitted, so the library can say
		// how much of an item was a guess without re-running the extractor.
		const notes = payload.importMeta?.fields ?? [];
		expect(notes.length).toBeGreaterThan(0);
		expect(notes.some((n) => n.confidence < REVIEW_THRESHOLD)).toBe(true);
		expect(notes.every((n) => typeof n.reason === "string" && n.reason.length > 0)).toBe(
			true,
		);
	});

	it("cannot be made to land already reviewed", () => {
		// `reviewed` is not a parameter of `toLibraryPayload`. If it ever becomes one, this
		// is the assertion that has to change -- and it is here so the change is a decision
		// rather than an accident.
		const section = result.sections[0];
		if (!section) return;
		const payload = buildImportPayload({
			overrides: {},
			removed: {},
			section,
			sectionIndex: 0,
			source: SOURCE,
		});
		expect(Object.keys(payload)).not.toContain("reviewed");
		expect(payload.importMeta?.reviewed).toBe(false);
	});

	it("stores the user's correction, not the extracted guess", () => {
		const section = result.sections[0];
		if (!section) return;
		const payload = buildImportPayload({
			overrides: { [fieldKeyOf(0, "entry.0.organization")]: "Acme Corporation Ltd" },
			removed: {},
			section,
			sectionIndex: 0,
			source: SOURCE,
		});
		expect(payload.data?.[0]?.organization).toBe("Acme Corporation Ltd");
	});

	it("drops a field the user emptied rather than storing a blank", () => {
		// A blank company in a resume reads as something the user wrote, which is worse
		// than a missing one.
		const section = result.sections[0];
		if (!section) return;
		const payload = buildImportPayload({
			overrides: {},
			removed: { [fieldKeyOf(0, "entry.0.organization")]: true },
			section,
			sectionIndex: 0,
			source: SOURCE,
		});
		expect(payload.data?.[0]).not.toHaveProperty("organization");
	});

	it("marks an edited field at the user's own confidence", () => {
		// Otherwise a correction shows up in the library forever as an unverified guess.
		const section = result.sections[0];
		if (!section) return;
		const payload = buildImportPayload({
			overrides: { [fieldKeyOf(0, "entry.0.organization")]: "Acme Corporation Ltd" },
			removed: {},
			section,
			sectionIndex: 0,
			source: SOURCE,
		});
		const note = payload.importMeta?.fields.find(
			(n) => n.path === "entries.0.organization",
		);
		expect(note?.confidence).toBe(1);
		expect(note?.reason).toMatch(/edited by you/i);
	});

	it("can be marked reviewed afterwards, and only then", () => {
		const section = result.sections[0];
		if (!section) return;
		const payload = buildImportPayload({
			overrides: {},
			removed: {},
			section,
			sectionIndex: 0,
			source: SOURCE,
		});
		expect(isUnreviewed(payload)).toBe(true);
		expect(isUnreviewed(withReviewed(payload, true))).toBe(false);
		// `withReviewed` copies. A mutation here would flip the in-memory item too.
		expect(isUnreviewed(payload)).toBe(true);
	});

	it("does not claim content the user wrote is an unreviewed import", () => {
		// A hand-written library item has no import state, so it is not "unreviewed" -- it
		// never needed to be.
		expect(isUnreviewed({ title: "A job", data: [] })).toBe(false);
		expect(readImportMeta({ title: "A job" })).toBeNull();
	});
});

describe("the review UI is reachable", () => {
	// The required case, and this repo has shipped two unreachable features: a
	// `TabsContent` with no `TabsTrigger`, and a landing section orphaned from nav and
	// footer. "It renders" is not "a user can get to it".
	//
	// Source-level, and weaker than a click-through -- there is no DOM in CI to click.
	// What it does pin is that the editor mounts the trigger, that the trigger is a real
	// button with an accessible name, and that the panel it opens is the one rendered
	// above.
	const editor = readFileSync(
		"src/features/resume-editor/resume-editor.tsx",
		"utf8",
	);
	const panel = readFileSync(
		"src/features/resume-editor/components/import-review-panel.tsx",
		"utf8",
	);

	it("is mounted by the resume editor", () => {
		expect(editor).toMatch(/<ImportTrigger\s*\/>/);
	});

	it("is imported exactly once", () => {
		expect(
			editor.match(/from "\.\/components\/import-review-panel"/g) ?? [],
		).toHaveLength(1);
	});

	it("sits next to the other top-level editor actions", () => {
		// Not in the left rail: the rail is where content lives once it is yours, and
		// burying the one feature that takes a document as input there hides it.
		const importAt = editor.indexOf("<ImportTrigger");
		const reviewAt = editor.indexOf("<ReviewTrigger");
		const exportAt = editor.indexOf("<ExportButtons");
		expect(importAt).toBeGreaterThan(-1);
		expect(reviewAt).toBeGreaterThan(importAt);
		expect(exportAt).toBeGreaterThan(importAt);
	});

	it("is opened by a labelled button, not by a hover", () => {
		expect(panel).toMatch(
			/aria-label="Import a resume from a PDF or Word document"/,
		);
		expect(panel).toMatch(/onClick=\{\(\) => setOpen\(true\)\}/);
	});

	it("opens a sheet that renders the review surface", () => {
		expect(panel).toMatch(/<Sheet[\s>]/);
		expect(panel).toMatch(/<ImportReviewView/);
	});

	it("does not mount a parser until the sheet is opened", () => {
		// Both extractors are dynamically imported and pdf.js is ~1.5 MB. Importing it at
		// module scope would put it in the editor's initial bundle for every user who
		// never imports anything.
		expect(panel).toMatch(/await extractDocumentText\(file\)/);
		expect(panel).not.toMatch(/^import .*pdfjs-dist/m);
		expect(panel).not.toMatch(/^import .*mammoth/m);
	});
});

describe("the panel cannot write to a resume", () => {
	// The only mutation the import path is allowed to call. `section.create`,
	// `section.upsert` and `content.attach` are all one line away and all of them would
	// put imported text in front of an employer.
	const panel = readFileSync(
		"src/features/resume-editor/components/import-review-panel.tsx",
		"utf8",
	);

	it("calls exactly one mutation, and it is the library", () => {
		const mutations = panel.match(/\.useMutation\(/g) ?? [];
		expect(mutations).toHaveLength(1);
		expect(panel).toMatch(/api\.content\.create\.useMutation/);
	});

	it("never attaches, creates or upserts a section", () => {
		expect(panel).not.toMatch(/content\.attach/);
		expect(panel).not.toMatch(/section\.(create|upsert|update)/);
		expect(panel).not.toMatch(/resume\.update/);
		expect(panel).not.toMatch(/bulkUpsertSections/);
	});
});

describe("the library shows the unreviewed flag", () => {
	const library = readFileSync(
		"src/features/resume-editor/components/content-library-panel.tsx",
		"utf8",
	);

	it("badges an unreviewed item and offers to mark it reviewed", () => {
		expect(library).toMatch(/data-library-unreviewed/);
		expect(library).toMatch(/Unreviewed/);
		expect(library).toMatch(/markReviewed\.mutate/);
	});

	it("names where the item came from", () => {
		expect(library).toMatch(/imported from \$\{item\.importSource/);
	});
});

/** The `<li>` in the rendered HTML carrying `marker`. Brace-aware about attributes. */
function rowContaining(html: string, marker: string): string {
	const at = html.indexOf(marker);
	if (at === -1) throw new Error(`no row with ${marker}`);
	const open = html.lastIndexOf("<li", at);
	const close = html.indexOf("</li>", at);
	if (open === -1 || close === -1) throw new Error(`unterminated row for ${marker}`);
	return html.slice(open, close);
}

/** The `class` attribute value of a chunk of rendered HTML. */
function classOf(html: string): string {
	return /class="([^"]*)"/.exec(html)?.[1] ?? "";
}

/** The key `ImportReviewView` uses for a field, rebuilt here so the test does not import it. */
function fieldKeyOf(sectionIndex: number, path: string): string {
	return `${sectionIndex}::${path}`;
}