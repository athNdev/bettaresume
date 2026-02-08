/// <reference types="@cloudflare/workers-types" />
import { createClerkClient, type ClerkClient } from '@clerk/backend';
import { createDb, type Database } from '../db';

interface CreateContextOptions {
  request: Request;
  env: any;
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
      const cached = await env.CACHE?.get(cacheKey, 'json');
      if (cached) {
        user = cached;
      } else {
        // Cache miss - fetch from Clerk API
        user = await clerkClient.users.getUser(userId);
        
        // Store in cache for 5 minutes (300 seconds)
        await env.CACHE?.put(cacheKey, JSON.stringify(user), {
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
      isDevMode: false, // Default to false
    };
  } catch (error) {
    console.error('Error creating context:', error);
    const ctx = unauthenticatedContext();
    return { ...ctx, isDevMode: false };
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>;
