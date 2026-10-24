import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * The input spine: Input, Textarea and SelectTrigger share these metrics —
 * h-10, px-3, rounded-md, 1px `--input` boundary — so a form's controls line up
 * row after row. State matrix: default / hover / focus-visible / disabled /
 * loading / error.
 *
 * The boundary is `--input`, not `--border`: it is what tells a user where the
 * control is, so it clears 3:1 on every surface (WCAG 1.4.11). Hover moves the
 * boundary toward the text colour; `aria-invalid` moves it to the danger token.
 */
const Input = React.forwardRef<
	HTMLInputElement,
	React.ComponentProps<"input"> & { loading?: boolean }
>(({ className, type, loading = false, disabled, ...props }, ref) => {
	return (
		<input
			aria-busy={loading || undefined}
			className={cn(
				"flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-sm placeholder:text-muted-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-invalid:border-destructive md:text-sm",
				className,
			)}
			disabled={loading || disabled}
			ref={ref}
			type={type}
			{...props}
		/>
	);
});
Input.displayName = "Input";

export { Input };
