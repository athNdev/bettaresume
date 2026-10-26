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
 * ## The values are the researched density envelope
 *
 * `docs/research/space-efficiency.md` §2, §5. Three profiles, in order:
 *
 * | | Compact (Tight) | Normal (Balanced) | Relaxed |
 * |---|---|---|---|
 * | Margins | 36pt all | 36pt all | 43/50pt |
 * | Line height | 1.22 | 1.25 | 1.35 |
 * | Section spacing | compact | normal | spacious |
 *
 * **Normal is the shipped default, and it is new.** It used to be the 43/50pt, 1.35
 * composition — a defensible *comfortable* profile that rendered a realistic five-year
 * engineer at 96 % of the page, so one extra bullet spilled it onto a second page that
 * was 6 % full. The measured band for a finished one-pager is 78–85 % fill, and Normal
 * is the profile that lands there. The old Normal is Relaxed now, and the old Relaxed
 * (54/60pt, 1.65 leading) was not a one-page profile at all — it rendered two pages of
 * a document meant for one — so it is gone.
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
 * Every vertical gap the document has, in points, for one density.
 *
 * This is the table `sections.typ` uses (`gaps-for`) and the one `preview.tsx` reads, so
 * the HTML preview and the PDF spend the same space. It exists because `sectionSpacing`
 * used to reach only the section gap and the header: the entry and bullet gaps were
 * compile-time constants, so no preset could reclaim the ~23pt they occupy
 * (`docs/research/space-efficiency.md` §3.4). `test/density-gaps.test.ts` parses the
 * Typst table and fails if the two disagree, so this cannot drift into two rhythms again.
 */
export interface SpacingGaps {
	/** Above a section heading. */
	section: number;
	/** Heading → its first entry. */
	heading: number;
	/** Between entries in a section. */
	entry: number;
	/** Between bullets in one entry. */
	bullet: number;
	/** Meta line / description → first bullet. */
	meta: number;
	/** Header block → body. */
	header: number;
	/** Name/title → the contact line. */
	contact: number;
	/** Whether the header draws its hairline rule. */
	headerRule: boolean;
}

/**
 * Tight / Balanced / Relaxed — `docs/research/space-efficiency.md` §2.
 *
 * Every value except the header rule is on the 2/3/4/6/8/12/16 scale.
 */
export const SPACING_GAPS: Record<
	ResumeSettings["sectionSpacing"],
	SpacingGaps
> = {
	compact: {
		section: 6,
		heading: 3,
		entry: 4,
		bullet: 2,
		meta: 2,
		header: 6,
		contact: 3,
		headerRule: false,
	},
	normal: {
		section: 8,
		heading: 4,
		entry: 4,
		bullet: 2,
		meta: 3,
		header: 8,
		contact: 4,
		headerRule: true,
	},
	spacious: {
		section: 12,
		heading: 4,
		entry: 6,
		bullet: 3,
		meta: 4,
		header: 16,
		contact: 6,
		headerRule: true,
	},
};

/** The gaps for a settings object, defaulting to the shipped Normal profile. */
export function gapsFor(
	settings: { sectionSpacing?: ResumeSettings["sectionSpacing"] } | undefined,
): SpacingGaps {
	return SPACING_GAPS[settings?.sectionSpacing ?? "normal"];
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
		lineHeight: 1.22,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
	},
	normal: {
		sectionSpacing: "normal",
		lineHeight: 1.25,
		margins: { ...MARGIN_DEFAULTS },
	},
	relaxed: {
		sectionSpacing: "spacious",
		lineHeight: 1.35,
		margins: { top: 43, right: 50, bottom: 43, left: 50 },
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
		"Tightest gaps, 1.22 leading and 0.5 in margins — for seven roles and long bullets.",
	normal:
		"The shipped default: 0.5 in margins, 1.25 leading, and gaps that fill the page without crowding it.",
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
 * is the confirm body: `Density: Normal → Compact · Line spacing 1.25 → 1.22 · Margins
 * 12.7 / 12.7 mm → 12.7 / 12.7 mm`.
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
