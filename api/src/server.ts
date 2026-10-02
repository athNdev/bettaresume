import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import {
	applyCorsHeaders,
	applyPreflightHeaders,
	parseAllowedOrigins,
} from "./cors";
import { appRouter } from "./root";
import { createContext } from "./trpc/context";

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);
		const origin = request.headers.get("origin");

		// Default-deny: an unset or empty ALLOWED_ORIGINS yields an empty list, and
		// no origin then matches. This used to hardcode `*` in three places and send
		// no CORS headers at all on the 404 path.
		const allowed = parseAllowedOrigins(env.ALLOWED_ORIGINS);

		if (request.method === "OPTIONS") {
			const headers = new Headers();
			applyPreflightHeaders(headers, origin, allowed);
			return new Response(null, { headers });
		}

		if (url.pathname.startsWith("/trpc")) {
			const response = await fetchRequestHandler({
				endpoint: "/trpc",
				req: request,
				router: appRouter,
				createContext: () => createContext({ request, env }),
				onError({ path, error }) {
					console.error(`Error in tRPC handler on path '${path}':`, error);
				},
			});

			const headers = new Headers(response.headers);
			applyCorsHeaders(headers, origin, allowed);

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		}

		if (url.pathname === "/health" || url.pathname === "/") {
			// Previously any method was accepted and POST was silently ignored, which
			// told callers a write had been handled when nothing had been.
			if (request.method !== "GET" && request.method !== "HEAD") {
				const headers = new Headers({ Allow: "GET" });
				applyCorsHeaders(headers, origin, allowed);
				return new Response("Method Not Allowed", {
					status: 405,
					headers,
				});
			}

			const headers = new Headers({ "Content-Type": "application/json" });
			applyCorsHeaders(headers, origin, allowed);

			return new Response(
				JSON.stringify({
					status: "ok",
					timestamp: new Date().toISOString(),
					service: "bettaresume-api",
				}),
				{ headers },
			);
		}

		const headers = new Headers();
		applyCorsHeaders(headers, origin, allowed);
		return new Response("Not Found", { status: 404, headers });
	},
};
