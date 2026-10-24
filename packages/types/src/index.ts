/**
 * @bettaresume/types
 * Shared types, schemas, and utilities for BettaResume
 */

// Metadata merge, shared by the API's write path and the client's optimistic cache
export * from "./metadata";
// Shared revision-history content projection (server hash + browser diff)
export * from "./revision-projection";
// Export all Zod schemas
export * from "./schemas";
// Export all types
export * from "./types";
