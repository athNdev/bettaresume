import { TRPCError } from "@trpc/server";
import { middleware } from "../trpc";
import type { Prisma } from "@prisma/client";

// Use Prisma's generated payload types for better compatibility
type Resume = Prisma.ResumeGetPayload<{}>;
type Section = Prisma.SectionGetPayload<{ include: { resume: true } }>;
type SectionWithResume = Section & { resume: Resume };

/**
 * Middleware that verifies the user owns the resume.
 * Checks for resume ID in either `input.id` or `input.resumeId`.
 * Adds `ctx.resume` with the verified resume.
 */
export const withResumeOwnership = middleware(async ({ ctx, input, next }) => {
  const typedInput = input as { id?: string; resumeId?: string };
  const resumeId = typedInput.resumeId ?? typedInput.id;

  if (!resumeId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Resume id is required (as 'id' or 'resumeId')",
    });
  }

  const resume = await ctx.db.resume.findUnique({
    where: { id: resumeId },
  });

  if (!resume) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Resume not found" });
  }

  if (resume.userId !== ctx.user!.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  return next({
    ctx: {
      ...ctx,
      resume,
    },
  });
});

/**
 * Middleware that verifies the user owns the section (via its resume).
 * Input must contain `id` (section ID).
 * Adds `ctx.section` and `ctx.resume` with the verified entities.
 */
export const withSectionOwnership = middleware(async ({ ctx, input, next }) => {
  const sectionId = (input as { id?: string })?.id;

  if (!sectionId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Section id is required",
    });
  }

  const section = await ctx.db.section.findUnique({
    where: { id: sectionId },
    include: { resume: true },
  });

  if (!section) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Section not found" });
  }

  if (section.resume.userId !== ctx.user!.id) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
  }

  return next({
    ctx: {
      ...ctx,
      section,
      resume: section.resume,
    },
  });
});

/**
 * Middleware that verifies the user is accessing their own data.
 */
export const withUserSelfAccess = middleware(async ({ ctx, input, next }) => {
  const userId = (input as { id?: string })?.id;

  if (!userId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "User id is required",
    });
  }

  if (userId !== ctx.user!.id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You can only access your own user data",
    });
  }

  return next({ ctx });
});

// Type exports for use in routers
export type ResumeOwnershipContext = {
  resume: Resume;
};

export type SectionOwnershipContext = {
  section: Section & { resume: Resume };
  resume: Resume;
};
