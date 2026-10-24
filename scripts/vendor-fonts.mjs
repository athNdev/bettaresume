// Vendor the Typst font files into public/fonts/.
//
// ## Why this exists
//
// `src/lib/typst/fonts.ts` used to pin nine `fonts.gstatic.com` URLs directly. Three of
// the nine returned 404 — including BOTH Inter files. Inter is the default family, so
// every default export had been silently falling back to a substitute face, which is the
// exact defect `[IO] Font substitution silently changing the rendered page` was meant to
// close. A pinned CDN URL is a promise that rots; a vendored file is not.
//
// ## Which files
//
// Whole families from google/fonts on GitHub, not the CSS API's per-subset slivers. Two
// reasons: a resume can carry an accented name, and the CSS API's modern endpoint now
// returns ONE variable font per family with every weight pointing at the same bytes —
// which is correct for a browser and confusing to reason about here. The bundled Typst
// is 0.14.2, which supports variable fonts (its docs say a variable font is preferred
// over a static one when both support a configuration), so the `wght` axis is what
// supplies bold.
//
// Lato is the exception: it has no variable build, so it gets its static Regular and
// Bold.
//
// Not part of the build: fonts change rarely, and a build that reaches GitHub or Google
// can fail for a reason unrelated to this repository. Run by hand when adding a family.
import fs from "node:fs";
import path from "node:path";

const RAW = "https://raw.githubusercontent.com/google/fonts/main";

/** local filename -> path in google/fonts. */
const FILES = {
	"inter.ttf": "ofl/inter/Inter[opsz,wght].ttf",
	"roboto.ttf": "ofl/roboto/Roboto[wdth,wght].ttf",
	"open-sans.ttf": "ofl/opensans/OpenSans[wdth,wght].ttf",
	"lato.ttf": "ofl/lato/Lato-Regular.ttf",
	"lato-bold.ttf": "ofl/lato/Lato-Bold.ttf",
	"montserrat.ttf": "ofl/montserrat/Montserrat[wght].ttf",
	"playfair-display.ttf": "ofl/playfairdisplay/PlayfairDisplay[wght].ttf",
};

const OUT = path.join(process.cwd(), "public", "fonts");
fs.mkdirSync(OUT, { recursive: true });

let total = 0;
for (const [name, remote] of Object.entries(FILES)) {
	// The brackets in the upstream filenames must stay percent-encoded.
	const url = `${RAW}/${remote.replace(/\[/g, "%5B").replace(/\]/g, "%5D")}`;
	const res = await fetch(url);
	if (!res.ok) {
		throw new Error(`${name}: ${res.status} from ${url}`);
	}
	const bytes = Buffer.from(await res.arrayBuffer());
	// A 200 with an HTML error page is possible from raw.githubusercontent; the font
	// signature check is what makes "downloaded" mean "is a font".
	const magic = bytes.subarray(0, 4).toString("latin1");
	if (!["\x00\x01\x00\x00", "true", "OTTO", "ttcf"].includes(magic)) {
		throw new Error(`${name}: not a font (signature ${JSON.stringify(magic)})`);
	}
	fs.writeFileSync(path.join(OUT, name), bytes);
	total += bytes.length;
	console.log(`${name}  ${(bytes.length / 1024).toFixed(0)} KB`);
}

console.log(
	`\n${Object.keys(FILES).length} files, ${(total / 1024 / 1024).toFixed(1)} MB in public/fonts/`,
);
