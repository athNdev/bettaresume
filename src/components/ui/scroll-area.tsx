"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import * as React from "react";

import { cn } from "@/lib/utils";

const ScrollArea = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
	<ScrollAreaPrimitive.Root
		className={cn("relative overflow-hidden", className)}
		ref={ref}
		{...props}
	>
		{/*
		 * `[&>div]:block!` overrides the `display: table` wrapper Radix injects inside the
		 * viewport (inline style, so only `!important` wins).
		 *
		 * That wrapper sizes its content to max-content, which is right for a horizontally
		 * scrollable canvas and wrong for every use in this app: it meant a pane narrower
		 * than its list clipped the list instead of letting it shrink. Measured by the
		 * viewport matrix — at 1024px the sections rail overflowed its own panel by 113px
		 * and amputated the label and both row actions, with the document itself still
		 * "fitting" so a viewport-width check could not see it.
		 */}
		<ScrollAreaPrimitive.Viewport className="[&>div]:block! h-full max-h-[inherit] w-full rounded-[inherit]">
			{children}
		</ScrollAreaPrimitive.Viewport>
		<ScrollBar />
		<ScrollAreaPrimitive.Corner />
	</ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

const ScrollBar = React.forwardRef<
	React.ComponentRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
	React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
	<ScrollAreaPrimitive.ScrollAreaScrollbar
		className={cn(
			"flex touch-none select-none transition-colors",
			orientation === "vertical" &&
				"h-full w-2.5 border-l border-l-transparent p-0.5",
			orientation === "horizontal" &&
				"h-2.5 flex-col border-t border-t-transparent p-0.5",
			className,
		)}
		orientation={orientation}
		ref={ref}
		{...props}
	>
		<ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" />
	</ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;

export { ScrollArea, ScrollBar };
