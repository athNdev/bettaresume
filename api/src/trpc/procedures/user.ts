import { userPreferencesSchema } from "@bettaresume/types";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
	contentItems,
	resumeRevisions,
	resumes,
	sections,
	users,
} from "../../db/schema";
import { buildShowcaseRows } from "../../db/showcase";
import { protectedProcedure, router } from "../index";

export const userRouter = router({
	/**
	 * Get the current authenticated user
	 */
	getMe: protectedProcedure.query(async ({ ctx }) => {
		const user = await ctx.db.query.users.findFirst({
			where: eq(users.id, ctx.userId),
			with: {
				resumes: true,
			},
		});

		if (!user) {
			// User exists in Clerk but not in our DB yet - this is handled by upsert
			return null;
		}

		return user;
	}),

	/**
	 * Create or update user record (called after Clerk authentication)
	 */
	upsert: protectedProcedure
		.input(
			z.object({
				email: z.string().email(),
				name: z.string().nullable().optional(),
				image: z.string().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();

			// Check if user exists
			const existingUser = await ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.userId),
			});

			if (existingUser) {
				// Update existing user
				await ctx.db
					.update(users)
					.set({
						email: input.email,
						name: input.name ?? existingUser.name,
						image: input.image ?? existingUser.image,
						updatedAt: now,
					})
					.where(eq(users.id, ctx.userId));

				return ctx.db.query.users.findFirst({
					where: eq(users.id, ctx.userId),
				});
			}

			// Create new user
			//
			// First sign-in is also the only time the showcase is seeded. See
			// `api/src/db/showcase.ts` for why: it is created once, it is the user's to
			// delete, and it does not come back. A document that reappears after every
			// sign-in would make "delete" a button that undoes itself.
			//
			// The user row and the showcase rows go in one `batch`, which D1 applies
			// atomically, so a first sign-in can never leave a user with half an example.
			// If the fixture itself is broken the batch rolls back and we retry with the
			// user alone: an unavailable example is a missing feature, an unavailable
			// account is a broken product.
			const userRow = {
				id: ctx.userId,
				email: input.email,
				name: input.name ?? null,
				image: input.image ?? null,
				createdAt: now,
				updatedAt: now,
			};
			const showcase = buildShowcaseRows({ userId: ctx.userId });
			const statements = [
				ctx.db.insert(users).values(userRow),
				ctx.db.insert(contentItems).values(showcase.contentItems),
				ctx.db.insert(resumes).values(showcase.resumes),
				ctx.db.insert(sections).values(showcase.sections),
				ctx.db.insert(resumeRevisions).values(showcase.revisions),
			] as const;
			try {
				// `batch` is the D1 primitive and the one that ships. The API suite runs the
				// same procedures against better-sqlite3, whose Drizzle adapter has no
				// `batch`; falling back to sequential execution keeps the seeding path
				// exercised by tests instead of guarded by a mock. Production is atomic.
				if (typeof ctx.db.batch === "function") {
					await ctx.db.batch(statements);
				} else {
					for (const statement of statements) await statement;
				}
			} catch (error) {
				console.error(
					"[user.upsert] seeding the showcase failed; creating the user without it",
					error,
				);
				// A rolled-back batch leaves no user; a partially applied sequential run may
				// have created it. Only insert when it is actually missing.
				const created = await ctx.db.query.users.findFirst({
					where: eq(users.id, ctx.userId),
				});
				if (!created) {
					await ctx.db.insert(users).values(userRow);
				}
			}

			return ctx.db.query.users.findFirst({
				where: eq(users.id, ctx.userId),
			});
		}),

	/**
	 * Update user preferences (stored in metadata or separate table)
	 * For now, we'll return a simple acknowledgment
	 */
	updatePreferences: protectedProcedure
		.input(
			z.object({
				preferences: userPreferencesSchema.partial(),
			}),
		)
		.mutation(async ({ input }) => {
			// TODO: Store preferences in user metadata or separate table
			// For now, just acknowledge the update
			return {
				success: true,
				preferences: input.preferences,
			};
		}),
});
