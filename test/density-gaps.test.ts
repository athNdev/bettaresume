import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	DENSITY_PRESETS,
	SPACING_GAPS,
	type SpacingGaps,
} from "../src/lib/layout/density";
import { codeOf } from "./helpers/code-source";

/**
 * One density table, two readers.
 *
 * `sections.typ` lays out the PDF and `preview.tsx` lays out the HTML preview from the
 * same numbers. Before this change only three gaps (`sectionSpacing`, the header and the
 * contact line) reached the typesetter at all — the entry and bullet gaps were
 * compile-time constants, which is why applying a density preset reclaimed almost nothing
 * (`docs/research/space-efficiency.md` §3.4).
 *
 * The two readers are now the Typst `gaps-for` table and the TS `SPACING_GAPS` table, and
 * this test is what stops them drifting into two rhythms again. It parses the Typst source
 * rather than trusting a comment, because a comment is what the old code had.
 */

const SECTIONS_TYP = resolve(
	process.cwd(),
	"src/features/resume-editor/typst_templates/sections.typ",
);

/** The named scale, in points. Parsed from the file so a rename cannot desync it. */
function scaleOf(source: string): Map<string, number> {
	const scale = new Map<string, number>();
	for (const match of source.matchAll(/#let space-(\w+)\s*=\s*(\d+)pt/g)) {
		scale.set(`space-${match[1]}`, Number(match[2]));
	}
	return scale;
}

/** The three branches of `gaps-for`, keyed by the `sectionSpacing` value each serves. */
function typstGaps(): Record<
	string,
	Partial<Record<keyof SpacingGaps, number>>
> {
	const source = codeOf(
		"src/features/resume-editor/typst_templates/sections.typ",
	);
	const scale = scaleOf(source);
	const start = source.indexOf("#let gaps-for(spacing)");
	const end = source.indexOf("#let gaps = gaps-for(section-spacing)");
	expect(start, "sections.typ has no gaps-for table").toBeGreaterThan(-1);
	expect(end).toBeGreaterThan(start);
	const body = source.slice(start, end);

	const branches: Array<[string, string]> = [];
	const compactStart = body.indexOf('if spacing == "compact"');
	const spaciousStart = body.indexOf('else if spacing == "spacious"');
	const normalStart = body.indexOf("else {", spaciousStart);
	expect(compactStart).toBeGreaterThan(-1);
	expect(spaciousStart).toBeGreaterThan(compactStart);
	expect(normalStart).toBeGreaterThan(spaciousStart);
	branches.push(["compact", body.slice(compactStart, spaciousStart)]);
	branches.push(["spacious", body.slice(spaciousStart, normalStart)]);
	branches.push(["normal", body.slice(normalStart)]);

	const out: Record<string, Partial<Record<keyof SpacingGaps, number>>> = {};
	for (const [name, branch] of branches) {
		const gaps: Partial<Record<keyof SpacingGaps, number>> = {};
		for (const match of branch.matchAll(
			/\b(section|heading|entry|bullet|meta|header|contact):\s*(space-\w+)/g,
		)) {
			const key = match[1] as keyof SpacingGaps;
			const value = scale.get(match[2] as string);
			expect(value, `${match[2]} is not on the named scale`).toBeTypeOf(
				"number",
			);
			gaps[key] = value;
		}
		out[name] = gaps;
	}
	return out;
}

const typst = typstGaps();

const SETTING_OF: Record<keyof typeof SPACING_GAPS, string> = {
	compact: "compact",
	normal: "normal",
	spacious: "spacious",
};

describe("the density table the PDF uses is the one the preview uses", () => {
	for (const [preset, setting] of Object.entries(SETTING_OF)) {
		it(`${setting} matches SPACING_GAPS.${preset}`, () => {
			const expected = SPACING_GAPS[
				setting as keyof typeof SPACING_GAPS
			] as SpacingGaps;
			const actual = typst[setting];
			expect(actual, `sections.typ has no ${setting} branch`).toBeDefined();
			for (const key of [
				"section",
				"heading",
				"entry",
				"bullet",
				"meta",
				"header",
				"contact",
			] as const) {
				expect(
					actual?.[key],
					`${setting}.${key} is ${actual?.[key]} in Typst and ${expected[key]} in TS`,
				).toBe(expected[key]);
			}
		});
	}
});

describe("the gaps are on the named scale and the heading rhythm is asymmetric", () => {
	const SCALE = new Set([2, 3, 4, 6, 8, 12, 16]);

	for (const [setting, gaps] of Object.entries(SPACING_GAPS)) {
		it(`${setting} uses only named scale values`, () => {
			for (const [key, value] of Object.entries(gaps)) {
				if (key === "headerRule") continue;
				expect(SCALE, `${setting}.${key} = ${value}pt is off-scale`).toContain(
					value,
				);
			}
		});

		it(`${setting} spends more above a heading than below it`, () => {
			// "Avoid ambiguous spacing": a heading belongs to the content under it. Equal
			// gaps above and below would make it float between two sections.
			expect(gaps.section).toBeGreaterThan(gaps.heading);
		});
	}
});

describe("the presets are ordered and land inside the researched envelope", () => {
	it("Compact is tighter than Normal, which is tighter than Relaxed", () => {
		const tight = SPACING_GAPS[DENSITY_PRESETS.compact.sectionSpacing];
		const balanced = SPACING_GAPS[DENSITY_PRESETS.normal.sectionSpacing];
		const relaxed = SPACING_GAPS[DENSITY_PRESETS.relaxed.sectionSpacing];
		expect(tight.entry).toBeLessThanOrEqual(balanced.entry);
		expect(balanced.entry).toBeLessThan(relaxed.entry);
		expect(tight.bullet).toBeLessThanOrEqual(balanced.bullet);
		expect(balanced.bullet).toBeLessThan(relaxed.bullet);
		expect(DENSITY_PRESETS.compact.lineHeight).toBeLessThan(
			DENSITY_PRESETS.normal.lineHeight,
		);
		expect(DENSITY_PRESETS.normal.lineHeight).toBeLessThan(
			DENSITY_PRESETS.relaxed.lineHeight,
		);
	});

	it("Normal is the Balanced profile: 0.5in margins, 1.25 leading", () => {
		expect(DENSITY_PRESETS.normal.margins).toEqual({
			top: 36,
			right: 36,
			bottom: 36,
			left: 36,
		});
		expect(DENSITY_PRESETS.normal.lineHeight).toBe(1.25);
		expect(DENSITY_PRESETS.normal.sectionSpacing).toBe("normal");
	});

	it("no preset goes below a floor", () => {
		for (const preset of Object.values(DENSITY_PRESETS)) {
			for (const side of ["top", "right", "bottom", "left"] as const) {
				expect(preset.margins[side]).toBeGreaterThanOrEqual(36);
			}
			expect(preset.lineHeight).toBeGreaterThanOrEqual(1.2);
		}
	});
});

describe("the Typst file the parser reads is the file that ships", () => {
	it("parses all three branches", () => {
		expect(Object.keys(typst).sort()).toEqual([
			"compact",
			"normal",
			"spacious",
		]);
		for (const branch of Object.values(typst)) {
			expect(Object.keys(branch).sort()).toEqual([
				"bullet",
				"contact",
				"entry",
				"header",
				"heading",
				"meta",
				"section",
			]);
		}
	});

	it("has no raw point literal standing in for a gap", () => {
		// The spacing scale is the only source of a vertical gap. `v(` followed by a digit
		// is a literal that a preset cannot reach — the defect this change is about.
		expect(readFileSync(SECTIONS_TYP, "utf8")).not.toMatch(/\bv\(\d/);
	});
});
