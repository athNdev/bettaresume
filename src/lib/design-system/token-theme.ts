/**
 * Reading the design tokens the way the browser does.
 *
 * `globals.css` is two-tiered: `--br-*` primitives in `@theme`, role variables
 * in `:root` / `.dark` that reference them through `var(--…)` and
 * `color-mix(in oklab, …)`. Anyone who needs the *resolved* colour a user
 * actually sees — the contrast tests, and the `/design-system` page itself —
 * has to resolve those chains the way a browser would.
 *
 * This module only parses and resolves. The colour maths lives in
 * `src/lib/color/contrast.ts`.
 *
 * It is server-only in practice: it reads the stylesheet from disk. The
 * `/design-system` page calls it at build time and ships the numbers as HTML,
 * which is why the page can show measured ratios without any client JavaScript
 * and without hand-maintained figures drifting from the stylesheet.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	composite,
	contrastRatio,
	oklchToRgb,
	type Rgb,
} from "@/lib/color/contrast";

export type ThemeName = "light" | "dark";

/** A colour with its alpha channel, in oklch coordinates plus alpha. */
interface OklchColour {
	l: number;
	c: number;
	h: number;
	alpha: number;
}

/** The token tables parsed out of `globals.css`. */
export interface TokenTheme {
	/** `--br-*` primitives from the `@theme` blocks. */
	primitives: Map<string, string>;
	/** Role variables from `:root`. */
	light: Map<string, string>;
	/** Role variables from `.dark`. */
	dark: Map<string, string>;
}

const CSS_PATH = "src/styles/globals.css";

export function loadTokenTheme(): TokenTheme {
	const css = readFileSync(resolve(process.cwd(), CSS_PATH), "utf8");
	const primitives = new Map<string, string>();
	const light = new Map<string, string>();
	const dark = new Map<string, string>();

	for (const block of blocks(css)) {
		if (block.selector.startsWith("@theme")) {
			for (const [name, value] of declarations(block.body)) {
				primitives.set(name, value);
			}
		} else if (block.selector === ":root") {
			for (const [name, value] of declarations(block.body)) {
				light.set(name, value);
			}
		} else if (block.selector === ".dark") {
			for (const [name, value] of declarations(block.body)) {
				dark.set(name, value);
			}
		}
	}

	if (primitives.size === 0) throw new Error("no @theme block found");
	if (light.size === 0) throw new Error("no :root block found");
	if (dark.size === 0) throw new Error("no .dark block found");
	return { primitives, light, dark };
}

