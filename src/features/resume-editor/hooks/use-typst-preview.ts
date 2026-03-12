/**
 * useTypstPreview — compiles a Resume to SVG pages via Typst WASM.
 *
 * - Debounces changes by 300 ms to avoid re-compiling on every keystroke.
 * - Cancels in-flight compilations when the resume changes.
 * - Returns individual SVG strings per page (one per Typst page break).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { Resume } from "@/features/resume-editor/types";
import { getTemplateSource } from "@/features/resume-editor/typst_templates";
import { compileToSvgPages } from "@/lib/typst/compiler";
import { resumeToTypstJson } from "@/lib/typst/serialize";

export interface UseTypstPreviewResult {
	/** One SVG string per page, in order. Empty while loading. */
	svgPages: string[];
	/** True during the first load or any recompile. */
	isLoading: boolean;
	/** Set if the last compile failed. */
	error: Error | null;
	/**
	 * Fallback page dimensions (in Typst pt units) derived from settings,
	 * used only while pages haven't loaded yet.
	 */
	fallbackPageWidth: number;
	fallbackPageHeight: number;
}

const DEBOUNCE_MS = 350;

export function useTypstPreview(
	resume: Resume | null | undefined,
): UseTypstPreviewResult {
	const [svgPages, setSvgPages] = useState<string[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Stable refs so the effect closure always reads the latest values
	const resumeRef = useRef(resume);
	resumeRef.current = resume;

	// Cancellation token: increment to cancel a pending compile
	const cancelTokenRef = useRef(0);

	// Debounce timer
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const compile = useCallback(async (token: number) => {
		const r = resumeRef.current;
		if (!r) return;

		setIsLoading(true);
		setError(null);

		try {
			const templateSource = getTemplateSource(r.template ?? "minimal");
			const dataJson = resumeToTypstJson(r);
			const rawFont = r.metadata?.settings?.fontFamily ?? "Inter";
			const FONT_MAP: Record<string, string> = {
				inter: "Inter",
				roboto: "Roboto",
				"open sans": "Open Sans",
				lato: "Lato",
				montserrat: "Montserrat",
				"playfair display": "Playfair Display",
			};
			const fontFamily = FONT_MAP[rawFont.toLowerCase()] ?? rawFont;

			const pages = await compileToSvgPages(
				templateSource,
				dataJson,
				fontFamily,
			);

			// Only update state if this compile is still the latest
			if (cancelTokenRef.current === token) {
				setSvgPages(pages);
				setError(null);
			}
		} catch (err) {
			if (cancelTokenRef.current === token) {
				setError(err instanceof Error ? err : new Error(String(err)));
				// Keep showing the last successful pages on error
			}
		} finally {
			if (cancelTokenRef.current === token) {
				setIsLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		if (!resume) {
			setSvgPages([]);
			setIsLoading(false);
			setError(null);
			return;
		}

		// Debounce: cancel any pending timer
		if (timerRef.current) clearTimeout(timerRef.current);

		const token = ++cancelTokenRef.current;

		timerRef.current = setTimeout(() => {
			// Only show the loading indicator when a compile is actually about to run,
			// not on every intermediary tick while the user is dragging a slider.
			setIsLoading(true);
			compile(token);
		}, DEBOUNCE_MS);

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [resume, compile]);

	// Fallback dimensions (pt units, matching Typst paper sizes) used only
	// before the first compile finishes.
	const pageSize = resume?.metadata?.settings?.pageSize ?? "Letter";
	const fallbackPageWidth = pageSize === "A4" ? 595 : 612;
	const fallbackPageHeight = pageSize === "A4" ? 842 : 792;

	return { svgPages, isLoading, error, fallbackPageWidth, fallbackPageHeight };
}
