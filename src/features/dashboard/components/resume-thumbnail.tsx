"use client";

import { FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Preview } from "@/features/resume-editor/components/preview";
import type { Resume } from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";

const PAGE_WIDTH_PX = {
	A4: 794,
	Letter: 816,
} as const;

function getPageWidthPx(resume: Resume): number {
	const pageSize = resume.metadata?.settings?.pageSize;
	if (pageSize === "A4") return PAGE_WIDTH_PX.A4;
	return PAGE_WIDTH_PX.Letter;
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

	const pageWidthPx = useMemo(
		() => getPageWidthPx(resume),
		[resume.metadata?.settings?.pageSize],
	);

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
			const computed = Math.max(0, width - 12) / pageWidthPx;
			const clamped = Math.min(0.28, Math.max(0.12, computed));
			setScale(clamped);
		});

		ro.observe(el);
		return () => ro.disconnect();
	}, [mounted, pageWidthPx]);

	const shouldRenderPreview = mounted && inView;

	return (
		<>
			{onClick ? (
				<button
					aria-hidden="true"
					className={cn(
						"relative flex aspect-[8.5/11] w-full cursor-pointer items-start justify-center overflow-hidden rounded-md border bg-muted/50",
						"transition-colors hover:bg-muted/70",
						"focus-visible:outline-none",
						className,
					)}
					onClick={onClick}
					ref={containerRef as React.RefObject<HTMLButtonElement>}
					tabIndex={-1}
					type="button"
				>
					<ThumbnailBody
						pageWidthPx={pageWidthPx}
						resume={resume}
						scale={scale}
						shouldRenderPreview={shouldRenderPreview}
					/>
				</button>
			) : (
				<div
					className={cn(
						"relative flex aspect-[8.5/11] w-full items-start justify-center overflow-hidden rounded-md border bg-muted/50",
						className,
					)}
					ref={containerRef as React.RefObject<HTMLDivElement>}
				>
					<ThumbnailBody
						pageWidthPx={pageWidthPx}
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
}: {
	resume: Resume;
	scale: number;
	shouldRenderPreview: boolean;
	pageWidthPx: number;
}) {
	return shouldRenderPreview ? (
		<div className="absolute inset-0 flex items-start justify-center p-1">
			<Preview
				className="pointer-events-none select-none"
				paginate={false}
				resume={resume}
				scale={scale}
			/>
		</div>
	) : (
		<div className="flex h-full w-full items-center justify-center">
			<FileText className="h-12 w-12 text-muted-foreground/50" />
		</div>
	);
}
