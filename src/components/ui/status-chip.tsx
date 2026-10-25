import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Status, said three ways at once: a tinted fill, a same-hue text colour and an
 * icon (or a word inside the label). Colour is never the only signal, because a
 * status that disappears in greyscale is not a status — the squint test is
 * mandatory (R6, WCAG 1.4.1).
 *
 * The formula lives in `.br-chip` in the token file (10–14% `color-mix` tint +
 * 28% same-hue border + hue-darkened text in light / hue-lightened text in
 * dark), so there is exactly one definition of what a chip is. This component
 * exists to make the icon mandatory rather than optional.
 *
 * Tones map to the four meaning tokens only. There is no "brand" tone: the
 * accent is an event (primary action, selection, focus), never a status.
 */
export type StatusTone = "success" | "warning" | "danger" | "info";

export function StatusChip({
	tone,
	icon,
	children,
	className,
}: {
	tone: StatusTone;
	/** Required: the redundant channel that survives greyscale. */
	icon: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<span className={cn("br-chip", className)} data-tone={tone}>
			<span aria-hidden className="[&_svg]:size-4">
				{icon}
			</span>
			{children}
		</span>
	);
}
