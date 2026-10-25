#!/usr/bin/env node
/**
 * Brand assets generator.
 *
 * The brand is part of the design system, so its artwork is generated from one
 * geometry definition rather than hand-drawn five times. Re-run after editing
 * the mark or the wordmark:
 *
 *   node scripts/brand-assets.cjs
 *
 * Outputs:
 *   public/brand/mark.svg           mark only, monochrome (currentColor)
 *   public/brand/mark-accent.svg    mark only, accent back sheet
 *   public/brand/wordmark.svg       wordmark only, outlined from Inter
 *   public/brand/lockup.svg         mark + wordmark
 *   public/brand/lockup-accent.svg  mark (accent) + wordmark
 *   public/brand/lockup-mono.svg    monochrome lockup for one-colour printing
 *   public/icon.svg                 favicon tile (mark on accent)
 *   public/favicon.ico              16/32/48 PNG-in-ICO of the same
 *
 * The wordmark is *outlined* with fontkit from the self-hosted Inter files the
 * document pipeline already ships (`public/fonts/inter-400.ttf`,
 * `inter-700.ttf`). Setting the product name in <text> would defer the typeface
 * choice to whatever font the viewer happens to have, which is the opposite of
 * a wordmark.
 */
const { writeFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");
const zlib = require("node:zlib");
const fontkit = require("fontkit");

const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "public");

/**
 * Mark geometry, 32×32.
 *
 * Two offset sheets: the back one is the master record, the front one is the
 * variant. The front sheet's text lines are knocked out with `fill-rule="evenodd"`,
 * so the mark is a single solid shape that works in one colour. The back sheet is
 * an outline, masked where the front sheet crosses it — that 1.2-unit gutter is
 * what keeps the two sheets legible when they are the same colour (16px, print,
 * favicons).
 */
const FRONT_PATH =
	"M7.5 4H16.5A3.5 3.5 0 0 1 20 7.5V16.5A3.5 3.5 0 0 1 16.5 20H7.5A3.5 3.5 0 0 1 4 16.5V7.5A3.5 3.5 0 0 1 7.5 4Z" +
	"M8 9H16V10.75H8Z" +
	"M8 12.5H16V14.25H8Z" +
	"M8 16H13.5V17.75H8Z";
/**
 * Back sheet, drawn as an open path that starts 1.2 units clear of the front
 * sheet (20 + 1.2 = 21.2) and stops 1.2 units before it on the other axis.
 *
 * This is the gutter without a <mask>: a mask needs a unique id, which needs
 * `useId`, which would make the mark a client component and put JavaScript on
 * the marketing page — a property that page deliberately keeps at zero. The
 * hidden part of the outline is behind the front sheet anyway.
 */
const BACK_PATH =
	"M21.2 12H24.5A3.5 3.5 0 0 1 28 15.5V24.5A3.5 3.5 0 0 1 24.5 28H15.5A3.5 3.5 0 0 1 12 24.5V21.2";

// ---------------------------------------------------------------------------
// Wordmark
// ---------------------------------------------------------------------------

const EM = 100; // the wordmark's em box, in SVG units
const TRACKING = -1; // -0.01em, the title tracking step

const regular = fontkit.openSync(resolve(OUT, "fonts/inter-400.ttf"));
const bold = fontkit.openSync(resolve(OUT, "fonts/inter-700.ttf"));

/** Lay out a run into glyph paths, returning the paths and the ink bbox. */
function run(font, text, x) {
	const layout = font.layout(text);
	const scale = EM / font.unitsPerEm;
	const paths = [];
	let cursor = x;
	let minX = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;
	layout.glyphs.forEach((glyph, i) => {
		const advance = (layout.positions[i]?.xAdvance ?? 0) * scale;
		const d = glyph.path.toSVG();
		if (d) {
			paths.push(
				`<path d="${d}" transform="translate(${cursor.toFixed(2)} 0)"/>`,
			);
			minX = Math.min(minX, cursor + glyph.bbox.minX * scale);
			maxX = Math.max(maxX, cursor + glyph.bbox.maxX * scale);
			minY = Math.min(minY, glyph.bbox.minY * scale);
			maxY = Math.max(maxY, glyph.bbox.maxY * scale);
		}
		cursor += advance + TRACKING;
	});
	return { paths, cursor, minX, maxX, minY, maxY };
}

/**
 * Two weights, one lockup: "Betta" at 700 and "Resume" at 400. The contrast is
 * the personality — a neutral sans cannot carry character by shape, so it
 * carries it by weight and tracking, which is the same device the UI uses.
 */
