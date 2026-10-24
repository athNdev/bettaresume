import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import { SECTION_RULE } from "@/lib/export/rules";
import { formatDateRange, formatResumeDate } from "@/lib/format-date";
import { richTextToPlain } from "@/lib/rich-text";

export { SECTION_RULE };

/**
 * The plain-text layer, in one place.
 *
 * This string is the product's central claim: it is what a parser reads out of the
 * exported document, and the landing page tells users to copy it into Notepad and read
 * it. The exporter, the Plain Text Test and the rubric all read the same bytes.
 *
 * ## What changed, and why it matters
 *
 * It used to emit `Object.entries(item)` for every section, so a reader got:
 *
 *     institution: Harvard University
 *     degree: Bachelor of Science in Computer Science
 *     startDate: 2020-09
 *     achievements: Dean's List (All Semesters),Teaching Assistant for CS50
 *
 * Three problems, and the third is the serious one:
 *
 *   1. Internal field names (`startDate`) leaked into a user-facing artefact.
 *   2. Arrays were stringified with no space after the comma.
 *   3. It did **not match the document**. The PDF renders `Sep 2020 - May 2024`,
 *      `Harvard University`, and the achievements as separate lines; the text layer
 *      said `startDate: 2020-09`. A "Plain Text Test" that describes a document
 *      nobody can produce is a test of the wrong thing — and the whole point of the
 *      feature is to predict what a parser will see.
 *
 * So each section type now renders the way its template draws it: a headline, a date
 * range, then prose and bullets. Field order is the template's order, not the schema's.
 *
 * Empty sections are skipped. `personal-info` is skipped entirely — its content is the
 * letterhead at the top, which is already printed there; emitting a bare
 * "Contact Information" heading with nothing under it was pure noise.
 */

/** `key: value` pairs are emitted for these keys only when the value is truthy. */
function isEmittedValue(value: unknown): boolean {
	return (
		value !== undefined && value !== null && value !== "" && value !== false
	);
}

/** `A, B, C`. Arrays are written inline, the way a reader expects to see them. */
function inline(value: unknown): string {
	if (!Array.isArray(value)) return String(value ?? "");
	return value
		.filter((v) => isEmittedValue(v))
		.map((v) => String(v).trim())
		.join(", ");
}

/** Bullets under a line, with a `- ` marker — the glyph the research says parses. */
function bullets(lines: unknown, out: string[]): void {
	if (!Array.isArray(lines)) return;
	for (const line of lines) {
		const text = String(line ?? "").trim();
		if (text) out.push(`- ${text}`);
	}
}

/** `Headline` on its own line, then a `dates • location • detail` line beneath it. */
function headline(out: string[], title: string, meta: string[]): void {
	if (title) out.push(title);
	const line = meta.filter((m) => m && m.trim() !== "").join(" • ");
	if (line) out.push(line);
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
	const dateFormat = metadata.settings?.dateFormat;
	const date = (value: unknown) => formatResumeDate(safeStr(value), dateFormat);
	const range = (start: unknown, end: unknown, current: unknown) =>
		formatDateRange(safeStr(start), safeStr(end), current === true, dateFormat);

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
		// The letterhead is already printed above.
		if (section.type === "personal-info") continue;

		const body = sectionBody(section, date, range);
		if (body.length === 0) continue;

		const title = headingOf(section);
		text += `${SECTION_RULE}\n${title}\n${SECTION_RULE}\n\n`;
		text += `${body.join("\n")}\n\n`;
	}

	return text;
}

/** One section's lines, in the order its Typst template draws them. */
function sectionBody(
	section: ResumeSection,
	date: (value: unknown) => string,
	range: (start: unknown, end: unknown, current: unknown) => string,
): string[] {
	const out: string[] = [];
	const data = section.content.data;

	if (section.type === "summary") {
		const plain = richTextToPlain(String(section.content.html ?? ""));
		if (plain) out.push(plain);
		return out;
	}

	if (!Array.isArray(data)) return out;

	for (const raw of data as Array<Record<string, unknown>>) {
		const item = raw ?? {};

		switch (section.type) {
			case "experience":
				headline(out, str(item.position, item.title), [
					range(item.startDate, item.endDate, item.current),
					str(item.company),
					str(item.location),
					str(item.employmentType),
				]);
				if (item.description) out.push(String(item.description).trim());
				bullets(item.highlights, out);
				if (Array.isArray(item.technologies) && item.technologies.length)
					out.push(`Technologies: ${inline(item.technologies)}`);
				break;

			case "education":
				headline(out, str(item.institution), [
					range(item.startDate, item.endDate, item.current) ||
						date(item.graduationDate),
					str(item.degree),
					str(item.field),
					str(item.location),
				]);
				if (item.gpa) out.push(`GPA: ${str(item.gpa)}`);
				bullets(item.achievements, out);
				bullets(item.honors, out);
				if (Array.isArray(item.coursework) && item.coursework.length)
					out.push(`Coursework: ${inline(item.coursework)}`);
				break;

			case "projects":
				headline(out, str(item.name), [
					range(item.startDate, item.endDate, item.current),
					str(item.role),
					str(item.url),
				]);
				if (item.description) out.push(String(item.description).trim());
				bullets(item.highlights, out);
				if (Array.isArray(item.technologies) && item.technologies.length)
					out.push(`Technologies: ${inline(item.technologies)}`);
				break;

			case "skills": {
				// The template draws a category label and its chips on one line.
				const name = str(item.name);
				const values = inline(item.skills);
				if (name && values) out.push(`${name}: ${values}`);
				else if (values) out.push(values);
				break;
			}

			case "certifications":
				headline(out, str(item.name), [
					date(item.date),
					str(item.issuer),
					item.noExpiration ? "" : date(item.expirationDate),
				]);
				if (item.credentialId)
					out.push(`Credential: ${str(item.credentialId)}`);
				if (item.url) out.push(str(item.url));
				break;

			case "awards":
				headline(out, str(item.title), [date(item.date), str(item.issuer)]);
				if (item.description) out.push(String(item.description).trim());
				break;

			case "languages": {
				const name = str(item.name);
				const level = str(item.proficiency);
				if (name) out.push(level ? `${name} — ${level}` : name);
				break;
			}

			case "publications":
				headline(out, str(item.title), [
					date(item.date),
					str(item.publisher),
					str(item.url),
				]);
				if (item.description) out.push(String(item.description).trim());
				break;

			case "volunteer":
				headline(out, str(item.role, item.title), [
					range(item.startDate, item.endDate, item.current),
					str(item.organization),
					str(item.location),
					str(item.cause),
				]);
				if (item.description) out.push(String(item.description).trim());
				bullets(item.highlights, out);
				break;

			case "references":
				headline(out, str(item.name), [
					str(item.position),
					str(item.company),
					str(item.relationship),
				]);
				if (item.email) out.push(`Email: ${str(item.email)}`);
				if (item.phone) out.push(`Phone: ${str(item.phone)}`);
				break;

			default: {
				// `custom` and anything new: emit the fields that carry text, with their
				// keys, because there is no template order to follow.
				for (const [key, value] of Object.entries(item)) {
					if (key === "id" || key === "order") continue;
					if (Array.isArray(value)) {
						bullets(value, out);
					} else if (isEmittedValue(value)) {
						out.push(String(value).trim());
					}
				}
			}
		}
	}

	return out;
}

function safeStr(value: unknown): string {
	return value === undefined || value === null ? "" : String(value);
}

function str(...candidates: unknown[]): string {
	for (const candidate of candidates) {
		const value = safeStr(candidate).trim();
		if (value !== "") return value;
	}
	return "";
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
