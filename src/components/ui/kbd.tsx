import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * A keyboard key cap. The pro-tool tell (T10): menus and tooltips that show the
 * shortcut read as an instrument; ones that only name the action read as a web
 * form.
 *
 * Single definition in `.br-kbd`, so every hint is the same size and shadow.
 * 12px is the type scale's floor — the research recipe said 11px, and nothing
 * functional is allowed below 12.
 */
export function Kbd({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return <kbd className={cn("br-kbd", className)}>{children}</kbd>;
}
