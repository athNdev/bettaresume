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

export function ResumeThumbnail({ resume, onClick, className }: ResumeThumbnailProps) {
	const containerRef = useRef<HTMLDivElement | null>(null);
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

	const pageWidthPx = useMemo(() => getPageWidthPx(resume), [resume.metadata?.settings?.pageSize]);

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
			const computed = (Math.max(0, width - 12) / pageWidthPx);
			const clamped = Math.min(0.28, Math.max(0.12, computed));
			setScale(clamped);
		});

		ro.observe(el);
		return () => ro.disconnect();
	}, [mounted, pageWidthPx]);

	const shouldRenderPreview = mounted && inView;

	return (
		<div
			ref={containerRef}
			className={cn(
				"relative flex aspect-[8.5/11] w-full items-start justify-center overflow-hidden rounded-md border bg-muted/50",
				"transition-colors hover:bg-muted/70",
				onClick ? "cursor-pointer" : "",
				className,
			)}
			onClick={onClick}
		>
			{shouldRenderPreview ? (
				<div className="absolute inset-0 flex items-start justify-center p-1">
					<Preview className="pointer-events-none select-none" paginate={false} resume={resume} scale={scale} />
				</div>
			) : (
				<div className="flex h-full w-full items-center justify-center">
					<FileText className="h-12 w-12 text-muted-foreground/50" />
				</div>
			)}
		</div>
	);
}
