/**
 * Protected procedure + user self-access verification.
 * Ensures users can only access/modify their own user data.
 * Input must contain `id` (user ID).
 */
export const ownedUserProcedure = protectedProcedure.use(withUserSelfAccess);
