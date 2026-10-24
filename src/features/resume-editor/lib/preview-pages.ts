import { create } from "zustand";

/**
 * How many pages the compiled preview has.
 *
 * The page count is the single most-asked question about a resume and it is only
 * knowable after the Typst preview compiles, which happens in one component while
 * the rubric lives in another. This is the smallest thing that connects them: the
 * preview publishes the number, the review panel reads it, and neither imports the
 * other.
 *
 * `null` means "not compiled yet", which is a different answer from zero pages and
 * the rubric reports it as such rather than guessing.
 */
interface PreviewPagesState {
	pageCount: number | null;
	setPageCount: (count: number | null) => void;
}

export const usePreviewPages = create<PreviewPagesState>((set) => ({
	pageCount: null,
	setPageCount: (pageCount) => set({ pageCount }),
}));
