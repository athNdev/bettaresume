import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StateIcon } from "../src/components/ui/state-icon";
import { contrast, NON_TEXT } from "../src/lib/color/contrast";
import { codeOf } from "./helpers/code-source";

/**
 * The polish rules from `better-ui`, asserted against the source rather than
 * trusted to taste.
 *
 * These are the rules that are easy to lose in a refactor: a `transition-all`
 * creeps back, the press scale disappears when someone "simplifies" the button,
 * the focus ring goes grey again, or the theme toggle starts animating every
 * surface at once. Each assertion below names the principle it protects so the
 * next person knows what they would be undoing.
 *
 * Motion durations and easings are read from code rather than measured, because
 * there is no browser in this suite — the same honesty rule the rest of the
 * repository uses.
 */

const read = (file: string) =>
	readFileSync(resolve(process.cwd(), file), "utf8");
const css = read("src/styles/globals.css");
const button = codeOf("src/components/ui/button.tsx");

const SOURCE_ROOTS = ["src/components", "src/features", "src/lib", "src/app"];

function sourceFiles(): string[] {
	const out: string[] = [];
	const walk = (dir: string) => {
		for (const entry of readdirSync(resolve(process.cwd(), dir), {
			withFileTypes: true,
		})) {
			const path = `${dir}/${entry.name}`;
			if (entry.isDirectory()) walk(path);
			else if (/\.tsx?$/.test(entry.name)) out.push(path);
		}
	};
	for (const root of SOURCE_ROOTS) walk(root);
	return out;
}

/** Tokens read from `:root` / `.dark`, so the assertions use the real values. */
function token(name: string, block: "root" | "dark"): string {
	const source =
		block === "root"
			? css.slice(0, css.indexOf(".dark {"))
			: css.slice(css.indexOf(".dark {"));
	const match = new RegExp(`\\s${name}:\\s*([^;]+);`).exec(source);
	if (!match?.[1]) throw new Error(`token ${name} not found in ${block}`);
	return match[1].trim();
}

describe("nothing transitions everything", () => {
	it("has no transition-all in source", () => {
		// "Transition only what changes." A blanket transition animates layout
		// properties the browser should not be touching and smears on theme flips.
		const offenders = sourceFiles().filter((file) =>
			codeOf(file).includes("transition-all"),
		);
		expect(offenders, `transition-all in: ${offenders.join(", ")}`).toEqual([]);
	});
});

describe("the button gives press feedback", () => {
	it("scales to exactly 0.96 on press", () => {
		// 0.96 is the value that reads as tactile without looking like the control
		// flinched. Anything below 0.95 is exaggerated.
		expect(button).toContain("active:scale-[0.96]");
	});

	it("names its transition properties", () => {
		const transition = /transition-\[([^\]]+)\]/.exec(button)?.[1] ?? "";
		expect(transition).toContain("transform");
		expect(transition).toContain("background-color");
		expect(transition).not.toContain("all");
	});

	it("can be opted out of the motion where it would distract", () => {
		expect(button).toMatch(/static:\s*\{/);
		expect(button).toContain('"active:scale-100"');
	});

	it("matches icon stroke to the weight of the text beside it", () => {
		// Button text is `font-medium` (500) — 1.5px is the stroke that carries the
		// same optical weight. Lucide's default is 2px, which reads heavy here.
		expect(button).toContain("[&_svg]:[stroke-width:1.5]");
		expect(codeOf("src/components/ui/dropdown-menu.tsx")).toContain(
			"[&_svg]:[stroke-width:1.5]",
		);
	});
});

describe("the focus ring is visible", () => {
	it("clears 3:1 against the surface it sits on, in both themes", () => {
		// WCAG 1.4.11: a focus indicator is a non-text contrast requirement. The ring
		// used to be `oklch(0.708 0 0)` — a grey that measured 2.3:1 on white, so the
		// ring was technically present and practically invisible.
		for (const block of ["root", "dark"] as const) {
			const ring = token("--ring", block);
			const background = token("--background", block);
			const ratio = contrast(ring, background);
			expect(ratio, `--ring ${ring} on ${background}`).toBeGreaterThanOrEqual(
				NON_TEXT,
			);
		}
	});
});

describe("elevation is shadows, structure is borders", () => {
	it("defines three layered elevations in both themes", () => {
		for (const block of ["root", "dark"] as const) {
			for (const name of ["--elev-1", "--elev-2", "--elev-3"]) {
				const value = token(name, block);
				// Layered, not a single hard shadow: at least two stops.
				expect(value, `${name} in ${block}`).toContain("oklch(0 0 0 /");
				expect(value.split("oklch").length).toBeGreaterThanOrEqual(3);
			}
		}
	});

	it("keeps dark-mode shadows strong enough to read", () => {
		// A light-mode alpha on a dark surface is invisible; the dark tokens use more.
		const light = token("--elev-2", "root");
		const dark = token("--elev-2", "dark");
		const alpha = (v: string) =>
			Math.max(
				...[...v.matchAll(/oklch\(0 0 0 \/ ([\d.]+)\)/g)].map((m) =>
					Number(m[1]),
				),
			);
		expect(alpha(dark)).toBeGreaterThan(alpha(light));
	});
});

describe("motion restraint", () => {
	it("honours prefers-reduced-motion globally", () => {
		// Every animation, not just the marketing ones: a user who asked for less
		// motion should not have to ask per component. There are two reduced-motion
		// blocks in the stylesheet — one scoped to the marketing animations — so the
		// assertion picks the global one by what it contains.
		const blocks = [
			...css.matchAll(
				/@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n\}/g,
			),
		].map((m) => m[0]);
		const global = blocks.find((b) => b.includes("animation-duration"));
		expect(global).toBeDefined();
		expect(global).toMatch(/animation-duration:\s*0\.01ms !important/);
		expect(global).toMatch(/transition-duration:\s*0\.01ms !important/);
		expect(global).toContain("*");
	});
});

describe("the theme switch does not smear", () => {
	it("suppresses every transition for the duration of the swap", () => {
		expect(css).toMatch(
			/\.theme-swapping \*[\s\S]*?transition: none !important/,
		);
	});

	it("adds and removes the suppression, and forces a reflow in between", () => {
		const module = codeOf("src/lib/ui/theme-swap.ts");
		expect(module).toContain("classList.add(SUPPRESS_CLASS)");
		expect(module).toContain("classList.remove(SUPPRESS_CLASS)");
		// Without the forced reflow the suppression and the class change land in the
		// same paint and nothing is suppressed.
		expect(module).toMatch(/void .*offsetHeight/);
	});
});

describe("state icons cross-fade instead of jumping", () => {
	it("uses the prescribed opacity, scale and blur values", () => {
		expect(css).toContain("transform: scale(0.25)");
		expect(css).toContain("filter: blur(4px)");
		expect(css).toContain("cubic-bezier(0.2, 0, 0, 1)");
	});

	it("keeps both icons mounted", () => {
		const markup = renderToStaticMarkup(
			createElement(StateIcon, {
				active: true,
				off: createElement("i", { "data-off": "" }),
				on: createElement("i", { "data-on": "" }),
			}),
		);
		expect(markup).toContain("data-off");
		expect(markup).toContain("data-on");
		expect(markup).toContain('data-state="b"');
	});
});
