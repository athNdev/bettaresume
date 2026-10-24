import { MARGIN_DEFAULTS } from "@bettaresume/types";
import type {
	ResumeSettings,
	TemplateType,
} from "@/features/resume-editor/types";

/**
 * Page-fit arithmetic: millimetres of overflow, where the spill starts, last-page fill.
 *
 * Everything here is pure. The Typst probe hands back positions in points measured from
 * the page's top-left corner (verified against the bundled compiler: the first line of
 * body text at a 43pt top margin reports `y = 43`), and the paper geometry is a
 * constant, so the arithmetic never guesses at a rendered value.
 *
 * There is deliberately **no** composite fit score. A fit report is a set of named facts
 * — pages, millimetres over, where the spill starts, how full the last page is — because
 * "you are 0.2 pages over" tells nobody what to do and a 0–100 number is the category's
 * trust failure.
 */

/** Paper sizes in Typst points (1/72 in). A4 is narrower and taller than Letter. */
export const PAPER_PT = {
	Letter: { width: 612, height: 792 },
	A4: { width: 595.28, height: 841.89 },
} as const;

/** Typst points per millimetre. */
export const PT_PER_MM = 72 / 25.4;

export const ptToMm = (pt: number) => pt / PT_PER_MM;
export const mmToPt = (mm: number) => mm * PT_PER_MM;

export type PageTarget = 1 | 2 | null;

/** One marker the probe located: an entry, or a section heading. */
export interface FitAnchor {
	/** The entry id (or the section id for a section marker). */
	id: string;
	/** The section the marker belongs to. */
	section: string;
	/** "Senior Engineer at Acme", or the section title. */
	label: string;
	/** 1-based page number. */
	page: number;
	/** Distance from the page's top edge, in points. */
	y: number;
}

export interface FitProbe {
	pages: number;
	/** Where the last content block ended. */
	end: { page: number; y: number };
	entries: FitAnchor[];
	sections: FitAnchor[];
	/**
	 * How many characters fit on a full body line, measured by the probe as
	 * `contentWidth / mean glyph advance of a 50-character reference at body size`.
	 * `null` when the measurement could not be read.
	 */
	lineChars: number | null;
	/** Usable text height of one page, measured by Typst. `null` when absent. */
	usableHeightPt: number | null;
}

export interface FitReport {
	/** Compiled page count. */
	pages: number;
	/** Usable text height of one page, in points. */
	usableHeightPt: number;
	/** Page target, or `null` when the user has not set one. */
	target: PageTarget;
	/** Overflow in points/mm. Zero when the target is met or unset. */
	overPt: number;
	overMm: number;
	/** "1.2 pages" — one decimal, derived from the last page's content height. */
	pageEstimate: number;
	/** 0–1 fill of the final page. Content ending short of the last page reads as 0. */
	lastPageFill: number;
	/** Characters per full body line, measured by the probe; `null` when unmeasured. */
	lineChars: number | null;
	/** The first entry/section that starts on the overflow page. */
	overflow: FitAnchor | null;
	/** True when the layout levers are already at their floors. */
	atFloor: boolean;
}

export interface FitInput {
	pages: number;
	end: { page: number; y: number };
	entries?: FitAnchor[];
	sections?: FitAnchor[];
	lineChars?: number | null;
	/** Usable page height measured by Typst; preferred over the paper constant. */
	usableHeightPt?: number | null;
}

/**
 * The template's default target: one page for the two early-career templates, no target
 * for the academic CV (a three-page postgrad CV is normal, not an overflow).
 */
export function pageTargetForTemplate(
	template: TemplateType | string | null | undefined,
): PageTarget {
	return template === "postgrad" ? null : 1;
}

/**
 * Resolve the effective target: an explicit setting wins, otherwise the template default.
 *
 * `null` is an explicit "no target" and is different from `undefined` ("not set").
 */
export function resolvePageTarget(
	settings: Partial<ResumeSettings> | undefined,
	template: TemplateType | string | null | undefined,
): PageTarget {
	const stored = settings?.pageTarget;
	if (stored === 1 || stored === 2 || stored === null) return stored;
	return pageTargetForTemplate(template);
}

function usableHeight(
	settings: Partial<ResumeSettings> | undefined,
	measured?: number | null,
): {
	height: number;
	top: number;
} {
	const paper = PAPER_PT[settings?.pageSize === "A4" ? "A4" : "Letter"];
	const margins = { ...MARGIN_DEFAULTS, ...settings?.margins };
	// Typst reports the real text box. Prefer it when present: a template that overrides
	// margins would otherwise make the arithmetic disagree with the page it measured.
	const height =
		typeof measured === "number" && measured > 0
			? measured
			: paper.height - margins.top - margins.bottom;
	return { height, top: margins.top };
}

/** At the floors: body 10pt, margins 36pt (0.5in). */
export function layoutAtFloor(
	settings: Partial<ResumeSettings> | undefined,
): boolean {
	const margins = { ...MARGIN_DEFAULTS, ...settings?.margins };
	const body =
		(settings?.typography?.body ?? 10.5) * (settings?.fontScale ?? 1);
	const marginsAtFloor = [
		margins.top,
		margins.right,
		margins.bottom,
		margins.left,
	].every((m) => m <= 36.001);
	return marginsAtFloor && body <= 10.001;
}

/**
 * Everything the meter needs, from one probe and the settings it was compiled with.
 *
 * The overflow amount is the vertical extent of content on the pages past the target:
 * for a one-page target with content ending on page 2, that is `end.y − margin.top`. For
 * a one-page target with content ending on page 3, it is a full usable page plus
 * `end.y − margin.top`. The error is bounded by the height of the last block, because
 * the end marker sits after all content.
 */
