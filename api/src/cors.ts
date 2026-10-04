/**
 * CORS policy for the API worker.
 *
 * `ALLOWED_ORIGINS` is a comma-separated allow-list of EXACT origins. It is
 * DEFAULT-DENY: when the binding is unset or empty, no browser origin is
 * granted access. There is deliberately no fallback to "*".
 *
 * The previous implementation hardcoded `Access-Control-Allow-Origin: *` in
 * three places and omitted CORS headers entirely on the 404 path, while
 * api/.env.example documented an `ALLOWED_ORIGIN` control that no code read.
 * An operator reading that file had every reason to believe production was
 * restricted. It was not.
 */

export const ALLOWED_METHODS = "GET, POST, OPTIONS";

export const ALLOWED_REQUEST_HEADERS =
	"Content-Type, Authorization, x-trpc-source, trpc-accept";

/**
 * The header the local development auth bypass travels on. **Not** in
 * `ALLOWED_REQUEST_HEADERS`, on purpose.
 *
 * A custom request header forces a CORS preflight, so leaving it out of the allow-list
 * means no cross-origin browser can send it at all. That was the second half of the
 * original bypass: the Worker honoured the header, *and* CORS permitted it, so any site
 * on the internet could have obtained a session with one request.
 *
 * `requestHeadersFor` adds it only when `ENVIRONMENT === "development"`, which exists
 * solely in `api/wrangler.dev.jsonc` for the local Worker. Production keeps the exact
 * four headers above, so the header is unreachable from a browser even if it somehow
 * reached the origin.
 */
const DEV_ONLY_REQUEST_HEADERS = "x-dev-mode";

/** The single environment value that unlocks local development behaviour. */
const DEV_ENVIRONMENT = "development";

/**
 * The `Access-Control-Allow-Headers` value for this request.
 *
 * Exported so a test can assert the production list without going through a request.
 */
export function requestHeadersFor(environment: string | undefined): string {
	if (environment === DEV_ENVIRONMENT) {
		return `${ALLOWED_REQUEST_HEADERS}, ${DEV_ONLY_REQUEST_HEADERS}`;
	}
	return ALLOWED_REQUEST_HEADERS;
}

/**
 * Response headers a cross-origin browser client is allowed to read.
 *
 * `x-request-id` is not emitted yet — emitting it is the separate request-id
 * plumbing ticket. Listing it here means that ticket only has to start sending
 * the header; no second change to this file will be needed for the browser to
 * become able to read it.
 */
export const EXPOSED_HEADERS = "x-request-id";

/** The literal wildcard, recognised only as an explicit entry in the list. */
export const WILDCARD = "*";

/**
 * Character code of `/`, used by the trailing-slash trim in `normalizeOrigin`.
 * A named constant so the loop reads as what it is rather than as a magic
 * number.
 */
const SLASH = 47; // "/".charCodeAt(0)

/**
 * Upper bound on the `Origin` header this module will process.
 *
 * `Origin` is attacker-controlled. A real `scheme://host:port` is ~30-60
 * characters, so 256 leaves ample headroom while putting a hard ceiling on the
 * work done per request. Anything longer cannot match the allow-list and is
 * treated as non-matching rather than throwing — `normalizeOrigin` is called
 * from a predicate on the hot path, so it must not be able to fail a request.
 */
const MAX_ORIGIN_LENGTH = 256;

/**
 * Split a raw `ALLOWED_ORIGINS` binding into a list of trimmed, non-empty
 * entries. Unset, empty and whitespace-only values all yield `[]`, which means
 * "deny every origin".
 */
export function parseAllowedOrigins(raw: string | undefined | null): string[] {
	if (!raw) return [];
	return raw
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);
}

/**
 * Canonical form used for comparison: trimmed, no trailing slash, lower-cased.
 *
 * An `Origin` header is already serialized by the browser as
 * `scheme://host[:port]` with a lower-cased scheme and host, so this is a
 * no-op for well-behaved callers and only absorbs hand-written configuration
 * typos such as a trailing slash.
 */
export function normalizeOrigin(origin: string): string {
	// The `Origin` header is attacker-controlled, so the work done on it is
	// bounded rather than merely fast. `MAX_ORIGIN_LENGTH` is generous next to
	// the ~100 characters of a real `scheme://host:port` origin.
	if (origin.length > MAX_ORIGIN_LENGTH) {
		return "";
	}

	const value = origin.trim();

	// Strip trailing slashes without a regular expression. A `/+$` pattern is
	// linear in practice, but CodeQL flags it as a potential ReDoS because it
	// depends on library-controlled input, and a hand-rolled loop is both
	// provably linear and cheaper to verify.
	let end = value.length;
	while (end > 0 && value.charCodeAt(end - 1) === SLASH) {
		end -= 1;
	}

	return value.slice(0, end).toLowerCase();
}

/**
 * The single origin decision, kept pure so it can be unit-tested directly.
 *
 * `"*"` as an entry in the allow-list means "any origin" and is honoured —
 * local development sometimes needs it. It is NOT the default: an unset or
 * empty list denies everything. When the wildcard is present the caller is
 * expected to still echo the request's own `Origin` rather than emit a literal
 * `*`; see `applyCorsHeaders`.
 */
export function isOriginAllowed(
	origin: string | null | undefined,
	allowed: readonly string[],
): boolean {
	if (!origin) return false;

	const candidate = normalizeOrigin(origin);
	if (candidate.length === 0) return false;

	if (allowed.includes(WILDCARD)) return true;

	return allowed.some((entry) => normalizeOrigin(entry) === candidate);
}

/**
 * Write the CORS headers for one response onto `headers`.
 *
 * `Vary: Origin` is unconditional: once responses differ per origin, a shared
 * cache that ignores it will hand a caller the `Access-Control-Allow-Origin`
 * that was computed for a different origin.
 *
 * `Access-Control-Allow-Origin` is only ever written on an exact allow-list
 * match. When the origin is absent or not allowed, any inherited value is
 * removed so no wildcard can survive from an upstream response.
 */
export function applyCorsHeaders(
	headers: Headers,
	origin: string | null,
	allowed: readonly string[],
	environment?: string,
): void {
	headers.append("Vary", "Origin");
	headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
	headers.set("Access-Control-Allow-Headers", requestHeadersFor(environment));
	headers.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);

	if (isOriginAllowed(origin, allowed)) {
		// Echo the request's own origin, verbatim, even under the `*` wildcard.
		// A literal `Access-Control-Allow-Origin: *` is not usable together with
		// credentialed requests, and echoing keeps `Vary: Origin` meaningful.
		headers.set("Access-Control-Allow-Origin", origin as string);
	} else {
		headers.delete("Access-Control-Allow-Origin");
	}
}

/** Preflight response headers: the standard set plus the caching hint. */
export function applyPreflightHeaders(
	headers: Headers,
	origin: string | null,
	allowed: readonly string[],
	environment?: string,
): void {
	applyCorsHeaders(headers, origin, allowed, environment);
	headers.set("Access-Control-Max-Age", "86400");
}

/** Convenience wrapper: build the allow-list from an env binding. */
export function allowedOriginsFromEnv(env: {
	ALLOWED_ORIGINS?: string;
}): string[] {
	return parseAllowedOrigins(env.ALLOWED_ORIGINS);
}
