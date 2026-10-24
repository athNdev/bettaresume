import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
	type Offender,
	type ScaleName,
	scan,
	scanFile,
	sourceFiles,
	tally,
} from "./helpers/token-scan";

/**
 * Scale closure (research R1/R2/R7/R8, §6.1 and §6.4).
 *
 * The scales are closed sets. A `p-5`, a `text-[13px]`, a `rounded-2xl`, a
 * `z-50` or a `shadow-sm` in app chrome is a bug, not a preference — the audit
 * measured ≈90 distinct spacing steps and 22 font sizes across this codebase
 * for a system whose useful range is ~10 and 7.
 *
 * Two tiers, like the Biome baseline:
 *
 *   - **Strict roots** (`src/components/ui`, `src/app`, `src/styles`): zero
 *     tolerance. The primitives and the token layer are fully migrated.
 *   - **The rest of `src/`**: ratchet. The full application migration is a
 *     later wave (features and marketing still carry the audit's ~27 singleton
 *     values), so every existing offender is recorded in
 *     `test/baselines/token-offenders.json` and *new* ones fail the build. A
 *     baseline entry that has been paid off also fails — with a message saying
 *     to delete it — so the debt can only ever shrink.
 *
 * To regenerate the baseline after deliberately changing scope:
 *   TOKEN_OFFENDERS_WRITE=1 npx vitest run test/token-scale-closure.test.ts
 * (This tightens nothing: it records what exists. Removing debt is the job.)
 */

const STRICT_ROOTS = ["src/components/ui", "src/app", "src/styles"];
const BASELINE_PATH = "test/baselines/token-offenders.json";
const SCALES: ScaleName[] = [
	"spacing",
	"type",
	"radius",
	"z",
	"shadow",
	"palette",
];

type Baseline = Record<ScaleName, Record<string, Record<string, number>>>;

function loadBaseline(): Baseline {
	if (!existsSync(resolve(process.cwd(), BASELINE_PATH))) {
		return {
			spacing: {},
			type: {},
			radius: {},
			z: {},
			shadow: {},
			palette: {},
		};
	}
	return JSON.parse(
		readFileSync(resolve(process.cwd(), BASELINE_PATH), "utf8"),
	);
}

function writeBaseline(baseline: Baseline): void {
	const path = resolve(process.cwd(), BASELINE_PATH);
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(baseline, null, "\t")}\n`);
}

const offenders: Offender[] = scan(["src"]);
const baseline = loadBaseline();

if (process.env.TOKEN_OFFENDERS_WRITE === "1") {
	const next = Object.fromEntries(
		SCALES.map((scale) => [scale, tally(offenders, scale)]),
	) as Baseline;
	writeBaseline(next);
}

describe("the primitives and token layer are on-scale (strict)", () => {
	it.each(SCALES)("has no off-scale %s in the strict roots", (scale) => {
		const found = sourceFiles(STRICT_ROOTS)
			.flatMap(scanFile)
			.filter((offender) => offender.scale === scale);
		expect(
			found,
			`off-scale ${scale}: ${found
				.map((o) => `${o.file} → ${o.utility}`)
				.join(", ")}`,
		).toEqual([]);
	});
});

describe("the rest of src/ is a ratchet", () => {
	it.each(SCALES)("adds no new off-scale %s", (scale) => {
		const actual = tally(offenders, scale);
		const allowed = baseline[scale];
		const fresh: string[] = [];
		for (const [file, utilities] of Object.entries(actual)) {
			for (const [utility, count] of Object.entries(utilities)) {
				const permitted = allowed[file]?.[utility] ?? 0;
				if (count > permitted) {
					fresh.push(`${file} → ${utility} ×${count} (baseline ${permitted})`);
				}
			}
		}
		expect(
			fresh,
			`new off-scale ${scale} — snap to the scale or, if this is a file this wave\n` +
				"may not touch, record it in the baseline:\n" +
				fresh.join("\n"),
		).toEqual([]);
	});

	it.each(SCALES)("keeps the %s baseline tight", (scale) => {
		const actual = tally(offenders, scale);
		const allowed = baseline[scale];
		const stale: string[] = [];
		for (const [file, utilities] of Object.entries(allowed)) {
			for (const [utility, count] of Object.entries(utilities)) {
				const remaining = actual[file]?.[utility] ?? 0;
				if (remaining < count) {
					stale.push(
						`${file} → ${utility} (baseline ${count}, actual ${remaining})`,
					);
				}
			}
		}
		expect(
			stale,
			`paid-off ${scale} debt in the baseline — delete these entries so the\n` +
				"ratchet cannot be spent again:\n" +
				stale.join("\n"),
		).toEqual([]);
	});
});

describe("the scales are the documented sets", () => {
	// The scanner's idea of "on scale" and the token file's scale must be the
	// same list — a closure test with a private idea of the scale can drift.
	it("matches the token file's spacing scale", async () => {
		const { loadTokenTheme, resolveValue } = await import(
			"./helpers/token-theme"
		);
		const theme = loadTokenTheme();
		const declared = ["05", "1", "2", "3", "4", "6", "8", "12", "16", "24"]
			.map((step) => resolveValue(theme, "light", `--br-space-${step}`))
			.map((value) => Number.parseFloat(value) * 16);
		expect(declared).toEqual([2, 4, 8, 12, 16, 24, 32, 48, 64, 96]);
	});

	it("matches the token file's type scale", async () => {
		const { loadTokenTheme, resolveValue } = await import(
			"./helpers/token-theme"
		);
		const theme = loadTokenTheme();
		const declared = ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"]
			.map((step) => resolveValue(theme, "light", `--br-text-${step}`))
			.map((value) => Number.parseFloat(value) * 16);
		expect(declared).toEqual([12, 14, 16, 20, 24, 32, 40]);
	});

	/**
	 * The scale is only real if the utilities render it. `text-lg` reads
	 * `--text-lg`, so the alias layer must bind it to `--br-text-lg` — without
	 * that binding the utilities fall back to Tailwind's own defaults
	 * (18/20/24/30px for lg/xl/2xl/3xl) and every documented size above 16px is
	 * fiction. That is exactly the state this repo shipped once: the tokens said
	 * 20px, `text-lg` painted 18px, and the wave briefs' "~20px" targets were
	 * unreachable on-scale.
	 */
	it("binds the text-* utilities to the type scale", async () => {
		const { loadTokenTheme, resolveValue } = await import(
			"./helpers/token-theme"
		);
		const theme = loadTokenTheme();
		for (const step of ["xs", "sm", "base", "lg", "xl", "2xl", "3xl"]) {
			expect(
				resolveValue(theme, "light", `--text-${step}`),
				`text-${step} does not resolve to --br-text-${step}`,
			).toBe(resolveValue(theme, "light", `--br-text-${step}`));
		}
	});

	it("matches the token file's radius scale", async () => {
		const { loadTokenTheme, resolveValue } = await import(
			"./helpers/token-theme"
		);
		const theme = loadTokenTheme();
		const declared = ["xs", "sm", "md", "lg"]
			.map((step) => resolveValue(theme, "light", `--br-radius-${step}`))
			.map((value) => Number.parseFloat(value) * 16);
		expect(declared).toEqual([4, 6, 8, 12]);
	});
});
