import { protectedProcedure } from "./trpc";
import {
  withResumeOwnership,
  withSectionOwnership,
  withUserSelfAccess,
} from "./middleware/ownership";

/**
 * Protected procedure + resume ownership verification.
 * Checks for resume ID in either `input.id` or `input.resumeId`.
 * Provides `ctx.resume` with the verified resume.
 */
export const ownedResumeProcedure = protectedProcedure.use(withResumeOwnership);

/**
 * Protected procedure + section ownership verification.
 * Use when input contains `id` (section ID).
 * Provides `ctx.section` and `ctx.resume` with the verified entities.
 */
export const ownedSectionProcedure = protectedProcedure.use(withSectionOwnership);

/**
 * Protected procedure + user self-access verification.
 * Ensures users can only access/modify their own user data.
 * Input must contain `id` (user ID).
 */
export const ownedUserProcedure = protectedProcedure.use(withUserSelfAccess);
