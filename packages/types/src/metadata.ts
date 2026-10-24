import {
	MARGIN_BAND,
	MARGIN_DEFAULTS,
	TYPE_SCALE_BANDS,
	TYPE_SCALE_DEFAULTS,
} from "./schemas";
import type { ResumeMetadata, ResumeSettings } from "./types";

// ============================================
// Settings migration: px-era values → true points
// ============================================

type TypographyScaleValues = ResumeSettings["typography"];
type MarginValues = ResumeSettings["margins"];

const TYPOGRAPHY_ROLES = [
	"name",
	"title",
	"sectionHeading",
	"itemTitle",
	"body",
	"small",
] as const;

const MARGIN_SIDES = ["top", "right", "bottom", "left"] as const;

const clamp = (value: number, min: number, max: number) =>
	Math.min(max, Math.max(min, value));

const round = (value: number) => Math.round(value * 100) / 100;

/**
 * Normalise stored typography and margins to true points.
 *
 * **Why convert on read (and not just reinterpret):** before this change the stored
 * numbers were CSS px wearing a "pt" label — `sections.typ` multiplied them by 0.75
 * (its `px-to-pt`) before laying out body text, while the document header read the same
 * numbers as raw pt. A stored `body: 11` therefore rendered at 8.25pt and a stored
 * `name: 24` at 24pt: two scales in one document. Reinterpreting the stored numbers as
 * points would "fix" the body by inflating it and leave the header at a 24pt name
 * (above the research cap of ~2× body), so old resumes would render *bigger* than the
 * canon they were modelled on. Instead, values that can only be px-era are rescaled by
 * 0.75 — recovering the point size body text actually rendered at — and then clamped
 * into the researched bands, where the floors lift anything below them (body 8.25 →
 * 10pt, small 6.75 → 9pt) and the header settles at the canonical 18pt name.
 *
 * **How px-era values are detected:** a stored scale is px-era when any value falls
 * outside its role's supported point band — a legal point scale cannot contain such a
 * value, while the old defaults (name 24, sectionHeading 14, …) always trip it. The
 * whole object is converted together so the document keeps its internal ratios.
 * Residual ambiguity: a px-era scale whose every value coincides with a legal point
 * value is treated as points. It renders somewhat larger than before, never smaller,
 * and never below a floor. The conversion is idempotent — a converted scale always
 * lands inside the bands, so it is never reconverted.
 */
export function normalizeTypeSettings(input: {
	typography?:
		| Partial<TypographyScaleValues>
		| Record<string, unknown>
		| undefined;
	margins?: Partial<MarginValues> | Record<string, unknown> | undefined;
}): { typography: TypographyScaleValues; margins: MarginValues } {
	const storedTypography = input.typography ?? {};
	const storedMargins = input.margins ?? {};

	const presentRoles = TYPOGRAPHY_ROLES.filter(
		(role) => typeof storedTypography[role] === "number",
	);
	const typographyIsPx = presentRoles.some((role) => {
		const value = storedTypography[role];
		const band = TYPE_SCALE_BANDS[role];
		return typeof value === "number" && (value < band.min || value > band.max);
	});
	// With no typography to date the object, a margin below the point floor can only be
	// px-era; anything inside the point band is left alone (it renders larger than the
	// old code drew it, but within the researched range — see the note above).
	const marginsArePx =
		presentRoles.length > 0
			? typographyIsPx
			: MARGIN_SIDES.some((side) => {
					const value = storedMargins[side];
					return typeof value === "number" && value < MARGIN_BAND.min;
				});

	const typography: TypographyScaleValues = {} as TypographyScaleValues;
	for (const role of TYPOGRAPHY_ROLES) {
		const band = TYPE_SCALE_BANDS[role];
		const raw = storedTypography[role];
		const base = typeof raw === "number" ? raw : TYPE_SCALE_DEFAULTS[role];
		const inPoints = typographyIsPx ? base * 0.75 : base;
		typography[role] = round(clamp(inPoints, band.min, band.max));
	}

	const margins: MarginValues = {} as MarginValues;
	for (const side of MARGIN_SIDES) {
		const raw = storedMargins[side];
		const base = typeof raw === "number" ? raw : MARGIN_DEFAULTS[side];
		const inPoints = marginsArePx ? base * 0.75 : base;
		margins[side] = round(clamp(inPoints, MARGIN_BAND.min, MARGIN_BAND.max));
	}

	return { typography, margins };
}

/**
 * Merge a metadata patch into stored metadata, recursively.
 *
 * Metadata has nested objects whose fields are individually optional in the patch type:
 * `{ settings: { fontFamily } }` is a complete, valid update that must change one field
 * and leave the other thirty alone. A shallow spread replaces `settings` wholesale, so the
 * result is missing `typography`, `margins` and `colors` — and the difference shows up as
 * the preview losing its layout for a frame, or, when the merge happens server-side, as
 * silently destroyed settings.
 *
 * `undefined` means "not present in this patch", never "set this field to nothing". A
 * client that wants to clear `jobTarget` sends `null`, which is a value and survives.
 *
 * This lived in `api/src/trpc/procedures/resume.ts` and was used only by the server, while
 * the client's optimistic update did `{ ...previous, ...data }` behind an `as any`. That is
 * two implementations of one rule, and the one without the type checking was the one the
 * user sees first. It lives here so both call it.
 */
export function deepMergeMetadata(
	base: Record<string, unknown>,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...base };

	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;

		const existing = out[key];
		const bothPlainObjects =
			value !== null &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			existing !== null &&
			typeof existing === "object" &&
			!Array.isArray(existing);

		out[key] = bothPlainObjects
			? deepMergeMetadata(
					existing as Record<string, unknown>,
					value as Record<string, unknown>,
				)
			: value;
	}

	return out;
}

/**
 * Type-level wrapper for the one call site that knows both sides are metadata.
 *
 * The merge itself has to work on `Record<string, unknown>` because it walks arbitrary
 * JSON; the cast back is the caller's assertion that it passed JSON in.
 */
export function mergeMetadata(
	base: ResumeMetadata | null,
	patch: Record<string, unknown> | null | undefined,
): ResumeMetadata | null {
	if (!patch) return base;
	return deepMergeMetadata(
		(base ?? {}) as Record<string, unknown>,
		patch,
	) as unknown as ResumeMetadata;
}
