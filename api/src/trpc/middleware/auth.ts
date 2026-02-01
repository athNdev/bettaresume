import { TRPCError } from "@trpc/server";
import { middleware } from "../index";

/**
 * Auth middleware that ensures user is authenticated via Clerk.
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
	if (!ctx.user || !ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		});
	}

	return next({
		ctx: {
			...ctx,
			user: ctx.user,
			userId: ctx.userId,
		},
	});
});
