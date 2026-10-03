import type { SectionType } from "@bettaresume/types";
import {
	type ExtractedSection,
	REVIEW_THRESHOLD,
} from "@/lib/import/sectioner";

/**
 * What an import writes into the content library, and how the library reads it back.
 *
 * ## Why this lives in the payload and not in a new column
 *
 * "Unreviewed" is a property of a content item, so the obvious home for it is a
 * `reviewedAt` column on `content_items`. It is not here, and the reason is recorded in
 * `CLAUDE.md`: `CLOUDFLARE_API_TOKEN` currently lacks D1 permission, so
 * `wrangler d1 migrations apply --remote` fails in CD with `code 7403` and **migrations
 * are not reaching production**. A migration added today would parse locally, pass CI,
 * and then have the deployed worker query a column that does not exist -- a runtime
 * failure on every library read, for every user, with no code change to point at.
 *
 * So the review state travels inside `payload`, which `sectionContentSchema` already
 * accepts because it is `.passthrough()`. The cost is real and worth naming: `content.list`
 * has to select `payload` to report the flag, so the library list transfers each item's
 * body. For a personal library of resume sections that is a few kilobytes; for a library
 * of thousands it would not be, and that is the point at which a column and a working
 * migration become the right answer.
 *
 * ## Nothing is renamed into a shape it does not have
 *
 * The sectioner emits a date range as one string under the key `startDate`, because that
 * is where it read it from. Storing `"Jan 2020 - Present"` into a field the rest of the
 * app calls `startDate` would be a mislabelled value: every consumer would render a range
 * where a start date belongs, and none of them would know why. So the range is stored
 * under `period`, which is what it is. Splitting it into start and end is a decision, and
 * decisions belong to the user reviewing the item -- which is why the item lands unreviewed.
 */

/** The key the review state is stored under, inside `content_items.payload`. */
export const IMPORT_META_KEY = "importMeta";

export type ImportSource = "pdf" | "docx" | "paste";

export interface ImportFieldNote {
	/** Where the value lives, e.g. `entries.0.organization` or `bullets.2`. */
	path: string;
	confidence: number;
	/** Why this confidence, in the sectioner's own words. Shown to the user. */
	reason: string;
}

export interface ImportMeta {
	/**
	 * False until the user has looked at this item.
	 *
	 * An item arrives unreviewed and stays that way until someone confirms it. The
	 * library shows the flag; nothing else changes, because the item is not in a resume
	 * and cannot be until the user attaches it.
	 */
	reviewed: boolean;
	source: ImportSource;
	sourceName: string;
	importedAt: string;
	headingConfidence: number;
	/** Every field the sectioner emitted, with its confidence and why. */
	fields: ImportFieldNote[];
	/** The untouched source text for this section, so nothing is lost in translation. */
	raw: string;
}

/** Shape written to `content_items.payload`. `sectionContentSchema` is passthrough. */
export type LibraryPayload = Record<string, unknown> & {
	title?: string;
	data?: Record<string, unknown>[];
	[IMPORT_META_KEY]?: ImportMeta;
};

function note(
	path: string,
	confidence: number,
	reason: string,
): ImportFieldNote {
	return { path, confidence, reason };
}

/**
 * Flatten one extracted section into library content.
 *
 * ## The mapping is deliberately conservative
 *
 * - Entry sections become one record per entry, keyed by the sectioner's own field
 *   names. `title`/`organization`/`period` are what the sectioner actually read, so the
 *   record says the same thing the source did.
 * - Flat sections become one `{ text }` record per line, verbatim.
 * - A section that parsed into neither (an experience block with no recognisable entry)
 *   falls back to its raw lines, so there is no path by which extracted text reaches the
 *   library as nothing at all. Dropping content and inventing it fail the same way from
 *   the user's side: either way the item is not what they wrote.
 * - Every value's confidence goes to `importMeta.fields`, not onto the value itself.
 *   Threading confidence through the content shape would make it a second source of
 *   truth for something the sectioner already decided.
 */
