import { cn } from "@/lib/utils";

/**
 * The wordmark: "Betta" at 700, "Resume" at 400, one typeface, −0.01em tracking.
 *
 * **Why Inter, and why that pairing.** The personality is serious, precise and
 * quiet. The book's font axis is explicit: serif reads elegant/classic, rounded
 * sans reads playful, and a neutral sans is *plain, letting other elements carry
 * the personality*. A resume tool people use while anxious should not be
 * playful, and a decorative serif would turn the product name into an editorial
 * masthead it hasn't earned. Inter is also already self-hosted for the whole UI,
 * so the wordmark costs no extra request and cannot drift from the interface.
 *
 * The character therefore comes from weight, not from a novelty face: the
 * product name's first word is the 700 emphasis, the second is 400 — the same
 * two weights the hierarchy rule allows. −0.01em is the `title` tracking step
 * (T9), so the wordmark reads as machined at 16px and at 40px.
 *
 * The SVG in `public/brand/wordmark.svg` is outlined from the same two Inter
 * files, so print and favicon contexts match the DOM exactly.
 */
export function BrandWordmark({ className }: { className?: string }) {
	return (
		<span className={cn("whitespace-nowrap tracking-title", className)}>
			<span className="font-bold">Betta</span>{" "}
			<span className="font-normal">Resume</span>
		</span>
	);
}
