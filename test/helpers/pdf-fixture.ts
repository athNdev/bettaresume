/**
 * Hand-built PDF fixtures.
 *
 * Written by hand rather than committed as binaries because a binary fixture cannot be
 * read in a diff, cannot be edited to add a case, and cannot be reviewed. These builders
 * emit real, spec-shaped PDFs -- correct object table, correct `xref` byte offsets,
 * correct trailer -- because pdf.js will refuse a malformed one and a test that passes
 * only because the parser gave up is worse than no test.
 *
 * The point of building them is control over *where* the text lands. A committed sample
 * resume cannot be guaranteed to be two-column or to be a scan, and a test that depends
 * on a property nobody can see in the diff is a test that quietly stops testing.
 */

export interface TextPlacement {
	/** Text to draw. */
	text: string;
	/** Left edge in PDF user-space units. */
	x: number;
	/** Baseline. Larger is higher; the origin is bottom-left. */
	y: number;
}

/**
 * Encode a PDF literal string.
 *
 * Every character becomes an octal byte, because the fixture font is `/WinAnsiEncoding`
 * and a literal string in a PDF is a byte string. That is what makes the ligature case
 * testable: U+FB01 is byte `0xFB` in WinAnsi, so `\373` reaches the text layer as the
 * single character a font without a `ToUnicode` entry would emit. Writing the ligature
 * as UTF-8 instead would arrive as three mangled characters and test nothing.
 */
const WIN_ANSI_ABOVE_LATIN1: Record<string, number> = {
	"\uFB00": 0x80,
	"\uFB01": 0xfb,
	"\uFB02": 0xfc,
	"\uFB03": 0xfb,
	"\uFB04": 0xfb,
};

function escapePdfString(value: string): string {
	let out = "";
	for (const ch of value) {
		const code = ch.codePointAt(0) ?? 0;
		const byte = code <= 0xff ? code : (WIN_ANSI_ABOVE_LATIN1[ch] ?? -1);
		if (byte < 0) {
			throw new Error(
				`fixture text must be WinAnsi encodable, got U+${code.toString(16).padStart(4, "0")} (${ch})`,
			);
		}
		out += `\\${byte.toString(8).padStart(3, "0")}`;
	}
	return out;
}

/** One `BT ... ET` block per placement, so each run carries its own matrix. */
function contentStream(placements: TextPlacement[]): string {
	// No `Tw` here. An earlier version set word spacing from the run width, which sounds
	// like a way to control the box and is not: `Tw` adds space at every space character,
	// so "JANE DOE" came out of the text layer as "JANEDOE". pdf.js derives each run's
	// width from the font metrics, which is both correct and one fewer thing to get
	// wrong.
	const body = placements
		.map(
			({ text, x, y }) =>
				`BT /F1 11 Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfString(text)}) Tj ET`,
		)
		.join("\n");
	return `${body}\n`;
}

/**
 * Build a single-page PDF.
 *
 * `placements` empty produces a page whose content stream draws nothing, which is what a
 * scanned page looks like to a text extractor: the image is there, the text is not.
 */
/** WinAnsi byte -> the character it is remapped to by a `ToUnicode` CMap. */
export type ToUnicodeMap = Record<number, string>;

function toUnicodeCMap(map: ToUnicodeMap): string {
	const entries = Object.entries(map)
		.sort(([a], [b]) => Number(a) - Number(b))
		.map(
			([byte, chars]) =>
				`<${Number(byte).toString(16).padStart(2, "0")}> <${Array.from(chars)
					.map((c) => (c.codePointAt(0) ?? 0).toString(16).padStart(4, "0"))
					.join("")}>`,
		);
	return `/CIDInit /ProcSet findresource begin
12 dict begin
begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /BettaResumeFixture def
/CMapType 2 def
1 begincodespacerange
<00> <FF>
endcodespacerange
${entries.length} beginbfchar
${entries.join("\n")}
endbfchar
endcmap
CMapName currentdict /CMap defineresource pop
end
end`;
}

/**
 * Build a single-page PDF.
 *
 * `toUnicode` attaches a `ToUnicode` CMap to the font, which is how a real PDF maps a
 * byte to a character outside WinAnsi. Without it, byte `0xFB` arrives as Latin-1 `û`
 * and the ligature case cannot be tested end to end -- the fixture would appear to prove
 * the extractor mishandles ligatures when it never saw one.
 */
export function buildTextLayerPdf(
	placements: TextPlacement[],
	toUnicode?: ToUnicodeMap,
): Uint8Array {
	const stream = contentStream(placements);
	const cmap = toUnicode ? toUnicodeCMap(toUnicode) : null;

	// Object numbering is fixed so the offsets below stay readable. Object 6 only exists
	// when there is a CMap, and the font's `/ToUnicode` reference is added with it.
	const font = cmap
		? "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding /ToUnicode 6 0 R >>"
		: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
		`<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
		font,
	];
	if (cmap) {
		objects.push(`<< /Length ${cmap.length} >>\nstream\n${cmap}\nendstream`);
	}

	let body = "%PDF-1.7\n";
	/** Byte offset of each object, 1-indexed to match the `xref` table. */
	const offsets: number[] = [];

	for (const [index, object] of objects.entries()) {
		offsets.push(body.length);
		body += `${index + 1} 0 obj\n${object}\nendobj\n`;
	}

	const xrefStart = body.length;
	let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const offset of offsets) {
		xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
	}
	xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

	return new TextEncoder().encode(body + xref);
}

/** A page with no text operators at all: the shape of a scan. */
export function buildImageOnlyPdf(): Uint8Array {
	const stream = "q 1 0 0 RG 100 100 300 400 re S Q\n";
	const objects = [
		"<< /Type /Catalog /Pages 2 0 R >>",
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
		"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
		`<< /Length ${stream.length} >>\nstream\n${stream}endstream`,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	];

	let body = "%PDF-1.7\n";
	const offsets: number[] = [];
	for (const [index, object] of objects.entries()) {
		offsets.push(body.length);
		body += `${index + 1} 0 obj\n${object}\nendobj\n`;
	}
	const xrefStart = body.length;
	let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
	for (const offset of offsets) {
		xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
	}
	xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

	return new TextEncoder().encode(body + xref);
}
