import { TRPCError } from "@trpc/server";
import { middleware } from "@/server/api/trpc";
import type { Resume, Section } from "../../../../generated/prisma";

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

  // Note: This middleware is used with protectedProcedure which guarantees session.user exists
  if (resume.userId !== ctx.session!.user.id) {
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

  // Note: These middleware are used with protectedProcedure which guarantees session.user exists
  if (section.resume.userId !== ctx.session!.user.id) {
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

// Type exports for use in routers
export type ResumeOwnershipContext = {
  resume: Resume;
};

export type SectionOwnershipContext = {
  section: Section & { resume: Resume };
  resume: Resume;
};
