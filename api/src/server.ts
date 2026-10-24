import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import {
	applyCorsHeaders,
	applyPreflightHeaders,
	parseAllowedOrigins,
} from "./cors";
import { checkRateLimit } from "./rate-limit";
import {
	applyRequestId,
	REQUEST_ID_HEADER,
	resolveRequestId,
} from "./request-id";
import { appRouter } from "./root";
import { applySecurityHeaders } from "./security-headers";
import type { Env } from "./trpc/context";
import { createContext } from "./trpc/context";

/**
 * Apply everything that belongs on *every* response — the request id and the
 * hardening set — in one call.
 *
 * Each path below used to remember its own headers individually, which is how the
 * CORS policy originally ended up inconsistent across four branches. One helper makes
 * "every response" literal rather than a thing four code blocks must each get right.
 */
function baseHeaders(requestId: string): Headers {
	const headers = new Headers();
	applyRequestId(headers, requestId);
	applySecurityHeaders(headers);
	return headers;
}

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get("origin");

		/*
		 * One id for this request, on every path.
		 *
		 * `cors.ts` already listed `x-request-id` in `Access-Control-Expose-Headers`,
		 * so the browser was told it could read a header nobody sent. Emitting it here
		 * is what makes that promise true, and it is also what makes a user's "saving
		 * failed" report actionable: the id in their response header appears in the
		 * Worker's log line for the failure they hit.
		 */
		const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));

		// Default-deny: an unset or empty ALLOWED_ORIGINS yields an empty list, and
		// no origin then matches. This used to hardcode `*` in three places and send
		// no CORS headers at all on the 404 path.
		const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);

		if (request.method === "OPTIONS") {
			const headers = baseHeaders(requestId);
			applyPreflightHeaders(headers, origin, allowed, env.ENVIRONMENT);
			return new Response(null, { headers });
		}

		if (url.pathname.startsWith("/trpc")) {
			/*
			 * Before any parsing, token verification or database work.
			 *
			 * The limiter is keyed by IP rather than user id because the user id is only
			 * known after `createContext` has verified the JWT inside the tRPC handler —
			 * which is after the work this is meant to protect. `CF-Connecting-IP` is set
			 * by Cloudflare at the edge, so it cannot be spoofed by the caller.
			 */
			const limited = await checkRateLimit(env, request);
			if (limited) {
				const headers = baseHeaders(requestId);
				headers.set("Content-Type", "application/json");
				headers.set("Retry-After", String(limited.retryAfterSeconds));
				applyCorsHeaders(headers, origin, allowed, env.ENVIRONMENT);
				return new Response(
					JSON.stringify({
						error: "Too many requests",
						requestId,
					}),
					{ status: 429, headers },
				);
			}

			const response = await fetchRequestHandler({
				endpoint: "/trpc",
				req: request,
				router: appRouter,
				createContext: () => createContext({ request, env, requestId }),
				onError({ path, error }) {
					// The id leads the line so `grep <id>` finds it whatever the message.
					console.error(
						`[${requestId}] Error in tRPC handler on path '${path}':`,
						error,
					);
				},
			});

			// Start from tRPC's own headers (it sets `content-type`), then add ours.
			const headers = new Headers(response.headers);
			applyRequestId(headers, requestId);
			applySecurityHeaders(headers);
			applyCorsHeaders(headers, origin, allowed, env.ENVIRONMENT);

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		}

		if (url.pathname === "/health" || url.pathname === "/") {
			// Previously any method was accepted and POST was silently ignored, which
			// told callers a write had been handled when nothing had.
			if (request.method !== "GET" && request.method !== "HEAD") {
				const headers = baseHeaders(requestId);
				headers.set("Allow", "GET");
				applyCorsHeaders(headers, origin, allowed, env.ENVIRONMENT);
				return new Response("Method Not Allowed", {
					status: 405,
					headers,
				});
			}

			const headers = baseHeaders(requestId);
			headers.set("Content-Type", "application/json");
			applyCorsHeaders(headers, origin, allowed, env.ENVIRONMENT);

			return new Response(
				JSON.stringify({
					status: "ok",
					timestamp: new Date().toISOString(),
					service: "bettaresume-api",
					requestId,
				}),
				{ headers },
			);
		}

		const headers = baseHeaders(requestId);
		applyCorsHeaders(headers, origin, allowed, env.ENVIRONMENT);
		return new Response("Not Found", { status: 404, headers });
	},
};
