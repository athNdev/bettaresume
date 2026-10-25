import { MARGIN_BAND } from "@bettaresume/types";
import { describe, expect, it } from "vitest";
import type {
	Resume,
	ResumeSection,
} from "../src/features/resume-editor/types";
import { buildReliefLadder } from "../src/lib/analysis/relief-ladder";
import {
	DENSITY_PRESETS,
	DENSITY_PRESETS_ORDER,
	densityOf,
	densityPatch,
	describeDensityPatch,
} from "../src/lib/layout/density";
import {
	deriveFit,
	formatFitChip,
	PAPER_PT,
	PT_PER_MM,
	pageTargetForTemplate,
	parseFitProbe,
	ptToMm,
	resolvePageTarget,
} from "../src/lib/layout/page-fit";
import {
	entryFitsOnOnePage,
	resolveKeepTogether,
	resumeToTypstJson,
} from "../src/lib/typst/serialize";

/**
 * The page-fit arithmetic, the density presets and the relief ladder.
 *
 * Everything here is pure, so it runs without the WASM. The compile-level claims — that
 * the probe measures what it says, and that a keep-together entry does not split — live
 * in `page-fit-probe.test.ts` and `page-breaks.test.ts`.
 *
 * The most important assertion in this file is that **Normal reproduces today's output
 * exactly**. A preset that silently moved the shipped document would make every existing
 * resume look different for no reason.
 */

const SETTINGS = {
	pageSize: "Letter" as const,
	margins: { top: 43, right: 50, bottom: 43, left: 50 },
	fontScale: 1,
	typography: {
		name: 18,
		title: 11,
		sectionHeading: 11,
		itemTitle: 10.5,
		body: 10.5,
		small: 9.5,
	},
	lineHeight: 1.35,
	fontFamily: "Inter" as const,
	colors: {
		primary: "#2563eb",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#1e293b",
		background: "#ffffff",
		accent: "#f59e0b",
		divider: "#e2e8f0",
	},
	sectionSpacing: "normal" as const,
	dateFormat: "MMM YYYY" as const,
	accentStyle: "underline" as const,
};

function section(overrides: Partial<ResumeSection> = {}): ResumeSection {
	return {
		id: "s1",
		type: "experience",
		order: 0,
		visible: true,
		content: {
			title: "Work Experience",
			data: [
				{
					id: "e1",
					position: "Senior Engineer",
					company: "Acme",
					startDate: "March 2022",
					highlights: ["one", "two", "three"],
				},
			],
		},
		...overrides,
	} as ResumeSection;
}

function resume(overrides: Partial<Resume> = {}): Resume {
	return {
		id: "r1",
		userId: "u1",
		name: "Avery Chen",
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "standard",
		tags: [],
		isArchived: false,
		createdAt: new Date(),
		updatedAt: new Date(),
		metadata: {
			personalInfo: { fullName: "Avery Chen" } as never,
			settings: SETTINGS,
		},
		sections: [section()],
		...overrides,
	} as Resume;
}

const usableLetter = PAPER_PT.Letter.height - 43 - 43;

describe("density presets", () => {
	it("Normal is exactly today's defaults", () => {
		// The serialiser's own defaults are what "today" means: a resume with no stored
		// settings is what every existing document compiles to.
		const serialised = JSON.parse(
			resumeToTypstJson(
				resume({
					metadata: {
						personalInfo: { fullName: "Avery Chen" } as never,
						settings: undefined as never,
					},
				}),
			),
		) as { settings: typeof SETTINGS };

		const normal = DENSITY_PRESETS.normal;
		expect(normal.sectionSpacing).toBe(serialised.settings.sectionSpacing);
		expect(normal.lineHeight).toBe(serialised.settings.lineHeight);
		expect(normal.margins).toEqual(serialised.settings.margins);
	});

	it("every preset stays inside the margin and spacing bands", () => {
		for (const preset of DENSITY_PRESETS_ORDER) {
			const spec = DENSITY_PRESETS[preset];
			for (const side of ["top", "right", "bottom", "left"] as const) {
				expect(spec.margins[side]).toBeGreaterThanOrEqual(MARGIN_BAND.min);
				expect(spec.margins[side]).toBeLessThanOrEqual(MARGIN_BAND.max);
			}
			expect(spec.lineHeight).toBeGreaterThanOrEqual(1.2);
			expect(spec.lineHeight).toBeLessThanOrEqual(2);
		}
	});

	it("Compact sits on the print floor rather than under it", () => {
		// The research sketched 32px (24pt), which the 0.5in clamp makes unreachable.
		expect(DENSITY_PRESETS.compact.margins.top).toBe(MARGIN_BAND.min);
	});

	it("round-trips: the preset it reports is the preset it applied", () => {
		for (const preset of DENSITY_PRESETS_ORDER) {
			expect(densityOf(densityPatch(preset))).toBe(preset);
		}
		expect(densityOf({ ...DENSITY_PRESETS.normal, lineHeight: 1.4 })).toBe(
			"custom",
		);
	});

	it("touches layout only", () => {
		// No typography, no font, no colour, no date format: those are the user's own
		// controls, and a preset that quietly reset them would be a different feature.
		for (const preset of DENSITY_PRESETS_ORDER) {
			expect(Object.keys(densityPatch(preset)).sort()).toEqual([
				"lineHeight",
				"margins",
				"sectionSpacing",
			]);
		}
	});

	it("describes the diff before applying it", () => {
		const diff = describeDensityPatch(DENSITY_PRESETS.normal, "compact");
		expect(diff).toContain("Density: Normal → Compact");
		expect(diff).toContain("Line spacing 1.25 → 1.22");
		expect(diff).toMatch(/Margins .*mm → .*mm/);
	});
});

