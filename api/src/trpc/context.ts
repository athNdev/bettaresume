import { createClerkClient } from "@clerk/backend";
import { createDb } from "../db";

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
		console.error("Error creating context:", error);
		return unauthenticatedContext();
	}
}

export type Context = Awaited<ReturnType<typeof createContext>>;
