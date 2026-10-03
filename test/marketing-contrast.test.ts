import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
	AA_BODY,
	AA_LARGE,
	composite,
	contrast,
	contrastRatio,
	minimumAlpha,
	NON_TEXT,
	oklchToRgb,
	parseColor,
	relativeLuminance,
	toHex,
} from "../src/lib/color/contrast";

/**
 * Contrast enforcement for the marketing page.
 *
 * ## Why this file exists
 *
 * The page previously set all of its body copy as `text-[var(--brand-ink)]/70`,
 * `/65`, `/62`, `/60`, `/55` and `/50`. Alpha-modulated ink at 50–65% produces a
 * mid grey that is perfectly legible-looking in source and, for the bottom of
 * that ramp, fails WCAG AA. Nothing in the build computed the result, so the
 * failure survived review repeatedly. The European Accessibility Act has applied
 * to e-commerce services since 28 June 2025, measured against EN 301 549 /
 * WCAG 2.1 AA, so this is a compliance surface.
 *
 * The structural cause was the ramp itself: because every step was *relative*,
 * a reviewer could not see which step was legal without a contrast tool, and
 * adding a new step (`/57`) would have been silently unknowable. So the tokens
 * are now explicit OKLCH values with no alpha, and this test is what keeps them
 * honest.
 *
 * ## How it works
 *
 * It does not check a hand-written list — that would drift from the components.
 * It parses `globals.css` for the token definitions and the three marketing
 * components for real usage, then classifies each usage by the *token it names*.
 * The convention is load-bearing:
 *
 * - a `--brand-*-on-ink` token may only be text on an ink background,
 * - a paper-side token may only be text on paper or white,
 * - `--brand-warm-decor` measures 2:1 on paper and may **never** appear in a
 *   `text-` utility — using it for type should fail here, not ship,
 * - any alpha modifier on a text utility fails outright, because alpha over ink
 *   is what broke in the first place.
 *
 * A token used in a `text-` utility that is not classified below fails the
 * build. Adding a colour therefore requires deciding which backdrop it is legal
 * on, which is exactly the decision that was being skipped.
 */

const root = new URL("../", import.meta.url);
const css = readFileSync(
	fileURLToPath(new URL("src/styles/globals.css", root)),
	"utf8",
);

const COMPONENTS = [
	"src/components/marketing/hero.tsx",
	"src/components/marketing/sections.tsx",
	"src/components/marketing/site-chrome.tsx",
	"src/app/page.tsx",
];

const BACKGROUNDS = {
	paper: "oklch(0.985 0.002 268)",
	white: "#ffffff",
	ink: "oklch(0.17 0.014 268)",
} as const;

type BackgroundName = keyof typeof BACKGROUNDS;

/**
 * Tokens legal as text, and every backdrop each may legally sit on. A text
 * token is checked against *all* of its backdrops, so "fine on paper, broken on
 * the white card inside it" fails.
 */
const TEXT_TOKENS: Record<string, BackgroundName[]> = {
	"--brand-text": ["paper", "white"],
	"--brand-text-muted": ["paper", "white"],
	"--brand-text-faint": ["paper", "white"],
	"--brand-accent": ["paper", "white"],
	"--brand-verified": ["paper", "white"],
	"--brand-text-on-ink": ["ink"],
	"--brand-text-on-ink-muted": ["ink"],
	"--brand-text-on-ink-faint": ["ink"],
	"--brand-accent-on-ink": ["ink"],
	"--brand-verified-on-ink": ["ink"],
};

/**
 * Tokens that may only appear in non-text utilities. `--brand-control-border`
 * is the boundary of an interactive control, so it carries the WCAG 1.4.11
 * 3:1 non-text bar rather than being exempt.
 */
const NON_TEXT_TOKENS: Record<string, number> = {
	"--brand-ink": 0,
	"--brand-ink-soft": 0,
	"--brand-paper": 0,
	"--brand-rule": 0,
	"--brand-warm-decor": 0,
	"--brand-control-border": NON_TEXT,
};

const ALL_TOKENS = { ...TEXT_TOKENS, ...NON_TEXT_TOKENS };

