"use client";

/**
 * TypstPreview — renders a resume using Typst WASM compiled SVG pages.
 *
 * Drop-in replacement for the HTML-based Preview component.
 * Accepts the same props; renders each Typst page as a positioned SVG
 * inside a fixed-size container that matches the exact page dimensions.
 */

import { Loader2 } from "lucide-react";
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
	const { svgPages, isLoading, error, fallbackPageWidth, fallbackPageHeight } =
		useTypstPreview(resume);

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
			{/* Loading state — show skeleton page placeholder */}
			{isLoading && svgPages.length === 0 && (
				<div style={placeholderStyle}>
					<div className="flex h-full items-center justify-center">
						<Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
					</div>
				</div>
			)}

			{/* Error state */}
			{error && !isLoading && svgPages.length === 0 && (
				<div style={placeholderStyle}>
					<div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
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

	// Stamp the CSS pixel size onto the SVG element so the browser renders it
	// at exactly the right size (the viewBox coordinates are in pt, so the
	// browser needs explicit pixel dimensions to know the display size).
	const scaledSvg = svg
		.replace(/width="[^"]*"/, `width="${cssWidth}"`)
		.replace(/height="[^"]*"/, `height="${cssHeight}"`);

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
			<div
				// biome-ignore lint/security/noDangerouslySetInnerHtml: Typst WASM output
				dangerouslySetInnerHTML={{ __html: scaledSvg }}
				style={{ display: "block", lineHeight: 0 }}
			/>
		</div>
	);
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
