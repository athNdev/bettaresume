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
import { readdirSync, readFileSync } from "node:fs";
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

		expect(row).toMatch(
			/<span className="hidden sm:inline" data-collapse-label="">[\s\S]*?Import[\s\S]*?<\/span>/,
		);
		expect(row).toMatch(
			/<span className="hidden sm:inline" data-collapse-label="">[\s\S]*?New Resume[\s\S]*?<\/span>/,
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

	it("keeps the export pipeline's own font source separate, and local", () => {
		// src/lib/typst/fonts.ts supplies the bytes the Typst compiler embeds in a PDF.
		// That is a deliberately different thing from a stylesheet @import, and this
		// assertion exists so removing the @import does not become a reason to break PDF
		// export later.
		//
		// It used to assert `fonts.gstatic.com` was present, because the export fetched
		// from that CDN at runtime. Three of the nine pinned URLs had rotted to 404 —
		// including both Inter files — so the default export had been substituting a face.
		// The files are vendored under public/fonts/ now, and the assertion is inverted:
		// the point was always "PDF export has real font bytes", not "PDF export has a CDN".
		const typstFonts = codeOf("src/lib/typst/fonts.ts");

		expect(typstFonts).toContain("FONT_FILES");
		expect(typstFonts).toMatch(/"\/fonts\//);
		expect(typstFonts).not.toContain("fonts.gstatic.com");
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

/* ─────────────────────────────────────────────────────────────────────────────
 * Wave 4A — the small-screen mechanisms.
 *
 * These are gates on *mechanisms*, in the same spirit as the header tests above: the
 * measured proof lives in `test/responsive-matrix.test.ts`, which drives a real browser
 * over seven viewports. What follows pins the things a future edit would quietly undo —
 * a `h-screen` typed back in, a `hidden md:flex` wrapped around a feature, the body
 * overflow mask restored because something was overflowing.
 *
 * Every absence check reads code with `codeOf()`, because a comment explaining a trap
 * necessarily names it, and a test that a comment can satisfy is not a test.
 * ──────────────────────────────────────────────────────────────────────────── */

const globalsCss = readFileSync(
	new URL("../src/styles/globals.css", import.meta.url),
	"utf8",
).replace(/\/\*[\s\S]*?\*\//g, "");

const reviewPanel = codeOf(
	"src/features/resume-editor/components/review-panel.tsx",
);
const historyPanel = codeOf(
	"src/features/resume-editor/components/history-panel.tsx",
);
const typstPreview = codeOf(
	"src/features/resume-editor/components/typst-preview.tsx",
);
const popover = codeOf("src/components/ui/popover.tsx");

/** Every TS/TSX file in `src/`, so a rule cannot be evaded by adding a file. */
function srcFiles(): string[] {
	const out: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			const path = `${dir}/${entry.name}`;
			if (entry.isDirectory()) walk(path);
			else if (/\.tsx?$/.test(entry.name)) out.push(path);
		}
	};
	walk("src");
	return out;
}

describe("the overflow mask is gone, not ignored", () => {
	it("does not hide horizontal overflow on the body", () => {
		// `overflow-x: hidden` + `max-width: 100vw` was the reason two header overflows
		// looked fine in review. If a layout overflows now, it must be visible and caught
		// by the matrix, not clipped into silence.
		const bodyRule = globalsCss.match(/\nbody\s*\{[^}]*\}/)?.[0] ?? "";
		expect(bodyRule).not.toBe("");
		expect(bodyRule).not.toMatch(/overflow-x\s*:\s*hidden/);
		expect(bodyRule).not.toMatch(/max-width\s*:\s*100vw/);
		expect(bodyRule).toContain("100dvh");
	});
});

describe("no fixed viewport height in src/", () => {
	it("has no `h-screen` or `min-h-screen` anywhere", () => {
		// 100vh includes mobile browser chrome, so the bottom of a full-height app sits
		// under it. `dvh` is the unit that describes the space actually available.
		const offenders = srcFiles().filter((file) =>
			/(?<![\w-])(?:min-)?h-screen(?![\w-])/.test(codeOf(file)),
		);
		expect(offenders, `still using 100vh: ${offenders.join(", ")}`).toEqual([]);
	});

	it("the editor root sizes itself to the dynamic viewport", () => {
		expect(editor).toMatch(/h-dvh/);
		expect(editor).not.toMatch(/flex h-screen flex-col/);
	});
});

describe("no feature is hidden behind a breakpoint", () => {
	/**
	 * `hidden` plus a display utility at `sm`/`md`/`lg` removes content below that width.
	 * That is right for a *duplicate* — a label that an `aria-label` replaces, a nav that
	 * the footer also carries — and wrong for a feature, which is why every legitimate
	 * use carries a marker: `data-collapse-label` (the control keeps its accessible
	 * name) or `data-responsive-duplicate` (the same thing is reachable elsewhere).
	 */
	const BREAKPOINT_DISPLAY =
		/^(sm|md|lg):(?:flex|block|inline|inline-flex|grid|table)$/;

	function hiddenAtBreakpoint(file: string): string[] {
		const code = codeOf(file);
		const found: string[] = [];
		for (const tag of code.match(/<[A-Za-z][\s\S]*?>/g) ?? []) {
			const classMatch = tag.match(
				/className=(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/,
			);
			const classes = (
				classMatch?.[1] ??
				classMatch?.[2] ??
				classMatch?.[3] ??
				""
			)
				.split(/\s+/)
				.filter(Boolean);
			if (!classes.includes("hidden")) continue;
			if (!classes.some((token) => BREAKPOINT_DISPLAY.test(token))) continue;
			if (
				tag.includes("data-collapse-label") ||
				tag.includes("data-responsive-duplicate")
			) {
				continue;
			}
			found.push(`${file}: ${tag.replace(/\s+/g, " ").slice(0, 100)}`);
		}
		return found;
	}

	it("every breakpoint-hidden element is a labelled collapse or a duplicate", () => {
		const offenders = srcFiles().flatMap(hiddenAtBreakpoint);
		expect(
			offenders,
			`hidden feature(s) — move it, do not remove it:\n${offenders.join("\n")}`,
		).toEqual([]);
	});

	it("keeps the variations control mounted at every width", () => {
		// The defect: `hidden md:flex` around `VariationManager` made variants — a
		// load-bearing feature per CLAUDE.md — completely unreachable on a phone.
		expect(editor).toMatch(/<VariationManager/);
		expect(
			codeOf("src/features/resume-editor/components/variation-manager.tsx"),
		).toMatch(/data-collapse-label/);
	});

	it("keeps save status on screen below lg", () => {
		// `hidden lg:block` meant "have I lost work?" had no answer on a tablet.
		expect(editor).toMatch(/<SaveState[\s\S]{0,200}?compact/);
	});
});

describe("the editor has a small-screen model", () => {
	it("switches between three modes below lg", () => {
		expect(editor).toMatch(/SMALL_SCREEN_MODES/);
		expect(editor).toMatch(/aria-label="Editor view"/);
		// Sections, form, preview — one per three-zone pane.
		for (const label of ['"sections"', '"form"', '"preview"']) {
			expect(editor).toContain(label);
		}
	});

	it("gates mounting rather than hiding the panes", () => {
		// A hidden pane reports width 0 to the preview's ResizeObserver, so fit-to-pane
		// would freeze at the wrong scale. The layout is chosen before render.
		expect(editor).toMatch(/isWideEditor \? \(/);
		expect(editor).toMatch(/useMediaQuery\("\(min-width: 1024px\)"\)/);
	});

	it("gives each pane a pixel floor, not a percentage one", () => {
		// `minSize="12%"` was 92px at 768px: a rail of clipped words.
		expect(editor).toMatch(/minSize=\{200\}/);
		expect(editor).toMatch(/minSize=\{280\}/);
		expect(editor).toMatch(/minSize=\{300\}/);
	});

	it("has a short-height variant for landscape phones", () => {
		expect(globalsCss).toMatch(/@media \(max-height:\s*520px\)/);
		expect(editor).toMatch(/small-screen-editor/);
		expect(editor).toMatch(/small-screen-nav-label/);
	});
});

describe("form rows collapse instead of clipping", () => {
	const formDir = "src/components/sections-forms";
	const forms = readdirSync(formDir)
		.filter((name) => name.endsWith(".tsx"))
		.map((name) => `${formDir}/${name}`);

	it("leaves no unfixed two- or three-column grid", () => {
		const offenders = forms.filter((file) =>
			/(?<![\w-])grid-cols-[23](?![\w-])/.test(codeOf(file)),
		);
		expect(
			offenders,
			`uncollapsed form grids: ${offenders.join(", ")}`,
		).toEqual([]);
	});

	it("uses the one shared definition", () => {
		// One shared definition, not eleven edits: if the breakpoint moves, it moves once.
		expect(globalsCss).toMatch(/\.fields-grid\s*\{/);
		expect(globalsCss).toMatch(/\.fields-grid-3\s*\{/);
		// A container query, because the form column is sized by the user's drag.
		expect(globalsCss).toMatch(/@container \(width >= 30rem\)/);
		// `col-span-2` must mean "the whole row" in both layouts, or it creates a
		// phantom second column when the grid is stacked.
		expect(globalsCss).toMatch(
			/\.fields-grid > \.col-span-2\s*\{[^}]*grid-column: 1 \/ -1/,
		);
		const uses = forms.filter((file) => /fields-grid/.test(codeOf(file)));
		expect(uses.length).toBeGreaterThanOrEqual(forms.length - 1);
	});
});

describe("the review sheet survives a 360px viewport", () => {
	it("gives its six tabs a wrapping strategy", () => {
		// Six `whitespace-nowrap` triggers in a 390px sheet with no wrap or scroll is the
		// highest-severity dense-toolbar trap in the research.
		expect(reviewPanel).toMatch(/<TabsList[^>]*flex-wrap/);
	});

	it("stacks the history diff under the version list by container width", () => {
		// Container queries, not media queries: the sheet is 360px on a phone and 576px
		// on a tablet, and the column is the *panel's* problem.
		expect(historyPanel).toMatch(/@container/);
		expect(historyPanel).toMatch(/@md:flex-row/);
		expect(historyPanel).toMatch(/max-h-48/);
	});

	it("caps every popover to the viewport", () => {
		expect(popover).toMatch(/max-w-\[calc\(100vw-2rem\)\]/);
	});
});

describe("touch and the document preview", () => {
	it("floors primary targets at 44px and dense ones at 40px", () => {
		const coarse =
			globalsCss.match(/@media \(pointer: coarse\)[\s\S]*?\n\}/)?.[0] ?? "";
		expect(coarse).toMatch(/min-block-size:\s*44px/);
		expect(coarse).toMatch(/min-block-size:\s*40px/);
	});

	it("makes hover-only row actions visible on a coarse pointer", () => {
		expect(globalsCss).toMatch(/\.hover-reveal/);
		expect(
			codeOf("src/features/resume-editor/components/sections-manager.tsx"),
		).toMatch(/hover-reveal/);
	});

	it("leaves pinch-zoom to the browser", () => {
		expect(typstPreview).toContain("pinch-zoom");
		expect(typstPreview).not.toContain("user-scalable=no");
		expect(typstPreview).toMatch(/data-typst-page/);
	});

	it("keeps the document page paper-white", () => {
		// The preview is the artefact. A themed page would misrepresent the export.
		expect(typstPreview).toMatch(/backgroundColor: "#ffffff"/);
	});
});
