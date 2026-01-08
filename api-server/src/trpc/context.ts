import { createClerkClient, type ClerkClient } from '@clerk/backend';
import { createDb, type Database } from '../db';

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
  });

  try {
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
    };
  } catch (error) {
    console.error('Error creating context:', error);
    return unauthenticatedContext();
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
