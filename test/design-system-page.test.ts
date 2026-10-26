import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import DesignSystemPage from "../src/app/design-system/page";
import {
	LADDER_STEPS,
	NON_TEXT_CONTRACT,
	RULES,
	TEXT_CONTRACT,
} from "../src/lib/design-system/contract";
import {
	contrastOf,
	contrastThrough,
	loadTokenTheme,
	resolveValue,
} from "../src/lib/design-system/token-theme";
import { codeOf } from "./helpers/code-source";

/**
 * Design system v2 — the layers the token alphabet did not have.
 *
 * The contrast pairs are already enforced against the primitives by
 * `app-token-contrast.test.ts`; this file enforces the *page's* contract, so the
 * documentation cannot show a number it did not measure, and the visual layers
 * cannot be removed while the page keeps claiming them.
 *
 * It also pins the decisions that are easy to undo by accident:
 *
 * - the dark ladder is 950 / 900 / 800 / 700 (D1),
 * - the border roles are hairline / control / selected (D2),
 * - the tone ladder keeps text on `muted-foreground`, icons on `subtle` (D3),
 * - dark floating layers carry the 1px top highlight (T3),
 * - the label role is 12/600/+0.02em (D5).
 */

const theme = loadTokenTheme();
const css = codeOf("src/styles/globals.css");

function contrast(
	pair: (typeof TEXT_CONTRACT)[number],
	mode: "light" | "dark",
) {
	return contrastThrough(theme, mode, pair.fg, pair.layer ?? null, pair.base);
}

describe("every pair the page publishes passes", () => {
	it.each(["light", "dark"] as const)("text pairs in %s", (mode) => {
		for (const pair of TEXT_CONTRACT) {
			const ratio = contrast(pair, mode);
			expect(
				ratio,
				`${mode}: ${pair.label} — ${pair.fg} on ${pair.base} = ${ratio.toFixed(2)}:1`,
			).toBeGreaterThanOrEqual(pair.min);
		}
	});

	it.each(["light", "dark"] as const)("non-text pairs in %s", (mode) => {
		for (const pair of NON_TEXT_CONTRACT) {
			const ratio = contrast(pair, mode);
			expect(
				ratio,
				`${mode}: ${pair.label} — ${pair.fg} on ${pair.base} = ${ratio.toFixed(2)}:1`,
			).toBeGreaterThanOrEqual(pair.min);
		}
	});

	it.each(["light", "dark"] as const)("surface ladder in %s", (mode) => {
		for (const step of LADDER_STEPS) {
			const ratio = contrastOf(theme, mode, step.a, step.b);
			expect(
				ratio,
				`${mode}: ${step.label} — ${step.a} vs ${step.b} = ${ratio.toFixed(2)}:1`,
			).toBeGreaterThanOrEqual(step.min);
		}
	});
});

describe("the dark ladder is the documented one (D1)", () => {
	const role = (token: string) => theme.dark.get(token);

	it("settles page / well / card / overlay at 950 / 900 / 800 / 700", () => {
		expect(role("--background")).toBe("var(--br-neutral-950)");
		expect(role("--sunken")).toBe("var(--br-neutral-900)");
		expect(role("--muted")).toBe("var(--sunken)");
		expect(role("--surface")).toBe("var(--br-neutral-800)");
		expect(role("--surface-raised")).toBe("var(--br-neutral-700)");
	});

	it("steps the hairline with the ladder, so edges stay drawn", () => {
		expect(role("--border")).toBe("var(--br-neutral-600)");
		expect(role("--border-control")).toBe("var(--br-neutral-400)");
		expect(role("--input")).toBe("var(--border-control)");
		expect(role("--border-selected")).toBe("var(--br-accent-400)");
	});
});

describe("the border roles state their job (D2)", () => {
	it("retires --border-strong", () => {
		expect(css).not.toContain("--border-strong:");
		expect(css).not.toContain("--color-border-strong");
	});

	it("exposes control and selected edges to components", () => {
		expect(css).toContain("--color-control: var(--border-control);");
		expect(css).toContain("--color-border-selected: var(--border-selected);");
	});

	it.each(["light", "dark"] as const)(
		"keeps selected edges at 3:1 on every raised surface in %s",
		(mode) => {
			for (const base of ["--background", "--surface", "--surface-raised"]) {
				const ratio = contrastOf(theme, mode, "--border-selected", base);
				expect(
					ratio,
					`${mode}: --border-selected on ${base} = ${ratio.toFixed(2)}:1`,
				).toBeGreaterThanOrEqual(3);
			}
		},
	);
});

describe("the tone ladder is used by role (D3)", () => {
	it("keeps dark text off the icon-only tone", () => {
		// neutral-500 is 4.18:1 on the dark page: legal for a 3:1 icon, below AA
		// for text. If this changes, every micro label in dark breaks at once.
		expect(theme.dark.get("--muted-foreground")).toBe("var(--br-neutral-300)");
		expect(theme.dark.get("--subtle")).toBe("var(--br-neutral-400)");
	});

	it("defines the label and micro roles at 12/600", () => {
		expect(css).toMatch(
			/\.br-label\s*\{[^}]*font-size:\s*var\(--br-text-xs\);[^}]*font-weight:\s*600;[^}]*letter-spacing:\s*var\(--br-tracking-label\);[^}]*\}/s,
		);
		expect(css).toMatch(/\.br-micro\s*\{[^}]*text-transform:\s*uppercase;/s);
		expect(resolveValue(theme, "light", "--br-tracking-label")).toBe("0.02em");
	});
});

