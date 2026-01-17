// Resume data hooks (React Query)

export { useResume } from "../features/resume-editor/hooks/use-resume";
export { useSectionMutations } from "../features/resume-editor/hooks/use-section-mutations";
// UI state hooks (Zustand)
export { useActiveResumeId, useActiveResumeStore } from "./use-active-resume";
export type { SaveStatus } from "./use-auto-save";
// Auto-save hooks
export { useAutoSave } from "./use-auto-save";
export { useBeforeUnload } from "./use-before-unload";
// Utility hooks
export { ConfirmDialog, useConfirm } from "./use-confirm";
export { useResumeMutations } from "./use-resume-mutations";
export { useActiveResumes, useAllResumes, useResumes } from "./use-resumes";
