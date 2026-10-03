"use client";

import { AlertTriangle, Inbox, Loader2, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The three states every data-backed panel in this product needs: loading, empty
 * and failed.
 *
 * They live together because keeping them adjacent is what stops the failure mode
 * this file exists to prevent: a query whose `data` is undefined both when there
 * is nothing to show and when the request failed. An `isPending` → `length === 0`
 * chain then renders the *empty* message on an error, which does not merely look
 * wrong — it tells the user something false about their own data, and often
 * invites the action that makes it worse.
 *
 * `content-library-panel.tsx` was the one panel that got this right, by accident
 * of having been written against a failing query. `history-panel.tsx` did not,
 * and shipped "No saved versions yet" on a failed history fetch. So the states are
 * now a shared primitive with the error branch impossible to forget.
 *
 * Every state here is honest about *which* one it is: loading is announced as
 * busy, failed is a live alert, and empty says what would make it stop being
 * empty.
 */

const STATE_FRAME =
	"flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-8 text-center";

/**
 * A failed request. Never interchangeable with empty, and never silent.
 *
 * `role="alert"` so it is announced when it appears — an error that only changes
 * pixels is invisible to a screen-reader user, who is left looking at a panel that
 * appears to have nothing in it.
 */
export function PanelError({
	message,
	onRetry,
	retryLabel = "Try again",
	className,
}: {
	message: string;
	onRetry?: () => void;
	retryLabel?: string;
	className?: string;
}) {
	return (
		<div
			className={cn(
				STATE_FRAME,
				"border-destructive/40 bg-destructive/5",
				className,
			)}
			role="alert"
		>
			<AlertTriangle aria-hidden className="h-5 w-5 text-destructive" />
			<p className="font-medium text-destructive text-sm">{message}</p>
			{onRetry ? (
				<Button onClick={onRetry} size="sm" variant="outline">
					<RotateCcw aria-hidden className="mr-1.5 h-3.5 w-3.5" />
					{retryLabel}
				</Button>
			) : null}
		</div>
	);
}

/** Nothing to show, and what would put something there. */
export function PanelEmpty({
	title,
	hint,
	action,
	className,
	icon,
}: {
	title: string;
	hint?: ReactNode;
	action?: ReactNode;
	className?: string;
	icon?: ReactNode;
}) {
	return (
		<div className={cn(STATE_FRAME, className)}>
			{icon ?? <Inbox aria-hidden className="h-5 w-5 opacity-60" />}
			<p className="font-medium text-sm">{title}</p>
			{hint ? (
				<p className="max-w-prose text-muted-foreground text-xs">{hint}</p>
			) : null}
			{action}
		</div>
	);
}

/**
 * In flight. `aria-busy` plus a polite live region, so assistive tech is told the
 * panel is working rather than being left to infer it from a spinner.
 *
 * Reserves its own box so a loading → content transition does not jump the
 * layout, which matters most in the narrow rail where a height change scrolls the
 * list underneath it.
 */
export function PanelLoading({
	label = "Loading…",
	className,
}: {
	label?: string;
	className?: string;
}) {
	return (
		<div
			aria-busy="true"
			aria-live="polite"
			className={cn(
				"flex items-center justify-center gap-2 px-4 py-8 text-muted-foreground",
				className,
			)}
		>
			<Loader2 aria-hidden className="h-4 w-4 animate-spin" />
			<span className="text-sm">{label}</span>
		</div>
	);
}

/**
 * A pass/fail state for a *check* rather than a request.
 *
 * Deliberately says which check and what it means, and never carries a number
 * that summarises the document as a whole — a single 0–100 figure is the
 * credibility failure this whole product is built against. "3 findings" counts
 * named, actionable items; "82/100" is a verdict on software nobody has run.
 */
export function PanelClear({
	title,
	hint,
	children,
	className,
}: {
	title: string;
	hint?: ReactNode;
	children?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(STATE_FRAME, "border-primary/30 bg-primary/5", className)}
		>
			<p className="font-medium text-sm">{title}</p>
			{hint ? (
				<p className="max-w-prose text-muted-foreground text-xs">{hint}</p>
			) : null}
			{children}
		</div>
	);
}
