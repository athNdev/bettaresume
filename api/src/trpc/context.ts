import { createClerkClient } from "@clerk/backend";
import { createDb } from "../db";
import type { D1Database } from "@cloudflare/workers-types";

interface Env {
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;
	CLOUDFLARE_ACCOUNT_ID: string;
	CLOUDFLARE_DATABASE_ID: string;
	CLOUDFLARE_D1_TOKEN: string;
	LOCAL_DB_PATH: string;
	bettaresume_d1: D1Database;
}

interface CreateContextOptions {
	request: Request;
	env: Env;
}

/**
 * createContext() runs on every procedure call
 * Generates a context, which is passed down to procedures
 */
export async function createContext({ request, env }: CreateContextOptions) {
	// Initialize database
	const db = createDb(env.bettaresume_d1);

	const clerkClient = createClerkClient({
		secretKey: env.CLERK_SECRET_KEY,
		publishableKey: env.CLERK_PUBLISHABLE_KEY,
	});

	// Helper to return unauthenticated context
	const unauthenticatedContext = () => ({
		db,
		user: null,
		userId: null,
		env,
		clerkClient,
		isDevMode: false,
	});

	try {
		// Check for dev mode bypass header
		const isDevMode = request.headers.get("x-dev-mode") === "true";

		if (isDevMode) {
			console.log("[createContext] Dev mode enabled via x-dev-mode header");
			return {
				db,
				user: {
					id: "user-1",
					emailAddresses: [{ emailAddress: "demo@example.com" }],
				} as any,
				userId: "user-1",
				env,
				clerkClient,
				isDevMode: true,
			};
		}

		// Use Clerk's built-in request authentication
		const authResult = await clerkClient.authenticateRequest(request, {
			secretKey: env.CLERK_SECRET_KEY,
			publishableKey: env.CLERK_PUBLISHABLE_KEY,
		});

		if (!authResult.isAuthenticated) {
			return unauthenticatedContext();
		}

		const { userId } = authResult.toAuth();

		// Try to get user from KV cache first (5-minute TTL)
		const cacheKey = `clerk_user:${userId}`;
		let user;
		
		try {
			const cached = await (env as any).CACHE?.get(cacheKey, 'json');
			if (cached) {
				user = cached;
			} else {
				// Cache miss - fetch from Clerk API
				user = await clerkClient.users.getUser(userId);
				
				// Store in cache for 5 minutes (300 seconds)
				await (env as any).CACHE?.put(cacheKey, JSON.stringify(user), {
					expirationTtl: 300,
				});
			}
		} catch (cacheError) {
			// If KV fails, fall back to direct Clerk API call
			console.warn('KV cache error, falling back to direct API:', cacheError);
			user = await clerkClient.users.getUser(userId);
		}

		return {
			db,
			user,
			userId,
			env,
			clerkClient,
			isDevMode: false,
		};
	} catch (error) {
		console.error("Error creating context:", error);
		return unauthenticatedContext();
	}
}

export type Context = Awaited<ReturnType<typeof createContext>>;