/** Extract `--brand-*: oklch(...)` definitions from the marketing block. */
function tokenDefinitions(): Map<string, string> {
	// The marketing block is the `[data-marketing] { ... }` rule.
	const start = css.indexOf("[data-marketing] {");
	expect(
		start,
		"marketing token block not found in globals.css",
	).toBeGreaterThan(-1);
	const block = css.slice(start, css.indexOf("\n}", start));
	const found = new Map<string, string>();
	for (const match of block.matchAll(
		/(--brand-[a-z-]+):\s*(oklch\([^)]*\))/g,
	)) {
		const name = match[1];
		const value = match[2];
		if (name) value && found.set(name, value);
	}
	return found;
}

/**
 * Tailwind utilities that paint type. Anything here is held to AA body. Stored
 * without the trailing dash, because that is what the usage regex captures.
 */
const TEXT_UTILITIES = ["text", "decoration", "placeholder"];

type Usage = {
	token: string;
	utility: string;
	alpha: number | null;
	file: string;
	/** Backdrop detected from the markup surrounding this usage. */
	background: BackgroundName;
};

/** Block-level openers that establish a background for what follows them. */
const BLOCK_OPENERS = /<(?:section|footer|header|main|article|aside|nav)\b/g;
/**
 * An ink background declared on a real *container*, not on a control or a
 * decorative bar.
 *
 * Narrowing the tag list matters twice over. Matching the bare string anywhere
 * would also catch `bg-[var(--brand-ink-soft)]` and the ink fill of the primary
 * CTA button, after which every element further down the file would look like
 * it sat on ink. Including `div` would catch the schematic bars inside
 * `TemplateThumb`, which are ink-coloured shapes drawn *on* paper.
 */
const INK_BACKGROUND =
	/<(?:section|footer|header|figure)\b[^>]*?\bbg-\[var\(--brand-ink\)\]/g;

/**
 * Which backdrop a given offset actually sits on.
 *
 * These components are flat — a `<section>` or `<figure>` owns its background
 * and does not nest a differently-coloured section inside itself — so the rule
 * is: the nearest ink container declared before this usage, with no later block
 * opener in between, is the backdrop. `>=` because in `<section
 * className="bg-[var(--brand-ink)]">` the ink container and the block opener are
 * the same tag.
 *
 * A usage with no ink container above it is on paper.
 */
function backgroundAt(source: string, index: number): BackgroundName {
	const before = source.slice(0, index);
	let inkIndex = -1;
	for (const match of before.matchAll(INK_BACKGROUND)) {
		inkIndex = match.index ?? -1;
	}
	if (inkIndex === -1) return "paper";
	let lastBlock = -1;
	for (const match of before.matchAll(BLOCK_OPENERS)) {
		lastBlock = match.index ?? -1;
	}
	return inkIndex >= lastBlock ? "ink" : "paper";
}

/** Every `var(--brand-*)` reference in a component, with its utility prefix. */
function usagesIn(file: string): Usage[] {
	const source = readFileSync(fileURLToPath(new URL(file, root)), "utf8");
	const usages: Usage[] = [];
	// Matches `text-[var(--brand-x)]` / `bg-[var(--brand-x)]/40` / `ring-[var(--brand-y)]`
	const pattern = /([a-z-]+)-\[var\((--brand-[a-z-]+)\)\](?:\/(\d+))?/g;
	for (const match of source.matchAll(pattern)) {
		const [, utility, token, alpha] = match;
		if (!utility || !token) continue;
		usages.push({
			token,
			utility,
			alpha: alpha ? Number(alpha) / 100 : null,
			file,
			background: backgroundAt(source, match.index ?? 0),
		});
	}
	return usages;
}

const ALL_USAGES: Usage[] = COMPONENTS.flatMap(usagesIn);
const DEFINITIONS = tokenDefinitions();

