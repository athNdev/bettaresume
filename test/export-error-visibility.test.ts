import { describe, expect, it, vi } from "vitest";

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
 */

const source = (await import("node:fs")).readFileSync(
	new URL("../src/components/export/export-buttons.tsx", import.meta.url)
		.pathname,
	"utf8",
);

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
			/downloadFile\(blob, filename, "application\/pdf"\)/,
		);
		expect(source).toMatch(
			/downloadFile\(json, filename, "application\/json"\)/,
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