function wordmark() {
	const first = run(bold, "Betta", 0);
	const second = run(regular, "Resume", first.cursor);
	const minX = Math.min(first.minX, second.minX);
	const maxX = Math.max(first.maxX, second.maxX);
	const minY = Math.min(first.minY, second.minY);
	const maxY = Math.max(first.maxY, second.maxY);
	const width = maxX - minX;
	const height = maxY - minY;
	return {
		body: `<g transform="translate(${(-minX).toFixed(2)} ${maxY.toFixed(2)}) scale(${(EM / regular.unitsPerEm).toFixed(6)} ${(-EM / regular.unitsPerEm).toFixed(6)})">${first.paths.join("")}${second.paths.join("")}</g>`,
		width,
		height,
		capHeight: first.maxY - first.minY,
	};
}

/** The wordmark group is generated in font units; wrap it in the right box. */
function wordmarkSvg({ body, width, height }, fill) {
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" role="img" aria-label="Betta Resume" fill="${fill}"><title>Betta Resume</title>${body}</svg>`;
}

// ---------------------------------------------------------------------------
// Mark and lockup
// ---------------------------------------------------------------------------

function markSvg({ accent }) {
	const back = accent
		? 'stroke="var(--primary, #0063ed)"'
		: 'stroke="currentColor"';
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Betta Resume">
	<title>Betta Resume mark</title>
	<path d="${BACK_PATH}" fill="none" ${back} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	<path d="${FRONT_PATH}" fill="currentColor" fill-rule="evenodd"/>
</svg>`;
}

function lockupSvg(word, { accent }) {
	const markSize = word.capHeight * 1.05;
	const gap = markSize * 0.25;
	const width = markSize + gap + word.width;
	const height = Math.max(markSize, word.height);
	const top = (height - markSize) / 2;
	const wordTop = (height - word.height) / 2;
	const scale = markSize / 32;
	const back = accent
		? 'stroke="var(--primary, #0063ed)"'
		: 'stroke="currentColor"';
	/*
	 * Geometry, not a mask: the open back path already carries the 1.2-unit
	 * gutter, so the lockup needs no ids and works in static SVG.
	 */
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width.toFixed(2)} ${height.toFixed(2)}" role="img" aria-label="Betta Resume">
	<title>Betta Resume</title>
	<g transform="translate(0 ${top.toFixed(2)}) scale(${scale.toFixed(6)})">
		<path d="${BACK_PATH}" fill="none" ${back} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
		<path d="${FRONT_PATH}" fill="currentColor" fill-rule="evenodd"/>
	</g>
	<g transform="translate(${(markSize + gap).toFixed(2)} ${wordTop.toFixed(2)})">${word.body}</g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Favicon (raster)
// ---------------------------------------------------------------------------

const ACCENT = [0x00, 0x63, 0xed]; // accent-600

function inRoundRect(px, py, x, y, w, h, r) {
	const qx = Math.abs(px - (x + w / 2)) - (w / 2 - r);
	const qy = Math.abs(py - (y + h / 2)) - (h / 2 - r);
	return Math.max(qx, 0) ** 2 + Math.max(qy, 0) ** 2 <= r * r;
}

/** Coverage of the mark at one supersample point, in 32-unit coordinates. */
function markAt(px, py) {
	// Front sheet, minus the three text lines.
	const front =
		inRoundRect(px, py, 4, 4, 16, 16, 3.5) &&
		!(
			(px >= 8 && px <= 16 && py >= 9 && py <= 10.75) ||
			(px >= 8 && px <= 16 && py >= 12.5 && py <= 14.25) ||
			(px >= 8 && px <= 13.5 && py >= 16 && py <= 17.75)
		);
	if (front) return true;
	// Back sheet: the 2-unit outline, only where it clears the front sheet's
	// 1.2-unit gutter. That is the open path's geometry, as a predicate.
	const outer = inRoundRect(px, py, 12, 12, 16, 16, 3.5);
	const inner = inRoundRect(px, py, 13, 13, 14, 14, 2.5);
	if (!outer || inner) return false;
	const gutter = inRoundRect(px, py, 2.8, 2.8, 18.4, 18.4, 4.7);
	return !gutter;
}

function renderIcon(size) {
	const rgba = Buffer.alloc(size * size * 4);
	const samples = 4;
	for (let y = 0; y < size; y++) {
		for (let x = 0; x < size; x++) {
			let markHits = 0;
			let tileHits = 0;
			for (let sy = 0; sy < samples; sy++) {
				for (let sx = 0; sx < samples; sx++) {
					const px = ((x + (sx + 0.5) / samples) / size) * 32;
					const py = ((y + (sy + 0.5) / samples) / size) * 32;
					if (inRoundRect(px, py, 0, 0, 32, 32, 7)) tileHits++;
					if (markAt(px, py)) markHits++;
				}
			}
			const total = samples * samples;
			const i = (y * size + x) * 4;
			const tileA = tileHits / total;
			const markA = markHits / total;
			// White mark over the accent tile; premultiplied source-over.
			const outA = tileA > 0 ? 1 : markA;
			const markOver = markA;
			const bg = ACCENT.map((c) => c * tileA);
			const fg = [255, 255, 255].map((c) => c * markOver);
			const rgb = bg.map((c, k) => c * (1 - markOver) + (fg[k] ?? 0));
			rgba[i] = Math.round(rgb[0] ?? 0);
			rgba[i + 1] = Math.round(rgb[1] ?? 0);
			rgba[i + 2] = Math.round(rgb[2] ?? 0);
			rgba[i + 3] = Math.round(outA * 255);
		}
	}
	return rgba;
}

const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();

function crc32(buf) {
	let c = -1;
	for (const byte of buf) c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
	return (c ^ -1) >>> 0;
}

function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

function png(size, rgba) {
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 6; // RGBA
	const raw = Buffer.alloc((size * 4 + 1) * size);
	for (let y = 0; y < size; y++) {
		raw[y * (size * 4 + 1)] = 0; // filter: none
		rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
	}
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk("IHDR", ihdr),
		chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
		chunk("IEND", Buffer.alloc(0)),
	]);
}

function ico(sizes) {
	const images = sizes.map((size) => ({
		size,
		data: png(size, renderIcon(size)),
	}));
	const header = Buffer.alloc(6);
	header.writeUInt16LE(0, 0);
	header.writeUInt16LE(1, 2); // icon
	header.writeUInt16LE(images.length, 4);
	const entries = [];
	let offset = 6 + 16 * images.length;
	for (const image of images) {
		const entry = Buffer.alloc(16);
		entry[0] = image.size >= 256 ? 0 : image.size;
		entry[1] = image.size >= 256 ? 0 : image.size;
		entry[2] = 0;
		entry[3] = 0;
		entry.writeUInt16LE(1, 4); // planes
		entry.writeUInt16LE(32, 6); // bpp
		entry.writeUInt32LE(image.data.length, 8);
		entry.writeUInt32LE(offset, 12);
		offset += image.data.length;
		entries.push(entry);
	}
	return Buffer.concat([
		header,
		...entries,
		...images.map((image) => image.data),
	]);
}

// ---------------------------------------------------------------------------

mkdirSync(resolve(OUT, "brand"), { recursive: true });
const word = wordmark();

writeFileSync(
	resolve(OUT, "brand/mark.svg"),
	`${markSvg({ accent: false })}\n`,
);
writeFileSync(
	resolve(OUT, "brand/mark-accent.svg"),
	`${markSvg({ accent: true })}\n`,
);
writeFileSync(
	resolve(OUT, "brand/wordmark.svg"),
	`${wordmarkSvg(word, "currentColor")}\n`,
);
writeFileSync(
	resolve(OUT, "brand/lockup.svg"),
	`${lockupSvg(word, { accent: true })}\n`,
);
writeFileSync(
	resolve(OUT, "brand/lockup-mono.svg"),
	`${lockupSvg(word, { accent: false })}\n`,
);
writeFileSync(
	resolve(OUT, "brand/lockup-accent.svg"),
	`${lockupSvg(word, { accent: true })}\n`,
);

/** The app icon: the mark inverted on the accent tile. */
writeFileSync(
	resolve(OUT, "icon.svg"),
	`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" role="img" aria-label="Betta Resume">
	<title>Betta Resume</title>
	<rect width="32" height="32" rx="7" fill="var(--primary, #0063ed)"/>
	<path d="${BACK_PATH}" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
	<path d="${FRONT_PATH}" fill="#fff" fill-rule="evenodd"/>
</svg>
`,
);
writeFileSync(resolve(OUT, "favicon.ico"), ico([16, 32, 48]));

// `public/logo.svg` is the historical asset referenced by metadata and by any
// external link. Point it at the lockup so it stops being a placeholder.
writeFileSync(
	resolve(OUT, "logo.svg"),
	`${lockupSvg(word, { accent: true })}\n`,
);

console.log(
	`brand assets written: mark, wordmark (${word.width.toFixed(1)}×${word.height.toFixed(1)}), lockups, icon, favicon`,
);
