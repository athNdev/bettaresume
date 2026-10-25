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

/** Narrow helper for call sites that only have a `Resume`. */
export type ShowcaseResume = Pick<Resume, "id" | "tags" | "variationType">;
