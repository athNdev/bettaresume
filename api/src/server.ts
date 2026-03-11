import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";
import { createContext } from "./trpc/context";

export default {
	async fetch(
		request: Request,
		env: Env,
		_ctx: ExecutionContext,
	): Promise<Response> {
		const allowedOrigin = env.ALLOWED_ORIGIN || "*";

		// Handle CORS preflight
		if (request.method === "OPTIONS") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": allowedOrigin,
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers":
						"Content-Type, Authorization, x-trpc-source, trpc-accept, x-dev-mode",
					"Access-Control-Max-Age": "86400",
				},
			});
		}

		const url = new URL(request.url);

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

			// Add CORS headers to response
			const headers = new Headers(response.headers);
			headers.set("Access-Control-Allow-Origin", allowedOrigin);
			headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
			headers.set(
				"Access-Control-Allow-Headers",
				"Content-Type, Authorization, x-trpc-source, trpc-accept, x-dev-mode",
			);

			return new Response(response.body, {
				status: response.status,
				statusText: response.statusText,
				headers,
			});
		}

		// Health check endpoint
		if (url.pathname === "/health" || url.pathname === "/") {
			return new Response(
				JSON.stringify({
					status: "ok",
					timestamp: new Date().toISOString(),
					service: "bettaresume-api",
				}),
				{
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": allowedOrigin,
					},
				},
			);
		}

		return new Response("Not Found", { status: 404 });
	},
};
