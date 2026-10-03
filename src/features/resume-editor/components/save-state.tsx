"use client";

import { Check, CloudUpload, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The editor's answer to "is my work saved?".
 *
 * The editor holds two documents at once: a **draft** the preview renders and the
 * forms write into, and the **saved** resume the server returned. That split is what
 * makes the preview live while you type, but it meant nothing on screen distinguished
 * "saved" from "saved three edits ago" — the only hint was a spinner inside the
 * Sections collapsible header while a write was in flight, which says nothing about
 * whether there was anything left to write.
 *
 * Three states, and only three, because only three are true:
 *
 * - **Saving** — a write is in flight.
 * - **Unsaved changes** — the draft holds something the server does not. Names how
 *   many *things* changed (name, template, metadata, section order) so the user can
 *   tell a stray whitespace-level change from a substantive one.
 * - **Saved** — nothing outstanding.
 *
 * Deliberately not a percentage, a count of "quality", or anything that reads as a
 * verdict on the document. It counts pending *writes*, which is a fact about the
 * session and not a judgement about the person.
 *
 * It is a `role="status"` region so the change is announced rather than only painted.
 */
export function SaveState({
	isDirty,
	isSaving,
	changeCount = 0,
	className,
}: {
	isDirty: boolean;
	isSaving: boolean;
	/** How many groups of fields differ. Never a score. */
	changeCount?: number;
	className?: string;
}) {
	// A write in flight outranks "unsaved": if something is already heading to the
	// server, saying "unsaved changes" is accurate but not the most useful thing to say.
	if (isSaving) {
		return (
			<p
				className={cn(
					"flex items-center gap-1.5 text-muted-foreground text-xs",
					className,
				)}
				role="status"
			>
				<CloudUpload aria-hidden className="h-3.5 w-3.5 animate-pulse" />
				Saving…
			</p>
		);
	}

	if (isDirty) {
		return (
			<p
				className={cn(
					"flex items-center gap-1.5 font-medium text-amber-700 text-xs dark:text-amber-500",
					className,
				)}
				role="status"
			>
				<PencilLine aria-hidden className="h-3.5 w-3.5" />
				{changeCount > 0
					? `Unsaved changes (${changeCount} ${changeCount === 1 ? "area" : "areas"})`
					: "Unsaved changes"}
			</p>
		);
	}

	return (
		<p
			className={cn(
				"flex items-center gap-1.5 text-muted-foreground text-xs",
				className,
			)}
			role="status"
		>
			<Check
				aria-hidden
				className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-500"
			/>
			All changes saved
		</p>
	);
}