export function toLibraryPayload(
	section: ExtractedSection,
	// `reviewed` is excluded on purpose: it is set to false below, on the only code path
	// that creates an imported item. Making a caller pass it would be one more way for an
	// import to land already marked reviewed.
	meta: Omit<ImportMeta, "fields" | "raw" | "reviewed">,
): LibraryPayload {
	const fields: ImportFieldNote[] = [
		note(
			"heading",
			section.confidence,
			`Heading read as "${section.rawHeading}"`,
		),
	];

	let data: Record<string, unknown>[];

	if (section.entries.length > 0) {
		data = section.entries.map((entry, index) => {
			const record: Record<string, unknown> = {};
			for (const [key, value] of Object.entries(entry.fields)) {
				record[key] = value.value;
				fields.push(
					note(`entries.${index}.${key}`, value.confidence, value.reason),
				);
			}
			record.bullets = entry.bullets.map((bullet, b) => {
				fields.push(
					note(
						`entries.${index}.bullets.${b}`,
						bullet.confidence,
						bullet.reason,
					),
				);
				return bullet.value;
			});
			return record;
		});
	} else {
		const lines = section.bullets.length > 0 ? section.bullets : [];
		data = lines.map((line, index) => {
			fields.push(note(`bullets.${index}`, line.confidence, line.reason));
			return { text: line.value };
		});
	}

	if (data.length === 0) {
		// Nothing was recognised, but the text exists. Keep it as lines rather than
		// presenting an empty item that looks like a clean extraction.
		data = section.raw
			.split(/\r?\n/)
			.map((l) => l.trim())
			.filter(Boolean)
			.map((text) => ({ text }));
	}

	return {
		title: section.title,
		data,
		[IMPORT_META_KEY]: {
			...meta,
			// An imported item is unreviewed by construction. This is not a default that
			// a caller can forget: it is set here, on the only path that creates one.
			reviewed: false,
			fields,
			raw: section.raw,
		},
	};
}

/** Read the import state back out of a stored payload. Null for anything not imported. */
export function readImportMeta(payload: unknown): ImportMeta | null {
	if (!payload || typeof payload !== "object") return null;
	const meta = (payload as LibraryPayload)[IMPORT_META_KEY];
	if (!meta || typeof meta !== "object") return null;
	return meta as ImportMeta;
}

/**
 * Is this library item awaiting review?
 *
 * `null` meta means the item was written by the user, not by an import, so it is not
 * "reviewed" -- it never needed to be. Only an imported item can be unreviewed.
 */
export function isUnreviewed(payload: unknown): boolean {
	const meta = readImportMeta(payload);
	return meta !== null && meta.reviewed === false;
}

/** A copy of the payload with the review flag set. Does not mutate the argument. */
export function withReviewed(
	payload: unknown,
	reviewed: boolean,
): LibraryPayload {
	const base = (
		payload && typeof payload === "object" ? payload : {}
	) as LibraryPayload;
	const meta = readImportMeta(base);
	if (!meta) return base;
	return { ...base, [IMPORT_META_KEY]: { ...meta, reviewed } };
}

/** How many of a section's fields sit below the review threshold. */
export function countNeedingReview(notes: ImportFieldNote[]): number {
	return notes.filter((n) => n.confidence < REVIEW_THRESHOLD).length;
}

/**
 * A short label for the library row.
 *
 * Prefers what the sectioner actually read over the section type, so an imported role
 * shows as the role rather than as the word "experience" repeated nine times.
 */
export function libraryTitleFor(
	section: ExtractedSection,
	payload: LibraryPayload,
): string {
	const first = payload.data?.[0];
	if (first) {
		for (const key of ["title", "organization", "name", "text"]) {
			const value = first[key];
			if (typeof value === "string" && value.trim()) return value.trim();
		}
	}
	return section.title || (section.type as SectionType);
}
