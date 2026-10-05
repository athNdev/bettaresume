/**
 * Headers must not force horizontal scrolling at phone widths.
 *
 * FOUND IN A BROWSER, not in review. At 390x844 both headers laid out wider than the viewport
 * and the whole page scrolled sideways:
 *
 *   - dashboard: 575px of content in 390px; the avatar hung 49px off the right edge
 *   - editor:    558px of content in 390px; Export sat 168px off the edge
 *
 * In both cases the cause was the same and it was not "too many buttons". It was
 * `flex h-16` / `flex h-14` — a *fixed* height. Nothing in the row could shrink and nothing
 * could wrap, because a fixed height leaves wrapping nowhere to go. The items did not
 * overflow because they were too wide; they overflowed because they were forbidden from
 * responding.
 *
 * WHAT THESE TESTS DO AND DO NOT PROVE
 *   They assert the *mechanism* — that the fixed heights are gone, that wrapping is permitted,
 *   and that a control which loses its label keeps an accessible name. That is worth pinning
 *   because it is the part a future edit would silently undo by typing `h-16` back.
 *
 *   It is **not** proof the layout fits. Only a real viewport at 390px shows that. The fix was
 *   verified in Chromium at 390x844; see the PR description for the measured widths. A test
 *   that asserts class names cannot tell you a row is 390px wide, and this file does not
 *   pretend otherwise.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

const dashboard = codeOf("src/features/dashboard/dashboard.tsx");
const editor = codeOf("src/features/resume-editor/resume-editor.tsx");

/**
 * Every `<header>` block in a file.
 *
 * The dashboard has two: the loading skeleton and the real page. Both were `h-16`, and both
 * overflowed. An earlier version of this file took the first match, which silently tested the
 * skeleton while the real header went unexamined -- so this returns all of them and the
 * invariant is applied to each.
 */
function headerRows(code: string): string[] {
	const rows = code.match(/<header[\s\S]*?<\/header>/g) ?? [];
	expect(rows.length, "no <header> found").toBeGreaterThan(0);
	return rows;
}

/** The header block containing the real (non-skeleton) content. */
function headerRow(code: string): string {
	const row =
		headerRows(code).find((h) => !h.includes("Skeleton")) ??
		headerRows(code)[0];
	return row as string;
}

/**
 * Whether a class list pins a fixed height.
 *
 * Token-aware, because `min-h-16` *contains* the substring `h-16` at a word boundary -- so a
 * naive `/\bh-16\b/` test fails on the very fix it was written to require. `min-` is a
 * different utility, and a different behaviour.
 */
function hasFixedHeight(className: string, height: string): boolean {
	return new RegExp(`(?<![\\w-])${height}(?![\\w-])`).test(className);
}

/** True if any class list inside `code` pins `height`. */
function pinsFixedHeight(code: string, height: string): boolean {
	const lists = code.match(/className="([^"]*)"/g) ?? [];
	return lists.some((l) => hasFixedHeight(l, height));
}

describe("the dashboard header", () => {
	it("has room to wrap instead of a height that forbids it", () => {
		const row = headerRow(dashboard);

		// The bug: `h-16`. Fixed height + no wrap = overflow.
		expect(pinsFixedHeight(row, "h-16")).toBe(false);
		expect(row).toMatch(/min-h-16/);
		expect(row).toContain("flex-wrap");
	});

	it("collapses action labels on narrow screens", () => {
		const row = headerRow(dashboard);

		expect(row).toMatch(/<span className="hidden sm:inline">Import<\/span>/);
		expect(row).toMatch(
			/<span className="hidden sm:inline">New Resume<\/span>/,
		);
	});

	it("keeps an accessible name on buttons that lose their visible label", () => {
		const row = headerRow(dashboard);

		// Icon-only is unreadable to a screen reader without this, and the label is the only
		// thing identifying the control once the text is hidden.
		expect(row).toMatch(/aria-label="Import resume"/);
		expect(row).toMatch(/aria-label="New resume"/);
		// And a pointer tooltip, since the visible label is gone below `sm`.
		expect(row).toMatch(/title="Import resume"/);
		expect(row).toMatch(/title="New resume"/);
	});
});

describe("the editor header", () => {
	it("has room to wrap instead of a height that forbids it", () => {
		const row = headerRow(editor);

		// The bug: `h-14`.
		expect(pinsFixedHeight(row, "h-14")).toBe(false);
		expect(row).toMatch(/min-h-14/);
		expect(row).toContain("flex-wrap");
	});

	it("lets its action group wrap too", () => {
		// Wrapping the outer row is not enough if the action group is itself rigid: it would
		// just push the whole group onto the next line, still 350px wide on a 390px screen.
		const row = headerRow(editor);

		expect(row).toMatch(/flex flex-wrap items-center justify-end gap-2/);
	});

	it("lets the identity block shrink so it yields space first", () => {
		// `truncate` only works inside a shrinkable box; without min-w-0 the h1 refuses to
		// give up width and the overflow comes back from the other side.
		expect(headerRow(editor)).toMatch(/flex min-w-0 items-center gap-4/);
	});

	it("keeps the back control labelled", () => {
		expect(headerRow(editor)).toMatch(/aria-label="Back to dashboard"/);
	});
});

