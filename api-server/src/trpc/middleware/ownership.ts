/**
 * Ownership verification utilities for resume-related procedures.
 * 
 * This module provides helper functions to verify that a user owns
 * a resume before performing operations on it.
 * 
 * Note: The backend procedures already enforce ownership by filtering
 * with `eq(resumes.userId, ctx.userId)`. These utilities provide
 * additional explicit checks when needed.
 */

import { TRPCError } from '@trpc/server';
import { eq, and } from 'drizzle-orm';
import type { Context } from '../context';
import { resumes } from '../../db/schema';

/**
 * Verifies that the authenticated user owns the specified resume.
 * Throws FORBIDDEN if the resume doesn't belong to the user.
 * Throws NOT_FOUND if the resume doesn't exist.
 * 
 * @param ctx - The tRPC context containing user and database
 * @param resumeId - The ID of the resume to verify ownership for
 * @returns The resume record if ownership is verified
 * 
 * @example
 * ```typescript
 * // In a procedure:
 * const resume = await verifyResumeOwnership(ctx, input.resumeId);
 * // Now safe to operate on the resume
 * ```
 */
export async function verifyResumeOwnership(
  ctx: Context & { userId: string },
  resumeId: string
) {
  const resume = await ctx.db.query.resumes.findFirst({
    where: eq(resumes.id, resumeId),
  });

  if (!resume) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Resume not found',
    });
  }

  if (resume.userId !== ctx.userId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to access this resume',
    });
  }

  return resume;
}

/**
 * Helper to check ownership without throwing - returns boolean.
 * Useful for conditional logic or soft checks.
 * 
 * @example
 * ```typescript
 * const canAccess = await checkResumeOwnership(ctx, resumeId);
 * if (!canAccess) {
 *   // Handle unauthorized access gracefully
 * }
 * ```
 */
export async function checkResumeOwnership(
  ctx: Context & { userId: string },
  resumeId: string
): Promise<boolean> {
  const resume = await ctx.db.query.resumes.findFirst({
    where: and(
      eq(resumes.id, resumeId),
      eq(resumes.userId, ctx.userId)
    ),
  });

  return !!resume;
}

/**
 * Type for the resume table select type.
 * Useful when working with verified resumes in procedures.
 */
export type ResumeRecord = typeof resumes.$inferSelect;
