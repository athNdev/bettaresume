import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const trpcRouter = t.router({
  // your procedures here
});

export type TrpcRouter = typeof trpcRouter;

// Public procedure - no auth required
export const publicProcedure = t.procedure;

// Protected procedure - requires authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,    // Now guaranteed to be non-null
      userId: ctx.userId, // Now guaranteed to be non-null
    },
  });
});
