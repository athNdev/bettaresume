// Side effect: installs `Promise.try` and `Uint8Array.prototype.toHex`, which pdf.js
// calls in every version. Must be evaluated before pdf.js is imported, which the dynamic
// import below guarantees because it happens at call time, not module load.
import "@/lib/import/extractors/compat";
import type {
	TextItem,
	TextMarkedContent,
} from "pdfjs-dist/types/src/display/api";

/**
 * PDF text-layer extraction for tier-1 import.
 *
 * ## Scope, stated up front
 *
 * This module reads the text layer that is already in the PDF. It does not OCR, and it
 * cannot: OCR needs a model, a model is where invented text comes from, and the product
 * constraint is that import never invents. So a scanned PDF is not a degraded import, it
 * is a refusal with a specific message. See `NoTextLayerError`.
 *
 * The geometry half (`groupIntoLines`, `detectColumns`, `orderLines`, `joinLines`) is
 * pure and separately exported. It is split out because it is where every hard case
 * lives, and because a pure function is something a test can break on purpose -- a
 * 1.5 MB parser can only be exercised by fixture.
 *
 * ## Why reading order has to be solved rather than assumed
 *
 * `getTextContent()` returns items in the order the content stream emitted them, which
 * for a two-column resume is a function of how the author typed it, not of how a human
 * reads. Sorting purely by `y` interleaves the columns: the reader sees
 * "EXPERIENCE / SKILLS / Acme Corp / Python", and the sectioner then carves a `skills`
 * section into the middle of a job and files half a job under `SKILLS`. Every field in
 * that output is wrong and none of it is flagged, because the sectioner cannot tell
 * interleaved text from interleaved *intent* -- it was handed a document no human ever
 * saw.
 *
 * So the column geometry is detected here, and the two columns are emitted one after the
 * other. See `detectColumns` for how narrow that test is.
 *
 * ## Hyphenation
 *
 * PDF text is laid out per line, and a word broken across a line break arrives as
 * `inter-` + `national`. Left alone it becomes two words and every search, alias match
 * and skill taxonomy downstream misses it. `joinLines` rejoins it -- but only when the
 * continuation starts lowercase, because a capital after a hyphen is a real word
 * boundary ("Cross-Functional", "Junior-Engineer").
 *
 * ## Ligatures
 *
 * `ﬁ`/`ﬂ` are single glyphs. A font with no `ToUnicode` entry for them puts the raw
 * character into the text layer, and it then matches no heading and no skill alias.
 * They are expanded explicitly. This is transcription, not inference: the glyph really
 * is those letters.
 */

/**
 * The message a scanned PDF must produce.
 *
 * An empty import is a lie. The user concludes their file was empty or unreadable and
 * goes hunting for a bug. Naming the cause is the difference between "this feature is
 * broken" and "this file needs OCR, which we do not do".
 */
export const NO_TEXT_LAYER_MESSAGE =
	"No text found — this PDF looks like a scan. BettaResume reads the text a PDF already contains and does not run OCR, so a scanned or image-only PDF has nothing to read. Export a text-based PDF, or paste the text in, and the same review step will run on it.";

/** Thrown when a PDF parsed cleanly but carries no readable text. */
export class NoTextLayerError extends Error {
	readonly code = "NO_TEXT_LAYER" as const;
	constructor(message: string = NO_TEXT_LAYER_MESSAGE) {
		super(message);
		this.name = "NoTextLayerError";
	}
}

/** One positioned run of text from the PDF text layer. */
export interface TextRun {
	str: string;
	/** Left edge, PDF user-space units. */
	x: number;
	/** Baseline. PDF origin is bottom-left, so larger y is higher on the page. */
	y: number;
	width: number;
	hasEOL: boolean;
}

/** A run joined with the other runs sharing its baseline. */
export interface TextLine {
	text: string;
	/** Left edge: the smallest x among the line's runs. */
	x: number;
	/** Baseline. */
	y: number;
	/** Right edge: the largest x + width. Spotted a line that overruns its column. */
	right: number;
}

/**
 * Ligature glyphs that reach the text layer as one character.
 *
 * Only the Latin `f`-shaped forms, which are the ones that appear in body text. Note
 * what is absent: `ﬅ`/`ﬆ` are included, but no `st`-ligature is guessed from context,
 * because an expansion that is wrong is worse than one that was never applied.
 */