describe("the overflow arithmetic", () => {
	const endOn = (page: number, y: number) => ({
		pages: page,
		end: { page, y },
		entries: [],
	});

	it("reports the spill in millimetres, from the top margin", () => {
		// 100pt of content on page 2 with a 43pt top margin = 100pt of overflow.
		const report = deriveFit(endOn(2, 143), SETTINGS, 1);
		expect(report.overPt).toBeCloseTo(100, 5);
		expect(report.overMm).toBeCloseTo(100 / PT_PER_MM, 3);
		expect(ptToMm(100)).toBeCloseTo(35.28, 2);
	});

	it("counts whole pages of overflow, not just the last page", () => {
		const report = deriveFit(endOn(3, 143), SETTINGS, 1);
		expect(report.overPt).toBeCloseTo(usableLetter + 100, 5);
	});

	it("is zero when the target is met or unset", () => {
		expect(deriveFit(endOn(2, 300), SETTINGS, 2).overPt).toBe(0);
		expect(deriveFit(endOn(2, 300), SETTINGS, null).overPt).toBe(0);
	});

	it("derives the page estimate from the last page's fill", () => {
		const full = deriveFit(endOn(2, usableLetter + 43), SETTINGS, null);
		expect(full.pageEstimate).toBe(2);
		const half = deriveFit(endOn(2, 43 + usableLetter / 2), SETTINGS, null);
		expect(half.pageEstimate).toBe(1.5);
	});

	it("measures last-page fill, and calls an unused last page empty", () => {
		expect(
			deriveFit(endOn(2, 43 + usableLetter / 2), SETTINGS, null).lastPageFill,
		).toBeCloseTo(0.5, 5);
		// Content ends on page 1 of a 2-page compile: the last page holds nothing.
		expect(
			deriveFit({ pages: 2, end: { page: 1, y: 400 } }, SETTINGS, null)
				.lastPageFill,
		).toBe(0);
	});

	it("names the first entry that starts on the overflow page", () => {
		const report = deriveFit(
			{
				pages: 2,
				end: { page: 2, y: 200 },
				entries: [
					{ id: "a", section: "s1", label: "First", page: 1, y: 100 },
					{ id: "b", section: "s1", label: "Spilling", page: 2, y: 50 },
					{ id: "c", section: "s1", label: "Later", page: 2, y: 120 },
				],
			},
			SETTINGS,
			1,
		);
		expect(report.overflow?.label).toBe("Spilling");
	});

	it("uses the configured paper", () => {
		const a4 = deriveFit(endOn(2, 100), { ...SETTINGS, pageSize: "A4" }, 1);
		const letter = deriveFit(endOn(2, 100), SETTINGS, 1);
		expect(a4.usableHeightPt).toBeCloseTo(PAPER_PT.A4.height - 86, 2);
		expect(a4.usableHeightPt).not.toBeCloseTo(letter.usableHeightPt, 1);
	});

	it("knows when the layout levers are spent", () => {
		const floor = {
			...SETTINGS,
			margins: { top: 36, right: 36, bottom: 36, left: 36 },
			fontScale: 10 / 10.5,
		};
		expect(deriveFit(endOn(2, 100), floor, 1).atFloor).toBe(true);
		expect(deriveFit(endOn(2, 100), SETTINGS, 1).atFloor).toBe(false);
	});
});

