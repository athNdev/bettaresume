import { htmlToText } from "html-to-text";
import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import { SECTION_RULE } from "@/lib/export/rules";

export { SECTION_RULE };

/**
 * The plain-text layer, in one place.
 *
 * This string is the product's central claim: it is what a parser reads out of the
 * exported document, and the landing page tells users to copy it into Notepad and read
 * it. It used to be built inside the export button's click handler, so nothing else
 * could see it — the review panel could not test it and the tests could not assert on
 * it. Extracted so the exporter, the Plain Text Test and the rubric all read the same
 * bytes.
 *
 * Shape, and why:
 *
 *   Name
 *   Title
 *
 *   Email: …  Phone: …  Location: …
 *
 *   ==================================================
 *   SECTION TITLE
 *   ==================================================
 *
 *   key: value
 *   key: value
 *
 * The `=` rule is 50 characters because that is what the exporter has always written and
 * what the marketing page reproduces; changing it would silently desynchronise the page
 * from the artefact. Field names come straight from the section schema, so the text layer
 * and the document cannot drift apart.
 */

/** `key: value` pairs are emitted for these keys only when the value is truthy. */
function isEmittedValue(value: unknown): boolean {
	return value !== undefined && value !== null && value !== "";
}

/**
 * Build the plain-text layer for a resume.
 *
 * Returns `""` when there is no metadata: the caller decides what that means (the
 * exporter refuses with a message), and a half-built document would be worse than
 * nothing to test against.
 */
export function buildPlainText(resume: Resume): string {
	const { metadata, sections } = resume;
	if (!metadata) return "";

	const { personalInfo } = metadata;

	let text = `${personalInfo.fullName}\n`;
	if (personalInfo.professionalTitle)
		text += `${personalInfo.professionalTitle}\n`;
	text += `\n`;

	if (personalInfo.email) text += `Email: ${personalInfo.email}\n`;
	if (personalInfo.phone) text += `Phone: ${personalInfo.phone}\n`;
	if (personalInfo.location) text += `Location: ${personalInfo.location}\n`;
	if (personalInfo.linkedin) text += `LinkedIn: ${personalInfo.linkedin}\n`;
	if (personalInfo.github) text += `GitHub: ${personalInfo.github}\n`;
	text += `\n`;

	for (const section of visibleSections(sections)) {
		const title = headingOf(section);
		text += `${SECTION_RULE}\n${title}\n${SECTION_RULE}\n\n`;

		if (section.type === "summary") {
			const html = section.content.html || "";
			text += `${htmlToText(html, { wordwrap: false })}\n\n`;
		} else if (Array.isArray(section.content.data)) {
			for (const item of section.content.data as Array<
				Record<string, unknown>
			>) {
				for (const [key, value] of Object.entries(item)) {
					if (key !== "id" && isEmittedValue(value)) {
						text += `${key}: ${value}\n`;
					}
				}
				text += "\n";
			}
		}
	}

	return text;
}

/** Visible sections in export order. */
export function visibleSections(
	sections: readonly ResumeSection[],
): ResumeSection[] {
	return sections.filter((s) => s.visible).sort((a, b) => a.order - b.order);
}

/**
 * The heading this section will render.
 *
 * A user-supplied `content.title` wins over the built-in default, which is exactly how a
 * resume ends up with a heading no parser recognises. `review-input.ts` owns the same
 * question for the audit; this is the export-side answer and both read `content.title`
 * first, so they cannot disagree.
 */
export function headingOf(section: ResumeSection): string {
	const title = section.content.title;
	if (typeof title === "string" && title.trim()) return title.trim();
	return section.type.replace(/-/g, " ").toUpperCase();
}
