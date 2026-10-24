/**
 * Font resolution — the single source of truth for which families the PDF
 * pipeline can actually embed, and what it substitutes when it cannot.
 *
 * ## Why this file exists
 *
 * Font resolution used to live in three places that disagreed:
 *
 * | site | what it did |
 * |---|---|
 * | `src/lib/typst/compiler.ts` (`TYPST_FONT_NAMES`) | mapped 7 families to `New Computer Modern` |
 * | `src/features/resume-editor/hooks/use-typst-preview.ts` (`FONT_MAP`) | mapped only the 6 embeddable ones, passed everything else through raw |
 * | `src/features/resume-editor/components/preview.tsx` (`resolveFontFamily`) | emitted CSS stacks that used the **locally installed** font |
 *
 * The consequence: for 7 of the 13 offered families the HTML preview rendered the
 * user's real system font while the Typst preview and the exported PDF silently
 * rendered `New Computer Modern`. The preview was not a preview of the export.
 *
 * ## Why substitution is a correctness problem, not a cosmetic one
 *
 * Substituting a font changes glyph advance widths, which changes where lines
 * wrap, which changes **how many pages the resume is**. A one-page resume becomes
 * two, with no error and no warning.
 *
 * The worst part of the old table was that it substituted by *name* rather than
 * by *kind*: `Arial`, `Helvetica` and `Calibri` are all sans-serif, and all three
 * were replaced by a **serif**. That is the largest single reflow risk in the
 * table. The rule here is that a substitution must preserve the generic family.
 */

/** The generic family a typeface belongs to. Substitutions must preserve this. */
export type FontKind = "sans" | "serif" | "mono";

interface FontSpec {
	kind: FontKind;
	/**
	 * True when the actual font file is fetched and handed to the Typst compiler.
	 * False for families that are either proprietary (Georgia, Times New Roman,
	 * Arial, Calibri, Helvetica) or absent from the load list.
	 */
	embeddable: boolean;
}

/**
 * The 13 families offered by `typographySettingsSchema.fontFamily`.
 *
 * `Computer Modern` is not embeddable but is also not substituted: Typst's
 * built-in `New Computer Modern` *is* Computer Modern, so the request is honoured.
 */
const FONT_SPECS: Record<string, FontSpec> = {
	Inter: { kind: "sans", embeddable: true },
	Roboto: { kind: "sans", embeddable: true },
	"Open Sans": { kind: "sans", embeddable: true },
	Lato: { kind: "sans", embeddable: true },
	Montserrat: { kind: "sans", embeddable: true },
	"Playfair Display": { kind: "serif", embeddable: true },
	Georgia: { kind: "serif", embeddable: false },
	"Times New Roman": { kind: "serif", embeddable: false },
	Garamond: { kind: "serif", embeddable: false },
	Arial: { kind: "sans", embeddable: false },
	Helvetica: { kind: "sans", embeddable: false },
	Calibri: { kind: "sans", embeddable: false },
	// Typst's built-in New Computer Modern is a Computer Modern, so this one is honoured.
	"Computer Modern": { kind: "serif", embeddable: false },
};

/**
 * What each non-embeddable family becomes. Chosen to preserve the generic family.
 *
 * The sans entries are the substantive fix: they previously resolved to a serif.
 * `Inter` is used because it is already loaded, is the app's own UI font, and is a
 * neutral UI sans — so the document keeps the *shape* the user asked for.
 *
 * The serif entries stay on Typst's built-in `New Computer Modern`. Playfair
 * Display is available but is a high-contrast display face; swapping a screen
 * serif (Georgia) or a text serif (Times) for it would reflow *more*, not less.
 *
 * `Computer Modern` is absent on purpose: it is honoured, not substituted.
 */
const SUBSTITUTES: Record<string, string> = {
	Georgia: "New Computer Modern",
	"Times New Roman": "New Computer Modern",
	Garamond: "New Computer Modern",
	Arial: "Inter",
	Helvetica: "Inter",
	Calibri: "Inter",
};

