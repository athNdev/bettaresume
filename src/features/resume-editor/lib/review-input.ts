import type { SectionContent, SectionType } from "@bettaresume/types";
import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import {
	analyzeHighlights,
	type HighlightsReport,
} from "@/lib/analysis/metrics";
import type { AuditInput, DateLike } from "@/lib/analysis/parse-fidelity";

/**
 * Bridges the resume domain model to the analysis engines.
 *
 * The single most important job here is reporting the heading the Typst template
 * **actually renders**, not the one the UI happens to display.
 *
 * The templates use this shape:
 *
 *     section-title(if section.title != "" { section.title } else { "Work Experience" })
 *
 * so a user-supplied `content.title` wins over the built-in default. That is exactly
 * how a resume ends up with a heading no parser recognises -- renaming a section is
 * the documented Greenhouse failure mode. Auditing the UI label instead of the
 * rendered string would miss every one of those.
 */

/**
 * The built-in heading for each section type, taken from the `else` branch of each
 * `section-title(...)` call in `sections.typ`.
 *
 * Pinned against the real template files by a test, so editing a heading in Typst
 * without updating this map fails CI instead of silently weakening the audit.
 */
export const TEMPLATE_SECTION_HEADINGS: Partial<Record<SectionType, string>> = {
	summary: "Professional Summary",
	experience: "Work Experience",
	education: "Education",
	skills: "Skills",
	projects: "Projects",
	certifications: "Certifications",
	awards: "Awards & Honors",
	languages: "Languages",
	volunteer: "Volunteer Experience",
	publications: "Publications",
	references: "References",
	// `custom` has no built-in heading in the template either: `render-custom` falls back to
	// "Additional Information" when the user has not titled the section. Without this
	// entry the audit reported the rendered heading as unmapped and the map/template
	// cross-check below failed — which is the check doing its job.
	custom: "Additional Information",
};

/** The heading a section will render, honouring a user override. */
export function renderedHeading(section: ResumeSection): string {
	const fromContent = (section.content as SectionContent | undefined)?.title;
	if (typeof fromContent === "string" && fromContent.trim()) {
		return fromContent.trim();
	}
	// `personal-info` deliberately has no entry: the templates render the contact
	// block without a section heading, and parsers find contact fields by regex.
	return TEMPLATE_SECTION_HEADINGS[section.type] ?? "Custom Section";
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function pushDates(out: DateLike[], value: unknown) {
	if (Array.isArray(value)) {
		for (const item of value) pushDates(out, item);
		return;
	}
	const row = asRecord(value);
	if (!row) return;
	out.push({
		startDate: (row.startDate as string) ?? null,
		endDate: (row.endDate as string) ?? null,
		current: Boolean(row.current),
		graduationDate: (row.graduationDate as string) ?? null,
	});
}

/**
 * Collect every date-bearing row across the whole resume.
 *
 * Walked structurally rather than per-section-type so a newly added section type with
 * dates is covered without touching this function -- the failure mode being guarded
 * against (a parser inferring the date pattern from the first entry and failing on the
 * rest) applies to every entry equally.
 */
export function collectDates(sections: readonly ResumeSection[]): DateLike[] {
	const out: DateLike[] = [];
	for (const section of sections) {
		const data = (section.content as SectionContent | undefined)?.data;
		pushDates(out, data);
	}
	return out;
}

/** Build the input for `auditParseFidelity`. */
export function buildParseAuditInput(resume: Resume): AuditInput {
	const sections = resume.sections ?? [];
	return {
		sections: sections.map((s) => ({
			type: s.type,
			title: renderedHeading(s),
			visible: s.visible,
		})),
		dates: collectDates(sections),
		dateFormat: resume.metadata?.settings?.dateFormat,
	};
}

export interface BulletFinding {
	/** Section id the bullet belongs to, for "jump to" navigation. */
	sectionId: string;
	/**
	 * Index of the entry inside that section, so a finding can be identified.
	 *
	 * This was hardcoded to `0` while the loop pushed one finding per *entry*. A section
	 * with two roles therefore produced two findings that claimed the same identity, which
	 * React reported as a duplicate key and the panel rendered as two unlabelled blocks
	 * of bullets. Carrying the real index is what makes the key unique and the heading
	 * truthful.
	 */
	index: number;
	/** The entry's own name — company, institution, project — for the row heading. */
	label: string;
	report: HighlightsReport;
}

/**
 * A display name for one entry, so the review can say which job a bullet came from.
 *
 * Every list-shaped section names its subject differently (a job has a company, a
 * degree has an institution, a project has a name), so this reads the first key that
 * exists rather than making the panel know about eleven schemas.
 */
function entryLabel(entry: unknown): string {
	const record = asRecord(entry);
	if (!record) return "";
	for (const key of [
		"company",
		"institution",
		"organization",
		"name",
		"title",
		"position",
		"role",
		"degree",
	]) {
		const value = record[key];
		if (typeof value === "string" && value.trim() !== "") return value.trim();
	}
	return "";
}

export interface ReviewBundle {
	parse: ReturnType<
		typeof import("@/lib/analysis/parse-fidelity").auditParseFidelity
	>;
	bullets: BulletFinding[];
	/** Bullets that want at least one edit, across the whole resume. */
	bulletsNeedingWork: number;
}

/**
 * Analyse every bullet in the resume.
 *
 * Bullets live in `content.data[]` for list-shaped sections and `content.html` for the
 * summary. Only list bullets are analysed: the summary is prose, and flagging prose for
 * "no number" would be a false positive on every single resume.
 */
export function collectBulletFindings(resume: Resume): {
	bullets: BulletFinding[];
	totalNeedingWork: number;
} {
	const bullets: BulletFinding[] = [];
	for (const section of resume.sections ?? []) {
		if (section.visible === false) continue;
		if (section.type === "summary" || section.type === "personal-info")
			continue;

		const data = (section.content as SectionContent | undefined)?.data;
		if (!Array.isArray(data)) continue;

		for (const [index, entry] of data.entries()) {
			const highlights = asRecord(entry)?.highlights;
			if (!Array.isArray(highlights)) continue;

			const report = analyzeHighlights(highlights as string[]);
			if (report.total === 0) continue;

			bullets.push({
				sectionId: section.id,
				index,
				label: entryLabel(entry),
				report,
			});
		}
	}
	return {
		bullets,
		totalNeedingWork: bullets.reduce((n, b) => n + b.report.needsWork, 0),
	};
}
