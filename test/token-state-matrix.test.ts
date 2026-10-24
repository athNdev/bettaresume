import { describe, expect, it } from "vitest";

import { codeOf } from "./helpers/code-source";
import { sourceFiles } from "./helpers/token-scan";

/**
 * The state matrix (research R4/R5, §6.3) — every interactive primitive in
 * `src/components/ui/` declares the states the component inventory requires:
 * default / hover / active / focus-visible / disabled, plus loading and error
 * for form controls. The audit's "missing states inventory" (§7) is the list of
 * what happens when this is not asserted.
 *
 * "Declares" means the state is handled *in the primitive's source* — a class
 * variant, a data-state branch, an aria contract or a loading prop — not that
 * every caller uses it. States a primitive genuinely does not own (a Tooltip
 * has no hover of its own; a Popover's trigger states live on the trigger) are
 * listed as not-required rather than checked.
 *
 * Focus-visible is special: R5 is implemented once, as the global
 * `:focus-visible` outline in the token file, so a primitive that adds no focus
 * styling of its own still declares it — as long as it does not suppress the
 * outline without a replacement. `accordion.tsx` is the one primitive relying
 * on the global rule alone; everything else carries its own ring.
 */

type State =
	| "hover"
	| "active"
	| "focus-visible"
	| "disabled"
	| "loading"
	| "error";

const MARKERS: Record<State, RegExp> = {
	hover: /hover:/,
	active: /active:|data-\[state=/,
	"focus-visible": /focus-visible:|focus:/,
	disabled: /disabled:|data-disabled|peer-disabled:|aria-disabled/,
	loading: /animate-spin|animate-pulse|Loader2|aria-busy|role="progressbar"/,
	error: /aria-invalid|role="alert"|text-destructive|border-destructive/,
};

/** [file, required states] per research §C5. */
const MATRIX: Array<[string, State[]]> = [
	[
		"src/components/ui/button.tsx",
		["hover", "active", "focus-visible", "disabled", "loading"],
	],
	[
		"src/components/ui/input.tsx",
		["hover", "focus-visible", "disabled", "loading", "error"],
	],
	[
		"src/components/ui/textarea.tsx",
		["hover", "focus-visible", "disabled", "loading", "error"],
	],
	[
		"src/components/ui/select.tsx",
		["hover", "focus-visible", "disabled", "loading", "error"],
	],
	[
		"src/components/ui/checkbox.tsx",
		["hover", "focus-visible", "disabled", "error"],
	],
	[
		"src/components/ui/radio-group.tsx",
		["hover", "focus-visible", "disabled", "error"],
	],
	["src/components/ui/switch.tsx", ["hover", "focus-visible", "disabled"]],
	["src/components/ui/slider.tsx", ["hover", "focus-visible", "disabled"]],
	[
		"src/components/ui/toggle.tsx",
		["hover", "active", "focus-visible", "disabled"],
	],
	[
		"src/components/ui/tabs.tsx",
		["hover", "active", "focus-visible", "disabled"],
	],
	["src/components/ui/accordion.tsx", ["hover", "active"]],
	[
		"src/components/ui/dropdown-menu.tsx",
		["hover", "active", "focus-visible", "disabled"],
	],
	["src/components/ui/badge.tsx", ["hover"]],
	["src/components/ui/label.tsx", ["disabled"]],
	["src/components/ui/save-status-indicator.tsx", ["loading", "error"]],
	["src/components/ui/panel-state.tsx", ["loading", "error"]],
	["src/components/ui/skeleton.tsx", ["loading"]],
	["src/components/ui/progress.tsx", ["loading"]],
];

/**
 * Primitives that rely on the global `:focus-visible` outline rather than a
 * ring of their own. Each entry needs a reason — this list is the exception
 * audit trail, and the global rule must exist for it to be honest.
 */
const GLOBAL_FOCUS: Record<string, string> = {
	"src/components/ui/accordion.tsx":
		"a text-row trigger; the global 2px ring at 2px offset reads cleanly on it",
};

describe("every primitive declares its states", () => {
	for (const [file, states] of MATRIX) {
		const code = codeOf(file);

		it(`${file} declares ${states.join(", ")}`, () => {
			const missing = states.filter((state) => !MARKERS[state].test(code));
			expect(
				missing,
				`${file} is missing declarations for: ${missing.join(", ")}`,
			).toEqual([]);
		});
	}
});

describe("the focus contract (R5)", () => {
	it("is implemented once, globally, as 2px of --ring at 2px offset", () => {
		const css = codeOf("src/styles/globals.css");
		expect(css).toMatch(
			/:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ring\);[^}]*outline-offset:\s*2px;/,
		);
	});

	it("accounts for every primitive that rings no focus of its own", () => {
		for (const [file, reason] of Object.entries(GLOBAL_FOCUS)) {
			expect(
				reason.trim().length,
				`${file} needs a written reason`,
			).toBeGreaterThan(10);
			// Relying on the global ring is only honest if the primitive does not
			// suppress the outline on the way.
			expect(
				codeOf(file),
				`${file} is listed as using the global ring but suppresses outlines`,
			).not.toMatch(/outline-none|outline-hidden/);
		}
	});
});

describe("the primitives use the motion tokens", () => {
	// Research §C4.9: 120/180/240ms and one easing family. The durations are
	// read from `--br-duration-*`; a raw `duration-500` is how the sheet ended
	// up with its own private motion language.
	it("has no raw durations or alien easings in the primitives", () => {
		const offenders: string[] = [];
		for (const file of sourceFiles(["src/components/ui"])) {
			const code = codeOf(file);
			for (const match of code.matchAll(/duration-[0-9]+/g)) {
				offenders.push(`${file} → ${match[0]}`);
			}
			for (const match of code.matchAll(/ease-(linear|in|out|in-out)\b/g)) {
				offenders.push(`${file} → ${match[0]}`);
			}
		}
		expect(offenders, offenders.join("\n")).toEqual([]);
	});
});
