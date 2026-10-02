import { createClerkClient } from "@clerk/backend";
import type { D1Database } from "@cloudflare/workers-types";
import { TRPCError } from "@trpc/server";
import { createDb } from "../db";

export interface Env {
	CLERK_PUBLISHABLE_KEY: string;
	CLERK_SECRET_KEY: string;
	CLOUDFLARE_ACCOUNT_ID: string;
	CLOUDFLARE_DATABASE_ID: string;
	CLOUDFLARE_D1_TOKEN: string;
	LOCAL_DB_PATH: string;
	/**
	 * Explicit deployment environment. The dev-mode auth bypass activates ONLY when this
	 * is exactly "development". Any other value — including unset — leaves the bypass off.
	 */
	ENVIRONMENT?: string;
	/**
	 * Comma-separated allow-list of exact browser origins permitted to call this
	 * API, read by src/cors.ts.
	 *
	 * DEFAULT-DENY: when unset or empty, no origin is granted access — there is
	 * no fallback to "*". Local development must therefore set this explicitly
	 * (e.g. "http://localhost:3000") or the browser will block every call.
	 */
	ALLOWED_ORIGINS?: string;
	bettaresume_d1: D1Database;
}

/**
 * The single environment value that unlocks the dev-mode auth bypass.
 * Default-deny: only this exact string activates it.
 */
const DEV_ENVIRONMENT = "development";

/** Default-deny dev-bypass gate. */
function isDevEnvironment(env: Env): boolean {
	return env.ENVIRONMENT === DEV_ENVIRONMENT;
}

/**
 * True when the caller actually presented credentials. Used to distinguish a normal
 * logged-out request from a real authentication failure (outage / bad token).
 */
function hasCredentials(request: Request): boolean {
	const authorization = request.headers.get("authorization");
	if (authorization && authorization.trim().length > 0) {
		return true;
	}

	for (const header of [
		"cookie",
		"x-clerk-auth-token",
		"x-clerk-session-token",
	]) {
		const value = request.headers.get(header);
		if (value && value.trim().length > 0) {
			return true;
		}
	}

	return false;
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
		// Dev mode bypass: requires BOTH the opt-in header AND an explicitly
		// development ENVIRONMENT binding. In every other environment the header is
		// ignored, so a stray or malicious x-dev-mode cannot fabricate a session.
		const devBypassRequested = request.headers.get("x-dev-mode") === "true";

		if (devBypassRequested && isDevEnvironment(env)) {
			console.log(
				"[createContext] Dev mode enabled via x-dev-mode header (ENVIRONMENT=development)",
			);
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

		if (devBypassRequested) {
			console.warn(
				"[createContext] Ignored x-dev-mode header: ENVIRONMENT is not 'development'",
			);
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

		// Fetch the full user object
		const user = await clerkClient.users.getUser(userId);

		return {
			db,
			user,
			userId,
			env,
			clerkClient,
			isDevMode: false,
		};
	} catch (error) {
		// Credentials were supplied but verification threw (Clerk outage, network
		// failure, malformed token, ...). Do NOT silently degrade to "logged out":
		// that hides a real outage behind a benign-looking anonymous response.
		console.error("Error creating context:", error);

		if (hasCredentials(request)) {
			throw new TRPCError({
				code: "INTERNAL_SERVER_ERROR",
				message: "Authentication verification failed",
				cause: error,
			});
		}

		return unauthenticatedContext();
	}
}

export type Context = Awaited<ReturnType<typeof createContext>>;
