import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { db } from "./db";

/**
 * Context type for tRPC procedures
 */
export interface Context {
  db: typeof db;
  user: { id: string; email: string } | null;
  headers: Headers;
}

/**
 * Create context from request headers
 * In production, validate JWT token here
 */
export const createContext = async (opts: { headers: Headers }): Promise<Context> => {
  // Extract and validate JWT from Authorization header
  const authHeader = opts.headers.get("authorization");
  let user: Context["user"] = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    // TODO: Validate JWT token and extract user info
    // For now, we'll use a simple mock - replace with real JWT validation
    try {
      user = await validateToken(token);
    } catch {
      // Invalid token - user remains null
    }
  }

  return {
    db,
    user,
    headers: opts.headers,
  };
};

/**
 * Validate JWT token and return user info
 * Replace this with actual JWT validation (e.g., jose library)
 */
async function validateToken(token: string): Promise<Context["user"]> {
  // TODO: Implement proper JWT validation
  // For development, accept a simple user ID token
  // In production, use jose or similar to verify JWT signature
  
  if (process.env.NODE_ENV === "development" && token.startsWith("dev:")) {
    const userId = token.slice(4);
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    return user;
  }

  // Production JWT validation would go here
  // Example with jose:
  // const { payload } = await jwtVerify(token, secret);
  // return { id: payload.sub, email: payload.email };

  return null;
}

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Middleware for timing (optional, useful for debugging)
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();
  const result = await next();
  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms`);
  return result;
});

/**
 * Router and procedure helpers
 */
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const middleware = t.middleware;

/**
 * Public procedure - no auth required
 */
export const publicProcedure = t.procedure.use(timingMiddleware);

/**
 * Protected procedure - requires authenticated user
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user, // Now guaranteed non-null
      },
    });
  });
