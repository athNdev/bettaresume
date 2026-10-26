import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import { SECTION_RULE } from "@/lib/export/rules";
import { headingOf, sectionLines, visibleSections } from "@/lib/export/text";
import { resumeToTypstJson } from "@/lib/typst/serialize";

/**
 * The design CV — a separate export target, never a template.
 *
 * Multi-column resume layouts are the largest single cause of ATS parse failure, because
 * a text layer built from coordinates loses the reading order a parser depends on. This
 * product's promise is the opposite: the standard export is single-column and the text
 * layer is knowable. So the design CV is not a layout setting, not a seventh archetype and
 * not reachable from `TEMPLATE_CONFIGS`. It is a deliberate, loudly-labelled exception for
 * a document the user will hand to a person.
 *
 * The boundary is enforced in three places:
 *
 *   1. `TEMPLATE_CONFIGS` still contains exactly the six archetypes in
 *      `templateTypeSchema`; `design-column` is in neither.
 *   2. `design-column.typ` lives outside `typst_templates/`, so the validator that reads
 *      every standard template cannot see it and the gallery never renders it.
 *   3. `test/design-export.test.ts` pins both facts plus the text layer's ordering.
 *
 * ## The text layer is not silent
 *
 * The design PDF is not parser-safe, and pretending otherwise would break the product's
 * credibility. So the target also offers a plain-text companion in the layout's visual
 * reading order — left column top to bottom, then the main column — prefixed with a label
 * that says exactly what it is. The standard text export still emits document order and
 * remains the one to paste into an ATS.
 *
 * DOCX is deliberately not offered for the design CV. A two-column WordprocessingML
 * document is a second layout engine with its own pagination, and the honest alternatives
 * are to build that second renderer or to emit the standard single-column document under a
 * design name. The design target refuses the format instead; see `DESIGN_DOCX_REFUSAL`.
 */

/**
 * Sections that read as facts rather than narrative, and therefore move to the sidebar.
 *
 * This is the single source of truth for the split. `resumeToDesignTypstJson` writes the
 * two arrays into the payload the template renders, and `buildDesignPlainText` walks the
 * same two arrays, so the picture and the text cannot disagree about which column a
 * section is in.
 */
export const DESIGN_SIDEBAR_TYPES = [
	"skills",
	"languages",
	"certifications",
	"awards",
] as const;

const SIDEBAR_TYPES: ReadonlySet<string> = new Set(DESIGN_SIDEBAR_TYPES);

export type DesignColumn = "sidebar" | "main";

/** Which column a section is drawn in. `personal-info` is the masthead, not a section. */
export function designColumnOf(
	section: Pick<ResumeSection, "type">,
): DesignColumn {
	return SIDEBAR_TYPES.has(section.type) ? "sidebar" : "main";
}

/**
 * The visible body sections, split into the sidebar and main column.
 *
 * Order is preserved within each column. `personal-info` is excluded: it is the masthead,
 * and the sidebar's contact block is built from the same resolved `personalInfo` the
 * standard header uses.
 */
export function splitDesignSections(sections: readonly ResumeSection[]): {
	sidebar: ResumeSection[];
	main: ResumeSection[];
} {
	const ordered = visibleSections(sections).filter(
		(section) => section.type !== "personal-info",
	);
	return {
		sidebar: ordered.filter((section) => designColumnOf(section) === "sidebar"),
		main: ordered.filter((section) => designColumnOf(section) === "main"),
	};
}

/**
 * The permanent warning. Rendered in the export menu and again in the confirmation, so
 * the user cannot reach this export without reading it. Not a toast, not a tooltip.
 */
export const DESIGN_EXPORT_WARNING =
	"This layout is not parser-safe. Use the standard export for anything that goes through an applicant tracking system.";

/** The first lines of the design text export. This is the label the brief asks for. */
export const DESIGN_TEXT_NOTICE = [
	"DESIGN CV - VISUAL READING ORDER (NOT PARSER-SAFE)",
	"The columns are written the way the page reads: the sidebar top to bottom, then the main column.",
	DESIGN_EXPORT_WARNING,
].join("\n");

/**
 * Why there is no design DOCX.
 *
 * Exported so the UI and the docs can quote the same sentence, and so a future request for
 * the format starts from the reason rather than from scratch.
 */
export const DESIGN_DOCX_REFUSAL =
	"The design CV is PDF-only. A two-column DOCX would need a second layout engine (Word paginates independently), so exporting the standard single-column DOCX under a design name would be the silent scramble this target exists to avoid.";