const LIGATURES: Record<string, string> = {
	ﬀ: "ff",
	ﬁ: "fi",
	ﬂ: "fl",
	ﬃ: "ffi",
	ﬄ: "ffl",
	ﬅ: "st",
	ﬆ: "st",
};

/**
 * Characters a text layer can carry that are not part of any word.
 *
 * A soft hyphen is an instruction to break a word, not a character of it. Left in, it
 * makes `inter­national` compare unequal to `international` everywhere downstream.
 *
 * A `Set` rather than a character class on purpose: these code points are the ones that
 * behave differently inside a Unicode-set class, and the intent here is a lookup, not a
 * pattern.
 */
const INVISIBLE = new Set([
	"\u00AD", // soft hyphen
	"\u200B", // zero width space
	"\u200C", // zero width non-joiner
	"\u200D", // zero width joiner
	"\uFEFF", // zero width no-break space / BOM
]);

function stripInvisible(text: string): string {
	let out = "";
	for (const ch of text) if (!INVISIBLE.has(ch)) out += ch;
	return out;
}

/**
 * Does this text contain anything a reader would call content?
 *
 * The scan test cannot be `text.length > 0`. A scanned PDF often yields a lone form
 * feed, a stray glyph from a stamp layer, or a page number, and any of those would read
 * as "there is a little text here" while the actual page is an image. It has to be
 * alphanumerics, because a scan has none.
 */
export function hasReadableText(text: string): boolean {
	return /[\p{L}\p{N}]/u.test(stripInvisible(text));
}

/** Expand ligatures and drop invisible characters. Never reorders or rewords. */
export function normaliseGlyphs(text: string): string {
	let out = "";
	for (const ch of text) out += LIGATURES[ch] ?? ch;
	return stripInvisible(out);
}

/** Runs that share one baseline, kept separate. */
export interface TextBand {
	y: number;
	runs: TextRun[];
}

/**
 * Cluster runs by baseline, without joining them.
 *
 * The runs are kept separate on purpose, and this is the single most important
 * structural decision in the file. pdf.js inserts a *synthetic spacer run* for the
 * horizontal gap between two text runs -- a real item whose `str` is a single space and
 * whose `x` sits in the gap. On a two-column page that spacer lands at, say, x=180 while
 * the right column starts at x=330.
 *
 * So if the runs on a baseline are joined first, the left column and the right column
 * become one line: "WORK EXPERIENCESKILLS". The gap that *proves* the page has two
 * columns is the very thing that destroys the evidence for it, and the join is
 * irreversible. Runs must therefore be classified into columns while their positions are
 * still separate, and only joined after.
 *
 * `tolerance` exists because a PDF has no notion of a line: the generator emits a
 * baseline per show-text operator and those float. Too tight and one visual line splits
 * into fragments the author never wrote as separate lines, which is what turns a heading
 * and its first bullet into two sections. Too loose and neighbouring lines fuse. The
 * default of 2pt sits well inside the leading of readable body text (10-14pt) and well
 * outside the jitter one line shows.
 *
 * `hasEOL` is deliberately ignored. It marks where the generator broke the line, which
 * on a two-column layout says nothing about reading order; honouring it would reintroduce
 * exactly the fragmenting the y-tolerance exists to prevent.
 */
export function groupIntoBands(runs: TextRun[], tolerance = 2): TextBand[] {
	const withText = runs.filter((r) => normaliseGlyphs(r.str).trim().length > 0);
	// Descending y so the first run of a band establishes its baseline.
	const sorted = [...withText].sort((a, b) => b.y - a.y || a.x - b.x);

	const bands: TextBand[] = [];
	for (const run of sorted) {
		const open = bands.find((b) => Math.abs(b.y - run.y) <= tolerance);
		if (open) open.runs.push(run);
		else bands.push({ y: run.y, runs: [run] });
	}
	return bands;
}

/** Join the runs of one band into a single positioned line. */
export function bandToLine(band: TextBand): TextLine {
	const parts = [...band.runs].sort((a, b) => a.x - b.x);
	const text = parts
		.map((p) => normaliseGlyphs(p.str).replace(/\s+/g, " "))
		.join("")
		.trim();
	return {
		text,
		x: Math.min(...parts.map((p) => p.x)),
		y: band.y,
		right: Math.max(...parts.map((p) => p.x + p.width)),
	};
}

/**
 * Join runs that share a baseline, within one column.
 *
 * Callers must pass runs from a single column. `groupIntoBands` plus `bandToLine` is the
 * two-step form, and it exists so column detection can happen in between.
 */
