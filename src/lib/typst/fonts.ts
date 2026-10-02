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
 * Drives whether `loadFontFamily` should attempt a download at all.
 */
export function isEmbeddableFont(family: string): boolean {
	return FONT_SPECS[family]?.embeddable ?? false;
}

/**
 * The declared font files, keyed by family.
 *
 * These are content-hashed `fonts.gstatic.com` paths. They are pinned here rather
 * than resolved at runtime because the Typst compiler needs bytes, not CSS, and
 * the Google Fonts CSS API only serves TTF to legacy user agents — a fragile
 * thing to depend on. A stale URL degrades to a substitution rather than a
 * failure, because `loadFontFamily` catches and retries.
 */
export const GOOGLE_FONT_URLS: Partial<Record<string, string[]>> = {
	Inter: [
		"https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-2.ttf",
		"https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-2.ttf",
	],
	Roboto: [
		"https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
		"https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2",
	],
	"Open Sans": [
		"https://fonts.gstatic.com/s/opensans/v34/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSCmu1aB.woff2",
	],
	Lato: [
		"https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2",
		"https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0N7w.woff2",
	],
	Montserrat: [
		"https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.woff2",
	],
	"Playfair Display": [
		"https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.woff2",
	],
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
