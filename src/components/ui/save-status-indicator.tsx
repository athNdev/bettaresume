"use client";

import { AlertCircle, Check, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "@/hooks/use-auto-save";
import { cn } from "@/lib/utils";

interface SaveStatusIndicatorProps {
	/** Current save status */
	status: SaveStatus;
	/** Error message if status is 'error' */
	error?: string | null;
	/** Callback to retry failed save */
	onRetry?: () => void;
	/** Additional class names */
	className?: string;
}

/**
 * Subtle indicator showing auto-save status.
 * Always reserves space to prevent layout shifts.
 *
 * States:
 * - idle: Hidden (nothing to show)
 * - dirty: Hidden (change detected but debounce not fired yet)
 * - saving: "Saving..." with spinner
 * - saved: "Saved ✓" (fades after 2s)
 * - error: "Save failed" with retry button
 */
export function SaveStatusIndicator({
	status,
	error,
	onRetry,
	className,
}: SaveStatusIndicatorProps) {
	const [displayState, setDisplayState] = useState<
		"hidden" | "saving" | "saved" | "error"
	>("hidden");
	const [isAnimatingOut, setIsAnimatingOut] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Clear any pending timers
	const clearTimers = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	// Handle status changes - only depends on status prop
	useEffect(() => {
		clearTimers();
		setIsAnimatingOut(false);

		if (status === "saving") {
			setDisplayState("saving");
		} else if (status === "saved") {
			setDisplayState("saved");
			// Auto-hide after 2 seconds
			timerRef.current = setTimeout(() => {
				setIsAnimatingOut(true);
				// After animation completes, hide
				timerRef.current = setTimeout(() => {
					setDisplayState("hidden");
					setIsAnimatingOut(false);
				}, 300);
			}, 1700);
		} else if (status === "error") {
			setDisplayState("error");
		} else {
			// idle or dirty - hide immediately (no animation needed for these states)
			setDisplayState("hidden");
		}

		return clearTimers;
	}, [status, clearTimers]);

	const isVisible = displayState !== "hidden";

	return (
		<div
			className={cn(
				"relative flex h-5 min-w-[80px] items-center justify-end",
				className,
			)}
		>
			<div
				aria-hidden={!isVisible}
				className={cn(
					"absolute right-0 flex items-center gap-2 text-sm transition-all duration-300",
					isVisible && !isAnimatingOut ? "opacity-100" : "opacity-0",
					"pointer-events-auto transform-gpu",
				)}
			>
				{displayState === "saving" && (
					<>
						<Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
						<span className="whitespace-nowrap text-muted-foreground">
							Saving...
						</span>
					</>
				)}

				{displayState === "saved" && (
					<>
						<Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
						<span className="whitespace-nowrap text-green-600 dark:text-green-500">
							Saved
						</span>
					</>
				)}

				{displayState === "error" && (
					<>
						<AlertCircle className="h-3.5 w-3.5 text-destructive" />
						<span className="whitespace-nowrap text-destructive">
							Save failed
						</span>
						{onRetry && (
							<Button
								className="h-6 px-2 text-xs"
								onClick={onRetry}
								size="sm"
								variant="ghost"
							>
								<RefreshCw className="mr-1 h-3 w-3" />
								Retry
							</Button>
						)}
					</>
				)}
			</div>
		</div>
	);
}
