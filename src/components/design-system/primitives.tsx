import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Layout primitives for the `/design-system` page.
 *
 * The page is documentation, but it is built from the same system it documents:
 * a region per section (hairline seams, no nesting), a specimen well for each
 * demo, and the tone ladder for de-emphasis. That is deliberate — a design
 * system page that does not use the system is a poster, not a reference.
 */

export function DSSection({
	id,
	index,
	title,
	lede,
	children,
}: {
	id: string;
	index: string;
	title: string;
	lede: string;
	children: ReactNode;
}) {
	return (
		<section className="scroll-mt-24 border-t pt-12 first:border-t-0" id={id}>
			<div className="mb-8 flex max-w-prose flex-col gap-2">
				<span className="br-micro">
					{index} · {title}
				</span>
				<h2 className="font-semibold text-xl tracking-title">{title}</h2>
				<p className="text-fg-muted text-sm leading-relaxed">{lede}</p>
			</div>
			<div className="space-y-8">{children}</div>
		</section>
	);
}

export function Subhead({
	children,
	hint,
	className,
}: {
	children: ReactNode;
	hint?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-1", className)}>
			<h3 className="font-semibold text-base tracking-title">{children}</h3>
			{hint ? <p className="text-fg-muted text-xs">{hint}</p> : null}
		</div>
	);
}

/** A specimen well: a floating card that holds one demo. Never nested. */
export function Specimen({
	title,
	note,
	children,
	className,
}: {
	title: ReactNode;
	note?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("br-panel flex flex-col gap-4 p-6", className)}>
			<div className="flex flex-col gap-1">
				<span className="font-semibold text-sm">{title}</span>
				{note ? <span className="text-fg-muted text-xs">{note}</span> : null}
			</div>
			{children}
		</div>
	);
}

/** A colour field that reads its value from a token, never a literal. */
export function Swatch({
	token,
	className,
	label,
}: {
	token: string;
	className?: string;
	label?: string;
}) {
	return (
		<span
			aria-label={label ?? token}
			className={cn("block size-10 rounded-sm border", className)}
			role="img"
			style={{ backgroundColor: `var(${token})` }}
		/>
	);
}

/**
 * A measured contrast ratio. The tick or cross is the redundant channel — the
 * page follows DS-10 on itself instead of colouring a number and hoping.
 */
export function Ratio({ value, min }: { value: number; min: number }) {
	const pass = value >= min;
	return (
		<span
			className={cn(
				"br-chip tabular-nums",
				pass ? "" : "border-destructive/40 bg-danger-soft text-destructive",
			)}
			data-tone={pass ? "success" : undefined}
			title={`${value.toFixed(2)}:1 — minimum ${min}:1`}
		>
			<span aria-hidden>{pass ? "✓" : "✗"}</span>
			{value.toFixed(2)}:1
		</span>
	);
}

export function KeyValue({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1">
			<span className="br-label">{label}</span>
			<span className="text-sm">{children}</span>
		</div>
	);
}