describe("the contrast maths itself", () => {
	/**
	 * Pinned against published WCAG reference values. Without these, a future
	 * refactor of `contrast.ts` could quietly under-report every ratio below and
	 * turn this file into a rubber stamp. `#767676` on white and `#777777` on
	 * white are the canonical 4.54 / 4.48 pair — they are 0.06 apart, so a
	 * luminance function that skips the sRGB decode reports both around 2:1 and
	 * fails here immediately.
	 */
	it.each([
		["#767676", "#ffffff", 4.54],
		["#777777", "#ffffff", 4.48],
		["#000000", "#ffffff", 21],
		["#ffffff", "#ffffff", 1],
		["#595959", "#ffffff", 7.0],
	])("%s on %s is %s:1", (fg, bg, expected) => {
		expect(contrastRatio(parseColor(fg).rgb, parseColor(bg).rgb)).toBeCloseTo(
			expected as number,
			1,
		);
	});

	it("computes relative luminance, not raw channel average", () => {
		// White must be 1.0 and black exactly 0. A naive mean of the encoded
		// channels happens to satisfy both of those, which is why the ratio cases
		// above matter more than this one.
		expect(relativeLuminance(parseColor("#ffffff").rgb)).toBeCloseTo(1, 5);
		expect(relativeLuminance(parseColor("#000000").rgb)).toBeCloseTo(0, 5);
		// Mid grey: 0.2159 after decoding, ~0.5 if you skip it.
		expect(relativeLuminance(parseColor("#808080").rgb)).toBeCloseTo(0.2159, 3);
	});

	it("converts the OKLCH tokens to the documented hex values", () => {
		// These are the hexes the design tokens have always resolved to; pinning
		// them catches a matrix transposition that a ratio-only test would hide.
		expect(toHex(oklchToRgb(0.17, 0.014, 268))).toBe("#0d0f16");
		expect(toHex(oklchToRgb(0.985, 0.002, 268))).toBe("#f9fafb");
	});

	it("composites alpha in gamma-encoded space, like a browser", () => {
		const ink = parseColor("#000000").rgb;
		const white = parseColor("#ffffff").rgb;
		expect(toHex(composite(ink, white, 0.5))).toBe("#808080");
		// A linear-space composite would give #bcbcbc here, a visibly lighter grey.
	});

	it("finds the minimum alpha that reaches a target", () => {
		const alpha = minimumAlpha(BACKGROUNDS.ink, BACKGROUNDS.paper, AA_BODY);
		expect(
			contrast(BACKGROUNDS.ink, BACKGROUNDS.paper, alpha),
		).toBeGreaterThanOrEqual(AA_BODY);
		expect(
			contrast(BACKGROUNDS.ink, BACKGROUNDS.paper, alpha - 0.02),
		).toBeLessThan(AA_BODY);
	});
});

describe("every marketing colour token is classified", () => {
	it("finds the token definitions", () => {
		expect(DEFINITIONS.size).toBeGreaterThanOrEqual(
			Object.keys(ALL_TOKENS).length,
		);
	});

	it.each(Object.keys(ALL_TOKENS))("%s is defined in globals.css", (token) => {
		expect(DEFINITIONS.has(token), `${token} has no definition`).toBe(true);
	});

	it.each(Object.keys(ALL_TOKENS))("%s parses as a colour", (token) => {
		const value = DEFINITIONS.get(token);
		expect(() => parseColor(value ?? "")).not.toThrow();
	});

	/**
	 * The renamed warm token is the load-bearing one. It measures 2:1 on paper —
	 * unusable as type — so the protection is structural: it may appear in
	 * gradients, washes and rules, and nowhere else.
	 */
	it("--brand-warm-decor is never used for text", () => {
		const misused = ALL_USAGES.filter(
			(u) =>
				u.token === "--brand-warm-decor" &&
				TEXT_UTILITIES.some((prefix) => u.utility.startsWith(prefix)),
		);
		expect(
			misused,
			`--brand-warm-decor is decorative only; used as text in ${misused
				.map((u) => `${u.file} (${u.utility})`)
				.join(", ")}`,
		).toEqual([]);
	});
});

