// Vendor the Typst font files into public/fonts/, one static file per weight.
//
// ## Why this exists
//
// `src/lib/typst/fonts.ts` used to pin nine `fonts.gstatic.com` URLs. Three of the nine
// returned 404 — including BOTH Inter files. Inter is the default family, so every
// default export had been silently substituting a face, which is the exact defect
// "font substitution silently changing the rendered page" was meant to close. A pinned
// CDN URL is a promise that rots; a vendored file is not.
//
// ## Why STATIC instances, not the upstream variable fonts
//
// Every family except Lato is published upstream as a single variable font. Typst will
// happily load one and pick the family, but the bundled build does not apply the `wght`
// axis: compiling the same word at weights 400, 700 and 900 produced byte-identical SVG
// and byte-identical PDFs. So a variable file makes every bold heading in the PDF render
// regular — verified, not assumed. Static instances fix it: 400 and 700 now differ.
//
// The instances are produced with HarfBuzz's subsetter, given the family's *entire*
// character set read from its own cmap, so instancing does not silently drop scripts.
// Lato has real static files upstream and is taken as-is.
//
// Not part of the build: fonts change rarely, and a build that reaches GitHub can fail
// for a reason unrelated to this repository. Run by hand after changing a family.
import fs from "node:fs";
import path from "node:path";
import * as fontkit from "fontkit";
import subsetFont from "subset-font";

const RAW = "https://raw.githubusercontent.com/google/fonts/main";

/**
 * local slug -> either an upstream file to copy verbatim, or a variable font to
 * instantiate per weight.
 *
 * `copy` is used where upstream already publishes static files. Montserrat is here for a
 * second reason: its variable font's default instance is named "Montserrat Thin", and
 * HarfBuzz's instancer keeps the instance name rather than rewriting the family. Typst
 * matches on the family name in the font's `name` table, so an instanced Montserrat would
 * register as "Montserrat Thin" and `#set text(font: "Montserrat")` would not find it.
 */
const FAMILIES = {
	inter: { remote: "ofl/inter/Inter[opsz,wght].ttf", weights: [400, 700] },
	roboto: { remote: "ofl/roboto/Roboto[wdth,wght].ttf", weights: [400, 700] },
	"open-sans": {
		remote: "ofl/opensans/OpenSans[wdth,wght].ttf",
		weights: [400, 600],
	},
	"playfair-display": {
		remote: "ofl/playfairdisplay/PlayfairDisplay[wght].ttf",
		weights: [400, 700],
	},
	// Metric-compatible substitutes. A resume set in Times New Roman must wrap like
	// Times New Roman, or the page count in the preview disagrees with the page count in
	// Word — which is the one thing this product promises not to get wrong.
	arimo: { remote: "ofl/arimo/Arimo[wght].ttf", weights: [400, 700] },
};

/** Files taken as published, keyed by local filename. */
const COPY = {
	"lato.ttf": "ofl/lato/Lato-Regular.ttf",
	"lato-bold.ttf": "ofl/lato/Lato-Bold.ttf",
	"tinos-400.ttf": "ofl/tinos/Tinos-Regular.ttf",
	"tinos-700.ttf": "ofl/tinos/Tinos-Bold.ttf",
	"carlito-400.ttf": "ofl/carlito/Carlito-Regular.ttf",
	"carlito-700.ttf": "ofl/carlito/Carlito-Bold.ttf",
	"montserrat-400.ttf":
		"https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Regular.ttf",
	"montserrat-700.ttf":
		"https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Bold.ttf",
};

/**
 * Typst's own default text fonts, served from this origin.
 *
 * The compiler loads these on first compile unless something else is configured, and
 * its default source is jsDelivr. They are also the substitution target for any family
 * we do not ship, so dropping them is not an option — hosting them is. The names are
 * `TypstCompilerDriver.defaultAssets`'s list, fetched from the same release the library
 * pins; `assetUrlPrefix` in `compiler.ts` points at this directory.
 */
const TYPST_ASSETS_BASE =
	"https://cdn.jsdelivr.net/gh/typst/typst-assets@v0.13.1/files/fonts";
