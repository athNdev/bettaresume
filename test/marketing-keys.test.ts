import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * No marketing component may map an array literal of repeated primitives.
 *
 * ## The bug this guards
 *
 * The landing page shipped six `Encountered two children with the same key, 1` errors
 * on every single load, from one decorative list in `TemplateThumb`:
 *
 *     {[1, 1, 1].map((row) => <div key={row} .../>)}
 *
 * Three identical `1`s, so three siblings all keyed `1`. React's own words: "Non-unique
 * keys may cause children to be duplicated and/or omitted — the behavior is
 * unsupported and could change in a future version."
 *
 * ## Why this test is source-level and not render-level
 *
 * The first attempt at this guard rendered the components and captured `console.error`.
 * **That test was vacuous**: `renderToStaticMarkup` does not validate keys. The
 * duplicate-key warning is emitted by the client reconciler, so a server render reports
 * nothing and every assertion passes forever. A self-guard test caught it, which is the
 * only reason this file was corrected rather than shipped as false confidence.
 *
 * React keys are not present in HTML output, so the collision is not observable from a
 * server render at all. That leaves the source, which is what this file checks, and one
 * more place — but only a *development* browser console.
 *
 * **Production React strips this warning.** `scripts/visual-audit.mjs` runs against a
 * production build and reported a clean page while the duplicate keys were still
 * present in it. So this file is the *only* guard for duplicate keys, not the cheap
 * local one. `visual.yml` owns hydration mismatches, missing resources and blank pages;
 * it cannot own this.
 *
 * Consequence worth stating plainly: deleting this file would reintroduce a class of
 * bug that no other check in the repo can see.
 *
 * ## Scope
 *
 * Only array literals of primitives are checked (`[1, 1, 1]`, `["a", "a"]`). A duplicate
 * arising from computed data cannot be caught statically; that is what the browser gate
 * is for. Arrays of unique primitives — `[0, 1, 2]` — are allowed, because a key derived
 * from a distinct value is fine.
 */

const marketingDir = fileURLToPath(
	new URL("../src/components/marketing", import.meta.url),
);
const files = ["sections.tsx", "site-chrome.tsx", "hero.tsx"];

/** `[1, 1, 1]` / `['a', 'a']` — a literal array whose values are not all distinct. */
const REPEATED_LITERAL_ARRAY =
	/\[\s*(-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*(?:,\s*(-?\d+(?:\.\d+)?|'[^']*'|"[^"]*")\s*)+\]/g;

describe("marketing components do not map repeated literals as keys", () => {
	for (const file of files) {
		it(`${file} has no array literal with a repeated primitive`, () => {
			const source = readFileSync(`${marketingDir}/${file}`, "utf8");
			const offenders: string[] = [];

			for (const match of source.matchAll(REPEATED_LITERAL_ARRAY)) {
				const literal = match[0];
				const values = [
					...literal.matchAll(/-?\d+(?:\.\d+)?|'[^']*'|"[^"]*"/g),
				].map((m) => m[0]);
				if (new Set(values).size !== values.length) {
					// Report the line so the failure is actionable.
					const line = source.slice(0, match.index).split("\n").length;
					offenders.push(`line ${line}: ${literal.replace(/\s+/g, " ")}`);
				}
			}

			expect(
				offenders,
				`${file} maps a literal with duplicate values; if each is used as a React key ` +
					`the siblings collide and React drops or duplicates them:\n  ${offenders.join("\n  ")}`,
			).toEqual([]);
		});
	}

	it("the repeated-literal detector actually detects one", () => {
		// Self-guard. Without this, a broken regex would make every assertion above
		// pass vacuously -- the exact failure mode this file exists to prevent.
		const bad = ["const x = [1, 1, 1].map((n) => n);", "const y = ['a', 'a'];"];
		const found = bad.filter((line) => {
			for (const m of line.matchAll(REPEATED_LITERAL_ARRAY)) {
				const values = [
					...m[0].matchAll(/-?\d+(?:\.\d+)?|'[^']*'|"[^"]*"/g),
				].map((x) => x[0]);
				if (new Set(values).size !== values.length) return true;
			}
			return false;
		});
		expect(found).toHaveLength(2);
	});

	it("allows an array literal whose values are distinct", () => {
		const good = [
			"const x = [0, 1, 2].map((n) => n);",
			"const y = ['a', 'b'];",
		];
		const flagged = good.filter((line) => {
			for (const m of line.matchAll(REPEATED_LITERAL_ARRAY)) {
				const values = [
					...m[0].matchAll(/-?\d+(?:\.\d+)?|'[^']*'|"[^"]*"/g),
				].map((x) => x[0]);
				if (new Set(values).size !== values.length) return true;
			}
			return false;
		});
		expect(flagged).toEqual([]);
	});
});
