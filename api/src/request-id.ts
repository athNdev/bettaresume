/**
 * Request correlation.
 *
 * Every response carries an `x-request-id`, and every server-side log line about a
 * failure carries the same value. Without it, a user reporting "saving failed" has
 * nothing to quote and an operator has a wall of timestamps to guess between; the
 * CORS layer already exposed the header to the browser, which made the absence an
 * unfulfilled promise rather than a missing feature.
 *
 * The client's own id is honoured when it is well-formed, so a retry or a proxy that
 * already assigned one keeps its correlation. Anything unparseable is replaced rather
 * than echoed: this value ends up in a response header and in logs, and reflecting
 * arbitrary client bytes into both is how log injection and header-splitting start.
 */

/** A conservative id shape: the alphabet of UUIDs, base64url and hex. */
const VALID_ID = /^[A-Za-z0-9_-]{8,128}$/;

/** Header name, in the lower case Workers' Headers implementation normalises to. */
export const REQUEST_ID_HEADER = "x-request-id";

/**
 * The id for this request: the caller's if it is valid, otherwise a fresh UUID.
 *
 * Exported so the rule can be tested without going through a Worker.
 */
export function resolveRequestId(inbound: string | null | undefined): string {
	if (inbound && VALID_ID.test(inbound)) return inbound;
	return crypto.randomUUID();
}

/**
 * Attach the id to a header set.
 *
 * Takes the `Headers` it is given rather than returning new ones, because every
 * response path in `server.ts` — CORS preflight, tRPC, health, 405, 404 — already
 * builds its own `Headers` and then calls one of the `apply*Headers` helpers.
 */
export function applyRequestId(headers: Headers, requestId: string): void {
	headers.set(REQUEST_ID_HEADER, requestId);
}
