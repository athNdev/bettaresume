import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A card floats; a region does not. The card carries a hairline as *edge
 * drawing* and elev-1 as *lift* — D4 refines the old "elev-1 or border, never
 * both", which left floating cards edgeless in light mode. What stays banned is
 * a shadow doing a divider's job and a border doing depth's job.
 *
 * - `inline` (default): a container inside a panel. Hairline only, no lift.
 * - `floating`: a card that lifts off the page — elev-1 plus its hairline.
 * - `overlay`: a card that floats above a dialog — the L2 surface, elev-2.
 *
 * Never nest a card inside a card (R10); use a region or a hairline section.
 */
const cardVariants = cva("rounded-md bg-card text-card-foreground", {
	variants: {
		elevation: {
			inline: "border",
			floating: "border shadow-elev-1",
			overlay:
				"border bg-surface-raised text-surface-raised-foreground shadow-elev-2",
		},
	},
	defaultVariants: {
		elevation: "inline",
	},
});

const Card = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardVariants>
>(({ className, elevation, ...props }, ref) => (
	<div
		className={cn(cardVariants({ elevation, className }))}
		ref={ref}
		{...props}
	/>
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		className={cn("flex flex-col gap-2 p-6", className)}
		ref={ref}
		{...props}
	/>
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		className={cn(
			"font-semibold text-base leading-tight tracking-title",
			className,
		)}
		ref={ref}
		{...props}
	/>
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		className={cn("text-fg-muted text-sm", className)}
		ref={ref}
		{...props}
	/>
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div className={cn("p-6 pt-0", className)} ref={ref} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
	<div
		className={cn("flex items-center p-6 pt-0", className)}
		ref={ref}
		{...props}
	/>
));
CardFooter.displayName = "CardFooter";

export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	cardVariants,
};
