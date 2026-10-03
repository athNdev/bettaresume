import type { ResumeSection, ResumeWithSections } from "../types";

/**
 * Has the draft diverged from what the server holds?
 *
 * This exists because the editor runs two versions of the document at once: a
 * **draft** that the preview renders and the forms write into, and the
 * **saved** resume the server returned. That split is deliberate — it is what
 * makes the preview live while you type — but it means "is my work saved?" is a
 * real question with a real answer, and nothing was computing it.
 *
 * Two consequences of not computing it, both of which had shipped:
 *
 * - `ExportButtons` was handed the saved resume while `TypstPreview` was handed the
 *   draft. Edit a bullet, do not press Save, export: the preview shows your edit and
 *   the file does not contain it. A WYSIWYG surface that lies about the artefact is
 *   worse than one that is merely ugly.
 * - There was no view-level save indicator at all, so nothing distinguished "saved"
 *   from "saved three edits ago" short of remembering which forms you had visited.
 *
 * ## Why this is not `JSON.stringify` on the whole object
 *
 * A whole-object stringify would also fire on a `new Date()` bumped into
 * `updatedAt` by an optimistic update, which is not a change the user made and not
 * one they can save. So the comparison is over the fields a save actually writes —
 * the same field set `diffSnapshot` requires, and for the same reason: a comparison
 * that omits a field hides a change that persisting would apply.
 *
 * Not a quality score and not a percentage anywhere near this file. It is a boolean
 * about one question.
 */

/** Everything `resume.update` and `section.update` persist. */
const RESUME_FIELDS = ["name", "template", "domain"] as const;

const SECTION_FIELDS = [
	"id",
	"type",
	"visible",
	"order",
	"contentItemId",
	"content",
] as const;

/**
 * Stable stringify: object keys sorted, so two structurally equal values compare
 * equal regardless of key insertion order.
 *
 * The draft is built by spreading objects in a different order than the server
 * returns them, so a plain `JSON.stringify` reports a difference on almost every
 * render and the indicator would be permanently "unsaved".
 */
function canonical(value: unknown): string {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	const entries = Object.entries(value as Record<string, unknown>)
		.filter(([, v]) => v !== undefined)
		.sort(([a], [b]) => (a < b ? -1 : 1));
	return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
}

/** Reduce a section to the fields that are actually persisted. */
function projectSection(section: ResumeSection) {
	const projected: Record<string, unknown> = {};
	for (const field of SECTION_FIELDS) {
		// `contentItemId` is optional on ResumeSection but `null` and "absent" are the
		// same thing to a save, so they must normalise to one value here.
		projected[field] =
			field === "contentItemId"
				? (section.contentItemId ?? null)
				: section[field];
	}
	return canonical(projected);
}

function projectSections(sections: readonly ResumeSection[] | undefined) {
	return [...(sections ?? [])]
		.sort((a, b) => a.order - b.order)
		.map(projectSection)
		.join("|");
}

/**
 * True when `draft` holds anything the server does not.
 *
 * `draft` may be null — it is, before the resume query resolves — which is not
 * dirty, it is absent.
 */
export function isDraftDirty(
	draft: ResumeWithSections | null | undefined,
	saved: ResumeWithSections | null | undefined,
): boolean {
	if (!draft || !saved) return false;

	for (const field of RESUME_FIELDS) {
		if ((draft[field] ?? null) !== (saved[field] ?? null)) return true;
	}

	// `metadata` holds the name, email, phone and the whole settings block, and it is
	// written by the personal-info form, the formatting toolbar and the job-target
	// panel. Comparing it is not optional: a metadata-only edit is precisely the one
	// that a section-only comparison reports as clean.
	if (canonical(draft.metadata) !== canonical(saved.metadata)) return true;

	return projectSections(draft.sections) !== projectSections(saved.sections);
}

/**
 * How many top-level things differ. For the save indicator's tooltip only —
 * "3 unsaved changes" counts name/template/metadata/section-order groups, never a
 * verdict on the document.
 */
export function draftChangeCount(
	draft: ResumeWithSections | null | undefined,
	saved: ResumeWithSections | null | undefined,
): number {
	if (!draft || !saved) return 0;
	let count = 0;
	for (const field of RESUME_FIELDS) {
		if ((draft[field] ?? null) !== (saved[field] ?? null)) count++;
	}
	if (canonical(draft.metadata) !== canonical(saved.metadata)) count++;
	if (projectSections(draft.sections) !== projectSections(saved.sections))
		count++;
	return count;
}
