import type { Resume } from "@bettaresume/types";

/**
 * The seeded example resume.
 *
 * The tag is the contract between `api/src/db/seed.sql` and the UI: the dashboard badge
 * and the "View the example" entry point both key off it, so a re-seeded example with a
 * new id still works. `api/test/showcase.test.ts` asserts the seed carries it.
 *
 * The base document is the entry point, not a variation: the one-pager is the thing a
 * reviewer wants to open, and the full CV is reachable from it through the variation
 * manager.
 */
export const SHOWCASE_TAG = "showcase";

export function isShowcase(resume: {
	tags?: readonly string[] | null;
}): boolean {
	return Array.isArray(resume.tags) && resume.tags.includes(SHOWCASE_TAG);
}

/**
 * The base showcase in a library, or the first tagged resume when no base is visible.
 *
 * The fallback matters when the base is archived but a variation is not: showing the
 * variation is more useful than hiding the entry point entirely.
 */
export function findShowcase<
	T extends { tags?: readonly string[] | null; variationType?: string },
>(resumes: readonly T[]): T | undefined {
	return (
		resumes.find(
			(resume) => isShowcase(resume) && resume.variationType === "base",
		) ?? resumes.find(isShowcase)
	);
}

/**
 * The showcase pinned to the front of the library, deliberately ordered.
 *
 * Two things were wrong with leaving this to the API's `updatedAt desc`:
 *
 * - The full CV led and the one-pager came second. The one-pager is the stronger
 *   artefact — the same person, every feature, one page — so it should greet someone
 *   opening the library.
 * - The two showcase cards could be separated by anything updated between them. They
 *   are one example in two shapes; they read as a pair or as a mistake.
 *
 * Rank, not a sort key: base first, then its variations, then everything else in the
 * order the query returned. `Array.prototype.sort` is stable, so "everything else"
 * keeps the recency order the API chose.
 */
export function orderShowcaseFirst<
	T extends { tags?: readonly string[] | null; variationType?: string },
>(resumes: readonly T[]): T[] {
	const rank = (resume: T) => {
		if (!isShowcase(resume)) return 2;
		return resume.variationType === "base" ? 0 : 1;
	};
	return [...resumes].sort((a, b) => rank(a) - rank(b));
}

/** Narrow helper for call sites that only have a `Resume`. */
export type ShowcaseResume = Pick<Resume, "id" | "tags" | "variationType">;
