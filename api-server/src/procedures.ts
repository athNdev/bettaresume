import { protectedProcedure } from "./trpc";
import {
  withResumeOwnership,
  withSectionOwnership,
  withUserSelfAccess,
} from "./middleware/ownership";

/**
 * Protected procedure + resume ownership verification.
 */
export const ownedResumeProcedure = protectedProcedure.use(withResumeOwnership);

/**
 * Protected procedure + section ownership verification.
 */
export const ownedSectionProcedure = protectedProcedure.use(withSectionOwnership);

/**
 * Protected procedure + user self-access verification.
 */
export const ownedUserProcedure = protectedProcedure.use(withUserSelfAccess);
