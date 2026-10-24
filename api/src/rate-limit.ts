/**
 * Edge rate limiting.
 *
 * ## Why this exists
 *
 * Every tRPC procedure is behind `protectedProcedure`, so a caller needs a valid Clerk
 * token — but nothing stopped a valid token from issuing thousands of requests a second.
 * The expensive paths are not hypothetical: `section.bulkUpsert` writes many rows,
 * `revision.restore` deletes and re-inserts every section, and `resume.createVariation`
 * copies a whole document. A script with one token could make the database the bottleneck
 * for everyone.
 *
 * ## Why the platform's limiter and not a counter in D1
 *
 * A D1-backed counter is a write on every request, on the same database the request is
 * about to use, which makes the limiter a load amplifier. Cloudflare's Rate Limiting
 * binding is a per-colo token bucket implemented outside the Worker, costs no D1 write,
 * and is free on the current plan.
 *
 * The trade is that it is per-colo and eventually consistent: a caller spread across ten
 * colos gets ten buckets. That is the right trade for this product — the goal is stopping
 * a runaway client, not enforcing a billing quota — and it is stated here rather than
 * implied.
 *
 * ## Why the key is the IP and not the user id
 *
 * The user id only exists after `createContext` has verified the JWT, which happens
 * *inside* the tRPC handler — after the work this is meant to protect. The IP is available
 * before any parsing, and Cloudflare sets `CF-Connecting-IP` at the edge, so it cannot be
 * spoofed by the client the way `X-Forwarded-For` can.
 */

/** What the Worker's `ratelimits` binding provides. */
export interface RateLimitBinding {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** Only the part of `Env` this module needs, so tests can supply a stub. */
export interface RateLimitEnv {
	RATE_LIMITER?: RateLimitBinding;
}

/**
 * `Retry-After` value on a rejection.
 *
 * Matches the 60-second window configured in `wrangler.jsonc`. Sending it is what turns
 * "you are being throttled" into something a client can act on; without it a well-behaved
 * retry loop has to guess.
 */
export const RATE_LIMIT_RETRY_AFTER_SECONDS = 60;

/**
 * The bucket a request is counted against.
 *
 * Falls back to a single shared bucket when the header is absent, which happens in local
 * development. Sharing one bucket there is deliberate: it keeps the code path identical
 * without inventing a per-request key that would make the limiter a no-op in dev and hide
 * a broken limiter until production.
 */
export function rateLimitKey(request: Request): string {
	return request.headers.get("cf-connecting-ip")?.trim() || "unknown";
}

/**
 * Check the limiter. Returns `null` when the request may proceed.
 *
 * An unset binding returns `null` too — a Worker deployed without the binding (a preview
 * environment, a test harness) must not fail closed and take the API down with it. The
 * protection is availability of the limiter, not correctness of the app.
 */
export async function checkRateLimit(
	env: RateLimitEnv,
	request: Request,
): Promise<{ retryAfterSeconds: number } | null> {
	const limiter = env.RATE_LIMITER;
	if (!limiter) return null;

	const { success } = await limiter.limit({ key: rateLimitKey(request) });
	if (success) return null;

	return { retryAfterSeconds: RATE_LIMIT_RETRY_AFTER_SECONDS };
}
