import { cn } from "@/lib/utils";

/**
 * The Betta Resume mark: two offset sheets.
 *
 * The back sheet is the master record; the front one is the variant. The front
 * sheet's text lines are knocked out with `fill-rule="evenodd"`, so the shape is
 * a single solid object that survives one colour, 16px and a photocopier — which
 * is the test a resume tool's own logo should pass.
 *
 * The back sheet is an *open* path that stops 1.2 units short of the front
 * sheet instead of a full outline behind it. That gutter is what keeps the two
 * sheets legible when they are the same colour, and drawing it as geometry
 * (rather than a `<mask>`) means no ids, no `useId` and no client JavaScript —
 * the marketing page renders this as a server component.
 *
 * - `mono` (default): one colour, inherits `currentColor`. Use in marketing
 *   chrome, in print, and anywhere the mark is not the subject.
 * - `accent`: the back sheet takes the product accent (`--primary`). Use on
 *   paper where the mark is the brand moment — never as a status, never twice on
 *   one screen.
 *
 * Sizes, clear space and the do/don't list: `docs/design-system/brand.md`.
 */
export function BrandMark({
	variant = "mono",
	className,
	label = "Betta Resume",
}: {
	variant?: "mono" | "accent";
	className?: string;
	/** Set null when the mark repeats a visible wordmark beside it. */
	label?: string | null;
}) {
	return (
		<svg
			aria-hidden={label ? undefined : true}
			aria-label={label ?? undefined}
			className={cn("h-7 w-7 shrink-0", className)}
			fill="none"
			role={label ? "img" : undefined}
			viewBox="0 0 32 32"
			xmlns="http://www.w3.org/2000/svg"
		>
			{label ? <title>{label}</title> : null}
			<path
				d="M21.2 12H24.5A3.5 3.5 0 0 1 28 15.5V24.5A3.5 3.5 0 0 1 24.5 28H15.5A3.5 3.5 0 0 1 12 24.5V21.2"
				stroke={variant === "accent" ? "var(--primary)" : "currentColor"}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
			/>
			<path
				d="M7.5 4H16.5A3.5 3.5 0 0 1 20 7.5V16.5A3.5 3.5 0 0 1 16.5 20H7.5A3.5 3.5 0 0 1 4 16.5V7.5A3.5 3.5 0 0 1 7.5 4ZM8 9H16V10.75H8ZM8 12.5H16V14.25H8ZM8 16H13.5V17.75H8Z"
				fill="currentColor"
				fillRule="evenodd"
			/>
		</svg>
	);
}
