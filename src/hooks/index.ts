// Resume data hooks (React Query)
export { useResumes, useActiveResumes, useAllResumes } from "./use-resumes";
export { useResume } from "./use-resume";
export { useResumeMutations } from "./use-resume-mutations";
export { useSectionMutations } from "./use-section-mutations";

// UI state hooks (Zustand)
export { useActiveResumeStore, useActiveResumeId } from "./use-active-resume";

// Utility hooks
export { useConfirm, ConfirmDialog } from "./use-confirm";

// Auto-save hooks
export { useAutoSave } from "./use-auto-save";
export type { SaveStatus } from "./use-auto-save";
export { useBeforeUnload } from "./use-before-unload";
