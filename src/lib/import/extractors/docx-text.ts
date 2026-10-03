/**
 * DOCX text extraction for tier-1 import.
 *
 * DOCX is the easy half of tier 1 and that is worth saying plainly: a `.docx` is a zip of
 * XML, the text is stored as text rather than drawn as glyphs, and the document has an
 * explicit paragraph structure. There is no reading order to infer, no ligature to
 * expand and no scan to refuse. `mammoth` flattens it and the sectioner does the rest.
 *
 * ## Raw text, not HTML
 *
 * `extractRawText` is used rather than `convertToHtml` on purpose. HTML would bring
 * presentational markup -- bold runs, list paragraphs, indentation -- that the sectioner
 * would then have to strip before it could see a line. Raw text gives the sectioner one
 * line per paragraph, which is the shape its heading detection and entry splitting are
 * written against.
 *
 * ## What is lost, stated rather than hidden
 *
 * A DOCX resume frequently uses indentation, not headings, to mark a section: the word
 * "EXPERIENCE" is a bold run at the left margin with nothing marking it as a heading. The
 * sectioner sees `EXPERIENCE` as an ALL-CAPS line, which is exactly the shape its
 * structural fallback accepts, so the section is usually found -- but at 0.35 confidence
 * and with a warning. That is the correct outcome: the heading was inferred, and the
 * review screen is required to say so.
 */

/** The message a DOCX with no readable text must produce. */
export const NO_DOCX_TEXT_MESSAGE =
	"No text found in this Word document. It may be empty, or it may be made entirely of images — BettaResume reads the text a document stores, and does not run OCR.";

/** Thrown when a Word document parsed but carries no readable text. */
export class NoDocxTextError extends Error {
	readonly code = "NO_DOCX_TEXT" as const;
	constructor(message: string = NO_DOCX_TEXT_MESSAGE) {
		super(message);
		this.name = "NoDocxTextError";
	}
}

export interface DocxExtraction {
	/** The document as plain text, ready for `sectionResumeText`. */
	text: string;
	/** Non-fatal conversion notes, surfaced in the review screen. */
	messages: string[];
}

/**
 * Read a `.docx`'s stored text.
 *
 * `messages` are mammoth's own conversion notes. They are returned rather than discarded
 * because mammoth reports genuine content problems in them -- an image-only page, an
 * embedded object it could not read -- and swallowing those is how an import silently
 * loses a page the user can see.
 */
export async function extractDocxText(
	data: ArrayBuffer,
): Promise<DocxExtraction> {
	const mammoth = await import("mammoth");

	// Both inputs, because the two builds of mammoth read different ones.
	//
	// `package.json` swaps `lib/unzip.js` for `browser/unzip.js` via the `browser` field,
	// and only the browser copy accepts `{ arrayBuffer }`. The Node copy accepts
	// `{ path }`, `{ buffer }` or `{ file }` and rejects `{ arrayBuffer }` with "Could not
	// find file in options". A bundler picks the browser build and the test suite -- which
	// runs on Node -- picks the other one, so the same extractor has to satisfy both or
	// the DOCX path only works in the environment that is easier to test in.
	const NodeBuffer = (
		globalThis as { Buffer?: { from(input: ArrayBuffer): unknown } }
	).Buffer;

	const { value, messages } = await mammoth.extractRawText({
		arrayBuffer: data,
		...(NodeBuffer ? { buffer: NodeBuffer.from(data) } : {}),
	});

	const text = value.replace(/\r\n/g, "\n");
	if (text.trim().length === 0) throw new NoDocxTextError();

	return {
		text,
		messages: messages.map((m) => m.message),
	};
}