export function deriveFit(
	probe: FitInput,
	settings: Partial<ResumeSettings> | undefined,
	target: PageTarget,
): FitReport {
	const { height: usable, top } = usableHeight(settings, probe.usableHeightPt);
	const pages = Math.max(1, Math.round(probe.pages));
	const endPage = Math.min(pages, Math.max(1, Math.round(probe.end.page)));
	const endOffset = Math.max(0, probe.end.y - top);

	// How much of the final page is actually used. Content that ends before the last
	// page makes the last page empty, which is a 0 fill, not a 1.
	const lastPageFill = endPage === pages ? Math.min(1, endOffset / usable) : 0;

	const pageEstimate =
		Math.round(
			(pages - 1 + Math.max(0, Math.min(1, endOffset / usable))) * 10,
		) / 10;

	let overPt = 0;
	if (target !== null && pages > target) {
		const pagesPastTarget = pages - target;
		overPt = (pagesPastTarget - 1) * usable + endOffset;
	}

	const overflowPage = target === null ? null : target + 1;
	const anchors = [...(probe.entries ?? []), ...(probe.sections ?? [])]
		.filter((a) => a.page > 0)
		.sort((a, b) => a.page - b.page || a.y - b.y);
	const overflow =
		overflowPage === null
			? null
			: ((probe.entries ?? [])
					.filter((a) => a.page >= overflowPage)
					.sort((a, b) => a.page - b.page || a.y - b.y)
					.at(0) ??
				anchors.find((a) => a.page >= overflowPage) ??
				null);

	return {
		pages,
		usableHeightPt: usable,
		target,
		overPt,
		overMm: ptToMm(overPt),
		pageEstimate,
		lastPageFill,
		lineChars: typeof probe.lineChars === "number" ? probe.lineChars : null,
		overflow,
		atFloor: layoutAtFloor(settings),
	};
}

/** `22 mm` — whole millimetres; a tenth of a millimetre is noise on paper. */
export function formatMm(value: number): string {
	const rounded = Math.round(value);
	return `${rounded} mm`;
}

/**
 * The always-visible chip copy.
 *
 * | state | copy |
 * |---|---|
 * | not compiled | `Pages —` |
 * | no target | `2 pages` |
 * | target met | `1 page · target 1` |
 * | over | `1.2 pages · 22 mm over target` |
 */
export function formatFitChip(report: FitReport | null): string {
	if (!report) return "Pages —";
	const plural = report.pages === 1 ? "page" : "pages";
	if (report.target === null) return `${report.pages} ${plural}`;
	if (report.overMm < 0.5)
		return `${report.pages} ${plural} · target ${report.target}`;
	return `${report.pageEstimate.toFixed(1)} pages · ${formatMm(report.overMm)} over target`;
}

/**
 * The honest terminal state: the levers are spent, so the rest has to come from content.
 * We do not cross the floor to win and we do not cut content to win.
 */
export const FLOOR_MESSAGE =
	"Layout is at its floor — body 10 pt, margins 36 pt. The remaining millimetres have to come from the content: hide something, or move it to your base resume.";

/** `Acme · Senior Engineer` → an anchor row the editor can scroll to. */
export function describeAnchor(anchor: FitAnchor): string {
	const section = anchor.section ? `${anchor.section} · ` : "";
	return `${section}${anchor.label || "the section start"}`;
}

/**
 * Tolerant reader for the probe.
 *
 * Typst returns the metadata value (or `{ func: "metadata", value }` records, depending
 * on whether a `field` was requested), and an empty document can return nothing at all.
 * Anything unexpected is `null` — a meter that says "not measured" beats one that draws
 * a zero.
 */
export function parseFitProbe(raw: unknown): FitProbe | null {
	const records = Array.isArray(raw) ? raw : [raw];
	let found: Record<string, unknown> | null = null;
	for (const record of records) {
		if (!record || typeof record !== "object") continue;
		const rec = record as Record<string, unknown>;
		const value =
			rec.func === "metadata" && rec.value && typeof rec.value === "object"
				? (rec.value as Record<string, unknown>)
				: rec;
		if (value.kind === "fit-probe") {
			found = value;
			break;
		}
	}
	if (!found) return null;

	const num = (v: unknown, fallback = 0) =>
		typeof v === "number" && Number.isFinite(v) ? v : fallback;
	const anchor = (v: unknown): FitAnchor | null => {
		if (!v || typeof v !== "object") return null;
		const rec = v as Record<string, unknown>;
		const page = num(rec.page);
		if (page < 1) return null;
		return {
			id: typeof rec.id === "string" ? rec.id : "",
			section: typeof rec.section === "string" ? rec.section : "",
			label: typeof rec.label === "string" ? rec.label : "",
			page,
			y: num(rec.y),
		};
	};
	const list = (v: unknown): FitAnchor[] =>
		Array.isArray(v)
			? v.map(anchor).filter((a): a is FitAnchor => a !== null)
			: [];

	const end =
		found.end && typeof found.end === "object"
			? (found.end as Record<string, unknown>)
			: {};
	const lineChars = found.lineChars;
	const usable = found.usableHeight;

	return {
		pages: Math.max(1, Math.round(num(found.pages, 1))),
		end: { page: Math.max(1, Math.round(num(end.page, 1))), y: num(end.y) },
		entries: list(found.entries),
		sections: list(found.sections),
		lineChars:
			typeof lineChars === "number" && Number.isFinite(lineChars)
				? lineChars
				: null,
		usableHeightPt:
			typeof usable === "number" && Number.isFinite(usable) && usable > 0
				? usable
				: null,
	};
}
