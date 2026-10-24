import { describe, expect, it } from "vitest";

import { codeOf } from "./helpers/code-source";
import { sourceFiles } from "./helpers/token-scan";

/**
 * No raw colour in code (research §5 rule: "no raw hex in `src/**` outside the
 * token file").
 *
 * Colour lives in `src/styles/globals.css` and nowhere else. A hex in a
 * component is a colour decision that no contrast test can see, no theme can
 * swap and no reviewer can price — the audit's status palette (3 greens, 4
 * ambers, 2 blues across 7 files) was exactly this failure, and the marketing
 * page's `text-[var(--brand-ink)]/60` alpha ramp was its subtler sibling.
 *
 * Two named exceptions, each counted and capped, because their medium is sRGB
 * literals rather than CSS:
 *
 *   - `src/app/og.png/route.tsx` paints an OG image pixel by pixel.
 *   - `src/app/layout.tsx` holds `<meta name="theme-color">`, which cannot read
 *     a CSS variable.
 *
 * The token file itself is `src/styles/globals.css` — it *defines* the colours,
 * so its oklch values are the subject of the contrast tests, not offenders.
 */

/**
 * Files allowed to carry colour literals, each capped. Two kinds:
 *
 *   - Legitimate (their medium is sRGB literals, or the values are *data* of a
 *     different design surface): the OG painter, `theme-color`, and the resume
 *     document's palettes — colour-picker swatches and template colours are
 *     user-facing document data (Surface B, owned by the document wave), not
 *     chrome.
 *   - Recorded debt pending its wave: the marketing shell's `#fff`.
 *
 * The caps make every entry a ratchet: none of these files may grow a new
 * literal, and removing one is the only way to make the test quieter.
 */
const EXCEPTIONS: Array<[string, string, number]> = [
	[
		"src/app/og.png/route.tsx",
		"paints an OG image; sRGB literals are the medium",
		9,
	],
	["src/app/layout.tsx", "meta theme-color cannot read a CSS variable", 2],
	[
		"src/components/rich-text-editor/rich-text-editor.tsx",
		"colour-picker swatches: document text colours are Surface B data",
		28,
	],
	[
		"src/features/resume-editor/components/formatting-toolbar.tsx",
		"document colour presets: Surface B data",
		43,
	],
	[
		"src/features/resume-editor/types.ts",
		"document template palettes: Surface B data",
		21,
	],
	[
		"src/components/marketing/sample-resume.ts",
		"document specimen colours: Surface B data",
		7,
	],
	[
		"src/features/resume-editor/components/preview.tsx",
		"document preview palette: Surface B data",
		9,
	],
	[
		"src/features/resume-editor/components/typst-preview.tsx",
		"document preview palette: Surface B data",
		6,
	],
	[
		"src/lib/typst/serialize.ts",
		"document palette defaults in the serializer: Surface B data",
		7,
	],
	[
		"src/components/marketing/site-chrome.tsx",
		"marketing shell — recorded debt, migrating with the marketing wave",
		1,
	],
];

/** Hex, rgb()/rgba(), hsl()/hsla() and oklch() colour literals. */
const LITERAL =
	/#[0-9a-fA-F]{3,8}\b|(?<![\w.-])(?:rgb|rgba|hsl|hsla)\(|oklch\(\s*[0-9.]/g;

describe("colour lives in the token file", () => {
	it("has no raw colour literals outside the named exceptions", () => {
		const limits = new Map(EXCEPTIONS.map(([file, , max]) => [file, max]));
		const offenders: string[] = [];
		for (const file of sourceFiles(["src"])) {
			const hits = [...codeOf(file).matchAll(LITERAL)].map((m) => m[0]);
			const allowed = limits.get(file) ?? 0;
			if (hits.length > allowed) {
				offenders.push(`${file} → ${hits.join(", ")}`);
			}
		}
		expect(
			offenders,
			"raw colour in code — read it from the token file:\n" +
				offenders.join("\n"),
		).toEqual([]);
	});

	it("keeps each exception at or under its cap", () => {
		for (const [file, reason, max] of EXCEPTIONS) {
			const hits = [...codeOf(file).matchAll(LITERAL)].length;
			expect(
				hits,
				`${file} (${reason}) grew to ${hits} literals — cap is ${max}`,
			).toBeLessThanOrEqual(max);
		}
	});

	it("documents every exception here", () => {
		// The exception list is the audit trail: if the set of files with raw
		// colour grows, this list must grow with it, in the same commit, with a
		// reason and a cap. The test above fails otherwise.
		expect(EXCEPTIONS.map(([file]) => file).sort()).toEqual(
			[
				"src/app/layout.tsx",
				"src/app/og.png/route.tsx",
				"src/components/marketing/sample-resume.ts",
				"src/components/marketing/site-chrome.tsx",
				"src/components/rich-text-editor/rich-text-editor.tsx",
				"src/features/resume-editor/components/formatting-toolbar.tsx",
				"src/features/resume-editor/components/preview.tsx",
				"src/features/resume-editor/components/typst-preview.tsx",
				"src/features/resume-editor/types.ts",
				"src/lib/typst/serialize.ts",
			].sort(),
		);
	});
});
