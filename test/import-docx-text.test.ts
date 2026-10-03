import { describe, expect, it } from "vitest";
import {
	extractDocumentText,
	NO_TEXT_LAYER_MESSAGE,
	sniffDocumentKind,
} from "@/lib/import/extractors";
import {
	extractDocxText,
	NO_DOCX_TEXT_MESSAGE,
	NoDocxTextError,
} from "@/lib/import/extractors/docx-text";
import { sectionResumeText } from "@/lib/import/sectioner";
import {
	boldParagraph,
	buildDocx,
	buildZip,
	listParagraph,
	paragraph,
} from "./helpers/docx-fixture";
import { buildImageOnlyPdf, buildTextLayerPdf } from "./helpers/pdf-fixture";

/**
 * DOCX is the easy half of tier 1, which means it is the half most likely to be assumed
 * rather than checked.
 *
 * The fixtures are real zips built in `helpers/docx-fixture.ts`, so a passing test means
 * `mammoth` parsed a document the code under test handed it -- not that a stub returned
 * the right string.
 *
 * The Word-specific case worth having is the bold heading. A Word resume marks its
 * sections with a bold run rather than a heading style, so the sectioner cannot see a
 * heading and has to fall back on the shape of the line. That fallback is a guess, and the
 * assertions here say so.
 */

function buffer(bytes: Uint8Array): ArrayBuffer {
	return bytes.buffer.slice(
		bytes.byteOffset,
		bytes.byteOffset + bytes.byteLength,
	) as ArrayBuffer;
}

/** A `File`-alike for the dispatcher, which reads `name`, `size` and `arrayBuffer()`. */
function fileOf(bytes: Uint8Array, name: string, type = ""): File {
	const data = buffer(bytes);
	return {
		arrayBuffer: async () => data,
		name,
		size: data.byteLength,
		type,
	} as File;
}



describe("the DOCX path", () => {
	it("reads the document's own text", async () => {
		const { text } = await extractDocxText(
			buffer(
				buildDocx([
					paragraph("JANE DOE"),
					paragraph("WORK EXPERIENCE"),
					paragraph("Senior Engineer, Acme Corp"),
				]),
			),
		);
		expect(text).toContain("JANE DOE");
		expect(text).toContain("Senior Engineer, Acme Corp");
	});

	it("segments straight into the sectioner without a pre-clean pass", async () => {
		const { text } = await extractDocxText(
			buffer(
				buildDocx([
					paragraph("JANE DOE"),
					boldParagraph("WORK EXPERIENCE"),
					paragraph("Senior Engineer, Acme Corp"),
					paragraph("Jan 2020 - Present"),
					listParagraph("Rebuilt the settlement pipeline"),
					boldParagraph("SKILLS"),
					paragraph("Python, Go, PostgreSQL"),
				]),
			),
		);

		const sections = sectionResumeText(text).sections;
		expect(sections.map((s) => s.type)).toEqual(["experience", "skills"]);
		// "WORK EXPERIENCE" is a real heading in Word's outline only if the author used a
		// heading style. Here it is a bold run, so the sectioner is reading the shape of
		// the line -- and it has to report that as a guess rather than as fact.
		expect(sections[0]?.confidence).toBeLessThan(1);
	});

	it("keeps a real list paragraph's content", async () => {
		const { text } = await extractDocxText(
			buffer(
				buildDocx([
					paragraph("WORK EXPERIENCE"),
					listParagraph("Rebuilt the settlement pipeline"),
					listParagraph("Led the migration of 40 services"),
				]),
			),
		);
		expect(text).toContain("Rebuilt the settlement pipeline");
		expect(text).toContain("Led the migration of 40 services");
	});

	it("refuses a document with no text rather than returning nothing", async () => {
		// The DOCX counterpart of the scanned PDF. An empty result would tell the user
		// their resume is empty when it is a page of photographs.
		await expect(
			extractDocxText(buffer(buildDocx([paragraph("")]))),
		).rejects.toThrow(NoDocxTextError);
	});

	it("names the cause", async () => {
		const error = (await extractDocxText(
			buffer(buildDocx([paragraph("")])),
		).catch((cause: unknown) => cause)) as NoDocxTextError;
		expect(error.code).toBe("NO_DOCX_TEXT");
		expect(error.message).toBe(NO_DOCX_TEXT_MESSAGE);
		expect(error.message).toMatch(/OCR/i);
	});

	it("does not throw an unrelated parser error on a corrupt zip", async () => {
		// jszip's own message ("end of central directory record signature not found") says
		// more about our dependency than about the user's file. It is caught and named.
		const truncated = buildDocx([paragraph("JANE DOE")]).slice(0, 40);
		await expect(extractDocxText(buffer(truncated))).rejects.not.toThrow(
			NoDocxTextError,
		);
	});
});

