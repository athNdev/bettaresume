/**
 * Typst WASM compiler service.
 *
 * Uses @myriaddreamin/typst.ts to compile Typst documents entirely in the
 * browser (client-side WASM), with no server round-trips.
 *
 * Initialization is lazy — the WASM modules (compiler + renderer) are only
 * downloaded and instantiated on the first compile call, then cached for
 * the lifetime of the page.
 *
 * Fonts are loaded from Google Fonts CDN on demand and cached per family.
 */

// Font URL map — TTF files work reliably with Typst's font loader.
// We use the variable-weight Inter file and standard TTFs for others.
const GOOGLE_FONT_URLS: Partial<Record<string, string[]>> = {
	Inter: [
		"https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-2.ttf",
		// Bold weight
		"https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuI6fAZ9hiJ-2.ttf",
	],
	Roboto: [
		"https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxKKTU1Kg.woff2",
		"https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4AMP6lQ.woff2",
	],
	"Open Sans": [
		"https://fonts.gstatic.com/s/opensans/v34/memvYaGs126MiZpBA-UvWbX2vVnXBbObj2OVTSCmu1aB.woff2",
	],
	Lato: [
		"https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXiWtFCc.woff2",
		"https://fonts.gstatic.com/s/lato/v24/S6u9w4BMUTPHh6UVSwiPGQ3q5d0N7w.woff2",
	],
	Montserrat: [
		"https://fonts.gstatic.com/s/montserrat/v25/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.woff2",
	],
	"Playfair Display": [
		"https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQ.woff2",
	],
};

// Map FontFamily names to what Typst calls them
// (Typst uses the actual font family name from the font file metadata)
export const TYPST_FONT_NAMES: Record<string, string> = {
	Inter: "Inter",
	Roboto: "Roboto",
	"Open Sans": "Open Sans",
	Lato: "Lato",
	Montserrat: "Montserrat",
	"Playfair Display": "Playfair Display",
	Georgia: "New Computer Modern", // fallback — Georgia isn't in Typst WASM
	"Times New Roman": "New Computer Modern",
	Arial: "New Computer Modern",
	Calibri: "New Computer Modern",
	Garamond: "New Computer Modern",
	Helvetica: "New Computer Modern",
	"Computer Modern": "New Computer Modern",
};

// Minimal typing for the @myriaddreamin/typst.ts snippet API surface we use.
interface TypstSnippet {
	setCompilerInitOptions(opts: { getModule: () => string }): void;
	setRendererInitOptions(opts: { getModule: () => string }): void;
	addFonts(fonts: Uint8Array[]): Promise<void>;
	/** May return a single combined SVG string or an array (one per page). */
	svg(opts: { mainContent: string }): Promise<string | string[]>;
	pdf(opts: { mainContent: string }): Promise<Uint8Array>;
}

// -------------------------------------------------------
// State
// -------------------------------------------------------
let compilerReady = false;
let initPromise: Promise<void> | null = null;
const loadedFonts = new Set<string>();
const fontCache = new Map<string, Uint8Array[]>();

// Dynamically imported typst instance (avoids SSR issues)
let $typst: TypstSnippet | null = null;

// -------------------------------------------------------
// Initialization
// -------------------------------------------------------
async function loadFontFamily(fontFamily: string): Promise<void> {
	if (loadedFonts.has(fontFamily)) return;
	loadedFonts.add(fontFamily); // mark early to prevent duplicate loads

	const urls = GOOGLE_FONT_URLS[fontFamily];
	if (!urls || urls.length === 0) return;

	try {
		const buffers = await Promise.all(
			urls.map(async (url) => {
				const res = await fetch(url);
				if (!res.ok) throw new Error(`Failed to fetch font: ${url}`);
				return new Uint8Array(await res.arrayBuffer());
			}),
		);
		fontCache.set(fontFamily, buffers);

		if ($typst && buffers.length > 0) {
			for (const buf of buffers) {
				await $typst.addFonts([buf]);
			}
		}
	} catch (err) {
		console.warn(`[typst] Failed to load font "${fontFamily}":`, err);
		loadedFonts.delete(fontFamily); // allow retry
	}
}

async function initCompiler(): Promise<void> {
	if (compilerReady) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Dynamic import keeps WASM out of the SSR bundle
		const snippetModule = await import(
			"@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs"
		);
		const inst = (snippetModule as Record<string, unknown>).$typst as TypstSnippet;
		$typst = inst;

		// Point to the CDN-hosted WASM modules — they will be cached by the browser
		inst.setCompilerInitOptions({
			getModule: () =>
				"https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm",
		});
		inst.setRendererInitOptions({
			getModule: () =>
				"https://cdn.jsdelivr.net/npm/@myriaddreamin/typst-ts-renderer@0.7.0-rc2/pkg/typst_ts_renderer_bg.wasm",
		});

		// Trigger a minimal compile to warm up the WASM modules
		await inst.svg({ mainContent: "#set page(width: 1pt, height: 1pt)\n" });

		// Pre-load the default font (Inter) in the background
		await loadFontFamily("Inter");

		compilerReady = true;
	})();

	return initPromise;
}

// -------------------------------------------------------
// Public API
// -------------------------------------------------------

/**
 * Compiles a Typst document (template source + injected JSON data) to a
 * list of SVG strings, one per page.
 *
 * @param templateSource  Typst source code for the resume template.
 *                        The data will be injected as `#let data = ...`
 *                        at the very top.
 * @param dataJson        JSON string produced by `resumeToTypstJson()`.
 * @param fontFamily      The font family requested by the resume settings
 *                        (used to pre-load if not already cached).
 */
