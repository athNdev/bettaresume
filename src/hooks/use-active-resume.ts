import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ActiveResumeState {
  /** Currently selected resume ID */
  activeResumeId: string | null;
  /** Set the active resume ID */
  setActiveResumeId: (id: string | null) => void;
  /** Clear the active resume (convenience method) */
  clearActiveResume: () => void;
}

/**
 * Minimal Zustand store for tracking the currently active resume.
 * This is UI-only state - the actual resume data comes from React Query.
 */
export const useActiveResumeStore = create<ActiveResumeState>()(
  persist(
    (set) => ({
      activeResumeId: null,
      setActiveResumeId: (id) => set({ activeResumeId: id }),
      clearActiveResume: () => set({ activeResumeId: null }),
    }),
    {
      name: "bettaresume-active-resume",
    }
  )
);

/**
 * Hook to get and set the active resume ID.
 * Returns the ID and setter function.
 */
export function useActiveResumeId() {
  const activeResumeId = useActiveResumeStore((state) => state.activeResumeId);
  const setActiveResumeId = useActiveResumeStore((state) => state.setActiveResumeId);
  return [activeResumeId, setActiveResumeId] as const;
}
