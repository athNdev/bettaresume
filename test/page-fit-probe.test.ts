import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import {
	deriveFit,
	PAPER_PT,
	PT_PER_MM,
	parseFitProbe,
} from "../src/lib/layout/page-fit";
import { FIT_PROBE_SOURCE } from "../src/lib/typst/probe";

/**
 * The fit probe, measured against known page geometry.
 *
 * This is the only test in the suite that runs the **bundled** compiler, and it runs it
 * in Node: the same WASM the browser loads (`typst-ts-web-compiler`, Typst 0.14.2), the
 * same vendored fonts, and the same probe source that `compileFitProbe` appends. The
 * `typst` CLI the golden text-layer gates use is pinned to 0.14.2 as well, but this probe
 * must be validated against the bundle the browser actually runs, which is why it is
 * compiled here rather than through the CLI.
 *
 * What is asserted is geometry, not a golden file:
 *
 *   - a marker placed at the top of the text area reports the top margin (43pt), so `y`
 *     is absolute from the page's top edge;
 *   - a 100pt block moves the next marker by exactly 100pt;
 *   - a page break moves it to page 2 at the top margin again;
 *   - the spill derived from that position matches the known overflow in millimetres.
 *
 * If the WASM or the fonts are missing the suite skips by name rather than pretending.
 */

const ROOT = resolve(process.cwd());
const WASM = resolve(
	ROOT,
	"node_modules/@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
);
const available = existsSync(WASM);

const MARGIN_TOP = 43;

/** A minimal document that provides exactly what the templates provide the probe. */
function document(body: string): string {
	return [
		`#set page(paper: "us-letter", margin: (top: ${MARGIN_TOP}pt, right: 50pt, bottom: 43pt, left: 50pt))`,
		`#set text(size: 10.5pt, font: "Inter")`,
		// Zero paragraph spacing so a block's height is the only thing between two
		// markers; the templates do not set this, and the probe reads absolute
		// positions either way.
		"#set par(spacing: 0pt)",
		`#let margins = (top: ${MARGIN_TOP}, right: 50, bottom: 43, left: 50)`,
		"#let typo = (body: 10.5pt)",
		"#let page-width = 612pt",
		"#let page-height = 792pt",
		"#let usable-height = page-height - margins.top * 1pt - margins.bottom * 1pt",
		body,
		'#metadata((kind: "end"))',
		FIT_PROBE_SOURCE,
	].join("\n");
}

type Measure = (source: string) => Promise<ReturnType<typeof parseFitProbe>>;

