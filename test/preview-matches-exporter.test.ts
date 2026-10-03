import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The preview must never show a layout the exporter cannot produce.
 *
 * `resumeSettingsSchema.layout` accepted `"single-column" | "two-column" | "sidebar"`,
 * the formatting toolbar offered all three, and `preview.tsx` faithfully drew
 * two-column and sidebar layouts. But **no Typst template ever read `layout`** -- it
 * was serialised into the Typst payload and ignored. So a user could select "Sidebar",
 * watch the preview reflow, and export a single-column PDF that looked nothing like what
 * they approved.
 *
 * That is worse than the option not existing, because it teaches the user to distrust
 * the one surface that is supposed to be WYSIWYG.
 *
 * Single-column is also the only defensible choice: multi-column layouts are the
 * largest single cause of ATS parse failure, and Typst's guaranteed single-column text
 * layer is this product's structural advantage over browser-rendered competitors.
 *
 * These tests assert on source because there is no DOM in CI (the Typst WASM is
 * CDN-loaded), so a render test would be theatre. The assertions are pinned tightly and
 * the reasoning is inline.
 */

const read = (p: string) => readFileSync(p, "utf8");

describe("the preview cannot diverge from the exporter", () => {
	const preview = read("src/features/resume-editor/components/preview.tsx");

	it("renders single-column unconditionally", () => {
		expect(preview).toMatch(/const layout = "single-column"/);
		// Not derived from settings at all -- otherwise the divergence returns.
		expect(preview).not.toMatch(/const layout = settings\.layout/);
	});

	it("does not branch on a layout the exporter ignores", () => {
		expect(preview).toMatch(/const isTwoColumn = false/);
		expect(preview).toMatch(/const isSidebar = false/);
	});

	it("explains why, so the constants are not 'simplified' back into a bug", () => {
		// A future reader seeing `isTwoColumn = false` will reasonably try to delete
		// it. The comment is the guard against that.
		expect(preview).toMatch(/no Typst template ever read `layout`/);
		expect(preview).toMatch(/preview itself/);
	});
});

describe("the toolbar only offers layouts that exist in the output", () => {
	const toolbar = read(
		"src/features/resume-editor/components/formatting-toolbar.tsx",
	);

	it("offers single-column only", () => {
		expect(toolbar).toMatch(/<SelectItem value="single-column">/);
		expect(toolbar).not.toMatch(/<SelectItem value="two-column">/);
		expect(toolbar).not.toMatch(/<SelectItem value="sidebar">/);
	});
});

describe("no Typst template claims to support a layout it does not render", () => {
	it("the Typst sources contain no layout branch", async () => {
		const { readdirSync } = await import("node:fs");
		// Note: CLAUDE.md points at src/lib/typst/typst_templates/, which does not
		// exist. The templates are under the feature directory.
		const dir = "src/features/resume-editor/typst_templates";
		const offenders = readdirSync(dir)
			.filter((f) => f.endsWith(".typ"))
			.filter((f) =>
				/two-column|sidebar|columns\s*\(/.test(read(`${dir}/${f}`)),
			)
			// `columns: (1fr, auto)` per-entry grids are legitimate: those align a
			// right-hand date, which is standard and parse-safe. Only a whole-page
			// column split would be a problem, and none of the templates do that.
			.filter((f) =>
				/layout\s*==|two-column|sidebar/.test(read(`${dir}/${f}`)),
			);

		expect(offenders).toEqual([]);
	});
});

describe("the schema stays backward compatible", () => {
	it("still accepts the legacy values so existing resumes keep loading", () => {
		const schemas = read("packages/types/src/schemas.ts");
		// Removing these from the enum would break every stored resume that carries
		// one, on read. They are ignored instead.
		expect(schemas).toMatch(
			/layout: z\.enum\(\["single-column", "two-column", "sidebar"\]\)/,
		);
	});
});
