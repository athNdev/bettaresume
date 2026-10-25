import { BrandMark } from "@/components/brand/brand-mark";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { cn } from "@/lib/utils";

/**
 * The full lockup: mark + wordmark at one of four sizes.
 *
 * The mark is 1:1 with the wordmark's cap height and the gap is one quarter of
 * the mark width, so the two read as one object rather than an icon next to
 * text. Below 20px the wordmark stops being legible; use `BrandMark` alone
 * (which is also what the favicon does).
 *
 * Clear space is *one mark width* on all four sides. The component deliberately
 * does not bake that in — spacing belongs to the layout — so see the specimen on
 * `/design-system` and the rule in `docs/design-system/brand.md`.
 */
const SIZES = {
	/** 20px mark / 14px wordmark. Minimum lockup. */
	sm: { mark: "size-5", word: "text-sm", gap: "gap-1" },
	/** 28px mark / 16px wordmark. Default header size. */
	md: { mark: "size-7", word: "text-base", gap: "gap-2" },
	/** 40px mark / 20px wordmark. */
	lg: { mark: "size-10", word: "text-lg", gap: "gap-2" },
	/** 56px mark / 32px wordmark. Marketing and docs only. */
	xl: { mark: "size-14", word: "text-2xl", gap: "gap-3" },
} as const;

export type LockupSize = keyof typeof SIZES;

export function BrandLockup({
	size = "md",
	variant = "mono",
	className,
}: {
	size?: LockupSize;
	variant?: "mono" | "accent";
	className?: string;
}) {
	const spec = SIZES[size];
	return (
		<span
			aria-label="Betta Resume"
			className={cn("inline-flex items-center", spec.gap, className)}
			role="img"
		>
			<BrandMark className={spec.mark} label={null} variant={variant} />
			<BrandWordmark className={cn(spec.word, "leading-none")} />
		</span>
	);
}
