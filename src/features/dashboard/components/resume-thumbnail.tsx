"use client";

import { useEffect, useRef, useState } from "react";
import { Preview } from "@/features/resume-editor/components/preview";
import type { Resume } from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";

/**
 * Page geometry at 96dpi, mirroring `preview.tsx` so the loading skeleton and
 * the rendered preview agree on the sheet's shape (A4 794×1123, Letter
 * 816×1056). Kept in sync by eye — the values live in the preview too because
 * the preview is Surface B and must not read chrome tokens (R15).
 */
const PAGE_PX = {
	A4: { width: 794, height: 1123 },
	Letter: { width: 816, height: 1056 },
} as const;

function getPagePx(resume: Resume): { width: number; height: number } {
	const pageSize = resume.metadata?.settings?.pageSize;
	if (pageSize === "A4") return PAGE_PX.A4;
	return PAGE_PX.Letter;
}

export interface ResumeThumbnailProps {
	resume: Resume;
	onClick?: () => void;
	className?: string;
}

/**
 * The card's preview, which doubles as its click target.
 *
 * ## Why this is a `<button>` and not a `<div onClick>`
 *
 * It was a div. That made the primary way to open a resume **mouse-only**: not in the tab
 * order, no accessible name, and invisible to assistive tech — a keyboard user could not
 * open a document at all unless they found the overflow menu and chose "Edit". A browser
 * pass surfaced it as four unnamed buttons in the dashboard's accessibility tree, which
 * is the shape of the defect rather than the fix.
 *
 * ## Why it is hidden from assistive tech anyway
 *
 * The card title beside it is the real control: it is a button whose own text is the
 * resume's name, so a screen reader announces "Harvard Application, button" once. This
 * one is a redundant pointer target for the large preview area, so it is `aria-hidden`
 * and taken out of the tab order — announced once, clickable in two places.
 *
 * ## The loading state
 *
 * Before the preview mounts (it lazy-loads behind an IntersectionObserver), the frame
 * shows the *sheet* the preview will draw on — paper, correct proportions, ghost lines
 * where the text will land — sized to the exact footprint the preview renders at. The
 * audit caught the old state as a lone icon in an empty box, which on a phone loaded as
 * three cards that read as broken. A skeleton that matches the final shape cannot.
 */
