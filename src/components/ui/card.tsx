import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A card is either in flow or floating — it never carries both an edge and a
 * lift (component inventory rule 24: "elev-1 or border, never both"). A border
 * is structure; a shadow is depth. Stacking both is what makes nested cards
 * look like cut paper.
 *
 * - `inline` (default): a container inside a panel. Its edge is the border
 *   (the elev-0 pair — surface + 1px border, no shadow).
 * - `floating`: a card that lifts off the page — interactive tiles, hover
 *   lifts. The elev-1 pair: surface + `shadow-elev-1`, no border.
 */
const cardVariants = cva("rounded-lg bg-card text-card-foreground", {
	variants: {
		elevation: {
			inline: "border shadow-elev-0",
			floating: "shadow-elev-1",
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
		className={cn("flex flex-col space-y-2 p-6", className)}
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
			"font-semibold text-xl leading-none tracking-tight",
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
		className={cn("text-muted-foreground text-sm", className)}
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