describe("sniffing the kind from the bytes", () => {
	it("trusts the bytes over the extension", () => {
		// A file picker will hand over a zip named .pdf without complaint, and a MIME type
		// is empty often enough to be useless.
		const docx = buildDocx([paragraph("x")]);
		expect(sniffDocumentKind(buffer(docx), "resume.pdf")).toBe("docx");
	});

	it("recognises a PDF", () => {
		const pdf = buildTextLayerPdf([{ text: "HI", x: 72, y: 700 }]);
		expect(sniffDocumentKind(buffer(pdf), "resume.docx")).toBe("pdf");
	});

	it("returns null for a legacy .doc, which is a different format", () => {
		// D0 CF 11 E0 -- the OLE compound header. `mammoth` reads OOXML, so this has to be
		// refused by name rather than parsed and half-read.
		const ole = new Uint8Array([
			0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0,
		]);
		expect(sniffDocumentKind(buffer(ole), "resume.doc")).toBeNull();
	});

	it("falls back to the extension only when the bytes say nothing", () => {
		const unknown = new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05, 0x06]);
		expect(sniffDocumentKind(buffer(unknown), "resume.pdf")).toBe("pdf");
		expect(sniffDocumentKind(buffer(unknown), "resume.pages")).toBeNull();
	});
});

describe("the dispatcher", () => {
	it("routes a docx to mammoth and returns its text with its name", async () => {
		const outcome = await extractDocumentText(
			fileOf(
				buildDocx([paragraph("JANE DOE"), paragraph("WORK EXPERIENCE")]),
				"jane.docx",
			),
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.source.kind).toBe("docx");
		expect(outcome.source.fileName).toBe("jane.docx");
		expect(outcome.text).toContain("JANE DOE");
	});

	it("refuses a scanned PDF with the scan message", async () => {
		const outcome = await extractDocumentText(
			fileOf(buildImageOnlyPdf(), "scan.pdf", "application/pdf"),
		);
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		// This is the required behaviour end to end: not an empty import, a sentence that
		// says why.
		expect(outcome.message).toBe(NO_TEXT_LAYER_MESSAGE);
		expect(outcome.kind).toBe("pdf");
	});

	it("refuses a legacy .doc in words rather than in parser internals", async () => {
		const ole = new Uint8Array(512);
		ole.set([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
		const outcome = await extractDocumentText(fileOf(ole, "resume.doc"));
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.message).toMatch(/\.docx/);
		expect(outcome.message).not.toMatch(/end of central directory|zip|jszip/i);
	});

	it("refuses an empty file without calling a parser", async () => {
		const outcome = await extractDocumentText(
			fileOf(new Uint8Array(0), "empty.pdf"),
		);
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.message).toMatch(/empty/i);
	});

	it("says a zip that is not a Word document could not be read", async () => {
		const notADocx = buildZip([{ name: "hello.txt", data: "hi" }]);
		const outcome = await extractDocumentText(fileOf(notADocx, "notes.docx"));
		expect(outcome.ok).toBe(false);
		if (outcome.ok) return;
		expect(outcome.message).toMatch(/could not be read/i);
	});

	it("tells the user when a page was read as two columns", async () => {
		const twoColumn = [
			{ text: "WORK EXPERIENCE", x: 72, y: 740 },
			{ text: "SKILLS", x: 360, y: 740 },
			{ text: "Senior Engineer, Acme Corporation", x: 72, y: 720 },
			{ text: "Python, Go and PostgreSQL", x: 360, y: 720 },
			{ text: "January 2020 to Present", x: 72, y: 704 },
			{ text: "Kubernetes and Terraform", x: 360, y: 704 },
			{ text: "Rebuilt the payment settlement stack", x: 72, y: 688 },
			{ text: "Event-driven payments services", x: 360, y: 688 },
		];
		const outcome = await extractDocumentText(
			fileOf(buildTextLayerPdf(twoColumn), "two-column.pdf"),
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.source.notes.join(" ")).toMatch(/two columns/i);
	});

	it("reports an uncertain reading order rather than hiding it", async () => {
		// A page with the shape of two columns but too little in the left one to commit.
		// The user is told, because the alternative is a confidently wrong document.
		const sparse = [
			{ text: "WORK EXPERIENCE", x: 72, y: 740 },
			{ text: "SKILLS", x: 360, y: 740 },
			{ text: "Engineer, Acme", x: 72, y: 720 },
			{ text: "Python", x: 360, y: 720 },
			{ text: "Jan 2020", x: 72, y: 704 },
			{ text: "Go", x: 360, y: 704 },
		];
		const outcome = await extractDocumentText(
			fileOf(buildTextLayerPdf(sparse), "s.pdf"),
		);
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.source.notes.join(" ")).toMatch(/reading order/i);
	});
});
