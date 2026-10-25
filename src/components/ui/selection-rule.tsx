import { cn } from "@/lib/utils";

/**
 * The 2px accent rule that marks a selected row.
 *
 * Selection is the app's most repeated accent moment, so it is defined once:
 * a tinted row background (`bg-selected`) plus this rule plus a check. The tint
 * alone measured 1.31:1 in the old dark theme, which is why a background change
 * was not enough to answer "where am I". The rule is 3:1 against every surface
 * in both themes and survives the squint test.
 *
 * The parent must be `relative`.
 */
export function SelectionRule({
	selected,
	className,
}: {
	selected: boolean;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"br-selection-rule transition-opacity duration-(--br-duration-fast)",
				selected ? "opacity-100" : "opacity-0",
				className,
			)}
		/>
	);
}
