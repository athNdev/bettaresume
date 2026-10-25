import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	/*
	 * Motion and feedback are part of the control, not decoration:
	 *
	 * - `active:scale-[0.96]` is press feedback. 0.96 is the value that reads as
	 *   tactile without looking like the button flinched; anything below 0.95 is
	 *   exaggerated.
	 * - The transition names its properties. `transition-colors` covered only
	 *   colour, so the press scale jumped instead of animating, and `transition-all`
	 *   would animate layout properties the browser should not be touching.
	 * - `static` switches the press motion off where it would distract (the
	 *   theme toggle, toolbar icon buttons).
	 */
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ring-offset-background transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--br-duration-fast) ease-enter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:[stroke-width:1.5]",
	{
		variants: {
			variant: {
				/* The one solid accent action in a region. */
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				/* Secondary: surface fill + the 3:1 control boundary. It used to be
				   `bg-background`, which vanishes on a card of the same colour. */
				outline:
					"border border-control bg-surface text-foreground hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-link underline-offset-4 hover:underline",
			},
			/* 28 / 32 / 40, default 32. Each size has hand-tuned padding rather
			   than one em scale — a large control gets disproportionately more. */
			size: {
				default: "h-8 px-4 text-sm",
				sm: "h-7 px-3 font-semibold text-xs",
				lg: "h-10 px-6 font-semibold text-sm",
				icon: "size-8 text-sm",
				"icon-sm": "size-7 text-xs",
			},
			/** No press scale: for icon toggles and controls inside dense toolbars. */
			static: {
				true: "active:scale-100",
				false: "",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
			static: false,
		},
	},
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
	/**
	 * Pending state. Renders a spinner, sets `aria-busy` and blocks interaction —
	 * the loading slot in the state matrix (default/hover/active/focus-visible/
	 * disabled/loading). A button that is waiting on a mutation must say so;
	 * `disabled` alone reads as "not applicable".
	 */
	loading?: boolean;
	/**
	 * Why a disabled button is disabled. Rendered as a native tooltip and as an
	 * `aria-describedby` target, so the reason is available to pointer and
	 * assistive users alike. A disabled control that only greys out is a dead
	 * end (audit: the create dialog's disabled primary "reads like an enabled
	 * secondary button" and never said what was missing).
	 */
	disabledReason?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			className,
			variant,
			size,
			asChild = false,
			static: isStatic,
			loading = false,
			disabled,
			disabledReason,
			children,
			...props
		},
		ref,
	) => {
		const isDisabled = loading || disabled;
		const reasonId = React.useId();
		const classes = cn(
			buttonVariants({ variant, size, static: isStatic, className }),
			loading && "cursor-progress",
			/* `pointer-events-none` would suppress the reason tooltip, so it
			   is only applied when there is nothing to explain. */
			isDisabled && !disabledReason && "pointer-events-none",
		);

		/*
		 * `asChild` means the caller supplies the element (typically a link).
		 * Radix's Slot requires exactly one child, so the spinner, the disabled
		 * reason and the button-only aria contract are not appended in this
		 * branch — a link is never loading, disabled or a submit button.
		 */
		if (asChild) {
			return (
				<Slot className={classes} ref={ref} {...props}>
					{children}
				</Slot>
			);
		}

		return (
			<button
				aria-busy={loading || undefined}
				aria-describedby={isDisabled && disabledReason ? reasonId : undefined}
				className={classes}
				disabled={isDisabled}
				ref={ref}
				title={isDisabled ? disabledReason : undefined}
				{...props}
			>
				{loading ? <Loader2 aria-hidden className="animate-spin" /> : null}
				{children}
				{isDisabled && disabledReason ? (
					<span className="sr-only" id={reasonId}>
						{disabledReason}
					</span>
				) : null}
			</button>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
