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

interface SaveStateProps {
	isDirty: boolean;
	isSaving: boolean;
	/** How many groups of fields differ. Never a score. */
	changeCount?: number;
	className?: string;
	/**
	 * Icon-only, for widths where the full sentence does not fit.
	 *
	 * Below `lg` this used to be `hidden`, which meant the answer to "have I lost work?"
	 * did not exist on a tablet or a phone — the one surface that exists to be honest
	 * about saving was the one that disappeared. The compact form keeps the icon, the
	 * `role="status"` announcement and the same words in an `sr-only` span; only the
	 * pixels are smaller.
	 */
	compact?: boolean;
}

export function SaveState({
	isDirty,
	isSaving,
	changeCount = 0,
	className,
	compact = false,
}: SaveStateProps) {
	// A write in flight outranks "unsaved": if something is already heading to the
	// server, saying "unsaved changes" is accurate but not the most useful thing to say.
	const state = isSaving
		? {
				Icon: CloudUpload,
				iconClass: "animate-pulse",
				textClass: "text-muted-foreground",
				title: "Saving…",
				label: "Saving…" as string,
			}
		: isDirty
			? {
					Icon: PencilLine,
					iconClass: "",
					textClass: "font-medium text-warning",
					title: "Unsaved changes",
					label:
						changeCount > 0
							? `Unsaved changes (${changeCount} ${changeCount === 1 ? "area" : "areas"})`
							: "Unsaved changes",
				}
			: {
					Icon: Check,
					iconClass: "text-success",
					textClass: "text-muted-foreground",
					title: "All changes saved",
					label: "All changes saved",
				};

	if (compact) {
		return (
			<p
				className={cn("flex items-center text-xs", className)}
				role="status"
				title={state.title}
			>
				<state.Icon
					aria-hidden
					className={cn("h-3.5 w-3.5", state.iconClass)}
				/>
				<span className="sr-only">{state.label}</span>
			</p>
		);
	}

	return (
		<p
			className={cn(
				"flex items-center gap-2 text-xs",
				state.textClass,
				className,
			)}
			role="status"
		>
			<state.Icon aria-hidden className={cn("h-3.5 w-3.5", state.iconClass)} />
			{state.label}
		</p>
	);
}
