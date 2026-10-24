/**
 * Response hardening for the API.
 *
 * These are headers a Worker can set and a GitHub-Pages-hosted frontend cannot, so
 * this is where they belong. Every one of them is a header the deployed API was not
 * sending: `curl -D - https://api.bettaresume.com/health` returned CORS, NEL and the
 * Cloudflare chain, and nothing else.
 *
 * Deliberately absent: `Content-Security-Policy`. A CSP protects a document, and this
 * origin serves JSON to a fetch client — it has no document to protect. The frontend
 * is where a CSP would matter, and it is served by GitHub Pages, which cannot send
 * response headers at all. A `<meta http-equiv>` CSP is the only option there, and
 * this app's frontend needs Clerk's script, a WASM compiler, and Next's inline
 * hydration bootstrap. A hand-rolled policy that got any of those wrong would break
 * sign-in — an outage in exchange for a header that protects a page with no user
 * input rendered as HTML. `docs/UI-FEATURE-PASS.md` records the decision to skip it
 * rather than ship one that cannot be verified in a browser.
 */

/**
 * The headers, applied to every response the Worker can produce.
 *
 * - `nosniff` — the API returns JSON and plain-text errors. Without it a browser may
 *   decide an error body is HTML and render it, which turns a reflected string into a
 *   document.
 * - `no-referrer` — the URL is an API endpoint; there is nothing worth forwarding to a
 *   third party, and the referring page may carry a resume id in its path.
 * - `no-store` — every response is scoped to one user's Bearer token. A shared cache
 *   holding one would serve it to somebody else. Cloudflare does not cache Worker
 *   responses by default; this makes that a guarantee rather than a default.
 * - `Strict-Transport-Security` — the API is HTTPS-only. One year, subdomains included,
 *   so a downgrade attempt fails before the first request body leaves the browser.
 */
export const SECURITY_HEADERS: ReadonlyArray<readonly [string, string]> = [
	["X-Content-Type-Options", "nosniff"],
	["Referrer-Policy", "no-referrer"],
	["Cache-Control", "no-store"],
	["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
];

/**
 * Apply the hardening set to a header collection.
 *
 * Takes the `Headers` it is given, matching `applyRequestId` and the `apply*Headers`
 * helpers in `cors.ts`, because every response path in `server.ts` already builds its
 * own and would otherwise need a second one returned.
 */
export function applySecurityHeaders(headers: Headers): void {
	for (const [name, value] of SECURITY_HEADERS) {
		headers.set(name, value);
	}
}