const TYPST_DEFAULT_FONTS = [
	"DejaVuSansMono-Bold.ttf",
	"DejaVuSansMono-BoldOblique.ttf",
	"DejaVuSansMono-Oblique.ttf",
	"DejaVuSansMono.ttf",
	"LibertinusSerif-Bold.otf",
	"LibertinusSerif-BoldItalic.otf",
	"LibertinusSerif-Italic.otf",
	"LibertinusSerif-Regular.otf",
	"LibertinusSerif-Semibold.otf",
	"LibertinusSerif-SemiboldItalic.otf",
	"NewCM10-Bold.otf",
	"NewCM10-BoldItalic.otf",
	"NewCM10-Italic.otf",
	"NewCM10-Regular.otf",
	"NewCMMath-Bold.otf",
	"NewCMMath-Book.otf",
	"NewCMMath-Regular.otf",
];

const OUT = path.join(process.cwd(), "public", "fonts");
fs.mkdirSync(OUT, { recursive: true });

const fetchFont = async (remote) => {
	const url = remote.startsWith("https://")
		? remote
		: `${RAW}/${remote.replace(/\[/g, "%5B").replace(/\]/g, "%5D")}`;
	const res = await fetch(url);
	if (!res.ok) throw new Error(`${remote}: ${res.status}`);
	const bytes = Buffer.from(await res.arrayBuffer());
	const magic = bytes.subarray(0, 4).toString("latin1");
	if (!["\x00\x01\x00\x00", "true", "OTTO", "ttcf"].includes(magic)) {
		throw new Error(
			`${remote}: not a font (signature ${JSON.stringify(magic)})`,
		);
	}
	return bytes;
};

/** Every code point the font covers, as a string, for the subsetter's keep-list. */
const fullCharset = (buffer) => {
	const font = fontkit.create(buffer);
	let charset = "";
	for (const cp of font.characterSet) {
		if (cp > 0x10ffff) continue;
		try {
			charset += String.fromCodePoint(cp);
		} catch {
			// Lone surrogates cannot round-trip through a JS string; they are not text.
		}
	}
	return charset;
};

let written = 0;
let total = 0;

for (const [file, remote] of Object.entries(COPY)) {
	const source = await fetchFont(remote);
	fs.writeFileSync(path.join(OUT, file), source);
	written++;
	total += source.length;
	console.log(
		`${file.padEnd(28)} ${(source.length / 1024).toFixed(0)} KB  (upstream static)`,
	);
}

for (const [slug, spec] of Object.entries(FAMILIES)) {
	const source = await fetchFont(spec.remote);
	const charset = fullCharset(source);

	for (const weight of spec.weights) {
		const instance = await subsetFont(source, charset, {
			targetFormat: "truetype",
			variationAxes: { wght: weight },
		});

		// Verify the instance kept the family name and claimed its weight. Typst matches
		// on both: a family it cannot find is substituted, and two faces claiming the
		// same weight make bold a coin flip.
		const check = fontkit.create(Buffer.from(instance));
		const declared = check.familyName;
		const weightClass = check["OS/2"]?.usWeightClass;
		if (!declared || declared.trim() === "") {
			throw new Error(`${slug} ${weight}: instance has no family name`);
		}
		if (weightClass !== weight) {
			throw new Error(
				`${slug} ${weight}: instance claims weight ${weightClass}, not ${weight}`,
			);
		}

		const file = `${slug}-${weight}.ttf`;
		fs.writeFileSync(path.join(OUT, file), instance);
		written++;
		total += instance.length;
		console.log(
			`${file.padEnd(28)} ${(instance.length / 1024).toFixed(0)} KB  (family "${declared}", ${weightClass})`,
		);
	}
}

console.log(
	`\n${written} files, ${(total / 1024 / 1024).toFixed(1)} MB in public/fonts/`,
);

// ── Typst's own default text fonts ────────────────────────────────────────────
const TYPST_DIR = path.join(OUT, "typst");
fs.mkdirSync(TYPST_DIR, { recursive: true });

let typstBytes = 0;
for (const name of TYPST_DEFAULT_FONTS) {
	const res = await fetch(`${TYPST_ASSETS_BASE}/${name}`);
	if (!res.ok) throw new Error(`${name}: ${res.status}`);
	const bytes = Buffer.from(await res.arrayBuffer());
	const magic = bytes.subarray(0, 4).toString("latin1");
	if (!["\x00\x01\x00\x00", "true", "OTTO", "ttcf"].includes(magic)) {
		throw new Error(`${name}: not a font`);
	}
	fs.writeFileSync(path.join(TYPST_DIR, name), bytes);
	typstBytes += bytes.length;
}

console.log(
	`${TYPST_DEFAULT_FONTS.length} Typst default fonts, ${(typstBytes / 1024 / 1024).toFixed(1)} MB in public/fonts/typst/`,
);