export function groupIntoLines(runs: TextRun[], tolerance = 2): TextLine[] {
	return groupIntoBands(runs, tolerance)
		.map(bandToLine)
		.filter((l) => l.text.length > 0);
}

export interface ColumnLayout {
	/** How many columns the page was read as. */
	count: 1 | 2;
	/** The x that separates them, when `count` is 2. */
	gutterX: number | null;
	/**
	 * The page has the shape of two columns but was read as one.
	 *
	 * Set when a clear gutter exists on both sides and either column is too sparse to
	 * commit to. It is reported rather than acted on because the two readings produce
	 * different documents and only the user can say which one their resume is -- and
	 * because a silent wrong reading is the failure this whole module is about.
	 */
	ambiguous: boolean;
}

/**
 * Is this page two columns?
 *
 * ## The test, and why it is this narrow
 *
 * A single column centred on the page, a wide title, an indented blockquote and a
 * right-aligned date column all put runs in the right half of a page that is not
 * two-column. Any test that only asks "is there text on both sides" fires on all four,
 * and the fix -- emitting the right-hand group after the left -- then reorders a
 * single-column document into nonsense.
 *
 * So all three of these must hold:
 *
 *  - baselines with a run starting well left of the page midpoint,
 *  - baselines with a run starting well right of it,
 *  - a band around the midpoint that *no run starts in*.
 *
 * The empty band is the discriminator. A centred title starts near the middle and fills
 * the gutter -- and correctly so: a page with a centred title and a right-aligned date
 * column is genuinely ambiguous, and refusing to call it two-column leaves it in natural
 * reading order instead of silently reordering it.
 *
 * Note it is baselines, not runs, that are counted. A right-aligned date sits on the
 * same baseline as the role it belongs to, so counting runs would call a single-column
 * job history two-column.
 *
 * Each side also needs `minLinesPerColumn` baselines. A "second column" of one line is a
 * page number or a footer.
 *
 * ## What this deliberately does not solve
 *
 * Three or more columns, and sidebars (a left rail of section headings with body text to
 * its right), are both real and neither is detected here. A sidebar reads as two columns
 * and is emitted as one flow, so its headings interleave with the body -- the exact
 * failure this function exists to prevent. It is recorded as unhandled rather than
 * papered over, because guessing a sidebar needs a width ratio this module has no honest
 * source for.
 */
export function detectColumns(
	bands: TextBand[],
	pageWidth: number,
	minLinesPerColumn = 3,
): ColumnLayout {
	const single: ColumnLayout = { count: 1, gutterX: null, ambiguous: false };
	if (bands.length < minLinesPerColumn) return single;
	if (!Number.isFinite(pageWidth) || pageWidth <= 0) return single;

	// This fraction of the page width has to be free of run starts.
	const band = pageWidth * 0.06;
	const mid = pageWidth / 2;

	let leftBaselines = 0;
	let rightBaselines = 0;
	let startsInBand = 0;
	let leftRightEdge = 0;

	for (const bandRuns of bands) {
		let sawLeft = false;
		let sawRight = false;
		for (const run of bandRuns.runs) {
			if (run.x < mid - band) {
				sawLeft = true;
				leftRightEdge = Math.max(leftRightEdge, run.x + run.width);
			} else if (run.x >= mid + band) sawRight = true;
			else startsInBand++;
		}
		if (sawLeft) leftBaselines++;
		if (sawRight) rightBaselines++;
	}

	if (startsInBand > 0) return single;
	if (leftBaselines < minLinesPerColumn || rightBaselines < minLinesPerColumn) {
		return single;
	}

	// ## The column has to look like a column
	//
	// A right-aligned date column is geometrically indistinguishable from a second
	// column: it starts past the midpoint, it leaves a wide gap, and it sits on the same
	// baselines as the text it annotates. Nothing in the text layer says which it is.
	//
	// The one signal left is that a *column* is filled. Text set in a column runs to the
	// column edge; text with a right-aligned field stops short of it and leaves the gap
	// inside the line. So the left side has to reach within two bands of the gutter
	// before this module will reorder the page.
	//
	// The cost is a real miss, stated rather than hidden: a two-column resume whose left
	// column is very short -- one job in a narrow left column, skills in the right -- is
	// read in y-order and interleaves. That case reports `ambiguous`, so the review screen
	// can tell the user the reading order is uncertain rather than presenting one as fact.
	// It is the right way round: reordering a correct document is a corruption this
	// module invented, and every PDF text reader on the market has the same interleaving
	// problem on the pages this rule declines.
	const fillsColumn = leftRightEdge >= mid - band * 2;
	if (!fillsColumn) return { count: 1, gutterX: null, ambiguous: true };

	return { count: 2, gutterX: mid, ambiguous: false };
}