describe("depth is layered, not stock (DS-2)", () => {
	it.each(["light", "dark"] as const)(
		"has two stops per elevation in %s",
		(mode) => {
			for (const token of ["--elev-1", "--elev-2", "--elev-3"]) {
				const value = resolveValue(theme, mode, token);
				expect(value.split("oklch").length).toBeGreaterThanOrEqual(3);
			}
		},
	);

	it("adds the top highlight to every dark floating layer", () => {
		for (const token of ["--elev-1", "--elev-2", "--elev-3", "--elev-hover"]) {
			expect(resolveValue(theme, "dark", token)).toContain(
				"inset 0 1px 0 oklch(1 0 0 /",
			);
		}
		expect(resolveValue(theme, "light", "--elev-1")).not.toContain("inset");
	});
});

describe("the brand is real artwork, not a placeholder", () => {
	const assets = [
		"public/brand/mark.svg",
		"public/brand/mark-accent.svg",
		"public/brand/wordmark.svg",
		"public/brand/lockup.svg",
		"public/brand/lockup-mono.svg",
		"public/brand/lockup-accent.svg",
		"public/icon.svg",
		"public/favicon.ico",
	];

	it.each(assets)("%s exists", (asset) => {
		expect(existsSync(resolve(process.cwd(), asset))).toBe(true);
	});

	it.each(assets.filter((asset) => asset.endsWith(".svg")))(
		"%s is a titled, viewBoxed mark",
		(asset) => {
			const svg = readFileSync(resolve(process.cwd(), asset), "utf8");
			expect(svg).toContain("viewBox=");
			expect(svg).toContain("<title>");
		},
	);

	it("keeps the mark a single knockout shape with no mask ids", () => {
		// A <mask> needs a unique id, which needs useId, which would put client
		// JavaScript on the marketing page. The open back path is the design.
		const mark = codeOf("src/components/brand/brand-mark.tsx");
		expect(mark).toContain('fillRule="evenodd"');
		expect(mark).toContain("strokeLinecap");
		expect(mark).not.toContain("useId");
		expect(mark).not.toContain("<mask");
	});

	it("ships a three-size favicon", () => {
		const ico = readFileSync(resolve(process.cwd(), "public/favicon.ico"));
		expect(ico.readUInt16LE(2)).toBe(1); // type: icon
		expect(ico.readUInt16LE(4)).toBe(3); // 16 / 32 / 48
	});

	it("points the page metadata at the icon, not the old placeholder", () => {
		const layout = codeOf("src/app/layout.tsx");
		expect(layout).toContain('"/icon.svg"');
		expect(layout).toContain('"/favicon.ico"');
	});
});

describe("the design-system page is a real route and renders", () => {
	const markup = renderToStaticMarkup(createElement(DesignSystemPage));

	it("is not behind the hash router", () => {
		const page = codeOf("src/app/design-system/page.tsx");
		expect(page).not.toContain("useHashRouter");
		expect(page).not.toContain("@clerk");
		expect(page).not.toContain("HashRouterProvider");
	});

	it("never leaks into the marketing nav", () => {
		// A footer link is the only entry point (see `marketing-claims.test.ts`); the
		// header nav must stay the five product links.
		const chrome = codeOf("src/components/marketing/site-chrome.tsx");
		const header = chrome.slice(
			0,
			chrome.indexOf("export function SiteFooter"),
		);
		expect(header).not.toContain("/design-system");
	});

	it("renders every numbered rule with its enforcer", () => {
		for (const rule of RULES) {
			expect(markup, `missing ${rule.id}`).toContain(rule.id);
			expect(markup, `missing ${rule.title}`).toContain(rule.title);
		}
		expect(markup).toContain("Enforced by");
	});

	it("renders every contrast pair it publishes", () => {
		for (const pair of [...TEXT_CONTRACT, ...NON_TEXT_CONTRACT]) {
			expect(markup, `missing pair: ${pair.label}`).toContain(pair.label);
		}
	});

	it("renders both themes and the copy affordance", () => {
		expect(markup).toContain(">Light<");
		expect(markup).toContain(">Dark<");
		expect(markup).toContain('aria-label="Copy var(--surface)"');
		expect(markup).toContain("Inter 700 / 400");
	});

	it("shows the brand at every supported size", () => {
		for (const label of [
			"xl · 56 / 32",
			"lg · 40 / 20",
			"md · 28 / 16",
			"sm · 20 / 14",
		]) {
			expect(markup).toContain(label);
		}
	});
});

describe("the ratchet is still empty", () => {
	it("has no token-offender debt", () => {
		const baseline = JSON.parse(
			readFileSync(
				resolve(process.cwd(), "test/baselines/token-offenders.json"),
				"utf8",
			),
		) as Record<string, Record<string, unknown>>;
		for (const [scale, entries] of Object.entries(baseline)) {
			expect(Object.keys(entries), `${scale} has baseline entries`).toEqual([]);
		}
	});
});