describe("no header in either file pins a fixed height", () => {
	it("covers every header, including the loading skeleton", () => {
		// Asserting on "the first header" once tested only the skeleton and let the real
		// dashboard header keep its `h-16`. Every block is checked now.
		const blocks = [
			...headerRows(dashboard).map((h) => ["dashboard", h] as const),
			...headerRows(editor).map((h) => ["editor", h] as const),
		];

		expect(blocks.length).toBeGreaterThanOrEqual(3);

		for (const [name, block] of blocks) {
			for (const height of ["h-14", "h-16"]) {
				expect(
					pinsFixedHeight(block, height),
					`${name} header still pins ${height}`,
				).toBe(false);
			}
			expect(block, `${name} header cannot wrap`).toContain("flex-wrap");
		}
	});
});

describe("webfonts are self-hosted exactly once", () => {
	// Comments stripped first. The explanation for *why* this file must not contain a Google
	// Fonts URL necessarily names one, so an unstripped read fails on its own documentation.
	// That is the third time in this repo a comment has satisfied or broken an identifier
	// assertion; `codeOf` exists for the TS side, and CSS needs the same treatment here.
	const globals = readFileSync(
		new URL("../src/styles/globals.css", import.meta.url),
		"utf8",
	).replace(/\/\*[\s\S]*?\*\//g, "");
	const fontsModule = codeOf("src/lib/fonts.ts");
	const layout = codeOf("src/app/layout.tsx");

	it("does not @import Google Fonts", () => {
		// Found in a browser, not in review: two `404 ( )` failures for
		// fonts.gstatic.com/s/inter/v13/*.ttf on every page, in both themes.
		expect(globals).not.toContain("fonts.googleapis.com");
		expect(globals).not.toMatch(/@import\s+url\(/);
	});

	it("still self-hosts every family the app asks for", () => {
		// next/font/google in the module, not a runtime <link> or @import. These are the
		// families the old @import duplicated.
		expect(fontsModule).toContain("next/font/google");
		// The imported identifiers, not the display names: next/font exports `Open_Sans`.
		// These are every family the app self-hosts; the old @import asked Google for a
		// subset of this list, which is why it was pure duplication.
		for (const family of [
			"Inter",
			"Roboto",
			"Open_Sans",
			"Lato",
			"Montserrat",
			"Playfair_Display",
			"PT_Serif",
		]) {
			expect(fontsModule, `${family} is no longer self-hosted`).toContain(
				family,
			);
		}
	});

	it("applies the self-hosted families to the document", () => {
		// Without this the removal above would silently drop the app's typeface, since a
		// font that is downloaded but never applied is the same as one that is missing.
		expect(layout).toContain("fontVariables");
		expect(layout).toMatch(/<body className=\{`\$\{fontVariables\}/);
	});

	it("keeps the export pipeline's own font fetch separate", () => {
		// src/lib/typst/fonts.ts fetches woff2 files from fonts.gstatic.com at export time,
		// to embed the real typeface in a PDF. That is a deliberate, different thing from a
		// stylesheet @import, and this assertion exists so removing the @import does not
		// become a reason to break PDF export later.
		const typstFonts = codeOf("src/lib/typst/fonts.ts");

		expect(typstFonts).toContain("fonts.gstatic.com");
	});
});

describe("the resume card grid declares its own track", () => {
	/**
	 * FOUND BY MEASUREMENT, not by reading.
	 *
	 * After the header fix the dashboard still overflowed at 390px: `scrollWidth 513` against
	 * `innerWidth 390`, and the widest overflowing node was the `ResumeCard` itself — not the
	 * header, which the earlier fix had already cured.
	 *
	 * The cause is the grid, not the card's contents. `grid gap-6 sm:grid-cols-2 …` emits **no
	 * `grid-template-columns` at all** below `sm`, so there is a single *implicit* column and
	 * implicit columns are `auto`-sized — that is, max-content. The card contains a document
	 * preview with an explicit pixel width (`preview.tsx` sets `width: pageWidth * scale`, and
	 * Letter is 816px), so that intrinsic width widened the track, which widened the
	 * container, which raised `scale` via the thumbnail's ResizeObserver. It settled at 513px.
	 *
	 * So these assert the mechanism. They do **not** prove the layout fits — only a viewport
	 * does that, and the before/after numbers above came from one.
	 */
	const card = codeOf("src/features/dashboard/components/resume-card.tsx");

	it("gives the single-column base an explicit track", () => {
		const grid = dashboard.match(/<div className="grid[^"]*gap-6[^"]*"/g) ?? [];

		expect(grid.length).toBeGreaterThan(0);
		for (const g of grid) {
			// Without `grid-cols-1` there is no `grid-template-columns` below `sm` and the
			// implicit column is max-content sized.
			expect(g, `grid has no explicit base track: ${g}`).toContain(
				"grid-cols-1",
			);
		}
	});

	it("keeps every card grid on the same track definition", () => {
		// Two grids exist (the main list and one inside a dialog). If only one is corrected the
		// overflow just moves.
		const grids = dashboard.match(/grid grid-cols-1 gap-6[^"]*/g) ?? [];

		expect(grids.length).toBe(2);
		for (const g of grids) {
			expect(g).toBe(grids[0]);
		}
	});

	it("lets a card shrink below its own max-content", () => {
		// A grid item defaults to `min-width: auto`, which floors it at the widest child. The
		// widest child is a pixel-width document preview, so without this the `minmax(0, …)`
		// track cannot actually shrink.
		expect(card).toMatch(/className=\{`group relative min-w-0/);
	});

	it("still uses a shrinkable track, not a bare 1fr", () => {
		// Tailwind's `grid-cols-1` is `repeat(1, minmax(0, 1fr))`; the `minmax(0, …)` is what
		// allows shrinking below content. Asserting the utility name rather than the emitted CSS
		// is the tractable half of this; the measured numbers are the other half.
		expect(dashboard).not.toMatch(/grid gap-6 sm:grid-cols-2/);
	});
});
