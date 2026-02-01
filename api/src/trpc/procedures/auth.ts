import { eq } from "drizzle-orm";
import { z } from "zod";
import { users } from "../../db/schema";
import { protectedProcedure, publicProcedure, router } from "../index";

export const authRouter = router({
	/**
	 * Verify session and upsert user
	 * Called after Clerk authentication to ensure user exists in our DB
	 */
	verifySession: protectedProcedure
		.input(
			z
				.object({
					email: z.string().email().optional(),
					name: z.string().nullable().optional(),
					image: z.string().nullable().optional(),
				})
				.optional(),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();

			// In dev mode, return mock user data
			if (ctx.isDevMode) {
				return {
					success: true,
					user: {
						id: ctx.userId,
						email: "dev@localhost.test",
						name: "Dev User",
						image: null,
						createdAt: now,
						updatedAt: now,
					},
					isNewUser: false,
					isDevMode: true,
				};
			}

			// Get user info from Clerk context or input
			const clerkUser = ctx.user;
			const email =
				input?.email ||
				(clerkUser &&
					"emailAddresses" in clerkUser &&
					clerkUser.emailAddresses?.[0]?.emailAddress) ||
				"";
			const name =
				input?.name ??
				(clerkUser && "firstName" in clerkUser
					? `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() ||
						null
					: null);
			const image =
				input?.image ??
				(clerkUser && "imageUrl" in clerkUser ? clerkUser.imageUrl : null);

			if (!email) {
				throw new Error("Email is required");
			}

			// Check if user exists
			let user = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.userId),
			});

			let isNewUser = false;

			if (!user) {
				// Create new user
				isNewUser = true;
				await ctx.db.insert(users).values({
					id: ctx.userId,
					email,
					name,
					image,
					createdAt: now,
					updatedAt: now,
				});

				user = await ctx.db.query.users.findFirst({
					where: eq(users.id, ctx.userId),
				});
			} else {
				// Update existing user (sync from Clerk)
				await ctx.db
					.update(users)
					.set({
						email,
						name: name ?? user.name,
						image: image ?? user.image,
						updatedAt: now,
					})
					.where(eq(users.id, ctx.userId));

				user = await ctx.db.query.users.findFirst({
					where: eq(users.id, ctx.userId),
				});
			}

			return {
				success: true,
				user,
				isNewUser,
				isDevMode: false,
			};
		}),

	/**
	 * Check if the API is reachable and auth is working
	 * Public endpoint for health checks
	 */
	healthCheck: publicProcedure.query(async ({ ctx }) => {
		return {
			status: "ok",
			timestamp: new Date().toISOString(),
			isAuthenticated: !!ctx.userId,
			isDevMode: ctx.isDevMode,
		};
	}),
});