describe("the chip copy", () => {
	const base = deriveFit(
		{ pages: 2, end: { page: 2, y: 43 + 62 }, entries: [] },
		SETTINGS,
		1,
	);

	it("says ‘not compiled’ rather than zero", () => {
		expect(formatFitChip(null)).toBe("Pages —");
	});

	it("reads in millimetres when over target", () => {
		expect(formatFitChip(base)).toBe(
			`${base.pageEstimate.toFixed(1)} pages · 22 mm over target`,
		);
	});

	it("reads the target when it is met", () => {
		const met = deriveFit(
			{ pages: 1, end: { page: 1, y: 400 }, entries: [] },
			SETTINGS,
			1,
		);
		expect(formatFitChip(met)).toBe("1 page · target 1");
	});

	it("bare count with no target", () => {
		const none = deriveFit(
			{ pages: 2, end: { page: 2, y: 200 }, entries: [] },
			SETTINGS,
			null,
		);
		expect(formatFitChip(none)).toBe("2 pages");
	});
});

describe("page targets", () => {
	it("defaults by archetype, and keeps resolving a pre-archetype id", () => {
		expect(pageTargetForTemplate("standard")).toBe(1);
		expect(pageTargetForTemplate("compact")).toBe(1);
		expect(pageTargetForTemplate("technical")).toBe(1);
		expect(pageTargetForTemplate("graduate")).toBe(1);
		expect(pageTargetForTemplate("executive")).toBe(2);
		expect(pageTargetForTemplate("academic")).toBeNull();
		// Resumes created before the archetypes still get the closest successor's target.
		expect(pageTargetForTemplate("postgrad")).toBeNull();
		expect(pageTargetForTemplate("minimal")).toBe(1);
	});

	it("lets the stored setting win, including an explicit none", () => {
		expect(resolvePageTarget({ pageTarget: 2 }, "standard")).toBe(2);
		expect(resolvePageTarget({ pageTarget: null }, "standard")).toBeNull();
		expect(resolvePageTarget({}, "academic")).toBeNull();
		expect(resolvePageTarget(undefined, "standard")).toBe(1);
	});
});

describe("the probe reader", () => {
	it("reads the value out of a metadata record and out of a bare value", () => {
		const value = {
			kind: "fit-probe",
			pages: 2,
			end: { page: 2, y: 120.5 },
			entries: [{ id: "e1", section: "s1", label: "Role", page: 2, y: 50 }],
			sections: [],
			lineChars: 96.2,
			usableHeight: 706,
		};
		expect(parseFitProbe([{ func: "metadata", value }])).toEqual({
			pages: 2,
			end: { page: 2, y: 120.5 },
			entries: value.entries,
			sections: [],
			lineChars: 96.2,
			usableHeightPt: 706,
		});
		expect(parseFitProbe([value])?.pages).toBe(2);
	});

	it("returns null rather than inventing a measurement", () => {
		expect(parseFitProbe([])).toBeNull();
		expect(parseFitProbe([{ kind: "entry" }])).toBeNull();
		expect(parseFitProbe(null)).toBeNull();
		expect(parseFitProbe("nonsense")).toBeNull();
	});
});

describe("the relief ladder", () => {
	const layers = {
		...SETTINGS,
		// The Relaxed density (43/50pt margins, 1.35 leading, spacious sections). The
		// ladder's job is to offer the next step *tighter*, so a document sitting on
		// Relaxed must offer Normal first and Compact after it — never jump two steps.
		sectionSpacing: "spacious" as const,
		margins: { ...SETTINGS.margins },
	};

	it("never gives a content row a patch", () => {
		const rows = buildReliefLadder({
			resume: resume({
				sections: [
					section(),
					section({
						id: "s2",
						type: "references",
						order: 1,
					}),
				],
			}),
			settings: layers,
			fit: deriveFit(
				{ pages: 2, end: { page: 2, y: 143 }, entries: [] },
				layers,
				1,
			),
		});
		const content = rows.filter((r) => r.kind === "content");
		expect(content.length).toBeGreaterThan(0);
		for (const row of content) {
			expect(row.patch).toBeUndefined();
		}
	});

	it("offers the tighter density first, with its diff", () => {
		const rows = buildReliefLadder({
			resume: resume(),
			settings: layers,
			fit: null,
		});
		const first = rows.find((r) => r.kind === "layout");
		expect(first?.lever).toBe("density");
		// `layers` is the Relaxed profile, so the next step tighter is Normal.
		expect(first?.diff).toContain("Relaxed → Normal");
		expect(first?.patch).toEqual(densityPatch("normal"));
	});

	it("offers a smaller type scale only above the body floor", () => {
		const rows = buildReliefLadder({
			resume: resume(),
			settings: { ...layers, fontScale: 1 },
			fit: null,
		});
		expect(rows.some((r) => r.lever === "type-scale")).toBe(true);

		const floored = buildReliefLadder({
			resume: resume(),
			settings: { ...layers, fontScale: 10 / 10.5 },
			fit: null,
		});
		expect(floored.some((r) => r.lever === "type-scale")).toBe(false);
	});

	it("never asks for a sub-10pt body", () => {
		const rows = buildReliefLadder({
			resume: resume(),
			settings: { ...layers, fontScale: 1 },
			fit: null,
		});
		const scale = rows.find((r) => r.lever === "type-scale");
		const next = (scale?.patch?.fontScale ?? 1) * SETTINGS.typography.body;
		expect(next).toBeGreaterThanOrEqual(10 - 0.001);
	});

	it("suggests hiding an optional section without applying it", () => {
		const rows = buildReliefLadder({
			resume: resume({ sections: [section({ id: "s2", type: "references" })] }),
			settings: layers,
			fit: null,
		});
		const hide = rows.find((r) => r.lever === "hide-section");
		expect(hide?.kind).toBe("content");
		expect(hide?.anchor).toBe("s2");
		expect(hide?.patch).toBeUndefined();
	});
});

