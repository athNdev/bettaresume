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
 * Fonts are vendored under `public/fonts/` and registered with the compiler at init, so
 * nothing here touches a CDN.
 */

// The library's font loaders. Their default driver pulls Typst's own faces from
// jsDelivr; these let every byte come from this origin instead.
import {
	loadFonts,
	preloadFontAssets,
} from "@myriaddreamin/typst.ts/options.init";
import {
	FONT_FILES,
	type FontResolution,
	fontSubstitutionWarning,
	resolveTypstFont,
} from "./fonts";

// Minimal typing for the @myriaddreamin/typst.ts snippet API surface we use.
interface TypstInitOptions {
	getModule: () => string;
	/**
	 * Stage the compiler's own default text fonts from this origin.
	 *
	 * This replaces the library default — `TypstCompilerDriver.defaultAssets` pushes
	 * `loadFonts([], { assets: ['text'] })`, which resolves its prefix to
	 * `cdn.jsdelivr.net/gh/typst/typst-assets@…/files/fonts/`. An earlier attempt passed
	 * `assets: false` to this object instead; that key is not part of `InitOptions`, so it
	 * was silently ignored and the compiler kept fetching 17 files from jsDelivr. Passing
	 * `assets` **and** `assetUrlPrefix` is what makes `hasSpecifiedAssets` true and stops
	 * the default from being added at all.
	 *
	 * The fonts must stay: they are the substitution target for any family this app does
	 * not ship, so dropping them would leave those resumes with no fallback face.
	 */
	beforeBuild?: unknown[];
}

interface TypstSnippet {
	setCompilerInitOptions(opts: TypstInitOptions): void;
	setRendererInitOptions(opts: TypstInitOptions): void;
	/** May return a single combined SVG string or an array (one per page). */
	svg(opts: { mainContent: string }): Promise<string | string[]>;
	pdf(opts: { mainContent: string }): Promise<Uint8Array>;
}

// -------------------------------------------------------
// State
// -------------------------------------------------------
let compilerReady = false;
let initPromise: Promise<void> | null = null;

// Dynamically imported typst instance (avoids SSR issues)
let $typst: TypstSnippet | null = null;

// -------------------------------------------------------
// Initialization
// -------------------------------------------------------

/**
 * Register every vendored family with the compiler at init.
 *
 * This is the library's documented path for fonts it has no metadata for
 * ("preLoad fonts from remote url (because font info is not provided)"), and it is the
 * only one that does not require hand-building a `FontInfo` — `setFonts` wants a
 * `{ family, variant }` descriptor that is otherwise produced by the internal font
 * resolver, and guessing it produced `missing field variant`.
 *
 * The alternative, `loadFonts` with `{ info, url }` per family, is lazy and would fetch
 * only the family in use. It needs that same descriptor, so it is not reachable from
 * here without re-implementing the resolver.
 *
 * What it costs: every family is fetched on the first compile of a session — about 7 MB,
 * once, cached by the browser afterwards. That is the price of the fonts actually being
 * embedded, which they were not before: the previous code called `$typst.addFonts`, a
 * method that does not exist, and every export silently fell back to LibertinusSerif.
 */
function allFontUrls(): string[] {
	const paths = new Set<string>();
	for (const list of Object.values(FONT_FILES)) {
		for (const path of list ?? []) paths.add(`${assetBase()}${path}`);
	}
	return [...paths];
}

/**
 * Prefix for the WASM paths.
 *
 * Empty for a root deploy (which is what `app.bettaresume.com` is) and settable for a
 * project-pages style deploy under a subpath. Kept as a function rather than a constant
 * so the value is read when the module loads, after env inlining, and so a test can
 * assert the CDN is gone without a DOM.
 */
