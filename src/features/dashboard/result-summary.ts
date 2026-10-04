/**
 * What to say about the resumes currently on screen.
 *
 * Kept out of the component so it can be tested directly, because every branch here is a
 * sentence a user reads and the failure mode is a sentence that is subtly wrong.
 */

type SummaryInput = {
	/** Resumes passing the current filter. */
	matched: number;
	/** Resumes the user has, before filtering. */
	total: number;
	/** The active search text, if any. */
	query?: string;
};

/** `1 resume` but `2 resumes`. English does not pluralise on zero this way. */
export function plural(n: number, singular: string, plural?: string): string {
	return n === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * One honest sentence about the result set.
 *
 * Two things this is careful about:
 *
 * - **Which number is which.** With a search active the count is "3 of 12", not "3", because
 *   a bare "3 matches" reads as "this account has three resumes" — true of the query, false
 *   of the data.
 * - **Announced, not decorative.** The dashboard filters client-side as you type, so the list
 *   changes without anything moving focus. Without a live region the change is invisible to a
 *   screen-reader user: the search box reports the query, and nothing reports the result.
 *
 * Returns `""` when there is nothing to show, because a count of zero next to an empty-state
 * message is two statements about the same fact, and the empty state is the better one.
 */
export function resultSummary({ matched, total, query }: SummaryInput): string {
	if (matched <= 0) return "";

	const trimmed = query?.trim();
	if (!trimmed) {
		return `${matched} ${plural(matched, "resume")}`;
	}

	const matches = `${matched} of ${total} ${plural(total, "resume")}`;
	return `${matches} match "${trimmed}"`;
}
