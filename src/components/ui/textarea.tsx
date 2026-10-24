import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Textarea — the input spine's multi-line sibling (same boundary, same radius,
 * same padding-x), min-height 80px so a form row never collapses to one line.
 * State matrix: default / hover / focus-visible / disabled / loading / error.
 */
const Textarea = React.forwardRef<
	HTMLTextAreaElement,
	React.ComponentProps<"textarea"> & { loading?: boolean }
>(({ className, loading = false, disabled, ...props }, ref) => {
	return (
		<textarea
			aria-busy={loading || undefined}
			className={cn(
				"flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground hover:border-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-progress aria-invalid:border-destructive md:text-sm",
				className,
			)}
			disabled={loading || disabled}
			ref={ref}
			{...props}
		/>
	);
});
Textarea.displayName = "Textarea";

export { Textarea };