describe.skipIf(!available)("the fit probe measures the page", () => {
	let measure: Measure;

	beforeAll(async () => {
		const typstDist = resolve(
			ROOT,
			"node_modules/@myriaddreamin/typst.ts/dist/esm",
		);
		const { createTypstCompiler } = await import(
			/* @vite-ignore */ `${typstDist}/compiler.mjs`
		);
		const { loadFonts } = await import(
			/* @vite-ignore */ `${typstDist}/options.init.mjs`
		);

		// `loadFonts` fetches, and `file:` is what Node has. This shim serves the vendored
		// bytes the browser would download, so the family and metrics are identical.
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (input: RequestInfo | URL) => {
			const url = typeof input === "string" ? input : String(input);
			if (url.startsWith("file:")) {
				const path = decodeURIComponent(url.replace(/^file:\/\/\/?/, ""));
				try {
					return new Response(readFileSync(path, null), { status: 200 });
				} catch {
					return new Response(null, { status: 404 });
				}
			}
			return originalFetch(input);
		}) as typeof fetch;

		const compiler = createTypstCompiler();
		const fontBase = new URL(`file:///${ROOT.replace(/\\/g, "/")}/public/`);
		await compiler.init({
			getModule: () => readFileSync(WASM),
			beforeBuild: [
				loadFonts([
					new URL("fonts/inter-400.ttf", fontBase).href,
					new URL("fonts/inter-700.ttf", fontBase).href,
				]),
			],
		});

		measure = async (source: string) => {
			compiler.addSource("/probe-test.typ", source);
			const raw = await compiler.runWithWorld(
				{ root: "/", mainFilePath: "/probe-test.typ" },
				async (world: {
					compile(opts?: { diagnostics?: string }): Promise<unknown>;
					query<T>(opts: { selector: string; field?: string }): Promise<T>;
				}) => {
					const result = (await world.compile({
						diagnostics: "full",
					})) as {
						diagnostics?: Array<{ severity?: string; message?: string }>;
					};
					const errors = (result?.diagnostics ?? []).filter(
						(d) => d.severity === "error",
					);
					if (errors.length > 0) {
						throw new Error(
							`probe test document did not compile: ${JSON.stringify(errors).slice(0, 600)}`,
						);
					}
					return world.query<unknown>({ selector: "metadata", field: "value" });
				},
			);
			return parseFitProbe(raw);
		};
	}, 120_000);

	it("reports the top margin for a marker at the top of the text area", async () => {
		const probe = await measure(document(""));
		expect(probe).not.toBeNull();
		// 0.5pt = 0.18mm: the error budget is ±2mm, so this is two orders inside it.
		expect(probe?.end.y).toBeCloseTo(MARGIN_TOP, 0);
		expect(Math.abs((probe?.end.y ?? 0) - MARGIN_TOP)).toBeLessThan(0.5);
		expect(probe?.pages).toBe(1);
	});

	it("moves by exactly the height of a known spacer", async () => {
		const probe = await measure(document("#block(height: 100pt)"));
		expect(Math.abs((probe?.end.y ?? 0) - (MARGIN_TOP + 100))).toBeLessThan(
			0.5,
		);
	});

	it("follows content onto page 2, and the spill is the content height", async () => {
		const probe = await measure(document("#pagebreak()\n#block(height: 50pt)"));
		expect(probe?.end.page).toBe(2);
		expect(Math.abs((probe?.end.y ?? 0) - (MARGIN_TOP + 50))).toBeLessThan(0.5);

		const settings = {
			pageSize: "Letter" as const,
			margins: { top: MARGIN_TOP, right: 50, bottom: 43, left: 50 },
		};
		expect(probe).not.toBeNull();
		const report = deriveFit(probe as NonNullable<typeof probe>, settings, 1);
		// 50pt of content past the target = 17.6mm. The rendered truth is the spacer's
		// own height, so anything inside ±2mm is the probe being right.
		expect(report.overMm).toBeCloseTo(50 / PT_PER_MM, 1);
		expect(Math.abs(report.overMm - 50 / PT_PER_MM)).toBeLessThan(2);
	});

	it("counts pages", async () => {
		const probe = await measure(
			document("#pagebreak()\n#pagebreak()\n#block(height: 10pt)"),
		);
		expect(probe?.pages).toBe(3);
	});

	it("locates entry markers", async () => {
		const probe = await measure(
			document(
				[
					'#metadata((kind: "entry", id: "e1", section: "s1", label: "First role"))',
					"#block(height: 20pt)",
					'#metadata((kind: "entry", id: "e2", section: "s1", label: "Second role"))',
					"#block(height: 20pt)",
				].join("\n"),
			),
		);
		expect(probe?.entries.map((e) => e.label)).toEqual([
			"First role",
			"Second role",
		]);
		expect(Math.abs((probe?.entries[0]?.y ?? 0) - MARGIN_TOP)).toBeLessThan(
			0.5,
		);
		expect(
			Math.abs((probe?.entries[1]?.y ?? 0) - (MARGIN_TOP + 20)),
		).toBeLessThan(0.5);
	});

	it("measures the line length in characters", async () => {
		const probe = await measure(document(""));
		// Letter with 50pt margins at 10.5pt Inter: the research predicts ~90–97.
		expect(probe?.lineChars).toBeGreaterThan(70);
		expect(probe?.lineChars).toBeLessThan(110);
	});

	it("agrees with the paper geometry it is calibrated against", () => {
		// The arithmetic the test above relies on is a constant, not a measurement:
		// Letter is 792pt tall and the usable column is 792 − 43 − 43.
		const usable = PAPER_PT.Letter.height - MARGIN_TOP - 43;
		expect(usable).toBe(706);
	});
});
