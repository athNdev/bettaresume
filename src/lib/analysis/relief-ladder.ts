import type {
	PartialResumeSettings,
	Resume,
	ResumeSection,
	ResumeSettings,
	TypographyScale,
} from "@/features/resume-editor/types";
import {
	DENSITY_LABELS,
	densityOf,
	densityPatch,
	describeDensityPatch,
	tighterDensity,
} from "@/lib/layout/density";
import type { FitReport } from "@/lib/layout/page-fit";

/**
 * The overflow relief ladder: what to spend, in the order that spends the least.
 *
 * Two kinds of row, and the distinction is the product's line in the sand:
 *
 * - **layout** rows change spacing, margins or type scale. They are visible, reversible
 *   (one revision restore), and carry an Apply action behind a diff-confirm.
 * - **content** rows never have an Apply action. We never invent content, never
 *   summarise a bullet and never hide a section on the user's behalf — the row says what
 *   the user could do and scrolls to it. That is "detect, never invent" made visible.
 *
 * The order encodes a principle: spend reversibility and whitespace before readability,
 * and never spend content automatically.
 */

export type ReliefLeverId =
	| "density"
	| "type-scale"
	| "date-format"
	| "hide-section"
	| "trim-bullets"
	| "shorten-bullets";

export interface ReliefRow {
	id: string;
	lever: ReliefLeverId;
	kind: "layout" | "content";
	title: string;
	detail: string;
	/** Measured gain in mm from a what-if compile; `null` until measured. */
	gainMm: number | null;
	/** Layout rows only: the patch the Apply action sends. */
	patch?: PartialResumeSettings;
	/** Layout rows only: the one-line diff shown before applying. */
	diff?: string;
	/** Where to scroll. A section id, or an entry id. */
	anchor?: string;
}

export interface ReliefInput {
	resume: Resume;
	settings: Partial<ResumeSettings> | undefined;
	fit: FitReport | null;
	/** Measured gains by lever id, from `probe` what-if compiles. */
	estimates?: Partial<Record<ReliefLeverId, number>>;
}

/** Sections a reader will not miss on the first pass, in the order to consider them. */
const OPTIONAL_SECTIONS: ReadonlySet<string> = new Set([
	"references",
	"awards",
	"publications",
	"languages",
	"volunteer",
	"certifications",
	"custom",
]);

/** Type-scale step. 5% is roughly 4–5% of page height plus reflow. */
const SCALE_STEP = 0.05;

/**
 * The smallest scale that keeps the body on its 10pt floor.
 * A user may be offered a smaller type scale for an explicit click; nothing here is
 * applied automatically, and nothing goes below the floor to win a page.
 */
export function floorScale(
	typography: Partial<TypographyScale> | undefined,
): number {
	const body = typography?.body ?? 10.5;
	return body > 0 ? 10 / body : 1;
}

function nextBodyScale(
	settings: PartialResumeSettings | undefined,
): number | null {
	const current = settings?.fontScale ?? 1;
	const floor = floorScale(settings?.typography);
	if (current <= floor + 0.001) return null;
	const next = Math.max(floor, Number((current - SCALE_STEP).toFixed(2)));
	if (next >= current - 0.001) return null;
	// Never round *below* the floor: the clamp is the floor, and the display rounds.
	return Math.max(floor, next);
}

function visibleSections(resume: Resume): ResumeSection[] {
	return [...(resume.sections ?? [])]
		.filter((s) => s.visible)
		.sort((a, b) => a.order - b.order);
}

function bulletsOf(sections: readonly ResumeSection[]): Array<{
	sectionId: string;
	entryId: string;
	label: string;
	count: number;
	overlong: number;
}> {
	const out: Array<{
		sectionId: string;
		entryId: string;
		label: string;
		count: number;
		overlong: number;
	}> = [];
	for (const section of sections) {
		if (section.type !== "experience" && section.type !== "projects") continue;
		if (!Array.isArray(section.content.data)) continue;
		for (const item of section.content.data as Array<Record<string, unknown>>) {
			const highlights = Array.isArray(item.highlights)
				? item.highlights.filter((h): h is string => typeof h === "string")
				: [];
			const label = [item.position, item.company]
				.filter((v) => typeof v === "string" && v)
				.join(" at ");
			out.push({
				sectionId: section.id,
				entryId: typeof item.id === "string" ? item.id : "",
				label: label || "Untitled role",
				count: highlights.length,
				overlong: highlights.filter((b) => b.length > 220).length,
			});
		}
	}
	return out;
}

