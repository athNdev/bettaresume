import { TRPCError } from "@trpc/server";
import { middleware } from "../index";

/**
 * Auth middleware that ensures user is authenticated via Clerk.
 */
export const authMiddleware = middleware(async ({ ctx, next }) => {
	if (!ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		});
	}

	return next({
		ctx: {
			...ctx,
			// `userId` is re-asserted so the narrowed type survives into handlers.
			// The Clerk user object is NOT resolved here — that would reintroduce a
			// network round-trip on every authenticated call for a field almost
			// nothing reads. Use `ctx.loadUser()` where the object is genuinely needed.
			userId: ctx.userId,
		},
	});
});
