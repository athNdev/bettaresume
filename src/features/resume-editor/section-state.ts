/**
 * Is a section actually empty?
 *
 * The editor could not tell an empty section from one the user believes they have
 * filled. Both render as a form with blank-looking inputs, so "my Work Experience
 * vanished" and "I never filled in Work Experience" looked identical. A résumé is
 * mostly a list of these, so the ambiguity sits on the main path rather than at the
 * edge.
 *
 * The shapes here are genuinely inconsistent, which is the reason this is a function
 * with tests rather than a one-liner:
 *
 * - list sections (`experience`, `education`, `projects`, ...) store an **array**
 * - object sections (`personal-info`) store an **object** of mostly empty strings
 * - `summary` stores rich text under `html`, with no `data` at all
 * - a newly added section is seeded with `data: []`
 * - `data` may be `undefined`, `null`, or absent entirely
 *
 * A missing key, an empty array, an empty object, and an object whose every value is
 * an empty string are all the same user-facing state, so they must all report empty.
 */

type Json =
	| string
	| number
	| boolean
	| null
	| undefined
	| Json[]
	| { [k: string]: Json };

/** True when a value carries no user-visible content. */
function isBlankValue(value: Json): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.every(isBlankValue);
	if (typeof value === "object") {
		const values = Object.values(value);
		// An object with no keys is empty; one whose keys are all blank is also empty.
		return values.every(isBlankValue);
	}
	// `false` and `0` are real content (e.g. a flag, a score), unlike null/undefined.
	return false;
}

export interface SectionLike {
	content?: {
		title?: string;
		data?: unknown;
		html?: string;
	} | null;
}

/**
 * True when the section has nothing for the reader.
 *
 * `content.title` is deliberately ignored: every section carries a default title, so
 * a title is never evidence that the user filled anything in.
 */
export function isSectionEmpty(
	section: SectionLike | null | undefined,
): boolean {
	if (!section?.content) return true;
	const { data, html } = section.content;

	// `summary` keeps its rich text in `html` and has no `data`.
	if (typeof html === "string" && html.trim() !== "") return false;
	if (html === undefined && data === undefined) return true;

	if (data === undefined) {
		// Only `html` exists and it was blank.
		return true;
	}

	return isBlankValue(data as Json);
}
