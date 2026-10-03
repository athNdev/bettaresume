import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// `src/features/resume-editor/typst_templates` imports `.typ` files through webpack's
// `asset/source` loader, which Vite does not have, so resolving the component's real
// import graph makes Vite parse Typst as JavaScript and the whole file fails to
// collect. Stubbed out: nothing under test reads a template. The Typst compiler itself
// only imports the WASM snippet lazily inside `initCompiler`, so it is safe to load.
vi.mock("@/features/resume-editor/typst_templates", () => ({
	getTemplateSource: () => "",
	resumeToTypstJson: () => ({}),
	minimalSource: "",
	postgradSource: "",
	sectionsSource: "",
	undergradSource: "",
}));

/**
 * Export controls must not fail silently.
 *
 * `exportPDF` caught its errors and only called `console.error`. To a user that is
 * indistinguishable from a slow export: the button re-enables, no file appears, and
 * nothing says why. `exportText` was worse — a bare `return` when the resume had no
 * metadata, so the click did literally nothing.
 *
 * These tests read the component source and assert the user-visible paths exist. They
 * deliberately avoid rendering React: there is no DOM or browser in CI (the Typst WASM
 * is CDN-loaded), so a render test here would be theatre. Asserting on the source is
 * weaker than a behaviour test, so the assertions are pinned tightly and the reasoning
 * is recorded inline.
 *
 * The one place that *can* be a behaviour test is the Blob construction, which is pure
 * and needs no DOM — so `toDownloadBlob` is exported and exercised directly. It used to
 * be a source-text assertion, which had the effect of pinning the corruption in place:
 * the test asserted that `exportPDF` pre-wrapped the Typst view in `new Blob([...buffer])`,
 * which is exactly the bug.
 */

const source = (await import("node:fs")).readFileSync(
	new URL("../src/components/export/export-buttons.tsx", import.meta.url)
		.pathname,
	"utf8",
);

// Typst itself is dynamically imported inside the compiler, so importing this module in
// Node pulls in no WASM and touches no browser API.
const { toDownloadBlob } = await import("../src/components/export/export-buttons");
const { DOCX_MIME } = await import("../src/lib/export/docx");

const read = (p: string) =>
	readFileSync(new URL(`../${p}`, import.meta.url).pathname, "utf8");

