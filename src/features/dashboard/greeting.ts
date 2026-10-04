/**
 * The name to greet someone by.
 *
 * Kept out of the component so it can be tested directly: this is the one place where
 * "signed-in user" turns into words on screen, and every branch here is a case where the
 * obvious thing is wrong.
 */

type MaybeUser = {
	name?: string | null;
	email?: string | null;
} | null;

/**
 * Best available name, or `undefined` when there is nothing to call someone.
 *
 * Order matters, and the two fallbacks are not interchangeable:
 *
 * - `name` may be absent entirely, which is common for a social login, so it cannot be
 *   relied on.
 * - The email local part is a real, recognisable name far more often than a placeholder is
 *   ("Welcome back, there" tells the reader nothing about whether they are signed in as
 *   themselves).
 * - A single leading initial looks like a bug rather than a greeting, so short or
 *   initial-only names are passed over in favour of the email.
 *
 * Blank and whitespace-only strings are treated as absent: an auth provider that returns
 * `""` or `" "` is telling us it does not have a name, and `" ".trim()` is not a name.
 */
export function greetingName(user: MaybeUser): string | undefined {
	const name = user?.name?.trim();
	if (name) {
		const first = name.split(/\s+/)[0] as string;
		// A lone initial is not a name to greet someone by.
		if (first.length > 1) return first;
	}

	const local = user?.email?.trim().split("@")[0]?.trim();
	// A single-letter email local part ("a@…") is no better than an initial.
	if (local && local.length > 1) return local;

	return undefined;
}
