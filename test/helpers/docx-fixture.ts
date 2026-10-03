/**
 * Hand-built `.docx` fixtures.
 *
 * A `.docx` is a zip of XML, so the fixture is a zip written here rather than a binary
 * committed to the repo. The zip is built with the STORE method (no compression) and a
 * real CRC-32, because a fixture that jszip rejects proves nothing.
 *
 * The alternative -- committing a real `.docx` from Word -- was rejected for the same
 * reason as the PDF fixtures: nobody can see what is in it in a diff, and the specific
 * cases under test (a heading paragraph, a bold run, a list paragraph, a hyphenated
 * word) would be invisible.
 */

const CRC_TABLE = (() => {
	const table = new Uint32Array(256);
	for (let i = 0; i < 256; i++) {
		let c = i;
		for (let k = 0; k < 8; k++) {
			c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		}
		table[i] = c >>> 0;
	}
	return table;
})();

function crc32(bytes: Uint8Array): number {
	let c = 0xffffffff;
	for (const byte of bytes) {
		c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

/** Minimal zip with no compression. Entries are written in the order given. */
export function buildZip(
	entries: { name: string; data: string }[],
): Uint8Array {
	const encoder = new TextEncoder();
	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBytes = encoder.encode(entry.name);
		const dataBytes = encoder.encode(entry.data);
		const crc = crc32(dataBytes);

		const local = new Uint8Array(30 + nameBytes.length + dataBytes.length);
		const localView = new DataView(local.buffer);
		localView.setUint32(0, 0x04034b50, true); // local file header signature
		localView.setUint16(4, 20, true); // version needed
		localView.setUint16(6, 0, true); // flags
		localView.setUint16(8, 0, true); // method: store
		localView.setUint16(10, 0, true); // mod time
		localView.setUint16(12, 0, true); // mod date
		localView.setUint32(14, crc, true);
		localView.setUint32(18, dataBytes.length, true); // compressed size
		localView.setUint32(22, dataBytes.length, true); // uncompressed size
		localView.setUint16(26, nameBytes.length, true);
		localView.setUint16(28, 0, true); // extra field length
		local.set(nameBytes, 30);
		local.set(dataBytes, 30 + nameBytes.length);
		locals.push(local);

		const central = new Uint8Array(46 + nameBytes.length);
		const centralView = new DataView(central.buffer);
		centralView.setUint32(0, 0x02014b50, true); // central directory signature
		centralView.setUint16(4, 20, true); // version made by
		centralView.setUint16(6, 20, true); // version needed
		centralView.setUint16(8, 0, true); // flags
		centralView.setUint16(10, 0, true); // method: store
		centralView.setUint16(12, 0, true); // mod time
		centralView.setUint16(14, 0, true); // mod date
		centralView.setUint32(16, crc, true);
		centralView.setUint32(20, dataBytes.length, true);
		centralView.setUint32(24, dataBytes.length, true);
		centralView.setUint16(28, nameBytes.length, true);
		centralView.setUint32(42, offset, true); // offset of local header
		central.set(nameBytes, 46);
		centrals.push(central);

		offset += local.length;
	}

	const centralSize = centrals.reduce((n, c) => n + c.length, 0);
	const eocd = new Uint8Array(22);
	const eocdView = new DataView(eocd.buffer);
	eocdView.setUint32(0, 0x06054b50, true); // end of central directory
	eocdView.setUint16(8, entries.length, true);
	eocdView.setUint16(10, entries.length, true);
	eocdView.setUint32(12, centralSize, true);
	eocdView.setUint32(16, offset, true);

	const all = [...locals, ...centrals, eocd];
	const total = all.reduce((n, part) => n + part.length, 0);
	const out = new Uint8Array(total);
	let cursor = 0;
	for (const part of all) {
		out.set(part, cursor);
		cursor += part.length;
	}
	return out;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

/** A body paragraph: one plain run. */
export function paragraph(text: string): string {
	return `<w:p><w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

/**
 * A body paragraph whose text is bold.
 *
 * Included because real Word resumes mark their headings with bold rather than with a
 * heading style, and the sectioner then has to fall back on shape. That fallback is a
 * guess, and this fixture is what makes it testable.
 */
export function boldParagraph(text: string): string {
	return `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">${escapeXml(
		text,
	)}</w:t></w:r></w:p>`;
}

/** A real Word list paragraph, so the bullet glyph is not something we invented. */
export function listParagraph(text: string): string {
	return `<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t xml:space="preserve">${escapeXml(
		text,
	)}</w:t></w:r></w:p>`;
}

/** Assemble a complete, minimal `.docx` from body paragraphs. */
export function buildDocx(bodyParts: string[]): Uint8Array {
	const document = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyParts.join(
		"",
	)}<w:sectPr/></w:body></w:document>`;

	return buildZip([
		{ name: "[Content_Types].xml", data: CONTENT_TYPES },
		{ name: "_rels/.rels", data: ROOT_RELS },
		{ name: "word/document.xml", data: document },
	]);
}