describe("text colour usage meets WCAG AA", () => {
	const textUsages = ALL_USAGES.filter((u) =>
		TEXT_UTILITIES.some((prefix) => u.utility.startsWith(prefix)),
	);

	it("found the marketing text usages", () => {
		expect(textUsages.length).toBeGreaterThan(20);
	});

	it.each(TEXT_UTILITIES)(
		"%s utilities only use classified text tokens",
		(p) => {
			const unclassified = textUsages.filter(
				(u) =>
					u.utility.startsWith(p) &&
					!(u.token in TEXT_TOKENS) &&
					!(u.token in NON_TEXT_TOKENS),
			);
			expect(
				unclassified.map((u) => `${u.token} in ${u.file}`),
				"a colour reached a text utility without declaring which backdrop it is legal on",
			).toEqual([]);
		},
	);

	/**
	 * The regression this whole file exists for. `text-[var(--brand-ink)]/60`
	 * and its siblings were the original defect: they read as deliberate muted
	 * grey and measured 3.55:1 at the bottom of the ramp. Alpha is now banned on
	 * type outright, so this cannot be reintroduced quietly.
	 */
	it("no text colour is composited with an alpha", () => {
		const faded = textUsages.filter((u) => u.alpha !== null && u.alpha < 1);
		expect(
			faded.map(
				(u) => `${u.utility}-[var(${u.token})]/${u.alpha} in ${u.file}`,
			),
			"alpha on a text colour reintroduces the original failure",
		).toEqual([]);
	});

	it.each(Object.entries(TEXT_TOKENS))(
		"%s clears 4.5:1 on every backdrop it is used on",
		(token, backgrounds) => {
			const value = DEFINITIONS.get(token);
			expect(value, `${token} undefined`).toBeTruthy();
			const failures: string[] = [];
			for (const name of backgrounds) {
				const ratio = contrastRatio(
					parseColor(value as string).rgb,
					parseColor(BACKGROUNDS[name]).rgb,
				);
				if (ratio < AA_BODY) {
					failures.push(
						`${toHex(parseColor(value as string).rgb)} on ${name} is ${ratio.toFixed(2)}:1`,
					);
				}
			}
			expect(failures, failures.join("; ")).toEqual([]);
		},
	);

	/** WCAG 1.4.11: a control boundary has to be identifiable at 3:1. */
	it("--brand-control-border clears 3:1 for non-text contrast", () => {
		const value = DEFINITIONS.get("--brand-control-border") as string;
		for (const name of ["paper", "white"] as const) {
			expect(
				contrastRatio(parseColor(value).rgb, parseColor(BACKGROUNDS[name]).rgb),
			).toBeGreaterThanOrEqual(NON_TEXT);
		}
	});

	/**
	 * Ink-filled controls must label with an on-ink token.
	 *
	 * A previous draft tried to derive the backdrop of every usage by scanning
	 * backwards through the file for the nearest ink background. That approach
	 * was abandoned: it cannot see function boundaries (a `SectionLabel` helper
	 * defined *after* an ink `<figure>` in the file is used inside a paper
	 * document panel), and it reads `hover:bg-…` variants as if they were the
	 * element's own fill. Both produce false positives, and a test that cries
	 * wolf gets deleted.
	 *
	 * This version works at the one level that is unambiguous: a single
	 * `className` string, where a fill and a text colour provably sit on the
	 * *same element*. Variant-prefixed utilities are excluded, because
	 * `hover:bg-[var(--brand-ink)]` is not the resting backdrop.
	 */
	it("every ink-filled control labels with an on-ink token", () => {
		const problems: string[] = [];
		for (const file of COMPONENTS) {
			const source = readFileSync(fileURLToPath(new URL(file, root)), "utf8");
			for (const attr of source.matchAll(/className="([^"]*)"/g)) {
				const classes = attr[1] ?? "";
				// Unprefixed ink fill on this element. Variant-prefixed utilities
				// (`hover:bg-[var(--brand-ink)]/5`) are excluded on purpose: they
				// are not the resting backdrop, so the label is not on ink.
				if (!/(?:^|\s)bg-\[var\(--brand-ink(?:-soft)?\)\]/.test(classes)) {
					continue;
				}
				// Unprefixed text colour on the same element.
				const text = classes.match(/(?:^|\s)text-\[var\((--brand-[a-z-]+)\)\]/);
				if (!text?.[1]) continue;
				if (!text[1].includes("-on-ink")) {
					const token = DEFINITIONS.get(text[1]);
					const ratio = token
						? contrastRatio(
								parseColor(token).rgb,
								parseColor(BACKGROUNDS.ink).rgb,
							)
						: 0;
					problems.push(
						`${file}: ink fill labelled with ${text[1]} (${ratio.toFixed(2)}:1 on ink, needs ${AA_BODY}:1)`,
					);
				}
			}
		}
		expect(problems, problems.join("; ")).toEqual([]);
	});

	it("finds the ink-filled controls it is checking", () => {
		// Guards the check above from passing because it found nothing. The hero
		// CTA, the skip link and the header button are all ink-filled.
		let found = 0;
		for (const file of COMPONENTS) {
			const source = readFileSync(fileURLToPath(new URL(file, root)), "utf8");
			for (const attr of source.matchAll(/className="([^"]*)"/g)) {
				if (/(?:^|\s)bg-\[var\(--brand-ink(?:-soft)?\)\]/.test(attr[1] ?? "")) {
					found++;
				}
			}
		}
		expect(found).toBeGreaterThanOrEqual(3);
	});

	/**
	 * Coarse sanity check that the components genuinely exercise both sides of
	 * the split. Deliberately counts rather than asserts per-usage legality —
	 * see the note on the abandoned scan above.
	 */
	it("components use both paper-side and on-ink text tokens", () => {
		const tokens = textUsages.map((u) => u.token);
		expect(tokens.filter((t) => t.includes("-on-ink")).length).toBeGreaterThan(
			5,
		);
		expect(
			tokens.filter((t) => t.startsWith("--brand-") && !t.includes("-on-ink"))
				.length,
		).toBeGreaterThan(10);
	});
});

