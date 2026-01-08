import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { router, protectedProcedure } from '../index';
import { users } from '../../db/schema';
import { userPreferencesSchema } from '@bettaresume/types';

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
      })
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
      await ctx.db.insert(users).values({
        id: ctx.userId,
        email: input.email,
        name: input.name ?? null,
        image: input.image ?? null,
        createdAt: now,
        updatedAt: now,
      });

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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Store preferences in user metadata or separate table
      // For now, just acknowledge the update
      return {
        success: true,
        preferences: input.preferences,
      };
    }),
});
