"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

/**
 * "Copy the token value" — the affordance a reviewer asks for first.
 *
 * It copies `var(--surface)`, not the resolved colour: a pasted value is meant
 * to be used in code, and a literal oklch would break on the next theme or
 * token edit. The resolved value is shown beside the name for reading, and both
 * are in the page's server-rendered HTML.
 *
 * Clipboard failures fall back to a hidden textarea and a selected range, so a
 * page served over http (not https) still copies.
 */
export function CopyToken({
	name,
	value,
	label,
	className,
}: {
	/** The custom property, including the leading `--`. */
	name: string;
	/** The resolved value, shown in muted type. */
	value?: string;
	/** Optional human label; defaults to the token name. */
	label?: string;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	async function copy() {
		const text = `var(${name})`;
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			const field = document.createElement("textarea");
			field.value = text;
			field.setAttribute("readonly", "");
			field.style.position = "fixed";
			field.style.opacity = "0";
			document.body.appendChild(field);
			field.select();
			try {
				document.execCommand("copy");
			} finally {
				field.remove();
			}
		}
		setCopied(true);
		window.setTimeout(() => setCopied(false), 1200);
	}

	return (
		<button
			aria-label={`Copy var(${name})`}
			className={cn(
				"group flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left",
				"transition-colors duration-(--br-duration-fast) ease-enter",
				"hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				className,
			)}
			onClick={copy}
			type="button"
		>
			<span className="min-w-0 flex-1 truncate font-mono text-xs">
				{label ?? name}
			</span>
			{value ? (
				<span className="min-w-0 shrink-0 truncate font-mono text-fg-muted text-xs">
					{value}
				</span>
			) : null}
			{copied ? (
				<Check aria-hidden className="size-4 shrink-0 text-success" />
			) : (
				<Copy
					aria-hidden
					className="size-4 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
				/>
			)}
			<span aria-live="polite" className="sr-only">
				{copied ? `${name} copied` : ""}
			</span>
		</button>
	);
}