/** Split `sel { … }` blocks by brace matching (blocks nest; regex cannot). */
function blocks(css: string): Array<{ selector: string; body: string }> {
	const out: Array<{ selector: string; body: string }> = [];
	const open = /([^\n{}]+)\{/g;

	for (;;) {
		const match = open.exec(css);
		if (match === null) break;
		let depth = 1;
		let i = open.lastIndex;
		for (; i < css.length && depth > 0; i++) {
			if (css[i] === "{") depth++;
			else if (css[i] === "}") depth--;
		}
		out.push({
			selector: (match[1] ?? "").replace(/\/\*[\s\S]*?\*\//g, "").trim(),
			body: css.slice(open.lastIndex, i - 1),
		});
		open.lastIndex = i;
	}
	return out;
}

/** `--name: value;` declarations, comments stripped, multi-line values kept. */
function declarations(body: string): Array<[string, string]> {
	const clean = body.replace(/\/\*[\s\S]*?\*\//g, "");
	const out: Array<[string, string]> = [];
	for (const match of clean.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
		out.push([match[1] ?? "", (match[2] ?? "").trim().replace(/\s+/g, " ")]);
	}
	return out;
}

function roleMap(theme: TokenTheme, name: ThemeName): Map<string, string> {
	return name === "light" ? theme.light : theme.dark;
}

/**
 * Resolve `var()` chains and return the final *expression* — a shadow list, a
 * duration, an oklch triple. For assertions about the shape of a value rather
 * than its painted colour.
 */
export function resolveValue(
	theme: TokenTheme,
	name: ThemeName,
	token: string,
): string {
	let value = roleMap(theme, name).get(token) ?? theme.primitives.get(token);
	if (value === undefined)
		throw new Error(`token ${token} not found in ${name}`);
	for (let i = 0; i < 12; i++) {
		const varMatch = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value.trim());
		if (!varMatch) return value.trim();
		const name2 = varMatch[1] ?? "";
		const next = roleMap(theme, name).get(name2) ?? theme.primitives.get(name2);
		if (next === undefined) {
			throw new Error(`token ${name2} not found in ${name}`);
		}
		value = next;
	}
	throw new Error(`token resolution too deep at ${token}`);
}

/**
 * Resolve a token to the sRGB it paints over the given backdrop (the page by
 * default), compositing any alpha the way a browser would.
 */
export function resolveColour(
	theme: TokenTheme,
	name: ThemeName,
	token: string,
	over?: Rgb,
): Rgb {
	return paint(theme, name, token, over);
}

/** Contrast between two tokens as they actually paint, on a given backdrop. */
export function contrastOf(
	theme: TokenTheme,
	name: ThemeName,
	foreground: string,
	background: string,
): number {
	const paintedBg = paint(theme, name, background);
	const paintedFg = paint(theme, name, foreground, paintedBg);
	return contrastRatio(paintedFg, paintedBg);
}

/**
 * Contrast of a foreground token over a *composited* backdrop: a state layer
 * painted over a surface, then text on top. `layer` may be `null` for a plain
 * surface pair.
 */
export function contrastThrough(
	theme: TokenTheme,
	name: ThemeName,
	foreground: string,
	layer: string | null,
	base: string,
): number {
	const paintedBase = paint(theme, name, base);
	const paintedLayer = layer
		? paint(theme, name, layer, paintedBase)
		: paintedBase;
	return contrastRatio(
		paint(theme, name, foreground, paintedLayer),
		paintedLayer,
	);
}

/** Paint a token over its backdrop (or the page), alpha and all. */
function paint(
	theme: TokenTheme,
	name: ThemeName,
	token: string,
	over?: Rgb,
): Rgb {
	const resolved = evaluate(theme, name, token, 0);
	const backdrop = over ?? rgbOf(evaluate(theme, name, "--background", 0));
	return composite(rgbOf(resolved), backdrop, resolved.alpha);
}

/** Pair separation ratio between two painted areas (for surface ladders). */
export function separationOf(
	theme: TokenTheme,
	name: ThemeName,
	a: string,
	b: string,
): number {
	return contrastOf(theme, name, a, b);
}

function rgbOf(colour: OklchColour): Rgb {
	return oklchToRgb(colour.l, colour.c, colour.h);
}

function evaluate(
	theme: TokenTheme,
	name: ThemeName,
	token: string,
	depth: number,
): OklchColour {
	if (depth > 12) throw new Error(`token resolution too deep at ${token}`);

	const roles = roleMap(theme, name);
	const raw = roles.get(token) ?? theme.primitives.get(token);
	if (raw === undefined) return parseColourTerm(token, theme, name, depth);

	return parseColourTerm(raw, theme, name, depth);
}

function parseColourTerm(
	term: string,
	theme: TokenTheme,
	name: ThemeName,
	depth: number,
): OklchColour {
	const value = term.trim();

	const varMatch = /^var\(\s*(--[\w-]+)\s*\)$/.exec(value);
	if (varMatch) return evaluate(theme, name, varMatch[1] ?? "", depth + 1);

	const mixMatch =
		/^color-mix\(\s*in oklab\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/.exec(
			value,
		);
	if (mixMatch) {
		const first = parseColourTerm(mixMatch[1] ?? "", theme, name, depth + 1);
		const share = Number(mixMatch[2] ?? 0) / 100;
		const second = parseColourTerm(mixMatch[3] ?? "", theme, name, depth + 1);
		return mixOklch(first, second, share);
	}

	if (value === "white") return { l: 1, c: 0, h: 0, alpha: 1 };
	if (value === "black") return { l: 0, c: 0, h: 0, alpha: 1 };
	if (value === "transparent") return { l: 0, c: 0, h: 0, alpha: 0 };

	const oklch =
		/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+))?\s*\)$/i.exec(
			value,
		);
	if (oklch) {
		return {
			l: Number(oklch[1]),
			c: Number(oklch[2]),
			h: Number(oklch[3]),
			alpha: oklch[4] ? Number(oklch[4]) : 1,
		};
	}

	throw new Error(`Unsupported colour syntax: ${term}`);
}

/**
 * Premultiplied oklab interpolation, exactly what `color-mix(in oklab, …)`
 * performs: mix in oklab, keep hue via the a/b components, and interpolate
 * alpha linearly (premultiplied, so mixing with `transparent` keeps the base
 * colour and only reduces opacity).
 */
function mixOklch(a: OklchColour, b: OklchColour, share: number): OklchColour {
	const aRad = (a.h * Math.PI) / 180;
	const bRad = (b.h * Math.PI) / 180;
	const aLab = [a.l, a.c * Math.cos(aRad), a.c * Math.sin(aRad)];
	const bLab = [b.l, b.c * Math.cos(bRad), b.c * Math.sin(bRad)];

	const alpha = a.alpha * share + b.alpha * (1 - share);
	const weightA = alpha === 0 ? share : (a.alpha * share) / alpha;
	const weightB = 1 - weightA;

	const lab = aLab.map((v, i) => v * weightA + (bLab[i] ?? 0) * weightB);
	const c = Math.hypot(lab[1] ?? 0, lab[2] ?? 0);
	const h = (Math.atan2(lab[2] ?? 0, lab[1] ?? 0) * 180) / Math.PI;
	return { l: lab[0] ?? 0, c, h: (h + 360) % 360, alpha };
}
