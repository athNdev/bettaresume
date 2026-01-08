/**
 * Store Barrel Export
 * 
 * Note: useResumeStore is deprecated - use hooks from @/hooks instead:
 * - useResumes() for fetching resume list
 * - useResume(id) for fetching single resume
 * - useResumeMutations() for CRUD operations
 * - useSectionMutations(resumeId) for section operations
 * - useActiveResumeStore for UI state (active resume ID)
 */

export { useAuthStore } from './auth.store';

// Deprecated - keeping for backwards compatibility during migration
// TODO: Remove after full migration to React Query
export { useResumeStore } from './resume.store';