function assetBase(): string {
	return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

async function initCompiler(): Promise<void> {
	if (compilerReady) return;
	if (initPromise) return initPromise;

	initPromise = (async () => {
		// Dynamic import keeps WASM out of the SSR bundle
		const snippetModule = await import(
			"@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs"
		);
		const inst = (snippetModule as Record<string, unknown>)
			.$typst as TypstSnippet;
		$typst = inst;

		// Point at the modules this build ships, not at a CDN. `prebuild`/`predev` copy
		// them out of node_modules into `public/wasm/`; see scripts/copy-typst-assets.mjs.
		// Loading them from our own origin removes a third-party request from the export
		// path, a runtime dependency on jsDelivr keeping a pre-release tag alive, and the
		// only place in the product where a personal document's export leaked the
		// visitor's IP to somebody else's server.
		inst.setCompilerInitOptions({
			getModule: () => `${assetBase()}/wasm/typst_ts_web_compiler_bg.wasm`,
			beforeBuild: [
				loadFonts(allFontUrls()),
				preloadFontAssets({
					assets: ["text"],
					assetUrlPrefix: `${assetBase()}/fonts/typst/`,
				}),
			],
		});
		inst.setRendererInitOptions({
			getModule: () => `${assetBase()}/wasm/typst_ts_renderer_bg.wasm`,
		});

		// Trigger a minimal compile to warm up the WASM modules
		await inst.svg({ mainContent: "#set page(width: 1pt, height: 1pt)\n" });

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
	const _font = await prepareFont(fontFamily);

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
	await prepareFont(fontFamily);

	const mainContent = buildMainContent(templateSource, dataJson);
	if (!$typst) throw new Error("[typst] Compiler not initialized");
	return $typst.pdf({ mainContent });
}

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

/**
 * Resolve a requested family and warn when the request cannot be honoured.
 *
 * Every compile path goes through here. Callers used to pass an already-resolved
 * family, which is how the preview and the export drifted apart.
 *
 * Loading is no longer part of this: every vendored family is registered with the
 * compiler once at init (see `allFontUrls`), so there is nothing to fetch per compile
 * and nothing that can fail silently at this point.
 */
async function prepareFont(fontFamily: string): Promise<FontResolution> {
	const resolution = resolveTypstFont(fontFamily);

	const warning = fontSubstitutionWarning(resolution);
	if (warning) console.warn(`[typst] ${warning}`);

	return resolution;
}

function buildMainContent(templateSource: string, dataJson: string): string {
	// Embed data as a Typst string literal that we convert to bytes for json().
	// In Typst 0.11+, json() expects bytes, so we need to call .bytes() on the string.
	//
	// This was long flagged as a bug: JSON.stringify emits `\uXXXX` for non-ASCII
	// and Typst wants `\u{XXXX}`. That is **not** what happens — JSON.stringify
	// emits literal UTF-8 and only escapes `"`, `\`, and control characters, which
	// are escaped identically in both languages. Verified:
	//
	//   JSON.stringify({n:"José", d:"—", c:"简历"})
	//   -> {"n":"José","d":"—","c":"简历"}      (no \uXXXX anywhere)
	//
	// So accented names, em dashes and CJK all pass through untouched. The escapes
	// that ARE emitted — \n, \t, \\, \" — are byte-identical in Typst, and
	// double-encoding handles the embedded JSON's own quotes. Do not "fix" this.
	const typstStringLiteral = JSON.stringify(dataJson);
	const preamble = `#let data = json(bytes(${typstStringLiteral}))\n`;
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
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * The two things Typst adds that are not part of the page.
 *
 * `--format svg` appends a `<script>` that implements interactive text selection, and a
 * `<foreignObject>` holding its transparent overlay. Neither belongs in a rendered page,
 * and both are actively harmful here:
 *
 *  - the script executes in the app's origin when the SVG is injected as markup, which is
 *    what `dangerouslySetInnerHTML` was doing;
 *  - the `<foreignObject>` contains `h5:div`, whose `h5` prefix is declared on the root
 *    `<svg>` — so a *page slice* is not well-formed XML and a browser refuses to load it
 *    as an image at all. That is how this was found: the preview went blank.
 */
const NOT_PAGE_CONTENT = "script, foreignObject";

/**
 * Read the compiler's SVG leniently.
 *
 * `image/svg+xml` parsing rejects the document outright because of the unbound `h5:`
 * prefix, which sends every caller down the string-slicing fallback. The HTML parser is
 * forgiving, and it still puts `<svg>` and its children in the SVG namespace, which is
 * all this needs.
 */
function parseSvgLeniently(rawSvg: string): Element | null {
	if (typeof DOMParser === "undefined") return null;
	const doc = new DOMParser().parseFromString(rawSvg, "text/html");
	const svg = doc.querySelector("svg");
	return svg ?? null;
}

/** Strip Typst's selection overlay, then serialise a standalone document. */
function toStandaloneSvg(el: Element): string {
	for (const node of el.querySelectorAll(NOT_PAGE_CONTENT)) node.remove();
	return new XMLSerializer().serializeToString(el);
}

function splitSvgPages(rawSvg: string): string[] {
	if (!rawSvg || rawSvg.trim().length === 0) return [];

	// ── Strategy 1: DOM attribute markers ───────────────────────────────────
	// Available in the browser only (always the case here — called after WASM init).
	const root = parseSvgLeniently(rawSvg);
	if (root) {
		const svgEl = root;
		// Look at direct children only to avoid matching nested groups
		const pageGroups = Array.from(svgEl.children).filter((el) =>
			el.hasAttribute("data-typst-page-width"),
		);

		if (pageGroups.length > 0) {
			const defsEl = svgEl.querySelector("defs");

			return pageGroups.map((g) => {
				const w = g.getAttribute("data-typst-page-width") ?? "612";
				const h = g.getAttribute("data-typst-page-height") ?? "792";

				// Build the page rather than string-concatenating it: the parts that must
				// not survive (the script, the overlay) are removed from a tree, so there is
				// no pattern to bypass.
				const page = document.createElementNS(SVG_NS, "svg");
				page.setAttribute("width", w);
				page.setAttribute("height", h);
				page.setAttribute("viewBox", `0 0 ${w} ${h}`);
				if (defsEl) page.appendChild(defsEl.cloneNode(true));

				const body = document.createElementNS(SVG_NS, "g");
				for (const child of Array.from(g.childNodes)) {
					body.appendChild(child.cloneNode(true));
				}
				page.appendChild(body);

				return toStandaloneSvg(page);
			});
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
		if (
			vbW !== undefined &&
			vbH !== undefined &&
			Number.isFinite(vbW) &&
			Number.isFinite(vbH) &&
			vbH > 0
		) {
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
					return sanitiseRawSvg(
						`<svg ${NS} width="${vbW}" height="${pageHeight}" ` +
							`viewBox="${vbX} ${pageY} ${vbW} ${pageHeight}">\n${inner}\n</svg>`,
					);
				});
			}
		}
	}

	// Single page or unrecognised format
	return [sanitiseRawSvg(rawSvg)];
}

/**
 * Last-resort clean-up for a page that could not be rebuilt from a DOM.
 *
 * Deliberately structural rather than textual where a DOM is available: parse it, remove
 * the nodes, serialise. The regex branch only runs where there is no DOM at all, which is
 * never the preview path.
 */
function sanitiseRawSvg(rawSvg: string): string {
	const parsed = parseSvgLeniently(rawSvg);
	if (parsed) return toStandaloneSvg(parsed);
	return rawSvg;
}

/** Resets the compiler state (useful for testing / HMR). */
export function resetTypstCompiler(): void {
	compilerReady = false;
	initPromise = null;
	$typst = null;
}
