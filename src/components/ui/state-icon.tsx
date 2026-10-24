/**
 * Two icons that cross-fade instead of jumping.
 *
 * A state indicator that hard-toggles (eye / eye-off, link / unlink) reads as a
 * blink rather than a change, and there is no cue that it was the same control
 * responding. Both icons stay mounted and one is absolutely positioned, so this
 * costs no dependency and no layout shift: opacity 0→1, scale 0.25→1, blur 4px→0,
 * on `cubic-bezier(0.2, 0, 0, 1)`.
 *
 * The static cue is still the icon itself and its label — motion is never the only
 * channel — and `prefers-reduced-motion` disables the transition globally.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StateIconProps {
	/** Rendered when `active` is false. */
	off: ReactNode;
	/** Rendered when `active` is true. */
	on: ReactNode;
	active: boolean;
	className?: string;
}

export function StateIcon({ off, on, active, className }: StateIconProps) {
	return (
		<span
			className={cn("icon-swap", className)}
			data-state={active ? "b" : "a"}
		>
			<span className="icon-swap-a">{off}</span>
			<span className="icon-swap-b">{on}</span>
		</span>
	);
}