/**
 * The design payload: the standard payload plus the two column arrays the template draws.
 *
 * Building it from `resumeToTypstJson` rather than from the raw resume keeps one
 * serialiser, one date formatter and one rich-text conversion for every export. The
 * sections are not reordered in the base array; the template reads `design.sidebar` and
 * `design.main`, which is what makes the visual order auditable in a test.
 */
export function resumeToDesignTypstJson(resume: Resume): string {
	const payload = JSON.parse(resumeToTypstJson(resume)) as {
		personalInfo?: Record<string, unknown>;
		sections?: Array<Record<string, unknown>>;
	};
	const sections = payload.sections ?? [];
	const sidebar = sections.filter((section) =>
		SIDEBAR_TYPES.has(String(section.type ?? "")),
	);
	const main = sections.filter(
		(section) =>
			section.type !== "personal-info" &&
			!SIDEBAR_TYPES.has(String(section.type ?? "")),
	);

	return JSON.stringify({
		...payload,
		design: {
			sidebar,
			main,
			hasSidebar: sidebar.length > 0 || hasContact(payload.personalInfo),
		},
	});
}

/** Whether the masthead has anything to put under "Contact" in the sidebar. */
function hasContact(
	personalInfo: Record<string, unknown> | undefined,
): boolean {
	if (!personalInfo) return false;
	return ["email", "phone", "location", "linkedin", "github", "website"].some(
		(key) => {
			const value = personalInfo[key];
			return typeof value === "string" && value.trim() !== "";
		},
	);
}

/**
 * The design CV's plain-text layer, in the visual reading order of the page.
 *
 * It is deliberately *not* `buildPlainText`: that function walks document order, which is
 * right for every parser-safe export and wrong for a layout whose first column is a
 * sidebar. The words inside each section still come from `sectionLines`, the same builder
 * the standard text export uses, so only the order of sections changes.
 */
export function buildDesignPlainText(resume: Resume): string {
	const { metadata, sections } = resume;
	if (!metadata) return "";

	const { personalInfo } = metadata;
	const dateFormat = metadata.settings?.dateFormat;
	const { sidebar, main } = splitDesignSections(sections);
	const hasSidebar =
		sidebar.length > 0 || Boolean(contactLines(personalInfo).length);

	const out: string[] = [DESIGN_TEXT_NOTICE, ""];
	out.push(personalInfo.fullName?.trim() ?? "");
	if (personalInfo.professionalTitle?.trim()) {
		out.push(personalInfo.professionalTitle.trim());
	}
	out.push("");

	if (hasSidebar) {
		out.push("--- SIDEBAR (left column, top to bottom) ---");
		out.push("");
		const contact = contactLines(personalInfo);
		if (contact.length > 0) {
			out.push(`${SECTION_RULE}\nContact\n${SECTION_RULE}`, "");
			out.push(...contact, "");
		}
		for (const section of sidebar) {
			appendSection(out, section, dateFormat);
		}
	}

	out.push(
		hasSidebar
			? "--- MAIN COLUMN (right column, top to bottom) ---"
			: "--- MAIN COLUMN (single column) ---",
	);
	out.push("");
	for (const section of main) {
		appendSection(out, section, dateFormat);
	}

	return `${out
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trimEnd()}\n`;
}

/** One labelled section, in the same words the standard plain-text export uses. */
function appendSection(
	out: string[],
	section: ResumeSection,
	dateFormat: string | undefined,
): void {
	const body = sectionLines(section, dateFormat);
	if (body.length === 0) return;
	out.push(`${SECTION_RULE}\n${headingOf(section)}\n${SECTION_RULE}`, "");
	out.push(...body, "");
}

/** The sidebar's contact rows, in the order the standard text layer prints them. */
function contactLines(personalInfo: {
	email?: string;
	phone?: string;
	location?: string;
	linkedin?: string;
	github?: string;
	website?: string;
}): string[] {
	const out: string[] = [];
	if (personalInfo.email) out.push(`Email: ${personalInfo.email}`);
	if (personalInfo.phone) out.push(`Phone: ${personalInfo.phone}`);
	if (personalInfo.location) out.push(`Location: ${personalInfo.location}`);
	if (personalInfo.linkedin) out.push(`LinkedIn: ${personalInfo.linkedin}`);
	if (personalInfo.github) out.push(`GitHub: ${personalInfo.github}`);
	if (personalInfo.website) out.push(`Website: ${personalInfo.website}`);
	return out;
}
