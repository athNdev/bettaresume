import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import * as fontkit from "fontkit";
import { describe, expect, it } from "vitest";
import { FONT_FILES } from "@/lib/typst/fonts";
import { codeOf } from "./helpers/code-source";

/**
 * The export path used to depend on two third-party CDNs at runtime: jsDelivr for the
 * Typst WASM modules and fonts.gstatic.com for the typefaces.
 *
 * Both dependencies were silently broken in ways a browser would not report as an
 * error:
 *
 *  - Three of the nine pinned font URLs returned **404**, including both Inter files.
 *    Inter is the default family, so every default export had been substituting a
 *    different face — the exact defect the font-substitution work was meant to close.
 *  - A WASM fetch from a CDN has no Subresource Integrity, so the version pin was a
 *    string and a promise rather than a hash, and the 28 MB request also told a
 *    third party that someone was exporting a resume.
 *
 * Both are now served from this origin. These assertions are what keeps them there.
 */

const ROOT = process.cwd();
const compiler = codeOf("src/lib/typst/compiler.ts");
const fonts = codeOf("src/lib/typst/fonts.ts");
const copyScript = readFileSync(
	resolve(ROOT, "scripts/copy-typst-assets.mjs"),
	"utf8",
);
const packageJson = JSON.parse(
	readFileSync(resolve(ROOT, "package.json"), "utf8"),
);

describe("nothing is fetched from a CDN at runtime", () => {
	it("the compiler points at this origin", () => {
		expect(compiler).toMatch(/wasm\/typst_ts_web_compiler_bg\.wasm/);
		expect(compiler).toMatch(/wasm\/typst_ts_renderer_bg\.wasm/);
	});

	it("no CDN hostname survives in code", () => {
		// `codeOf` strips comments, so the doc comments explaining the removal cannot
		// satisfy or fail this.
		for (const source of [compiler, fonts]) {
			expect(source).not.toMatch(/cdn\.jsdelivr\.net/);
			expect(source).not.toMatch(/fonts\.gstatic\.com/);
			expect(source).not.toMatch(/unpkg\.com/);
		}
	});
});

describe("the WASM modules are copied out of node_modules", () => {
	it("the copy script resolves both packages", () => {
		expect(copyScript).toMatch(/@myriaddreamin\/typst-ts-web-compiler/);
		expect(copyScript).toMatch(/@myriaddreamin\/typst-ts-renderer/);
	});

	it("it runs before both build and dev, so neither has a missing module", () => {
		expect(packageJson.scripts.prebuild).toMatch(/copy:typst/);
		expect(packageJson.scripts.predev).toMatch(/copy:typst/);
	});

	it("the generated directory is gitignored, because it is build output", () => {
		const ignore = readFileSync(resolve(ROOT, ".gitignore"), "utf8");
		expect(ignore).toMatch(/^\/public\/wasm\/$/m);
	});
});

describe("every declared font file exists", () => {
	it("FONT_FILES is not empty", () => {
		expect(Object.keys(FONT_FILES).length).toBeGreaterThanOrEqual(6);
	});

	it("each path resolves to a real font on disk", () => {
		// A rename in `public/fonts/` would otherwise surface as a substitution warning
		// during someone's export, months later, with nothing failing here.
		const families = Object.entries(FONT_FILES);
		expect(families.length).toBeGreaterThan(0);

		for (const [family, paths] of families) {
			expect(paths, `${family} declares no files`).toBeTruthy();
			for (const path of paths ?? []) {
				const full = resolve(ROOT, `public${path}`);
				expect(existsSync(full), `${family}: ${path} is missing`).toBe(true);
				expect(statSync(full).size).toBeGreaterThan(1000);

				// TrueType/OpenType magic. A HTML error page saved as .ttf would pass an
				// existence check and fail at compile time.
				const magic = readFileSync(full).subarray(0, 4).toString("latin1");
				expect(
					["\x00\x01\x00\x00", "true", "OTTO", "ttcf"],
					`${family}: ${path} is not a font`,
				).toContain(magic);
			}
		}
	});

	it("Inter, the default family, is covered", () => {
		// This is the one that was 404 and nobody noticed.
		expect(FONT_FILES.Inter?.length).toBeGreaterThan(0);
	});
});

describe("each family ships real weights, not one variable font twice", () => {
	// The regression this pins, measured rather than guessed: every upstream family
	// except Lato is published as a single variable font. Typst loads it and reports the
	// right family, but does not apply the `wght` axis — compiling the same word at 400,
	// 700 and 900 produced byte-identical SVG *and* byte-identical PDF. Vendoring the
	// variable file therefore renders every bold heading in the export at regular weight,
	// and nothing in the build complains.
	//
	// So: two files per family, and they must actually claim different weights.
	for (const [family, paths] of Object.entries(FONT_FILES)) {
		it(`${family} declares at least two weights`, () => {
			expect(
				(paths ?? []).length,
				`${family} declares ${paths?.length ?? 0} file(s); a single file cannot supply bold`,
			).toBeGreaterThanOrEqual(2);
		});

		it(`${family}'s files carry distinct, non-zero weight classes`, () => {
			const weights = (paths ?? []).map((path) => {
				const font = fontkit.openSync(resolve(ROOT, `public${path}`));
				// openSync is typed as Font | FontCollection; every file here is a single face.
				const os2 = (font as fontkit.Font)["OS/2"];
				return os2?.usWeightClass ?? 0;
			});

			for (const weight of weights) {
				expect(
					weight,
					`${family} declares a face with no weight class`,
				).toBeGreaterThan(0);
			}
			expect(
				new Set(weights).size,
				`${family} declares duplicate weights`,
			).toBe(weights.length);
		});

		it(`${family}'s files are registered under the family name Typst asks for`, () => {
			// Montserrat's variable font defaults to an instance named "Montserrat Thin", and
			// HarfBuzz's instancer keeps the instance name. A file whose `name` table says
			// "Montserrat Thin" is invisible to `#set text(font: "Montserrat")`.
			for (const path of paths ?? []) {
				const font = fontkit.openSync(
					resolve(ROOT, `public${path}`),
				) as fontkit.Font;
				expect(font.familyName, `${path} is registered as something else`).toBe(
					family,
				);
			}
		});
	}
});