export async function compileToSvgPages(
	templateSource: string,
	dataJson: string,
	fontFamily = "Inter",
): Promise<string[]> {
	await initCompiler();
	await loadFontFamily(fontFamily);

	const mainContent = buildMainContent(templateSource, dataJson);

	if (!$typst) throw new Error("[typst] Compiler not initialized");
	const svgResult = await $typst.svg({ mainContent });

	// typst.ts v0.7+ may return string[] (one SVG per page) or a single combined string
	if (Array.isArray(svgResult)) return svgResult;
	return splitSvgPages(svgResult);
}

/**
 * Compiles a Typst document to a PDF Uint8Array for download.
 */
export async function compileToPdf(
	templateSource: string,
	dataJson: string,
	fontFamily = "Inter",
): Promise<Uint8Array> {
	await initCompiler();
	await loadFontFamily(fontFamily);

	const mainContent = buildMainContent(templateSource, dataJson);
	if (!$typst) throw new Error("[typst] Compiler not initialized");
	return $typst.pdf({ mainContent });
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

function buildMainContent(templateSource: string, dataJson: string): string {
	// Embed data as a Typst string literal parsed via json.decode().
	// JSON.stringify on a JSON string produces a valid Typst string literal
	// because both Typst and JSON use the same escape conventions.
	const typstStringLiteral = JSON.stringify(dataJson);
	const preamble = `#let data = json.decode(${typstStringLiteral})\n`;
	return preamble + templateSource;
}

/**
 * Splits a combined Typst SVG (all pages stacked vertically) into
 * one standalone SVG per page.
 *
 * Strategy 1 — DOM attribute markers:
 *   typst.ts annotates each page group with `data-typst-page-width` +
 *   `data-typst-page-height`. When present we extract each group and copy the
 *   shared <defs> block so that `<use href="#...">` symbol references resolve.
 *
 * Strategy 2 — viewBox slicing (fallback):
 *   Typst renders all pages into a single tall SVG with a viewBox of
 *   `0 0 {pageWidth} {numPages * pageHeight}`. The individual page height is
 *   the standard for the paper size (A4 ≈ 841.89pt, Letter ≈ 792pt), which we
 *   can infer from the SVG width. We then produce one SVG per page by shifting
 *   the viewBox Y offset — the browser clips everything outside the viewport,
 *   giving a pixel-perfect page slice without touching any SVG internals.
 */
function splitSvgPages(rawSvg: string): string[] {
	if (!rawSvg || rawSvg.trim().length === 0) return [];

	// ── Strategy 1: DOM attribute markers ───────────────────────────────────
	// Available in the browser only (always the case here — called after WASM init)
	if (typeof DOMParser !== "undefined") {
		const parser = new DOMParser();
		const doc = parser.parseFromString(rawSvg, "image/svg+xml");

		if (!doc.querySelector("parsererror")) {
			const svgEl = doc.documentElement;
			// Look at direct children only to avoid matching nested groups
			const pageGroups = Array.from(svgEl.children).filter((el) =>
				el.hasAttribute("data-typst-page-width"),
			);

			if (pageGroups.length > 0) {
				const defsEl = svgEl.querySelector("defs");
				const defsHtml = defsEl ? defsEl.outerHTML : "";
				const NS =
					'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';

				return pageGroups.map((g) => {
					const w = g.getAttribute("data-typst-page-width") ?? "612";
					const h = g.getAttribute("data-typst-page-height") ?? "792";
					return (
						`<svg ${NS} width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n` +
						`${defsHtml}\n<g>${g.innerHTML}</g>\n</svg>`
					);
				});
			}
		}
	}

	// ── Strategy 2: viewBox slicing ──────────────────────────────────────────
	// Typst emits viewBox="0 0 {pageWidth} {numPages * pageHeight}".
	// Standard page heights (in Typst pt units):
	//   A4     — width ≈ 595.28pt, height = 841.89pt
	//   Letter — width = 612pt,    height = 792pt
	const vbMatch = rawSvg.match(/viewBox="([^"]+)"/);
	if (vbMatch?.[1]) {
		const parts = vbMatch[1].split(/\s+/).map(Number);
		const vbX = parts[0] ?? 0;
		const vbW = parts[2];
		const vbH = parts[3];
		if (vbW !== undefined && vbH !== undefined && Number.isFinite(vbW) && Number.isFinite(vbH) && vbH > 0) {
			// Infer page height from page width
			const pageHeight = vbW < 600 ? 841.89 : 792;
			const numPages = Math.max(1, Math.round(vbH / pageHeight));

			if (numPages > 1) {
				// Extract the inner SVG content once (shared across all pages)
				const innerMatch = rawSvg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
				const inner = innerMatch ? innerMatch[1] : "";
				const NS =
					'xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"';

				return Array.from({ length: numPages }, (_, i) => {
					const pageY = i * pageHeight;
					return (
						`<svg ${NS} width="${vbW}" height="${pageHeight}" ` +
						`viewBox="${vbX} ${pageY} ${vbW} ${pageHeight}">\n${inner}\n</svg>`
					);
				});
			}
		}
	}

	// Single page or unrecognised format — return as-is
	return [rawSvg];
}

/** Resets the compiler state (useful for testing / HMR). */
export function resetTypstCompiler(): void {
	compilerReady = false;
	initPromise = null;
	$typst = null;
	loadedFonts.clear();
	fontCache.clear();
}