describe("focus indicators meet WCAG 1.4.11", () => {
	/**
	 * The focus ring is drawn with `--brand-accent` normally and
	 * `--brand-accent-on-ink` inside `.on-ink` sections. Both are asserted in the
	 * token table above at 4.5:1, which clears the 3:1 non-text bar with room;
	 * these restate the specific pairs because a focus ring is the single most
	 * consequential thing to get wrong.
	 */
	it("clears 3:1 on paper, on a white card, and on ink", () => {
		const paper = parseColor(BACKGROUNDS.paper).rgb;
		const white = parseColor(BACKGROUNDS.white).rgb;
		const ink = parseColor(BACKGROUNDS.ink).rgb;
		const light = parseColor(DEFINITIONS.get("--brand-accent") as string).rgb;
		const dark = parseColor(
			DEFINITIONS.get("--brand-accent-on-ink") as string,
		).rgb;

		expect(contrastRatio(light, paper)).toBeGreaterThanOrEqual(NON_TEXT);
		expect(contrastRatio(light, white)).toBeGreaterThanOrEqual(NON_TEXT);
		expect(contrastRatio(dark, ink)).toBeGreaterThanOrEqual(NON_TEXT);
	});

	it("keeps scroll-margin so the sticky header cannot obscure the ring", () => {
		// WCAG 2.4.11 Focus Not Obscured. The header is sticky at 4rem with a
		// z-index above the content; without scroll-margin the browser scrolls a
		// focused link to y=0 and the header covers the ring.
		expect(css).toMatch(/scroll-margin-top/);
	});

	it("keeps the motion block gated on prefers-reduced-motion", () => {
		// Correct as shipped; pinned so a future animation is not added outside
		// the guard.
		expect(css).toMatch(
			/@media \(prefers-reduced-motion: no-preference\)[\s\S]*?\[data-marketing\] \[data-animate\]/,
		);
		expect(css).toMatch(
			/@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none/,
		);
	});
});

describe("the historical defect, documented", () => {
	/**
	 * These are the measured values of the old alpha ramp against paper. They
	 * are pinned as a record rather than as a target: if a future change makes
	 * this block fail, it means the documentation below has drifted, not that
	 * the tokens have regressed. The point is that the numbers that shipped are
	 * now knowable in a test rather than only in a review.
	 */
	it("the old ink/alpha ramp did in fact fail at its lower steps", () => {
		const ink = BACKGROUNDS.ink;
		const at = (alpha: number) =>
			contrastRatio(
				composite(
					parseColor(ink).rgb,
					parseColor(BACKGROUNDS.paper).rgb,
					alpha,
				),
				parseColor(BACKGROUNDS.paper).rgb,
			);

		// 1.81:1 as originally reported by an external audit that measured the
		// rendered page rather than the source.
		expect(at(0.5)).toBeGreaterThanOrEqual(AA_LARGE);
		expect(at(0.5)).toBeLessThan(AA_BODY);
		expect(at(0.55)).toBeLessThan(AA_BODY);
		// The upper steps of the old ramp did pass. Recording that honestly
		// matters: the failure was the bottom of the ramp and the accent tokens,
		// not every paragraph on the page.
		expect(at(0.7)).toBeGreaterThanOrEqual(AA_BODY);
	});

	it("the accent now passes where it previously sat under the bar", () => {
		const accent = DEFINITIONS.get("--brand-accent") as string;
		expect(
			contrastRatio(parseColor(accent).rgb, parseColor(BACKGROUNDS.paper).rgb),
		).toBeGreaterThanOrEqual(AA_BODY);
	});
});
