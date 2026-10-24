import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "@/lib/utils";

const alertVariants = cva(
	"relative w-full rounded-lg border p-4 [&>svg+div]:-translate-y-0.5 [&>svg]:absolute [&>svg]:top-4 [&>svg]:left-4 [&>svg~*]:pl-8",
	{
		variants: {
			variant: {
				default: "bg-background text-foreground",
				/*
				 * Status callouts: a soft tint of the one status token, a 1px border of
				 * the same token, and text in it. The tints are derived (`color-mix`),
				 * never a second hardcoded hue — the audit found 3 greens, 4 ambers and
				 * 2 blues across seven files doing exactly this job.
				 */
				success: "border-success/50 bg-success-soft text-success",
				warning: "border-warning/50 bg-warning-soft text-warning",
				info: "border-info/50 bg-info-soft text-info",
				destructive:
					"border-destructive/50 bg-danger-soft text-destructive dark:border-destructive",
			},
		},
		defaultVariants: {
			variant: "default",
		},
	},
);

const Alert = React.forwardRef<
	HTMLDivElement,
	React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
	<div
		className={cn(alertVariants({ variant }), className)}
		ref={ref}
		role="alert"
		{...props}
	/>
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
	<h5
		className={cn("mb-1 font-medium leading-none tracking-tight", className)}
		ref={ref}
		{...props}
	/>
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
	HTMLParagraphElement,
	React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
	<div
		className={cn("text-sm [&_p]:leading-relaxed", className)}
		ref={ref}
		{...props}
	/>
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription, AlertTitle };
