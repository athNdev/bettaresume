"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Sheet — a panel that slides in from an edge, built on the same Radix Dialog
 * primitives as `dialog.tsx`.
 *
 * Deliberately not shadcn's stock Sheet, which pulls in `vaul` for the mobile
 * drag-to-dismiss gesture. This app is a desktop-first authenticated workspace
 * (three resizable panes, keyboard-driven), so the extra ~15 KB dependency buys
 * nothing, and every added dependency is one more thing to audit.
 *
 * Radix supplies the accessibility that matters here and that a hand-rolled
 * panel would not: `role="dialog"`, `aria-modal`, focus trapping, focus restore
 * on close, Escape to dismiss, and `aria-describedby` wired to the description.
 */

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		className={cn(
			"data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in",
			className,
		)}
		ref={ref}
		{...props}
	/>
));
SheetOverlay.displayName = "SheetOverlay";

/** Slide direction + which edge it enters from. */
type SheetSide = "top" | "right" | "bottom" | "left";

const SIDE_CLASSES: Record<SheetSide, string> = {
	top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
	bottom:
		"inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
	left: "inset-y-0 left-0 h-full w-full border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-md",
	right:
		"inset-y-0 right-0 h-full w-full border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md",
};

interface SheetContentProps
	extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
	side?: SheetSide;
	/** Set false when the caller renders its own close affordance. */
	showCloseButton?: boolean;
}

const SheetContent = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Content>,
	SheetContentProps
>(
	(
		{ className, children, side = "right", showCloseButton = true, ...props },
		ref,
	) => (
		<SheetPortal>
			<SheetOverlay />
			<DialogPrimitive.Content
				className={cn(
					"fixed z-50 flex flex-col gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-300 data-[state=open]:duration-500",
					SIDE_CLASSES[side],
					className,
				)}
				ref={ref}
				{...props}
			>
				{children}
				{showCloseButton ? (
					<DialogPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
						<X className="h-4 w-4" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				) : null}
			</DialogPrimitive.Content>
		</SheetPortal>
	),
);
SheetContent.displayName = "SheetContent";

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn("flex flex-col gap-1.5 text-left", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

const SheetTitle = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		className={cn("font-semibold text-foreground", className)}
		ref={ref}
		{...props}
	/>
));
SheetTitle.displayName = "SheetTitle";

const SheetDescription = React.forwardRef<
	React.ComponentRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		className={cn("text-muted-foreground text-sm", className)}
		ref={ref}
		{...props}
	/>
));
SheetDescription.displayName = "SheetDescription";

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	type SheetSide,
	SheetTitle,
	SheetTrigger,
};
