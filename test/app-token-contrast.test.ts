import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { AA_BODY, contrast, NON_TEXT } from "../src/lib/color/contrast";

/**
 * The app's colour tokens have to be legible in both themes.
 *
 * `marketing-contrast.test.ts` covers the marketing palette, which is a separate token
 * set. These are the shadcn tokens behind the dashboard and the editor, and nothing was
 * checking them: a dark-mode tweak to `--muted-foreground` could halve the contrast of
 * every hint text in the app without any test noticing.
 *
 * Each ratio is computed from the token values in `globals.css`, not from a screenshot,
 * so this runs headless and cannot drift from the stylesheet.
 */

const css = readFileSync(
	resolve(process.cwd(), "src/styles/globals.css"),
	"utf8",
);

function token(name: string, theme: "light" | "dark"): string {
	const source =
		theme === "light"
			? css.slice(0, css.indexOf(".dark {"))
			: css.slice(css.indexOf(".dark {"));
	const match = new RegExp(`\\s${name}:\\s*([^;]+);`).exec(source);
	if (!match?.[1]) throw new Error(`token ${name} not found in ${theme}`);
	return match[1].trim();
}

/** [foreground, background, minimum ratio, what the pair is for] */
const PAIRS: Array<[string, string, number, string]> = [
	["--foreground", "--background", AA_BODY, "body text"],
	["--card-foreground", "--card", AA_BODY, "card text"],
	["--muted-foreground", "--background", AA_BODY, "secondary text"],
	["--primary-foreground", "--primary", AA_BODY, "text on a primary button"],
	[
		"--secondary-foreground",
		"--secondary",
		AA_BODY,
		"text on a secondary button",
	],
	[
		"--destructive-foreground",
		"--destructive",
		AA_BODY,
		"text on a destructive button",
	],
	["--accent-foreground", "--accent", AA_BODY, "text on a hovered row"],
	["--ring", "--background", NON_TEXT, "the focus indicator"],
];

describe.each(["light", "dark"] as const)("%s theme contrast", (theme) => {
	it.each(PAIRS)("%s on %s clears %s (%s)", (fg, bg, minimum, purpose) => {
		const ratio = contrast(token(fg, theme), token(bg, theme));
		expect(
			ratio,
			`${purpose}: ${fg} ${token(fg, theme)} on ${bg} ${token(bg, theme)} = ${ratio.toFixed(2)}`,
		).toBeGreaterThanOrEqual(minimum);
	});
});

describe("the border is structure, not decoration", () => {
	it("is visible against the background in both themes", () => {
		// A border that vanishes in dark mode turns every card into a floating block.
		// This is not a WCAG requirement — card edges are decorative, and the shadows
		// carry elevation — so the threshold is the measured current minimum rather than
		// a standard. It is here to catch a token change that erodes the edge to nothing.
		for (const theme of ["light", "dark"] as const) {
			const ratio = contrast(
				token("--border", theme),
				token("--background", theme),
			);
			expect(ratio, `${theme} border`).toBeGreaterThanOrEqual(1.2);
		}
	});
});