/**
 * Put the page's lines into reading order.
 *
 * One column: top to bottom. Two columns: the whole left column top to bottom, then the
 * whole right column.
 *
 * A line that *starts* inside the gutter band would have failed detection, so a spanning
 * line can only be one that begins at or left of the left margin and overruns the gutter
 * -- a full-width rule, or a centred heading rendered from the left margin. Those are
 * placed above both columns when they sit higher than the top of the right one, so a
 * page-wide heading stays above the text it introduces, and after both when they do not.
 */
export function orderLines(
	lines: TextLine[],
	columns: ColumnLayout,
): TextLine[] {
	// Descending y: PDF's origin is bottom-left, so a page's first line has the largest y.
	const topDown = (a: TextLine, b: TextLine) => b.y - a.y || a.x - b.x;

	if (columns.count === 1) return [...lines].sort(topDown);

	const gutter = columns.gutterX ?? 0;
	const left = lines.filter((l) => l.x < gutter);
	const right = lines.filter((l) => l.x >= gutter);
	if (left.length === 0 || right.length === 0) return [...lines].sort(topDown);

	// The right column's left edge. A left-column line ends before this, so anything
	// starting left of the gutter and ending past it has overrun into the other column.
	const rightEdge = Math.min(...right.map((l) => l.x));
	const spanning = left.filter((l) => l.right > rightEdge);
	const leftOnly = left.filter((l) => l.right <= rightEdge);

	const topOfRight = Math.max(...right.map((l) => l.y));
	const head = spanning.filter((l) => l.y > topOfRight);
	const tail = spanning.filter((l) => l.y <= topOfRight);

	return [
		...head.sort(topDown),
		...leftOnly.sort(topDown),
		...right.sort(topDown),
		...tail.sort(topDown),
	];
}

/**
 * Read one page: runs in, document text out.
 *
 * This is the composition the extractor and the tests both go through, and the order of
 * its steps is the whole argument of this module:
 *
 *  1. cluster runs into baselines, keeping runs separate,
 *  2. decide the column layout from run positions,
 *  3. only then join the runs of each baseline, per column,
 *  4. order, then rejoin hyphenated line breaks.
 *
 * Steps 1 and 3 have to be separate because joining first loses the column evidence, and
 * step 2 has to sit between them. See `groupIntoBands`.
 */
export function readPageRuns(
	runs: TextRun[],
	pageWidth: number,
	tolerance = 2,
): { text: string; columns: ColumnLayout } {
	const columns = detectColumns(groupIntoBands(runs, tolerance), pageWidth);
	const topDown = (a: TextLine, b: TextLine) => b.y - a.y;
	const toLines = (subset: TextRun[]) =>
		groupIntoBands(subset, tolerance).map(bandToLine);

	if (columns.count === 1) {
		return { text: joinLines(toLines(runs).sort(topDown)), columns };
	}

	// Partition the RUNS, not the bands.
	//
	// A band is a horizontal slice of the page, and on a two-column page one band
	// contains one line from each column. Classifying bands therefore throws away every
	// band that has content in both columns -- which on a real resume is most of them --
	// and the sections that survive are the fragments. The columns are disjoint sets of
	// runs, and only after splitting them can each be banded on its own.
	const gutter = columns.gutterX ?? 0;
	const rightRuns = runs.filter((r) => r.x >= gutter);
	const leftRuns = runs.filter((r) => r.x < gutter);

	// The right column's left edge. A left-column run ends before it; a run that starts
	// left of the gutter and ends past it is full-width -- a page-wide rule, or a centred
	// heading rendered from the left margin. The 2pt slack absorbs a rounding difference
	// between two runs that merely abut.
	const rightEdge = Math.min(...rightRuns.map((r) => r.x));
	const isSpanning = (r: TextRun) => r.x + r.width > rightEdge + 2;

	const rightLines = toLines(rightRuns).sort(topDown);
	const leftLines = toLines(leftRuns.filter((r) => !isSpanning(r))).sort(
		topDown,
	);
	const spanning = toLines(leftRuns.filter(isSpanning)).sort(topDown);

	const topOfRight = rightLines[0]?.y ?? Number.NEGATIVE_INFINITY;
	const head = spanning.filter((l) => l.y > topOfRight);
	const tail = spanning.filter((l) => l.y <= topOfRight);

	return {
		text: joinLines([...head, ...leftLines, ...rightLines, ...tail]),
		columns,
	};
}

