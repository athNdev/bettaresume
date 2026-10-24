/**
 * Run a theme change without every transition on the page firing at once.
 *
 * A theme flip changes colour, background, border and shadow on nearly every
 * element simultaneously, so `transition-colors` on the button, the card shadow,
 * the sidebar border and a hundred others all animate together and the page
 * smears rather than snapping. Adding `.theme-swapping` (whose rule in
 * `globals.css` is `transition: none !important` on everything) for the duration
 * of the swap is what makes the change feel instant.
 *
 * The class is removed on the next frame, so ordinary transitions resume
 * immediately afterwards. A forced reflow between adding the class and applying
 * the change is what guarantees the browser has committed the suppression before
 * the class on <html> changes; without it the two can land in the same paint and
 * nothing is suppressed.
 */
const SUPPRESS_CLASS = "theme-swapping";

export function withoutThemeTransitions(apply: () => void): void {
	if (typeof document === "undefined") {
		apply();
		return;
	}

	const root = document.documentElement;
	root.classList.add(SUPPRESS_CLASS);

	// Force a reflow so the suppression is committed before the theme changes.
	void root.offsetHeight;

	try {
		apply();
	} finally {
		requestAnimationFrame(() => {
			root.classList.remove(SUPPRESS_CLASS);
		});
	}
}
