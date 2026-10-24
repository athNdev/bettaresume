import { create } from "zustand";
import type { FitReport } from "@/lib/layout/page-fit";

/**
 * How many pages the compiled preview has, and what the page-fit probe measured.
 *
 * The page count is the single most-asked question about a resume and it is only
 * knowable after the Typst preview compiles, which happens in one component while
 * the rubric lives in another. This is the smallest thing that connects them: the
 * preview publishes the numbers, the review panel and the fit meter read them, and
 * neither imports the other.
 *
 * `null` means "not compiled yet", which is a different answer from zero pages and
 * the rubric reports it as such rather than guessing. `fit` is `null` independently:
 * the preview can render while the measurement compile has not landed yet, or has
 * failed, and a meter that says "not measured" beats one that draws a zero.
 */
interface PreviewPagesState {
	pageCount: number | null;
	fit: FitReport | null;
	/** True while a measurement compile is in flight. */
	measuring: boolean;
	setPageCount: (count: number | null) => void;
	setFit: (fit: FitReport | null) => void;
	setMeasuring: (measuring: boolean) => void;
}

export const usePreviewPages = create<PreviewPagesState>((set) => ({
	pageCount: null,
	fit: null,
	measuring: false,
	setPageCount: (pageCount) => set({ pageCount }),
	setFit: (fit) => set({ fit, measuring: false }),
	setMeasuring: (measuring) => set({ measuring }),
}));
