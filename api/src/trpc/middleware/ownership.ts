/**
 * Ownership verification utilities for resume-related procedures.
 *
 * This module provides helper functions to verify that a user owns
 * a resume before performing operations on it.
 *
 * Two distinct jobs live here:
 *
 * 1. `verifyResumeOwnership` / `checkResumeOwnership` — read-side helpers that
 *    answer "does this user own this resume?". They are exported for use by
 *    procedures that want an explicit check, but note that no procedure currently
 *    calls them: the procedures do their own inline lookup with
 *    `and(eq(resumes.id, ...), eq(resumes.userId, ctx.userId))`.
 *
 * 2. `sectionWriteScope` / `resumeWriteScope` — the WRITE-side tenant predicates.
 *    These are used by the section and resume write procedures so that every
 *    `UPDATE` / `DELETE` carries its tenant constraint in the `WHERE` clause
 *    instead of relying on a preceding read to have got it right. A read-check
 *    alone is not authorisation: the write itself must be scoped.
 */

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { resumes, sections } from "../../db/schema";
import type { Context } from "../context";

/**
 * Tenant predicate for every write against a single section row.
 *
 * Matches only when BOTH the section id and its parent resume match, so a caller
 * can never mutate a section that hangs off somebody else's resume — even if they
 * supply that section's id. Same shape as the per-row predicate in
 * `section.reorder`.
 *
 * Pure: no context, no database access, so it is directly unit-testable.
 */
export function sectionWriteScope(sectionId: string, resumeId: string) {
	return and(eq(sections.id, sectionId), eq(sections.resumeId, resumeId));
}

/**
 * Tenant predicate for every write against a single resume row.
 *
 * Pure: no context, no database access, so it is directly unit-testable.
 */
export function resumeWriteScope(resumeId: string, userId: string) {
	return and(eq(resumes.id, resumeId), eq(resumes.userId, userId));
}

/**
 * Error thrown when a caller supplies a section id that does not belong to the
 * resume they are writing to.
 *
 * Deliberately NOT_FOUND rather than FORBIDDEN: answering "that id exists but
 * belongs to someone else" would turn the endpoint into a probe for guessing
 * other tenants' section ids. Both cases get the same answer.
 */
export function sectionScopeError() {
	return new TRPCError({
		code: "NOT_FOUND",
		message: "Section not found in this resume",
	});
}

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
	resumeId: string,
) {
	const resume = await ctx.db.query.resumes.findFirst({
		where: eq(resumes.id, resumeId),
	});

	if (!resume) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Resume not found",
		});
	}

	if (resume.userId !== ctx.userId) {
		throw new TRPCError({
			code: "FORBIDDEN",
			message: "You do not have permission to access this resume",
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
	resumeId: string,
): Promise<boolean> {
	const resume = await ctx.db.query.resumes.findFirst({
		where: and(eq(resumes.id, resumeId), eq(resumes.userId, ctx.userId)),
	});

	return !!resume;
}

/**
 * Type for the resume table select type.
 * Useful when working with verified resumes in procedures.
 */
export type ResumeRecord = typeof resumes.$inferSelect;