/**
 * Turn ordered lines into the text the sectioner reads.
 *
 * ## Hyphenation, narrowly
 *
 * `word-` + `continuation` rejoins only when the continuation starts with a lowercase
 * letter. A capital after the hyphen is a boundary the author typed: `Cross-Functional`,
 * `Junior-Engineer`, `Full-Stack`. Rejoining those produces a single word that appears in
 * no skill taxonomy and no search index, which is a silent corruption and far harder to
 * notice than the original hyphen.
 *
 * A hyphen at the end of the last line is left alone. There is no continuation to attach
 * it to, and dropping it would delete a character the author wrote.
 */
export function joinLines(lines: TextLine[]): string {
	const out: string[] = [];
	for (const line of lines) {
		const text = line.text.trim();
		if (!text) continue;
		const previous = out.at(-1);
		if (previous && previous.endsWith("-") && /^[a-z]/.test(text)) {
			out[out.length - 1] = `${previous.slice(0, -1)}${text}`;
			continue;
		}
		out.push(text);
	}
	return out.join("\n");
}

/** pdf.js text items -> the position-only shape the geometry works on. */
function toRuns(items: (TextItem | TextMarkedContent)[]): TextRun[] {
	const runs: TextRun[] = [];
	for (const item of items) {
		if (!("str" in item)) continue;
		const x = Number(item.transform[4] ?? 0);
		const y = Number(item.transform[5] ?? 0);
		runs.push({
			str: item.str,
			x: Number.isFinite(x) ? x : 0,
			y: Number.isFinite(y) ? y : 0,
			width: Number.isFinite(item.width) ? item.width : 0,
			hasEOL: item.hasEOL,
		});
	}
	return runs;
}

export interface PdfExtraction {
	/** The document as plain text, ready for `sectionResumeText`. */
	text: string;
	pageCount: number;
	/** How each page was read, so the review screen can report it honestly. */
	layout: ColumnLayout[];
	/**
	 * 1-based page numbers whose reading order is uncertain. See `ColumnLayout`.
	 *
	 * Reported, never acted on. The alternative is to pick one order and present it as
	 * fact, which for a resume means the user's job history and their skills can be
	 * silently transposed.
	 */
	ambiguousPages: number[];
}

/**
 * Read a PDF's text layer.
 *
 * Throws `NoTextLayerError` when the document parses but carries no readable text. That
 * is the scan case, and it is a refusal rather than an empty result on purpose: an empty
 * import tells the user their file was empty, which is a claim the extractor cannot make
 * and, for a scan, a false one.
 */
export async function extractPdfText(
	data: ArrayBuffer,
): Promise<PdfExtraction> {
	const pdfjs = await import("pdfjs-dist");

	// pdf.js runs on the main thread unless it is handed a worker. Publishing the worker
	// module's handler is the one setup that behaves identically in a browser and in Node,
	// and Node has no `Worker`. A resume is one to three pages, so main-thread parsing is
	// not a concern at this size, and it costs no extra worker file in a static export.
	const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs");
	(globalThis as { pdfjsWorker?: unknown }).pdfjsWorker = worker;

	const task = pdfjs.getDocument({ data: new Uint8Array(data) });
	const doc = await task.promise;

	try {
		const layout: ColumnLayout[] = [];
		const pages: string[] = [];
		const ambiguousPages: number[] = [];

		for (let n = 1; n <= doc.numPages; n++) {
			const pdfPage = await doc.getPage(n);
			const viewport = pdfPage.getViewport({ scale: 1 });
			const content = await pdfPage.getTextContent();
			const page = readPageRuns(toRuns(content.items), viewport.width);
			layout.push(page.columns);
			pages.push(page.text);
			if (page.columns.ambiguous) {
				ambiguousPages.push(n);
			}
		}

		const text = pages.join("\n\n");
		if (!hasReadableText(text)) throw new NoTextLayerError();

		return {
			text,
			pageCount: doc.numPages,
			layout,
			ambiguousPages,
		};
	} finally {
		await task.destroy();
	}
}
