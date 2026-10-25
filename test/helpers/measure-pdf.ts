/**
 * Measure a resume the way a reader measures it: compile the real PDF and read the
 * geometry back out of it.
 *
 * The fit meter in the app measures with an invisible Typst `metadata` probe, which needs
 * `context` (Typst ≥ 0.11). The test suite compiles with the `typst` binary on PATH, which
 * is 0.10 on this host, so the probe cannot run here. The PDF text layer is the honest
 * substitute: every glyph carries a transform, so the vertical extent of the content is
 * read from the file the user would actually download, and the page count is the file's
 * own page count. No assumed arithmetic.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PT_PER_MM = 72 / 25.4;

export const PAPER_PT = {
	Letter: { width: 612, height: 792 },
	A4: { width: 595.28, height: 841.89 },
} as const;

const TYPST = (() => {
	const candidates: Array<[string, string[]]> = [
		["typst", []],
		["typst.exe", []],
		["npx", ["--no-install", "typst"]],
	];
	for (const [command, prefix] of candidates) {
		const probe = spawnSync(command, [...prefix, "--version"], {
			encoding: "utf8",
			shell: process.platform === "win32",
		});
		if (probe.status === 0 && (probe.stdout ?? "").includes("typst")) {
			return [command, prefix] as const;
		}
	}
	return null;
})();

export const hasTypst = TYPST !== null;

export interface Measurement {
	/** Pages the compiler produced. */
	pages: number;
	/** Usable text height of one page, in points. */
	usablePt: number;
	/** Bottom of the last line on the last page, measured from the page's top edge. */
	contentBottomPt: number;
	/** Fill of the last page: content height ÷ printable height, 0–1. */
	fill: number;
	/** Fill of page 1, 0–1. Differs from `fill` only when the document spills. */
	pageOneFill: number;
	/** Fill of page 1 in millimetres of used height. */
	contentMm: number;
}

interface PdfTextItem {
	str?: string;
	transform?: number[];
}

/**
 * The bottom of the deepest glyph on a page.
 *
 * A glyph's `transform[5]` is its baseline in PDF points, measured from the page's
 * *bottom-left* with y increasing upward — so the lowest line on the page is the
 * smallest y, not the largest. The bottom of that line's box is the baseline minus a
 * descent of 0.25em; the bundled families measure 0.64–0.73em for the ascent, so a
 * quarter of the size is the conservative other half of the line. That under-reports
 * fill by at most 0.3 % on a one-pager, well inside the band being asserted.
 *
 * Returns `null` for a page with no text at all.
 */
function deepestBaseline(items: PdfTextItem[]): number | null {
	let min: number | null = null;
	for (const item of items) {
		if (!item.str || item.str.trim() === "") continue;
		const t = item.transform;
		if (!t || t.length < 6) continue;
		const y = t[5];
		if (typeof y === "number" && Number.isFinite(y)) {
			min = min === null ? y : Math.min(min, y);
		}
	}
	return min;
}

export interface MeasureOptions {
	/** Directory to write the .typ/.pdf into. A temp dir by default. */
	dir: string;
	/** The assembled source (`sections.typ` + the template). */
	source: string;
	/** The serialised `data` JSON. */
	json: string;
	/** Body size in points, for the descent allowance. */
	bodyPt: number;
	marginTopPt: number;
	pageSize: "A4" | "Letter";
	name: string;
}

export async function measurePdf({
	dir,
	source,
	json,
	bodyPt,
	marginTopPt,
	pageSize,
	name,
}: MeasureOptions): Promise<Measurement> {
	writeFileSync(join(dir, `${name}.json`), json);
	const sourcePath = join(dir, `${name}.typ`);
	const pdfPath = join(dir, `${name}.pdf`);
	writeFileSync(sourcePath, `#let data = json("${name}.json")\n${source}\n`);
	const [command, prefix] = TYPST as readonly [string, string[]];
	execFileSync(command, [...prefix, "compile", sourcePath, pdfPath], {
		cwd: dir,
		stdio: "pipe",
		shell: process.platform === "win32",
	});

	const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
	// pdf.js rejects a Node `Buffer`; it wants a plain `Uint8Array` view.
	const doc = await getDocument({
		data: new Uint8Array(readFileSync(pdfPath)),
		useSystemFonts: true,
	}).promise;
	const pages = doc.numPages;
	let lastPageDeepest: number | null = null;
	let firstPageDeepest: number | null = null;
	for (let page = 1; page <= pages; page++) {
		const content = await (await doc.getPage(page)).getTextContent();
		const deepest = deepestBaseline(content.items as PdfTextItem[]);
		if (page === pages) lastPageDeepest = deepest;
		if (page === 1) firstPageDeepest = deepest;
	}
	const paper = PAPER_PT[pageSize];
	const usablePt = paper.height - marginTopPt * 2;
	const bottomOf = (deepest: number | null) =>
		deepest === null ? 0 : paper.height - deepest + bodyPt * 0.25;
	const fillOf = (bottom: number) =>
		Math.min(1, Math.max(0, (bottom - marginTopPt) / usablePt));
	// A text-free page is a 0 fill, not a full one.
	const contentBottomPt = bottomOf(lastPageDeepest);
	const fill = fillOf(contentBottomPt);
	return {
		pages,
		usablePt,
		contentBottomPt,
		fill,
		pageOneFill: fillOf(bottomOf(firstPageDeepest)),
		contentMm: fill * usablePt * (25.4 / 72),
	};
}
