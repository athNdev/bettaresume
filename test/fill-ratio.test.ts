import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";
import { DENSITY_PRESETS, type DensityPreset } from "../src/lib/layout/density";
import { resumeToTypstJson } from "../src/lib/typst/serialize";
import { hasTypst, type Measurement, measurePdf } from "./helpers/measure-pdf";
import { loadShowcase } from "./helpers/showcase-resume";

/**
 * The fill ratio of the shipped showcase, measured from the real PDF.
 *
 * `docs/research/space-efficiency.md` §2 puts a finished one-page resume at **78–85 %**
 * fill (Balanced). Below that is the "half-empty page" the maintainer described; above it
 * there is no slack, so one extra bullet spills to a second page that is nearly empty —
 * which is the same failure wearing a different mask (§3.3). This test is what stops the
 * space creeping back: it compiles the seeded showcase resume (Priya Raman, A4, seven
 * visible sections) at each of the three densities and asserts where the content lands.
 *
 * The measurement is the PDF itself, read back with `pdfjs`: page count from the file,
 * and the deepest text baseline on the last page as the bottom of the content. The in-app
 * fit meter uses an invisible Typst `metadata` probe instead, but that needs `context`
 * (Typst ≥ 0.11) and this suite compiles with the 0.10 CLI, so the PDF is the honest
 * measurement available here — and it is the artefact the user actually sends.
 *
 * The fixture is loaded from `api/src/db/seed.sql` through SQLite, not copied, so it is
 * the same document `npm run db:reset-seed` puts in the app (`docs/SHOWCASE.md`).
 */

const TEMPLATE_DIR = resolve(
	process.cwd(),
	"src/features/resume-editor/typst_templates",
);

/** Balanced targets, from the research's density envelope (§2). */
const BALANCED_BAND = { min: 0.78, max: 0.85 } as const;

const showcase = loadShowcase();
const sectionsSource = readFileSync(join(TEMPLATE_DIR, "sections.typ"), "utf8");
const templateSource = readFileSync(
	join(
		TEMPLATE_DIR,
		`${TEMPLATE_CONFIGS[showcase.template as "compact"].sourceFile}.typ`,
	),
	"utf8",
);

const dir = mkdtempSync(join(tmpdir(), "br-fill-"));

/** Compile the showcase with one density preset applied, and measure the result. */
async function measureAt(preset: DensityPreset): Promise<Measurement> {
	const settings = {
		...(showcase.metadata?.settings ?? {}),
		...DENSITY_PRESETS[preset],
	};
	const json = resumeToTypstJson({
		...showcase,
		metadata: { ...showcase.metadata, settings },
	} as never);
	const parsed = JSON.parse(json) as {
		settings: {
			pageSize: "A4" | "Letter";
			margins: { top: number };
			typography: { body: number };
		};
	};
	return measurePdf({
		dir,
		source: `${sectionsSource}\n\n${templateSource}`,
		json,
		bodyPt: parsed.settings.typography.body,
		marginTopPt: parsed.settings.margins.top,
		pageSize: parsed.settings.pageSize,
		name: `showcase-${preset}`,
	});
}

const measured: Partial<Record<DensityPreset, Measurement>> = {};

describe.skipIf(!hasTypst)(
	"the showcase lands in the researched fill band",
	() => {
		beforeAll(async () => {
			for (const preset of ["compact", "normal", "relaxed"] as const) {
				measured[preset] = await measureAt(preset);
			}
		}, 180_000);

		const pct = (value: number) => `${(value * 100).toFixed(1)} %`;

		it("Balanced — the shipped default — fills 78–85 % of one page", () => {
			const normal = measured.normal;
			expect(normal, "the normal-density compile failed").toBeDefined();
			expect(normal?.pages).toBe(1);
			expect(
				normal?.fill,
				`Balanced filled ${pct(normal?.fill ?? 0)} of the page; the researched band is ${pct(BALANCED_BAND.min)}–${pct(BALANCED_BAND.max)}`,
			).toBeGreaterThanOrEqual(BALANCED_BAND.min);
			expect(normal?.fill).toBeLessThanOrEqual(BALANCED_BAND.max);
		});

		it("fits on one page at every density", () => {
			// The showcase is a one-page document by its own page target. Two pages means a
			// second page that is a few lines tall — the paradox this work removes.
			for (const preset of ["compact", "normal", "relaxed"] as const) {
				expect(measured[preset]?.pages, `${preset} spilled`).toBe(1);
			}
		});

		it("spends less of the page as the density tightens", () => {
			// The same content, three compositions: Compact must be the smallest and Relaxed
			// the largest, or a preset is not moving the whole document. This is the assertion
			// the old hard-coded entry and bullet gaps would have failed for Compact.
			const compact = measured.compact?.fill ?? 0;
			const normal = measured.normal?.fill ?? 0;
			const relaxed = measured.relaxed?.fill ?? 0;
			expect(compact).toBeLessThan(normal);
			expect(normal).toBeLessThan(relaxed);
		});

		it("leaves the default with slack for another line or two", () => {
			// 78–85 % is the band precisely because a resume is edited: two more wrapped lines
			// (~2 × 4.6 mm at Balanced) must not force a page-flow crisis.
			const normal = measured.normal;
			const freePt = (normal?.usablePt ?? 0) * (1 - (normal?.fill ?? 0));
			const linePitchPt = 10.5 * 1.25;
			expect(freePt).toBeGreaterThan(2 * linePitchPt);
		});
	},
);