/** Typst's built-in family. Always available; no download required. */
export const TYPST_BUILTIN_FONT = "New Computer Modern";

export interface FontResolution {
	/** The family name to hand Typst. */
	typstFamily: string;
	/** The family the user actually chose. */
	requested: string;
	/** True when `typstFamily` differs from `requested`. */
	substituted: boolean;
	/** The generic family of the request. `typstFamily` always matches it. */
	kind: FontKind;
}

/**
 * Resolve a requested family to the one Typst will actually render.
 *
 * Unknown families are passed through untouched: a typo should render in the
 * requested font (and fail loudly in Typst) rather than be silently rewritten.
 */
export function resolveTypstFont(requested: string): FontResolution {
	const spec = FONT_SPECS[requested];
	if (!spec) {
		return {
			typstFamily: requested,
			requested,
			substituted: false,
			kind: "sans",
		};
	}

	if (requested === "Computer Modern") {
		return {
			typstFamily: TYPST_BUILTIN_FONT,
			requested,
			substituted: false,
			kind: spec.kind,
		};
	}

	if (spec.embeddable) {
		return {
			typstFamily: requested,
			requested,
			substituted: false,
			kind: spec.kind,
		};
	}

	const replacement = SUBSTITUTES[requested];
	return {
		typstFamily: replacement ?? TYPST_BUILTIN_FONT,
		requested,
		substituted: true,
		kind: spec.kind,
	};
}

/**
 * True when the family has a real font file behind it.
 *
 * Drives whether `loadFontFamily` should fetch anything at all.
 */
export function isEmbeddableFont(family: string): boolean {
	return FONT_SPECS[family]?.embeddable ?? false;
}

/**
 * The vendored font files, keyed by family.
 *
 * Paths are site-relative: the files live in `public/fonts/`, are copied into the export
 * by Next, and are fetched from this origin. Nothing here touches a CDN at runtime.
 *
 * ## Why they are vendored
 *
 * This used to be nine pinned `fonts.gstatic.com` URLs. Three of the nine returned 404
 * — including both Inter files. Inter is the default family, so every default export had
 * been silently substituting a different face, which is the exact defect "font
 * substitution silently changing the rendered page" was meant to close. A URL into
 * somebody else's versioned CDN is a promise that rots quietly; a file in this
 * repository cannot.
 *
 * These are whole families from google/fonts (OFL / Apache-2.0), not the CSS API's
 * per-subset slivers, because a resume can carry an accented name and a missing glyph is
 * a worse failure than a larger download. Most are variable fonts — the bundled Typst is
 * 0.14.2, whose docs state that a variable font is preferred over a static one when both
 * support a configuration — so the `wght` axis supplies bold. Lato has no variable build
 * and gets its static Regular and Bold.
 *
 * `scripts/vendor-fonts.mjs` refreshes them; it is deliberately not part of the build.
 */
export const FONT_FILES: Partial<Record<string, string[]>> = {
	Inter: ["/fonts/inter.ttf"],
	Roboto: ["/fonts/roboto.ttf"],
	"Open Sans": ["/fonts/open-sans.ttf"],
	Lato: ["/fonts/lato.ttf", "/fonts/lato-bold.ttf"],
	Montserrat: ["/fonts/montserrat.ttf"],
	"Playfair Display": ["/fonts/playfair-display.ttf"],
};

/**
 * A human-readable warning for a substituted family.
 *
 * Substituting a font can change the page count, so this must reach the user
 * rather than only the console. Returning `null` for honoured families lets
 * callers skip the warning entirely.
 */
export function fontSubstitutionWarning(
	resolution: FontResolution,
): string | null {
	if (!resolution.substituted) return null;
	return (
		`"${resolution.requested}" is not embeddable in the PDF pipeline, so it ` +
		`was rendered in ${resolution.typstFamily}. Different font metrics can ` +
		`change line breaks and the resulting page count — check the exported PDF.`
	);
}
