/**
 * The local development authentication bypass, in one place.
 *
 * ## What this is for
 *
 * The API half already exists and is safe: `api/src/trpc/context.ts` grants a bypass only
 * when `ENVIRONMENT === "development"` **and** the request carries `x-dev-mode: true`.
 * `api/wrangler.jsonc` sets `ENVIRONMENT: "production"`, and every other value — including
 * unset — denies.
 *
 * The frontend half was removed, correctly, when the API gate was tightened. That left
 * local development needing real Clerk keys just to look at the dashboard, which in turn
 * meant **the dashboard and editor had never been visually verified by anyone**. This
 * restores the frontend half *without* reopening the hole.
 *
 * ## Why this cannot reach production
 *
 * Both conditions must hold, and both are resolved at build time:
 *
 *   1. `NEXT_PUBLIC_DEV_MODE === "true"`. `NEXT_PUBLIC_*` variables are inlined by Next at
 *      build time, and `.github/workflows/cd.yml` never sets this one — verified by
 *      grepping the workflows. So a production build contains the literal `false`.
 *   2. `process.env.NODE_ENV === "development"`. Next statically replaces this too, so a
 *      production build folds the branch away entirely.
 *
 * Two independent gates, either of which alone is sufficient to disable it. That is
 * deliberate: the previous bypass had one implicit gate and it failed.
 *
 * ## Why the artifact is asserted, not just the source
 *
 * `test/dev-bypass.test.ts` asserts on the *built output* that the string `x-dev-mode`
 * does not appear in a production build, and that `dev-bypass.mjs`/the module graph does
 * not reference it. Reading the source proves nothing here — the source is the thing that
 * was wrong last time. The claim that matters is "a deployed bundle cannot authenticate
 * without Clerk", and only the bundle can show that.
 */

const DEV_MODE_REQUESTED = process.env.NEXT_PUBLIC_DEV_MODE === "true";

/**
 * True only in a local development build that explicitly opted in.
 *
 * Named `DEV_BYPASS_ACTIVE` rather than `isDevBypass` because the value is fixed for the
 * lifetime of a build: it is two statically-replaced comparisons, not a runtime condition.
 */
export const DEV_BYPASS_ACTIVE =
	DEV_MODE_REQUESTED && process.env.NODE_ENV === "development";

/** The user id the API's dev bypass fabricates. Must match `api/src/trpc/context.ts`. */
export const DEV_USER_ID = "user-1";

/**
 * The shape the app's own auth store expects, so the dev session is indistinguishable from
 * a real one to every consumer downstream.
 */
export const DEV_USER = {
	id: DEV_USER_ID,
	email: "demo@example.com",
	name: "Demo User",
	picture: null,
	createdAt: "2026-01-01T00:00:00.000Z",
	emailVerified: true,
	preferences: {
		theme: "dark" as const,
		emailNotifications: true,
		autoSave: true,
		defaultTemplate: "minimal" as const,
	},
};
