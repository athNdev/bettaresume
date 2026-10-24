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
	"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium text-sm ring-offset-background transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-(--br-duration-fast) ease-enter focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:[stroke-width:1.5]",
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline:
					"border border-input bg-background hover:bg-accent hover:text-accent-foreground",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-10 px-4 py-2",
				sm: "h-9 rounded-md px-3",
				lg: "h-11 rounded-md px-8",
				icon: "h-10 w-10",
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
			children,
			...props
		},
		ref,
	) => {
		const Comp = asChild ? Slot : "button";
		return (
			<Comp
				aria-busy={loading || undefined}
				className={cn(
					buttonVariants({ variant, size, static: isStatic, className }),
					loading && "cursor-progress",
				)}
				disabled={loading || disabled}
				ref={ref}
				{...props}
			>
				{loading ? <Loader2 aria-hidden className="animate-spin" /> : null}
				{children}
			</Comp>
		);
	},
);
Button.displayName = "Button";

export { Button, buttonVariants };
