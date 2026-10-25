/**
 * One unit for the document type scale: true points.
 *
 * `ResumeSettings.typography` used to carry CSS px while the UI labelled them "pt":
 * `sections.typ` multiplied every section-body size by 0.75 (`px-to-pt`), so a setting
 * of `body: 11` exported at 8.25pt — below every published floor — while the templates'
 * headers read the same numbers as raw points, putting a 24pt name over 8.25pt body in
 * one document. Margins had the same 0.75 factor (a setting of 40 rendered at 30pt =
 * 0.42in, under the 0.5in floor).
 *
 * The unit is now points end to end. Stored px-era metadata is converted on read (×0.75,
 * recovering the point size the text actually rendered at) and then clamped into the
 * researched bands, where the floors lift body to 10pt and small to 9pt. The reasoning
 * for convert-on-read over reinterpretation is in `normalizeTypeSettings`
 * (`packages/types/src/metadata.ts`).
 *
 * The template assertions are source-level because the Typst WASM loads at runtime; they
 * exist so the ×0.75 cannot quietly come back in a helper with a new name.
 */
import {
	MARGIN_BAND,
	MARGIN_DEFAULTS,
	normalizeTypeSettings,
	TYPE_SCALE_BANDS,
	TYPE_SCALE_DEFAULTS,
	templateTypeSchema,
} from "@bettaresume/types";
import { describe, expect, it } from "vitest";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";
import { codeOf } from "./helpers/code-source";

/** The values every pre-change resume stored (the old defaults). */
const PX_ERA_TYPOGRAPHY = {
	name: 24,
	title: 14,
	sectionHeading: 14,
	itemTitle: 12,
	body: 11,
	small: 9,
};
const PX_ERA_MARGINS = { top: 40, right: 40, bottom: 40, left: 40 };

describe("the scale the research specifies is the scale in the code", () => {
	it("defaults to the canonical point values", () => {
		expect(TYPE_SCALE_DEFAULTS).toEqual({
			name: 18,
			title: 11,
			sectionHeading: 11,
			itemTitle: 10.5,
			body: 10.5,
			small: 9.5,
		});
		expect(MARGIN_DEFAULTS).toEqual({
			top: 36,
			right: 36,
			bottom: 36,
			left: 36,
		});
	});

	it("carries the hard floors: body 10pt, small 9pt, margins 0.5in", () => {
		expect(TYPE_SCALE_BANDS.body.min).toBe(10);
		expect(TYPE_SCALE_BANDS.small.min).toBe(9);
		expect(MARGIN_BAND.min).toBe(36);
	});
});

describe("stored px-era values are converted on read", () => {
	it("rescales the old defaults and lifts the body to the floor", () => {
		const { typography, margins } = normalizeTypeSettings({
			typography: PX_ERA_TYPOGRAPHY,
			margins: PX_ERA_MARGINS,
		});

		// The header read name 24 as pt; ×0.75 lands it on the canonical 18pt.
		expect(typography.name).toBe(18);
		expect(typography.title).toBe(10.5);
		expect(typography.sectionHeading).toBe(10.5);
		// Body 11px rendered at 8.25pt. The conversion recovers 8.25 and the 10pt
		// floor lifts it — this is the bug being fixed, asserted at the boundary.
		expect(typography.body).toBe(10);
		expect(typography.small).toBe(9);
		// Margins 40px rendered at 30pt; the 36pt (0.5in) floor lifts them.
		expect(margins).toEqual({
			top: 36,
			right: 36,
			bottom: 36,
			left: 36,
		});
	});

	it("is idempotent — a converted scale is never reconverted", () => {
		const once = normalizeTypeSettings({
			typography: PX_ERA_TYPOGRAPHY,
			margins: PX_ERA_MARGINS,
		});
		expect(normalizeTypeSettings(once)).toEqual(once);
	});

	it("leaves point-era values alone", () => {
		const stored = {
			typography: { ...TYPE_SCALE_DEFAULTS },
			margins: { ...MARGIN_DEFAULTS },
		};
		expect(normalizeTypeSettings(stored)).toEqual({
			typography: { ...TYPE_SCALE_DEFAULTS },
			margins: { ...MARGIN_DEFAULTS },
		});
	});
});

describe("nothing renders below a floor", () => {
	it("clamps out-of-band values into the bands", () => {
		const { typography, margins } = normalizeTypeSettings({
			typography: {
				name: 30,
				title: 20,
				sectionHeading: 20,
				itemTitle: 20,
				body: 20,
				small: 20,
			},
			margins: { top: 10, right: 100, bottom: 10, left: 10 },
		});

		// Out-of-band values are read as px-era (a legal point scale cannot contain
		// them), rescaled, and then clamped — so nothing ends up outside its band.
		expect(typography.name).toBeLessThanOrEqual(TYPE_SCALE_BANDS.name.max);
		expect(typography.body).toBeGreaterThanOrEqual(TYPE_SCALE_BANDS.body.min);
		expect(typography.small).toBeGreaterThanOrEqual(TYPE_SCALE_BANDS.small.min);
		for (const value of Object.values(typography)) {
			expect(value).toBeGreaterThanOrEqual(10 - 0.001);
		}
		for (const value of Object.values(margins)) {
			expect(value).toBeGreaterThanOrEqual(MARGIN_BAND.min);
			expect(value).toBeLessThanOrEqual(MARGIN_BAND.max);
		}
	});
});

describe("the templates render points, not converted px", () => {
	// Derived from the registry, so a new archetype is covered by these assertions the day
	// its `.typ` is added rather than the day someone remembers this list.
	const templateFiles = [
		...new Set(
			templateTypeSchema.options.map(
				(id) => `${TEMPLATE_CONFIGS[id].sourceFile}.typ`,
			),
		),
	];
	const templates = ["sections.typ", ...templateFiles];
	const read = (file: string) =>
		codeOf(`src/features/resume-editor/typst_templates/${file}`);

	it.each(templates)("%s has no px-to-pt conversion left", (file) => {
		expect(read(file)).not.toContain("px-to-pt");
		expect(read(file)).not.toMatch(/\* 0\.75pt/);
	});

	it.each(templates)("margins are read as points in %s", (file) => {
		expect(read(file)).toMatch(/\* 1pt/);
	});

	it("every gap in sections.typ is a named scale value", () => {
		const source = read("sections.typ");
		// `v(` followed by a digit is a raw literal again — the spacing scale is
		// 2/3/4/6/8/12/16pt named `space-*` (plus the 8–12pt `section-gap` band).
		expect(source).not.toMatch(/\bv\(\d/);
		expect(source).not.toContain("spacing-val");
	});

	it("no badge chip or section fill paints the accent", () => {
		const source = read("sections.typ");
		// The tinted chip fill (`colors.accent + "20"`) and the accent-filled heading
		// bar are named parse failures (they extract as graphics). The accent may
		// appear only as the heading rule / bar and label ink.
		expect(source).not.toContain('colors.accent + "');
		expect(source).not.toMatch(/fill: rgb\(colors\.accent\),\s*\n\s*inset/);
	});

	it("no archetype tints its header or paints the accent", () => {
		// A shaded header band was one template's identity; section fills and tinted
		// badges are named parse failures (they extract as graphics). The accent may
		// appear as a rule, never as a block fill.
		for (const file of templateFiles) {
			expect(read(file), `${file} fills a block with the accent`).not.toMatch(
				/fill: rgb\(colors\.accent\)/,
			);
		}
	});
});