/**
 * Build the ladder.
 *
 * Layout rows come first because they are the reversible ones. Content rows are sorted
 * tail-first: hiding the last section on the page reclaims the tail of the document,
 * which is where the overflow is.
 */
export function buildReliefLadder(input: ReliefInput): ReliefRow[] {
	const { resume, settings, fit, estimates = {} } = input;
	const rows: ReliefRow[] = [];

	const currentDensity = densityOf(settings ?? {});
	const tighter = tighterDensity(currentDensity);
	if (tighter) {
		rows.push({
			id: `density-${tighter}`,
			lever: "density",
			kind: "layout",
			title: `${DENSITY_LABELS[tighter]} density`,
			detail:
				tighter === "compact"
					? "Tighter section gaps, line spacing and margins together — the largest single win that touches nothing semantic."
					: "One step tighter: section gaps, line spacing and margins move together.",
			gainMm: estimates.density ?? null,
			patch: densityPatch(tighter),
			diff: describeDensityPatch(settings ?? {}, tighter),
		});
	}

	const scale = nextBodyScale(settings);
	if (scale !== null) {
		const body = (settings?.typography?.body ?? 10.5) * scale;
		rows.push({
			id: "type-scale",
			lever: "type-scale",
			kind: "layout",
			title: `Text scale ${Math.round((settings?.fontScale ?? 1) * 100)}% → ${Math.round(scale * 100)}%`,
			detail: `Body text stays at ${body.toFixed(1)}pt, on the 10pt floor. Nothing goes below it.`,
			gainMm: estimates["type-scale"] ?? null,
			patch: { fontScale: scale },
			diff: `Type scale ${Math.round((settings?.fontScale ?? 1) * 100)}% → ${Math.round(scale * 100)}% · body ${((settings?.typography?.body ?? 10.5) * (settings?.fontScale ?? 1)).toFixed(1)}pt → ${body.toFixed(1)}pt`,
		});
	}

	if (settings?.dateFormat === "MMMM YYYY") {
		rows.push({
			id: "date-format",
			lever: "date-format",
			kind: "layout",
			title: "Shorten the date format",
			detail:
				"“March 2022” → “Mar 2022”. Still parse-safe; it can pull a wrapped date line back onto one line.",
			gainMm: estimates["date-format"] ?? null,
			patch: { dateFormat: "MMM YYYY" },
			diff: "Date format March 2022 → Mar 2022",
		});
	}

	// ── Content rows: no patch, no Apply. Ever. ──────────────────────────────
	const sections = visibleSections(resume);
	const optional = sections.filter((s) => OPTIONAL_SECTIONS.has(s.type));
	for (const section of [...optional].reverse()) {
		rows.push({
			id: `hide-section-${section.id}`,
			lever: "hide-section",
			kind: "content",
			title: `Hide “${section.content.title || section.type}” — usually optional`,
			detail:
				"Making a section invisible is your call, and it is undoable. We will not hide it for you.",
			gainMm: null,
			anchor: section.id,
		});
	}

	const roles = bulletsOf(sections);
	for (const role of [...roles].reverse()) {
		if (role.count > 6) {
			rows.push({
				id: `trim-bullets-${role.entryId || role.label}`,
				lever: "trim-bullets",
				kind: "content",
				title: `“${role.label}” lists ${role.count} bullets; the rubric suggests 3–6`,
				detail:
					"Cutting a bullet is a content decision, so this row has no button. The rubric marks which roles run long.",
				gainMm: null,
				anchor: role.sectionId,
			});
		}
		if (role.overlong > 0) {
			rows.push({
				id: `shorten-bullets-${role.entryId || role.label}`,
				lever: "shorten-bullets",
				kind: "content",
				title: `${role.overlong} bullet${role.overlong === 1 ? "" : "s"} under “${role.label}” run past 220 characters`,
				detail:
					"Long bullets wrap to three lines. Tightening the wording is yours to do — we never rewrite it.",
				gainMm: null,
				anchor: role.sectionId,
			});
		}
	}

	// A ladder that ends in nothing is a dead end. When the layout levers are spent,
	// say so rather than repeating "make it smaller".
	if (fit?.atFloor && rows.every((r) => r.kind === "content")) {
		return rows;
	}
	return rows;
}

/** Rows that may be applied — layout only. Asserted by `test/page-fit.test.ts`. */
export function applicableRows(rows: readonly ReliefRow[]): ReliefRow[] {
	return rows.filter((r) => r.kind === "layout" && r.patch !== undefined);
}