export function ResumeThumbnail({
	resume,
	onClick,
	className,
}: ResumeThumbnailProps) {
	const containerRef = useRef<HTMLElement | null>(null);
	const [mounted, setMounted] = useState(false);
	const [inView, setInView] = useState(false);
	const [scale, setScale] = useState(0.2);

	useEffect(() => {
		setMounted(true);
	}, []);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;

		if (!("IntersectionObserver" in window)) {
			setInView(true);
			return;
		}

		const obs = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (entry.isIntersecting) {
						setInView(true);
						obs.disconnect();
						break;
					}
				}
			},
			{ rootMargin: "300px" },
		);

		obs.observe(el);
		return () => obs.disconnect();
	}, []);

	// A `useMemo` keyed on the page-size string, reading the whole `resume` — which is
	// what the dependency rule is complaining about, correctly: the memo captured a
	// `resume` that its key did not describe. The function is a two-branch switch, so
	// the memo was buying nothing anyway.
	const pagePx = getPagePx(resume);

	useEffect(() => {
		if (!mounted) return;
		const el = containerRef.current;
		if (!el) return;

		if (!("ResizeObserver" in window)) {
			// Fallback scale for older browsers
			setScale(0.2);
			return;
		}

		const ro = new ResizeObserver(() => {
			const width = el.clientWidth;
			// Fit the page width into the container with a bit of padding.
			const computed = Math.max(0, width - 16) / pagePx.width;
			/*
			 * The ceiling is 0.6, not 0.28.
			 *
			 * 0.28 was tuned for a four-column grid; at three columns (and at 390px,
			 * where the card is nearly full width) it capped the sheet at 228px inside
			 * a 320px frame, so every thumbnail sat in a well with a dead band under
			 * it. The clamp still stops a tiny pane from upscaling a page past its
			 * container.
			 */
			const clamped = Math.min(0.6, Math.max(0.12, computed));
			setScale(clamped);
		});

		ro.observe(el);
		return () => ro.disconnect();
	}, [mounted, pagePx]);

	const shouldRenderPreview = mounted && inView;

	return (
		<>
			{onClick ? (
				<button
					aria-hidden="true"
					className={cn(
						/*
						 * The well, not the page: a sunken fill with a hairline edge holds the
						 * sheet, so the white paper reads as paper *on* a surface. It used to be
						 * `bg-muted/50`, which in dark was almost the card tone and left the page
						 * floating with no frame at all.
						 */
						"relative flex aspect-[8.5/11] w-full cursor-pointer items-start justify-center overflow-hidden rounded-sm border bg-sunken p-2",
						"transition-colors hover:bg-accent",
						"focus-visible:outline-none",
						className,
					)}
					onClick={onClick}
					ref={containerRef as React.RefObject<HTMLButtonElement>}
					tabIndex={-1}
					type="button"
				>
					<ThumbnailBody
						pagePx={pagePx}
						resume={resume}
						scale={scale}
						shouldRenderPreview={shouldRenderPreview}
					/>
				</button>
			) : (
				<div
					className={cn(
						"relative flex aspect-[8.5/11] w-full items-start justify-center overflow-hidden rounded-sm border bg-sunken p-2",
						className,
					)}
					ref={containerRef as React.RefObject<HTMLDivElement>}
				>
					<ThumbnailBody
						pagePx={pagePx}
						resume={resume}
						scale={scale}
						shouldRenderPreview={shouldRenderPreview}
					/>
				</div>
			)}
		</>
	);
}

function ThumbnailBody({
	resume,
	scale,
	shouldRenderPreview,
	pagePx,
}: {
	resume: Resume;
	scale: number;
	shouldRenderPreview: boolean;
	pagePx: { width: number; height: number };
}) {
	return (
		<div className="absolute inset-0 flex items-start justify-center p-2">
			{shouldRenderPreview ? (
				<div className="shadow-elev-1">
					<Preview
						className="pointer-events-none select-none"
						paginate={false}
						resume={resume}
						scale={scale}
					/>
				</div>
			) : (
				<ThumbnailSkeleton
					height={pagePx.height * scale}
					// The document's own paper colour when the resume sets one, so the
					// skeleton is the same sheet the preview will draw (Surface B colour
					// as data). Falls back to the paper token.
					paper={resume.metadata?.settings?.colors?.background}
					width={pagePx.width * scale}
				/>
			)}
		</div>
	);
}

/**
 * The sheet, before there is content: paper at the preview's exact footprint,
 * with ghost lines in the document's hierarchy (name, title, rule, body lines,
 * section heads). The bars are `--preview-paper-shade` — a fixed mix of the ink
 * ramp into the paper — because the sheet is white in both themes and its
 * placeholders cannot follow the app's dark mode.
 */
export function ThumbnailSkeleton({
	width,
	height,
	paper,
}: {
	width: number;
	height: number;
	paper?: string;
}) {
	return (
		<div
			className="flex flex-col gap-1 overflow-hidden bg-preview-paper p-2 shadow-elev-1"
			style={{ backgroundColor: paper, height, width }}
		>
			<div className="h-2 w-1/2 rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-1/3 rounded-xs bg-preview-paper-shade" />
			<div className="mt-1 h-px w-full bg-preview-paper-shade" />
			<div className="h-1 w-full rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-full rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-2/3 rounded-xs bg-preview-paper-shade" />
			<div className="mt-2 h-1 w-1/4 rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-full rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-5/6 rounded-xs bg-preview-paper-shade" />
			<div className="mt-2 h-1 w-1/4 rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-full rounded-xs bg-preview-paper-shade" />
			<div className="h-1 w-1/2 rounded-xs bg-preview-paper-shade" />
		</div>
	);
}
