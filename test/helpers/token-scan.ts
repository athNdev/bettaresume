/**
 * Class-utility scanning for the closed scales (research §6.1 / §6.4).
 *
 * The design system is a set of closed sets: spacing (0 2 4 8 12 16 24 32 48 64
 * 96 px), type (12–40px in 7 steps), radius (4/6/8/12/full), elevation
 * (shadow-elev-0..3) and one z-index ladder. A utility whose value is not on its
 * scale is a bug — the audit found ≈90 distinct spacing steps and 22 type sizes
 * in one app.
 *
 * This module is the single definition of "on scale" that both the closure test
 * and the ratchet baseline use, so a value can never be legal in one file and
 * illegal in another.
 */
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

import { codeOf } from "./code-source";

export type ScaleName =
	| "spacing"
	| "type"
	| "radius"
	| "z"
	| "shadow"
	| "palette";

/** The closed spacing scale, as Tailwind numeric utilities (value = px ÷ 4). */
const SPACING_VALUES = new Set([
	"0",
	"0.5",
	"1",
	"2",
	"3",
	"4",
	"6",
	"8",
	"12",
	"16",
	"24",
]);

/** The closed type scale, as `text-*` size names. */
const TYPE_SIZES = new Set(["xs", "sm", "base", "lg", "xl", "2xl", "3xl"]);

/**
 * The closed radius scale. `rounded` (bare) renders the `xs` step; `inherit`
 * delegates to the container (a scroll viewport copying its parent's rounding)
 * rather than choosing a step.
 */
const RADIUS_VALUES = new Set([
	"none",
	"inherit",
	"xs",
	"sm",
	"md",
	"lg",
	"full",
]);

/** z-index must come from the `--br-z-*` ladder. */
const Z_ALLOWED = new Set(["0", "auto"]);

/** Shadows must come from the elevation scale. */
const SHADOW_ALLOWED = new Set([
	"none",
	"elev-0",
	"elev-1",
	"elev-2",
	"elev-3",
]);

/**
 * Tailwind's stock palette. None of it may appear in class strings: every
 * colour comes from the token file, including status colours — the audit found
 * 3 greens, 4 ambers and 2 blues hardcoded across seven files.
 */
const PALETTE_COLOURS =
	"black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

const SPACING_FAMILY =
	"(?:p|px|py|pt|pb|pl|pr|ps|pe|m|mx|my|mt|mb|ml|mr|ms|me|gap-x|gap-y|gap|space-x|space-y)";

/** One found offender: the exact utility text, per file. */
export interface Offender {
	file: string;
	utility: string;
	scale: ScaleName;
}

export function sourceFiles(roots: string[]): string[] {
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
	for (const root of roots) walk(root);
	return out;
}

/**
 * Scan a source file's *code* (comments stripped — prose must never satisfy or
 * fail a source assertion) for off-scale utilities.
 */
export function scanFile(file: string): Offender[] {
	const code = codeOf(file);
	const out: Offender[] = [];
	const push = (scale: ScaleName, match: string) => {
		out.push({ file, utility: match, scale });
	};

	// Spacing: numeric values on the 11-step scale; `px`, bare numbers off the
	// scale and `[...]` arbitrary values are offenders.
	for (const match of code.matchAll(
		new RegExp(`(?<!\\w)${SPACING_FAMILY}-(\\[[^\\]]+\\]|[0-9.]+|px)`, "g"),
	)) {
		const value = match[1] ?? "";
		if (SPACING_VALUES.has(value)) continue;
		push("spacing", match[0]);
	}

	// Type: `text-[…rem/px]` sizes and `text-4xl`+ names are off the 7-step
	// scale. (`text-[var(--…)]` and `text-[#…]` are colours, not sizes — the
	// raw-colour rule owns those.)
	for (const match of code.matchAll(
		/(?<!\w)text-\[[^\]]*(?:px|rem|em|pt)\]/g,
	)) {
		push("type", match[0]);
	}
	for (const match of code.matchAll(/(?<!\w)text-(?:[4-9]|[1-9][0-9]+)xl\b/g)) {
		push("type", match[0]);
	}
	for (const match of code.matchAll(
		/(?<!\w)text-(xs|sm|base|lg|xl|2xl|3xl|[0-9][0-9.]*px)\b/g,
	)) {
		if (TYPE_SIZES.has(match[1] ?? "")) continue;
		push("type", match[0]);
	}

	// Radius.
	for (const match of code.matchAll(
		/(?<!\w)rounded(?:-(?:t|b|l|r|tl|tr|bl|br))?-(none|xs|sm|md|lg|full|xl|2xl|3xl|px|\[[^\]]+\])/g,
	)) {
		const value = (match[1] ?? "").replace(/^\[|\]$/g, "");
		if (RADIUS_VALUES.has(value)) continue;
		push("radius", match[0]);
	}

	// z-index: the ladder lives in `--br-z-*`; `z-(--br-z-…)` is the only
	// variable form allowed.
	for (const match of code.matchAll(/(?<!\w)z-(\[[^\]]+\]|[0-9]+|auto)\b/g)) {
		if (Z_ALLOWED.has(match[1] ?? "")) continue;
		push("z", match[0]);
	}
	for (const match of code.matchAll(/(?<!\w)z-\(([^)]+)\)/g)) {
		if ((match[1] ?? "").startsWith("--br-z-")) continue;
		push("z", match[0]);
	}

	// Shadows: the elevation scale, not the stock Tailwind set.
	for (const match of code.matchAll(
		/(?<!\w)shadow-(none|elev-[0-3]|2xs|xs|sm|md|lg|xl|2xl|\[[^\]]+\])/g,
	)) {
		if (SHADOW_ALLOWED.has(match[1] ?? "")) continue;
		push("shadow", match[0]);
	}

	// Colours: the stock palette (including black/white) is never a token. Status
	// colours read `text-success` and friends, not `text-emerald-500`.
	for (const match of code.matchAll(
		new RegExp(
			`(?<![\\w-])(?:bg|text|border|ring|fill|stroke|outline|decoration|divide|accent|caret|from|via|to|selection|placeholder|shadow)-(?:${PALETTE_COLOURS})(?:-[0-9]{2,3})?(?:/[0-9]{1,3})?`,
			"g",
		),
	)) {
		push("palette", match[0]);
	}

	return out;
}

/** Scan whole roots, returning every offender found. */
export function scan(roots: string[]): Offender[] {
	return sourceFiles(roots).flatMap(scanFile);
}

/**
 * Count offenders per (file, utility) so the ratchet can detect both new debt
 * and debt that has been paid off — a baseline entry that no longer matches must
 * be deleted, or the ratchet is quietly re-usable as a budget.
 */
export function tally(
	offenders: Offender[],
	scale: ScaleName,
): Record<string, Record<string, number>> {
	const out: Record<string, Record<string, number>> = {};
	for (const offender of offenders) {
		if (offender.scale !== scale) continue;
		const perFile = out[offender.file];
		const count = (perFile?.[offender.utility] ?? 0) + 1;
		if (perFile) {
			perFile[offender.utility] = count;
		} else {
			out[offender.file] = { [offender.utility]: count };
		}
	}
	return out;
}
