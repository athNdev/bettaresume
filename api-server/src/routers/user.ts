import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { ownedUserProcedure } from "../procedures";

export const userRouter = createTRPCRouter({
  // Get current authenticated user
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.user.id },
      include: { resumes: true },
    });
  }),

  // Get user by ID (protected - users can only access their own data)
  getById: ownedUserProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.user.findUnique({
        where: { id: input.id },
        include: { resumes: true },
      });
    }),

  // Get user by email (protected - users can only access their own data)
  getByEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      if (input.email !== ctx.user.email) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only access your own user data",
        });
      }
      return ctx.db.user.findUnique({
        where: { email: input.email },
        include: { resumes: true },
      });
    }),

  // List all users (protected - only returns current user)
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      where: { id: ctx.user.id },
      include: { resumes: true },
    });
  }),

  // Create user
  create: publicProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.create({
        data: {
          email: input.email,
          name: input.name,
        },
      });
    }),

  // Get or create user (useful for auth flows)
  getOrCreate: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.user.findUnique({
        where: { email: input.email },
      });

      if (existing) {
        return existing;
      }

      return ctx.db.user.create({
        data: { email: input.email },
      });
    }),

  // Update user (middleware ensures self-access only)
  update: ownedUserProcedure
    .input(z.object({
      id: z.string(),
      email: z.string().email().optional(),
      name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.user.update({
        where: { id },
        data,
      });
    }),

  // Delete user (middleware ensures self-access only)
  delete: ownedUserProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.delete({ where: { id: input.id } });
      return true;
    }),
});
