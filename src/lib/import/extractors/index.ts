import {
	type DocxExtraction,
	extractDocxText,
	NO_DOCX_TEXT_MESSAGE,
	NoDocxTextError,
} from "@/lib/import/extractors/docx-text";
import {
	extractPdfText,
	NO_TEXT_LAYER_MESSAGE,
	NoTextLayerError,
	type PdfExtraction,
} from "@/lib/import/extractors/pdf-text";

/**
 * Turn a file the user picked into text the sectioner can read.
 *
 * ## Sniffing is done on the bytes, not the filename or the MIME type
 *
 * `File.type` is empty for plenty of real files -- browsers decline to guess for types
 * they do not recognise -- and a file picker happily hands over a `.pdf` that is a zip.
 * So the kind is read from the magic number, with the extension used only to break ties
 * the bytes leave ambiguous. A wrong-but-confident "PDF" that then fails to parse is a
 * worse failure than a plain refusal, because the user is told to export a text-based PDF
 * when the problem is that they picked a Word file with a PDF extension.
 *
 * ## Unsupported is a named outcome, not an exception
 *
 * Legacy `.doc` is the OLE compound format, not the zip OOXML that `mammoth` reads. It
 * is refused in words. Throwing a parser error out of this function would put "zip end
 * header not found" in front of a user, which describes our bug rather than their file.
 *
 * ## Everything here is browser-side
 *
 * This is a static export: there is no server to stream the file to, and sending a
 * resume to a third party to parse it would be a privacy failure for a product whose
 * whole pitch is self-hosting. Both parsers are imported dynamically, so neither library
 * is in the initial bundle and neither is fetched unless the user actually picks that
 * kind of file.
 */

export type DocumentKind = "pdf" | "docx";

export interface ImportSourceInfo {
	/** What the bytes say this file is. */
	kind: DocumentKind;
	/** The name the user picked. Shown in the review screen, never trusted. */
	fileName: string;
	/** Extra file facts worth telling the user, e.g. that a page was two-column. */
	notes: string[];
}

export interface ImportOk {
	ok: true;
	source: ImportSourceInfo;
	text: string;
}

export interface ImportRefused {
	ok: false;
	/** The name we fell back to, or null when the bytes are not a file we read. */
	kind: DocumentKind | null;
	fileName: string;
	/** Prose fit to show the user as-is. */
	message: string;
}

export type ImportOutcome = ImportOk | ImportRefused;

/** File extensions we accept, mapped to the kind the bytes must then confirm. */
const EXTENSION_KINDS: Record<string, DocumentKind> = {
	pdf: "pdf",
	docx: "docx",
};

/**
 * Read the leading bytes and decide what this file is.
 *
 * Returns `null` for "not something we read", which the caller turns into a named
 * refusal. Never throws.
 */
export function sniffDocumentKind(
	data: ArrayBuffer,
	fileName: string,
): DocumentKind | null {
	const head = new Uint8Array(data, 0, Math.min(8, data.byteLength));
	if (head.length >= 5) {
		// `%PDF-`
		if (
			head[0] === 0x25 &&
			head[1] === 0x50 &&
			head[2] === 0x44 &&
			head[3] === 0x46 &&
			head[4] === 0x2d
		) {
			return "pdf";
		}
		// `PK\x03\x04` -- a zip, which is what OOXML (.docx) is.
		if (
			head[0] === 0x50 &&
			head[1] === 0x4b &&
			head[2] === 0x03 &&
			head[3] === 0x04
		) {
			return "docx";
		}
		// `D0 CF 11 E0 A1 B1 1A E1` -- the OLE compound header, i.e. legacy `.doc`.
		// Reported separately below so the message can name the real problem.
		if (
			head[0] === 0xd0 &&
			head[1] === 0xcf &&
			head[2] === 0x11 &&
			head[3] === 0xe0
		) {
			return null;
		}
	}

	// Bytes undecided. Fall back to the extension, but only where it agrees with
	// something we support; otherwise this is a file we do not read.
	const ext = fileName.toLowerCase().split(".").pop() ?? "";
	return EXTENSION_KINDS[ext] ?? null;
}

const REFUSALS = {
	empty:
		"That file is empty, so there is nothing to read. Choose a PDF or Word document containing your resume.",
	unsupported:
		"That file type is not supported. BettaResume reads PDF and Word documents (.pdf and .docx).",
	legacyDoc:
		"That is a legacy Word .doc file, which is a different format from .docx and is not supported. Open it in Word and save it as .docx, or export it as a PDF.",
	unknown: (reason: string) => `That file could not be read: ${reason}`,
} as const;

/**
 * Extract text from a file the user picked.
 *
 * Returns a refusal rather than throwing for every expected failure, because all of these
 * are outcomes the review screen has to render as words. An unexpected exception is still
 * caught and named, so a parser bug shows as a sentence instead of an unhandled rejection.
 */
export async function extractDocumentText(file: File): Promise<ImportOutcome> {
	const name = file.name || "this file";

	if (file.size === 0) {
		return { ok: false, kind: null, fileName: name, message: REFUSALS.empty };
	}

	const data = await file.arrayBuffer();
	const kind = sniffDocumentKind(data, name);

	if (!kind) {
		const head = new Uint8Array(data, 0, Math.min(8, data.byteLength));
		const isLegacyDoc =
			head[0] === 0xd0 &&
			head[1] === 0xcf &&
			head[2] === 0x11 &&
			head[3] === 0xe0;
		return {
			ok: false,
			kind: null,
			fileName: name,
			message: isLegacyDoc ? REFUSALS.legacyDoc : REFUSALS.unsupported,
		};
	}

	const notes: string[] = [];

	try {
		if (kind === "pdf") {
			const result: PdfExtraction = await extractPdfText(data);
			for (const [index, layout] of result.layout.entries()) {
				if (layout.count === 2) {
					notes.push(
						`Page ${index + 1} was laid out in two columns. It was read as one column then the next, which is usually right, but check that nothing crossed between them.`,
					);
				}
			}
			// Reported, never acted on. See `ColumnLayout.ambiguous`: the two readings of
			// this page are different documents and only the user can say which one is
			// theirs.
			for (const page of result.ambiguousPages) {
				notes.push(
					`Page ${page} looks like two columns but is too sparse to tell, so it was read straight down. Its reading order is uncertain -- check the source text against what is shown below.`,
				);
			}
			return {
				ok: true,
				source: { kind, fileName: name, notes },
				text: result.text,
			};
		}

		const result: DocxExtraction = await extractDocxText(data);
		notes.push(...result.messages);
		return {
			ok: true,
			source: { kind, fileName: name, notes },
			text: result.text,
		};
	} catch (cause) {
		if (cause instanceof NoTextLayerError) {
			return { ok: false, kind, fileName: name, message: cause.message };
		}
		if (cause instanceof NoDocxTextError) {
			return { ok: false, kind, fileName: name, message: cause.message };
		}
		return {
			ok: false,
			kind,
			fileName: name,
			message: REFUSALS.unknown(
				cause instanceof Error ? cause.message : String(cause),
			),
		};
	}
}

export { NO_DOCX_TEXT_MESSAGE, NO_TEXT_LAYER_MESSAGE };
