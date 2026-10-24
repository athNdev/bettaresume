import { MARGIN_DEFAULTS } from "@bettaresume/types";
import type {
	PartialResumeSettings,
	ResumeSettings,
} from "@/features/resume-editor/types";

/**
 * Density presets — the three named compositions of the spacing knobs.
 *
 * The knobs already existed (`sectionSpacing`, `lineHeight`, `margins`) but they are
 * three separate controls, and users do not know which combination is "tight". A preset
 * is a *named composition*, the density equivalent of named pass/fail instead of a
 * score: one click, one settings patch, one revision snapshot.
 *
 * **`normal` is exactly today's defaults.** That is a hard requirement, not a
 * coincidence: switching a resume to Normal must not move a single line. The regression
 * test in `test/page-fit.test.ts` pins it against `MARGIN_DEFAULTS`, the default
 * `lineHeight` in the serialiser, and the default `sectionSpacing`.
 *
 * Presets touch layout only — `typography`, `fontScale`, `fontFamily`, `dateFormat`,
 * `colors` and `accentStyle` are the user's own controls and are never part of a patch.
 * "Custom" is a *derived* display state (the settings match no preset), never a stored
 * value, so this needs no schema change.
 */
export type DensityPreset = "compact" | "normal" | "relaxed";

/** The settings a density preset owns, and nothing else. */
export interface DensityPatch {
	sectionSpacing: ResumeSettings["sectionSpacing"];
	lineHeight: number;
	margins: ResumeSettings["margins"];
}

/**
 * Compact sits on the margin floor (36pt = 0.5in) rather than below it.
 *
 * The research sketches Compact at 32px (24pt). That value predates the point-unit
 * migration: 24pt is *under* the 0.5in floor the product clamps to, so it could never
 * render. The floor is the honest Compact, and `margins-printable` stays green because
 * of it.
 */
export const DENSITY_PRESETS: Record<DensityPreset, DensityPatch> = {
	compact: {
		sectionSpacing: "compact",
		lineHeight: 1.25,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
	},
	normal: {
		sectionSpacing: "normal",
		lineHeight: 1.35,
		margins: { ...MARGIN_DEFAULTS },
	},
	relaxed: {
		sectionSpacing: "spacious",
		lineHeight: 1.65,
		margins: { top: 54, right: 60, bottom: 54, left: 60 },
	},
};

export const DENSITY_PRESETS_ORDER: DensityPreset[] = [
	"compact",
	"normal",
	"relaxed",
];

export const DENSITY_LABELS: Record<DensityPreset, string> = {
	compact: "Compact",
	normal: "Normal",
	relaxed: "Relaxed",
};

export const DENSITY_DESCRIPTIONS: Record<DensityPreset, string> = {
	compact:
		"Tighter gaps, leading and margins — the largest single page-height win.",
	normal: "The shipped default: balanced gaps at the researched spacing scale.",
	relaxed:
		"More air between sections and lines. Reads calmer, costs page height.",
};

const same = (a: number, b: number, epsilon = 0.001) =>
	Math.abs(a - b) < epsilon;

const sameMargins = (
	left: DensityPatch["margins"],
	right: DensityPatch["margins"],
) =>
	same(left.top, right.top) &&
	same(left.right, right.right) &&
	same(left.bottom, right.bottom) &&
	same(left.left, right.left);

/**
 * Which preset the settings currently match, or `"custom"`.
 *
 * Derived, never stored — the same reason a rubric is derived from the document. A
 * stored preset would drift the moment somebody moved one slider.
 */
export function densityOf(settings: {
	sectionSpacing?: string;
	lineHeight?: number;
	margins?: Partial<DensityPatch["margins"]>;
}): DensityPreset | "custom" {
	const margins = { ...MARGIN_DEFAULTS, ...settings.margins };
	const lineHeight = settings.lineHeight ?? DENSITY_PRESETS.normal.lineHeight;
	const sectionSpacing =
		settings.sectionSpacing ?? DENSITY_PRESETS.normal.sectionSpacing;

	for (const preset of DENSITY_PRESETS_ORDER) {
		const spec = DENSITY_PRESETS[preset];
		if (
			sectionSpacing === spec.sectionSpacing &&
			same(lineHeight, spec.lineHeight) &&
			sameMargins(margins, spec.margins)
		) {
			return preset;
		}
	}
	return "custom";
}

/** The settings patch a preset applies. One patch = one revision = one restore. */
export function densityPatch(preset: DensityPreset): PartialResumeSettings {
	const spec = DENSITY_PRESETS[preset];
	return {
		sectionSpacing: spec.sectionSpacing,
		lineHeight: spec.lineHeight,
		margins: { ...spec.margins },
	};
}

/** The next tighter preset, or `null` when already at Compact. */
export function tighterDensity(
	current: DensityPreset | "custom",
): DensityPreset | null {
	if (current === "compact") return null;
	if (current === "relaxed") return "normal";
	return "compact";
}

const mm = (pt: number) => (pt * 25.4) / 72;
const marginSummary = (m: DensityPatch["margins"]) =>
	`${mm(m.top).toFixed(1)} / ${mm(m.left).toFixed(1)} mm`;

/**
 * The one-line diff shown before a density patch is applied.
 *
 * "Nothing happens without a click", and a click needs to know what it is buying. This
 * is the confirm body: `Density: Normal → Compact · Line spacing 1.35 → 1.25 · Margins
 * 9.5 / 17.6 mm → 12.7 / 12.7 mm`.
 */
export function describeDensityPatch(
	from: {
		sectionSpacing?: string;
		lineHeight?: number;
		margins?: Partial<DensityPatch["margins"]>;
	},
	to: DensityPreset,
): string {
	const target = DENSITY_PRESETS[to];
	const currentMargins = { ...MARGIN_DEFAULTS, ...from.margins };
	const fromLabel = densityOf(from);
	const fromLineHeight = from.lineHeight ?? DENSITY_PRESETS.normal.lineHeight;
	return [
		`Density: ${fromLabel === "custom" ? "Custom" : DENSITY_LABELS[fromLabel]} → ${DENSITY_LABELS[to]}`,
		`Line spacing ${fromLineHeight} → ${target.lineHeight}`,
		`Margins ${marginSummary(currentMargins)} → ${marginSummary(target.margins)}`,
	].join(" · ");
}
