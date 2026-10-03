/**
 * WCAG 2.1 contrast maths for the OKLCH design tokens.
 *
 * This exists because the marketing page shipped a full page of body copy at
 * between 1.8:1 and 2.7:1 against its own background. The failure was invisible
 * in review: every usage looked reasonable in source (`text-[var(--brand-ink)]/60`
 * reads as "medium grey body text"), and nothing in the build ever computed the
 * result. The European Accessibility Act has applied to e-commerce services
 * since 28 June 2025, measured against EN 301 549 / WCAG 2.1 AA, so this is a
 * compliance surface rather than a taste question.
 *
 * Two details are load-bearing and easy to get wrong:
 *
 * - **Alpha is composited in gamma-encoded sRGB**, not linearly. Browsers
 *   composite ordinary alpha in the device's non-linear space, so `ink at 60%`
 *   is a weighted average of the *encoded* RGB channels. Compositing linearly
 *   instead would report a noticeably different — and wrong — ratio.
 * - **Alpha can never increase contrast** against the same backdrop. There is no
 *   alpha value that turns a failing colour into a passing one; you have to move
 *   the colour. The ratio table below is therefore monotonic in alpha, and
 *   anything below 1.0 can only ever be worse.
 */

/** An sRGB colour, each channel 0–255. */
export interface Rgb {
	r: number;
	g: number;
	b: number;
}

/** Relative luminance per WCAG 2.1, in the range 0–1. */
export type Luminance = number;

/** Thresholds from WCAG 2.1 §1.4.3 and §1.4.11. */
export const AA_BODY = 4.5;
export const AA_LARGE = 3;
export const NON_TEXT = 3;

/**
 * Convert OKLCH to gamma-encoded sRGB.
 *
 * Follows the CSS Color 4 reference path: OKLCH → OKLab → LMS → linear sRGB →
 * gamma-encoded sRGB. Out-of-gamut results are clamped per channel, which is
 * what a browser does when it has to render a colour it cannot represent.
 *
 * @param lightness OKLCH lightness, 0–1
 * @param chroma OKLCH chroma, 0–0.4ish
 * @param hue OKLCH hue in degrees
 */
export function oklchToRgb(
	lightness: number,
	chroma: number,
	hue: number,
): Rgb {
	// OKLCH → OKLab
	const radians = (hue * Math.PI) / 180;
	const a = chroma * Math.cos(radians);
	const b = chroma * Math.sin(radians);

	// OKLab → LMS (the inverse of the M1 matrix)
	const lCone = lightness + 0.3963377774 * a + 0.2158037573 * b;
	const mCone = lightness - 0.1055613458 * a - 0.0638541728 * b;
	const sCone = lightness - 0.0894841775 * a - 1.291485548 * b;

	const l = lCone * lCone * lCone;
	const m = mCone * mCone * mCone;
	const s = sCone * sCone * sCone;

	// LMS → linear sRGB (the inverse of the M2 matrix)
	const redLinear = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	const greenLinear = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	const blueLinear = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;

	return {
		r: clampChannel(linearToGamma(redLinear)),
		g: clampChannel(linearToGamma(greenLinear)),
		b: clampChannel(linearToGamma(blueLinear)),
	};
}

/** sRGB transfer function (the inverse companding curve). */
function linearToGamma(linear: number): number {
	if (linear <= 0.0031308) return 12.92 * linear;
	return 1.055 * Math.max(linear, 0) ** (1 / 2.4) - 0.055;
}

function clampChannel(value: number): number {
	return Math.min(255, Math.max(0, value * 255));
}

/** Format as `#rrggbb`, so test failures print something a human can check. */
export function toHex({ r, g, b }: Rgb): string {
	const channel = (v: number) => Math.round(v).toString(16).padStart(2, "0");
	return `#${channel(r)}${channel(g)}${channel(b)}`;
}

/**
 * Parse `oklch(L C H)` — optionally with an `/ alpha` — or a 6-digit hex.
 * Deliberately narrow: it only has to understand the token syntax this repo
 * writes, so it rejects anything it would otherwise silently misparse.
 */
export function parseColor(input: string): { rgb: Rgb; alpha: number } {
	const trimmed = input.trim();
	const alphaMatch = trimmed.match(/\/\s*([\d.]+)\s*\)?$/);
	const alpha = alphaMatch?.[1] ? Number(alphaMatch[1]) : 1;

	if (trimmed.startsWith("#")) {
		return { rgb: parseHex(trimmed), alpha };
	}

	const oklch = trimmed.match(
		/^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/i,
	);
	if (!oklch) {
		throw new Error(`Unsupported colour syntax: ${input}`);
	}
	return {
		rgb: oklchToRgb(Number(oklch[1]), Number(oklch[2]), Number(oklch[3])),
		alpha,
	};
}

function parseHex(hex: string): Rgb {
	const value = hex.replace("#", "");
	if (!/^[0-9a-f]{6}$/i.test(value)) {
		throw new Error(`Unsupported hex colour: ${hex}`);
	}
	return {
		r: parseInt(value.slice(0, 2), 16),
		g: parseInt(value.slice(2, 4), 16),
		b: parseInt(value.slice(4, 6), 16),
	};
}

/**
 * Composite a possibly-translucent foreground over an opaque background, the way
 * a browser does — weighted in gamma-encoded sRGB, not linearly.
 */
export function composite(foreground: Rgb, background: Rgb, alpha = 1): Rgb {
	if (alpha >= 1) return foreground;
	return {
		r: foreground.r * alpha + background.r * (1 - alpha),
		g: foreground.g * alpha + background.g * (1 - alpha),
		b: foreground.b * alpha + background.b * (1 - alpha),
	};
}

/** WCAG relative luminance from gamma-encoded sRGB. */
export function relativeLuminance({ r, g, b }: Rgb): Luminance {
	const linearise = (v: number) => {
		const channel = v / 255;
		return channel <= 0.04045
			? channel / 12.92
			: ((channel + 0.055) / 1.055) ** 2.4;
	};
	return 0.2126 * linearise(r) + 0.7152 * linearise(g) + 0.0722 * linearise(b);
}

/** WCAG contrast ratio between two opaque colours, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
	const la = relativeLuminance(a);
	const lb = relativeLuminance(b);
	const [light, dark] = la > lb ? [la, lb] : [lb, la];
	return (light + 0.05) / (dark + 0.05);
}

/**
 * Contrast ratio of `foreground` at `alpha` over `background`, in one call.
 * The form the tests and the audit script both use.
 */
export function contrast(
	foreground: string,
	background: string,
	alpha = 1,
): number {
	const bg = parseColor(background);
	const fg = parseColor(foreground);
	return contrastRatio(composite(fg.rgb, bg.rgb, fg.alpha * alpha), bg.rgb);
}

/**
 * The smallest alpha at which `foreground` over `background` reaches `target`.
 *
 * Useful for designing a muted ramp: rather than guessing percentages, solve for
 * the boundary and round *down* to a value that still passes.
 */
export function minimumAlpha(
	foreground: string,
	background: string,
	target: number,
): number {
	let low = 0;
	let high = 1;
	// Monotonic: alpha increases contrast monotonically against a fixed backdrop,
	// so plain bisection converges and 30 iterations is far beyond float precision.
	for (let i = 0; i < 30; i++) {
		const mid = (low + high) / 2;
		if (contrast(foreground, background, mid) >= target) {
			high = mid;
		} else {
			low = mid;
		}
	}
	return high;
}

/** Round a ratio to 2dp for stable, readable test output. */
export function ratio(value: number): number {
	return Math.round(value * 100) / 100;
}
