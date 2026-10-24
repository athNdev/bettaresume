"use client";

/**
 * TypstPreview — renders a resume using Typst WASM compiled SVG pages.
 *
 * Drop-in replacement for the HTML-based Preview component.
 * Accepts the same props; renders each Typst page as a positioned SVG
 * inside a fixed-size container that matches the exact page dimensions.
 */

import { AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { usePreviewPages } from "@/features/resume-editor/lib/preview-pages";
import type { Resume } from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";
import { useTypstPreview } from "../hooks/use-typst-preview";

interface TypstPreviewProps {
	resume: Resume;
	scale?: number;
	className?: string;
}

export function TypstPreview({
	resume,
	scale = 1,
	className,
}: TypstPreviewProps) {
	const {
		svgPages,
		isLoading,
		error,
		fallbackPageWidth,
		fallbackPageHeight,
		fit,
	} = useTypstPreview(resume);

	/*
	 * Publish the page count and the measured fit. They are only knowable here, after
	 * compilation, and the review panel's rubric and the toolbar's fit meter need them —
	 * "how many pages is my resume" is the question a candidate actually asks. `null`
	 * while nothing has compiled, which the rubric reports as unknown rather than as zero.
	 */
	const setPageCount = usePreviewPages((s) => s.setPageCount);
	const setFit = usePreviewPages((s) => s.setFit);
	useEffect(() => {
		setPageCount(svgPages.length > 0 ? svgPages.length : null);
	}, [svgPages, setPageCount]);
	useEffect(() => {
		setFit(fit);
	}, [fit, setFit]);

	// Use fallback dimensions (in pt) only for the skeleton/error placeholders.
	// Real pages derive their size from the actual SVG attributes.
	const placeholderStyle: React.CSSProperties = {
		width: fallbackPageWidth * scale * (96 / 72),
		height: fallbackPageHeight * scale * (96 / 72),
		position: "relative",
		backgroundColor: "#ffffff",
		boxShadow:
			"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
		marginBottom: 16 * scale,
	};

	return (
		<div className={cn("flex flex-col items-center", className)}>
			{/*
			 * Loading: a skeleton page at the real page's dimensions, shaped like the
			 * document it stands in for (name, rule, heading + body lines). The audit
			 * found the page area blank while the WASM compiles; the skeleton matches
			 * the loaded layout's metrics so the transition does not jump, and the
			 * region is a polite status so it is announced.
			 */}
			{isLoading && svgPages.length === 0 && (
				<div aria-busy="true" role="status" style={placeholderStyle}>
					<span className="sr-only">Rendering preview</span>
					<div
						className="flex h-full flex-col"
						style={{ padding: 48 * scale, gap: 12 * scale }}
					>
						<Skeleton className="h-3 w-1/2 rounded-xs" />
						<Skeleton className="h-px w-full rounded-xs" />
						{[0, 1].map((group) => (
							<div
								className="flex flex-col"
								key={group}
								style={{ gap: 8 * scale }}
							>
								<Skeleton className="h-2 w-1/3 rounded-xs" />
								<Skeleton className="h-1.5 w-full rounded-xs" />
								<Skeleton className="h-1.5 w-11/12 rounded-xs" />
								<Skeleton className="h-1.5 w-4/5 rounded-xs" />
							</div>
						))}
					</div>
				</div>
			)}

			{/* Error state */}
			{error && !isLoading && svgPages.length === 0 && (
				<div style={placeholderStyle}>
					<div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
						<AlertTriangle aria-hidden className="h-5 w-5 text-destructive" />
						<p className="font-medium text-destructive text-sm">
							Preview unavailable
						</p>
						<p className="text-muted-foreground text-xs">{error.message}</p>
					</div>
				</div>
			)}

			{/* SVG pages — each page sizes itself from the actual SVG dimensions */}
			{svgPages.map((svg, i) => (
				<TypstPage
					isLoading={isLoading}
					// biome-ignore lint/suspicious/noArrayIndexKey: SVG pages have no natural ID
					key={`page-${i}`}
					scale={scale}
					svg={svg}
				/>
			))}
		</div>
	);
}

// -------------------------------------------------------
// Single page renderer
// -------------------------------------------------------

interface TypstPageProps {
	svg: string;
	scale: number;
	isLoading: boolean;
}

function TypstPage({ svg, scale, isLoading }: TypstPageProps) {
	// Parse the actual page dimensions (in Typst pt units) from the SVG element.
	// The SVG produced by splitSvgPages already has width/height from the
	// `data-typst-page-width/height` attributes, so this is reliable.
	const dims = parseSvgDimensions(svg);

	// Convert pt → CSS px at screen resolution (72pt = 96px, so factor = 96/72)
	const PT_TO_PX = 96 / 72;
	const cssWidth = dims.width * PT_TO_PX * scale;
	const cssHeight = dims.height * PT_TO_PX * scale;

	const src = useSvgObjectUrl(svg);

	return (
		<div
			style={{
				width: cssWidth,
				height: cssHeight,
				backgroundColor: "#ffffff",
				boxShadow:
					"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
				marginBottom: 16 * scale,
				// Dim slightly while a new compile is in progress
				opacity: isLoading ? 0.7 : 1,
				transition: "opacity 150ms ease",
			}}
		>
			{src ? (
				/*
				 * An `<img>`, NOT `dangerouslySetInnerHTML`.
				 *
				 * The SVG comes from the Typst compiler and is safe today because Typst
				 * escapes the text it lays out. Injecting it as markup made the whole
				 * preview depend on that being true forever, and a hand-rolled strip of
				 * script tags was both a CodeQL finding and the wrong shape of fix.
				 *
				 * An SVG loaded through `<img>` is parsed as an image: scripts do not run,
				 * event-handler attributes do nothing, and external references are not
				 * fetched. That is guaranteed by the spec rather than by this code, which
				 * is the property worth having. Nothing here renders a photo or any other
				 * external resource — Typst outlines its glyphs — so there is nothing to
				 * lose.
				 *
				 * The size comes from CSS now instead of string-replacing `width`/`height`
				 * attributes, so the compiler's own output is passed through untouched.
				 */
				// biome-ignore lint/performance/noImgElement: the image is a blob URL the browser just created; `next/image` cannot optimise a compiled page
				<img
					alt=""
					aria-hidden="true"
					src={src}
					style={{
						display: "block",
						width: cssWidth,
						height: cssHeight,
					}}
				/>
			) : null}
		</div>
	);
}

/**
 * A blob URL for one compiled page, revoked when the page or its SVG changes.
 *
 * A blob URL keeps the SVG string out of the DOM entirely and costs no base64
 * inflation, which a `data:` URL would. `image/svg+xml` in `<img>` is an image context,
 * so the browser's SVG script and external-resource restrictions apply.
 */
function useSvgObjectUrl(svg: string): string | null {
	const [src, setSrc] = useState<string | null>(null);

	useEffect(() => {
		const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
		setSrc(url);
		return () => URL.revokeObjectURL(url);
	}, [svg]);

	return src;
}

// -------------------------------------------------------
// Helper — parse width/height (pt units) from an SVG string
// -------------------------------------------------------

function parseSvgDimensions(svg: string): { width: number; height: number } {
	const wMatch = svg.match(/\bwidth="([^"]+)"/);
	const hMatch = svg.match(/\bheight="([^"]+)"/);
	const width = wMatch ? Number.parseFloat(wMatch[1] ?? "") : 612;
	const height = hMatch ? Number.parseFloat(hMatch[1] ?? "") : 792;
	// Guard against NaN (e.g. "100%" width on a fallback raw SVG)
	return {
		width: Number.isFinite(width) ? width : 612,
		height: Number.isFinite(height) ? height : 792,
	};
}