describe("export failures are visible to the user", () => {
	it("imports the toast API that ToastProvider already mounts", () => {
		// `src/components/providers/toast-provider.tsx` renders a react-hot-toast
		// Toaster and is mounted in `src/app/provider.tsx`, so this is available
		// without adding a dependency.
		expect(source).toMatch(/import toast from "react-hot-toast"/);
	});

	it("surfaces a PDF export failure instead of only logging it", () => {
		const catchBlock = source.slice(
			source.indexOf("} catch (error) {"),
			source.indexOf("} finally {"),
		);
		// Both: the detail for debugging, and something the user can see.
		expect(catchBlock).toMatch(/console\.error/);
		expect(catchBlock).toMatch(/toast\.error\(/);
		// And it must name the failure, so the message is actionable rather than a
		// bare "something went wrong".
		expect(catchBlock).toMatch(/PDF export failed/);
	});

	it("reports that text export has nothing to export, rather than returning silently", () => {
		const guard = source.slice(
			source.indexOf("if (!metadata) {"),
			source.indexOf("const { personalInfo }"),
		);
		expect(guard).not.toMatch(/^\s*if \(!metadata\) return;/m);
		expect(guard).toMatch(/toast\.error\(/);
	});

	it("still produces a file on the success path", () => {
		// A regression guard on the fix itself: if the catch block swallowed the
		// success path, every test above would still pass.
		expect(source).toMatch(
			/downloadFile\(json, filename, "application\/json"\)/,
		);
	});

	it("hands the raw PDF bytes to downloadFile, never a pre-wrapped Blob", () => {
		// `new Blob([pdfBytes.buffer])` was the bug: `pdfBytes` is a *view* into the
		// Typst WASM heap, so `.buffer` is the entire heap. Asserting the old shape
		// here would have pinned the corruption in place.
		const handler = source.slice(
			source.indexOf("const exportPDF"),
			source.indexOf("const exportDocx"),
		);
		expect(handler).toMatch(/downloadFile\(pdfBytes, filename, "application\/pdf"\)/);
		expect(handler).not.toMatch(/pdfBytes\.buffer/);
		expect(handler).not.toMatch(/new Blob\(\[\s*pdfBytes/);
	});

	it("wraps a WASM-heap view as exactly the PDF bytes", async () => {
		// Real behaviour, not source text: this is the same call `exportPDF` makes.
		// Mirror `get_artifact`: a small view inside a large WASM memory buffer.
		const heap = new Uint8Array(16 * 1024 * 1024);
		const pdfStart = 12_582_912;
		const pdf = new TextEncoder().encode("%PDF-1.7\n% fabricated bytes\n%%EOF\n");
		heap.set(pdf, pdfStart);
		const view = heap.subarray(pdfStart, pdfStart + pdf.byteLength);

		// The trap this replaces: `.buffer` is 16 MiB even though the view is tiny.
		expect(view.byteLength).toBe(pdf.byteLength);
		expect(view.buffer.byteLength).toBe(16 * 1024 * 1024);
		expect(view.byteOffset).toBe(pdfStart);

		const blob = toDownloadBlob(view, "application/pdf");
		expect(blob.type).toBe("application/pdf");
		// Not the heap.
		expect(blob.size).toBe(pdf.byteLength);
		expect(blob.size).not.toBe(heap.byteLength);

		const bytes = new Uint8Array(await blob.arrayBuffer());
		expect(bytes.byteLength).toBe(pdf.byteLength);
		expect(new TextDecoder().decode(bytes)).toBe(
			new TextDecoder().decode(pdf),
		);
		// The bytes really are the PDF, read from its offset in the heap.
		expect(new TextDecoder().decode(bytes.slice(0, 8))).toBe("%PDF-1.7");
	});

	it("gives a string export an explicit MIME type", () => {
		// Word and browsers both fall back to octet-stream on a type-less Blob.
		expect(toDownloadBlob("{}", "application/json").type).toBe(
			"application/json",
		);
	});

	it("resets isExporting in a finally block so the button cannot get stuck", () => {
		const handler = source.slice(source.indexOf("const exportPDF"));
		expect(handler).toMatch(/\}\s*finally\s*\{\s*setIsExporting\(false\);/);
	});
});

describe("the toast surface is actually mounted", () => {
	it("ToastProvider renders a Toaster and is in the app tree", async () => {
		const { readFileSync } = await import("node:fs");
		const provider = readFileSync(
			new URL("../src/components/providers/toast-provider.tsx", import.meta.url)
				.pathname,
			"utf8",
		);
		const app = readFileSync(
			new URL("../src/app/provider.tsx", import.meta.url).pathname,
			"utf8",
		);
		// Without both, every toast.error above would be a silent no-op — which is
		// precisely the bug class this file exists to prevent.
		expect(provider).toMatch(/Toaster/);
		expect(app).toMatch(/<ToastProvider\s*\/?>/);
	});
});

describe("the DOCX export path is wired and honest", () => {
	it("appears in the export menu, labelled for what it is good at", () => {
		const src = read("src/components/export/export-buttons.tsx");
		expect(src).toMatch(/<DropdownMenuItem onClick=\{exportDocx\}>/);
		// Pagination differs between Word and Typst, so it must not be presented as
		// interchangeable with the PDF.
		expect(src).toMatch(/parse-optimised/);
	});

	it("surfaces a DOCX failure instead of only logging it", () => {
		// Same rule as the PDF path: a silent failure looks like a slow export.
		const src = read("src/components/export/export-buttons.tsx");
		const i = src.indexOf("const exportDocx");
		const block = src.slice(i, src.indexOf("const exportJSON"));
		expect(block).toMatch(/toast\.error\(/);
		expect(block).toMatch(/DOCX export failed/);
	});

	it("gives the Blob an explicit MIME type", () => {
		// `new Blob([uint8array])` with no options yields application/octet-stream,
		// which Word refuses to open, so every branch is typed.
		//
		// Asserted per branch rather than as a bare `content instanceof Uint8Array`
		// match: that string also occurs in the DOCX path, so the old assertion passed
		// on the strength of DOCX coverage while advertising that the PDF Blob had the
		// same treatment. It did not — the PDF path pre-wrapped its own Blob.
		expect(toDownloadBlob("{}", "application/json").type).toBe(
			"application/json",
		);
		expect(toDownloadBlob(new Uint8Array([1, 2, 3]), DOCX_MIME).type).toBe(
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		);
		expect(toDownloadBlob(new Uint8Array([1, 2, 3]), "application/pdf").type).toBe(
			"application/pdf",
		);
	});

	it("keeps the DOCX byte length, not the buffer length", () => {
		// `resumeToDocx` hands back bytes; the same view-vs-buffer trap applies, and
		// this file's DOCX path was the one that already got it right.
		const heap = new Uint8Array(1024 * 1024);
		const bytes = heap.subarray(500_000, 500_128);
		expect(toDownloadBlob(bytes, DOCX_MIME).size).toBe(128);
	});
});