describe("the fill-the-hole hint", () => {
	const overflowing = deriveFit(
		{ pages: 2, end: { page: 2, y: 143 }, entries: [] },
		SETTINGS,
		1,
	);

	it("names a pinned entry when the document overflows", () => {
		// A whole-entry keep that does not fit moves the entry to the next page and leaves
		// the space it would have used empty — the "half empty at the same time as it
		// overflows" paradox. The row is a hint with an anchor, never a button: splitting
		// an entry is the user's call.
		const rows = buildReliefLadder({
			resume: resume({
				sections: [section({ layout: { keepTogether: "always" } })],
			}),
			settings: SETTINGS,
			fit: overflowing,
		});
		const row = rows.find((r) => r.lever === "fill-hole");
		expect(row).toBeDefined();
		expect(row?.kind).toBe("content");
		expect(row?.patch).toBeUndefined();
		expect(row?.anchor).toBe("s1");
	});

	it("stays quiet when nothing is pinned or nothing overflows", () => {
		const auto = buildReliefLadder({
			resume: resume(),
			settings: SETTINGS,
			fit: overflowing,
		});
		expect(auto.some((r) => r.lever === "fill-hole")).toBe(false);

		const fits = buildReliefLadder({
			resume: resume({
				sections: [section({ layout: { keepTogether: "always" } })],
			}),
			settings: SETTINGS,
			fit: deriveFit({ pages: 1, end: { page: 1, y: 300 } }, SETTINGS, 1),
		});
		expect(fits.some((r) => r.lever === "fill-hole")).toBe(false);
	});
});

describe("auto keep-together", () => {
	it("keeps a small entry whole and protects only the heading of a long one", () => {
		// Small = a title block and a few lines: moving it whole costs a small hole.
		expect(
			resolveKeepTogether(undefined, { highlights: ["a", "b", "c"] }),
		).toBe("always");
		// Longer entries used to be "never" entirely, which orphaned the heading at the
		// bottom of a page. "head" keeps the heading with its first bullet and lets the
		// rest flow — the hole is capped at one heading block instead of the whole entry.
		expect(
			resolveKeepTogether(undefined, { highlights: ["a", "b", "c", "d"] }),
		).toBe("head");
		expect(
			resolveKeepTogether(undefined, {
				description: "A paragraph",
				highlights: ["a"],
			}),
		).toBe("head");
	});

	it("honours the section default and the per-entry override", () => {
		expect(
			resolveKeepTogether({ keepTogether: "never" }, { highlights: ["a"] }),
		).toBe("never");
		expect(
			resolveKeepTogether(
				{ keepTogether: "auto", entries: { e1: "never" } },
				{ id: "e1", highlights: ["a"] },
			),
		).toBe("never");
		expect(
			resolveKeepTogether(
				{ keepTogether: "auto", entries: { e1: "always" } },
				{ id: "e1", description: "long", highlights: ["a", "b", "c", "d"] },
			),
		).toBe("always");
	});

	it("refuses to keep an entry taller than a page, because Typst would clip it", () => {
		// A `breakable: false` block that cannot fit on a page is cut off at the bottom
		// margin rather than moved, so honouring "always" here would delete bullets. The
		// entry still gets its heading protected, which cannot be clipped.
		const tall = {
			highlights: Array.from({ length: 80 }, (_, i) => `Bullet ${i}`),
		};
		expect(
			resolveKeepTogether({ keepTogether: "always" }, tall, SETTINGS),
		).toBe("head");
		expect(entryFitsOnOnePage(tall, SETTINGS)).toBe(false);
		expect(entryFitsOnOnePage({ highlights: ["a", "b", "c"] }, SETTINGS)).toBe(
			true,
		);
	});
});
