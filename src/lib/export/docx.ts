import { TEMPLATE_SECTION_HEADINGS } from "@/features/resume-editor/lib/review-input";
import type { Resume } from "@/features/resume-editor/types";

/**
 * DOCX export — Feature 3 from docs/ROADMAP.md.
 *
 * ## Why DOCX and not just PDF
 *
 * DOCX is XML with a guaranteed reading order. A PDF's extraction depends on the
 * producer's internal text-drawing order, which is exactly why every browser-rendered
 * competitor cannot tell you what a parser will see. For a resume being fed to an ATS,
 * DOCX is the safer artefact and the category largely ignores it -- only Reactive Resume
 * (also OSS) exports it.
 *
 * ## No WYSIWYG library, on purpose
 *
 * The tempting approach is a `docx` npm package that mirrors an on-screen editor. That
 * would reintroduce precisely the divergence #153 just removed: a second layout engine
 * that can disagree with the Typst exporter. This serialises the same content, in the
 * same order, with the same headings, so the two outputs cannot drift in content.
 *
 * Pagination still differs -- Word and Typst lay out independently -- so the UI labels
 * DOCX "parse-optimised" and PDF "visual fidelity" rather than pretending they match.
 *
 * ## Single column, on purpose
 *
 * Multi-column layouts are the largest single cause of ATS parse failure. This exporter
 * emits one column unconditionally, matching the Typst templates.
 *
 * ## No new dependency
 *
 * A DOCX is a ZIP, and a ZIP with the STORE method (no compression) needs only a CRC-32
 * and some header structs. That is a few dozen lines, versus ~15 KB of dependency for a
 * library used by exactly one export path. Output is validated against Python's
 * `zipfile`, an independent implementation, in the tests.
 */

/* ------------------------------------------------------------------ *
 * CRC-32
 * ------------------------------------------------------------------ */

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

export function crc32(bytes: Uint8Array): number {
	let crc = 0xffffffff;
	for (let i = 0; i < bytes.length; i++) {
		// `noUncheckedIndexedAccess` types a Uint32Array lookup as possibly undefined.
		// The index is masked to 0..255 and the table has exactly 256 entries, so it
		// never can be; `?? 0` documents that rather than hiding it behind `!`.
		// `i` is bounded by `bytes.length`, so neither lookup can be out of range;
		// `noUncheckedIndexedAccess` cannot see that. Coerce rather than assert.
		const byte = bytes[i] ?? 0;
		const entry = CRC_TABLE[(crc ^ byte) & 0xff] ?? 0;
		crc = entry ^ (crc >>> 8);
	}
	return (crc ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ *
 * Minimal ZIP writer (STORE, no compression)
 * ------------------------------------------------------------------ */

interface ZipEntry {
	name: string;
	data: Uint8Array;
}

/**
 * Build a ZIP archive using the STORE method.
 *
 * `dateTime` is fixed rather than taken from the clock so the output is deterministic:
 * two exports of the same resume produce byte-identical files, which makes the export
 * testable at all and stops a timestamp from churning the user's download.
 */
export function buildZip(entries: ZipEntry[]): Uint8Array {
	const encoder = new TextEncoder();
	// Fixed DOS timestamp: 2026-01-01 00:00:00.
	const dosTime = 0;
	const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1;

	const locals: Uint8Array[] = [];
	const centrals: Uint8Array[] = [];
	let offset = 0;

	for (const entry of entries) {
		const nameBytes = encoder.encode(entry.name);
		const crc = crc32(entry.data);

		const local = new Uint8Array(30 + nameBytes.length);
		const lv = new DataView(local.buffer);
		lv.setUint32(0, 0x04034b50, true); // local file header signature
		lv.setUint16(4, 20, true); // version needed
		lv.setUint16(6, 0, true); // flags
		lv.setUint16(8, 0, true); // method: STORE
		lv.setUint16(10, dosTime, true);
		lv.setUint16(12, dosDate, true);
		lv.setUint32(14, crc, true);
		lv.setUint32(18, entry.data.length, true); // compressed size
		lv.setUint32(22, entry.data.length, true); // uncompressed size
		lv.setUint16(26, nameBytes.length, true);
		lv.setUint16(28, 0, true); // extra length
		local.set(nameBytes, 30);

		locals.push(local, entry.data);

		const central = new Uint8Array(46 + nameBytes.length);
		const cv = new DataView(central.buffer);
		cv.setUint32(0, 0x02014b50, true); // central directory signature
		cv.setUint16(4, 20, true); // version made by
		cv.setUint16(6, 20, true); // version needed
		cv.setUint16(8, 0, true); // flags
		cv.setUint16(10, 0, true); // method: STORE
		cv.setUint16(12, dosTime, true);
		cv.setUint16(14, dosDate, true);
		cv.setUint32(16, crc, true);
		cv.setUint32(20, entry.data.length, true);
		cv.setUint32(24, entry.data.length, true);
		cv.setUint16(28, nameBytes.length, true);
		cv.setUint16(30, 0, true); // extra
		cv.setUint16(32, 0, true); // comment
		cv.setUint16(34, 0, true); // disk number
		cv.setUint16(36, 0, true); // internal attrs
		cv.setUint32(38, 0, true); // external attrs
		cv.setUint32(42, offset, true); // local header offset
		central.set(nameBytes, 46);
		centrals.push(central);

		offset += local.length + entry.data.length;
	}

	const centralSize = centrals.reduce((n, c) => n + c.length, 0);
	const end = new Uint8Array(22);
	const ev = new DataView(end.buffer);
	ev.setUint32(0, 0x06054b50, true); // end of central directory
	ev.setUint16(8, entries.length, true);
	ev.setUint16(10, entries.length, true);
	ev.setUint32(12, centralSize, true);
	ev.setUint32(16, offset, true);

	const total =
		locals.reduce((n, l) => n + l.length, 0) + centralSize + end.length;
	const out = new Uint8Array(total);
	let p = 0;
	for (const chunk of [...locals, ...centrals, end]) {
		out.set(chunk, p);
		p += chunk.length;
	}
	return out;
}

/* ------------------------------------------------------------------ *
 * WordprocessingML
 * ------------------------------------------------------------------ */

/** Escape text for XML content and attribute values. */
export function escapeXml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&apos;");
}

/** Strip tags to plain text. DOCX has no HTML, and stray markup reads as garbage. */
export function htmlToPlainText(html: string): string {
	return (
		html
			// Drop <script>/<style> WITH their content. Removing only the tags would
			// leave the JavaScript or CSS source sitting in the document as visible
			// text, which is worse than useless in a file a user submits to an employer.
			.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
			.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
			.replace(/<br\s*\/?>/gi, " ")
			.replace(/<\/(p|div|li|h[1-6])>/gi, " ")
			.replace(/<[^>]*>/g, "")
			.replace(/&nbsp;/g, " ")
			.replace(/&amp;/g, "&")
			.replace(/&lt;/g, "<")
			.replace(/&gt;/g, ">")
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/\s+/g, " ")
			.trim()
	);
}

type Align = "left" | "center" | "right";

function paragraph(
	text: string,
	opts: {
		bold?: boolean;
		size?: number;
		align?: Align;
		spaceBefore?: number;
	} = {},
): string {
	const { bold = false, size = 20, align = "left", spaceBefore = 0 } = opts;
	const rPr = `<w:rPr>${bold ? "<w:b/>" : ""}<w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr>`;
	const pPr = `<w:pPr><w:spacing w:before="${spaceBefore}"/>${
		align === "left" ? "" : `<w:jc w:val="${align}"/>`
	}</w:pPr>`;
	// xml:space="preserve" so leading/trailing spaces survive the round trip.
	return `<w:p>${pPr}<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Contact line, mirroring what the Typst header renders. */
function contactLine(personalInfo: Record<string, unknown>): string {
	return [
		str(personalInfo.email),
		str(personalInfo.phone),
		str(personalInfo.linkedin),
		str(personalInfo.github),
		str(personalInfo.website),
	]
		.filter(Boolean)
		.join("  ·  ");
}

function dateRange(start: string, end: string, current: boolean): string {
	if (!start) return "";
	return `${start} – ${current ? "Present" : end || ""}`.trim();
}

/** Build `word/document.xml` from a resume. */
export function buildDocumentXml(resume: Resume): string {
	const body: string[] = [];

	const personalInfo =
		(asRecord(resume.metadata?.personalInfo) as Record<string, unknown>) ?? {};
	const fullName = str(personalInfo.fullName);
	const title = str(personalInfo.professionalTitle);

	if (fullName) body.push(paragraph(fullName, { bold: true, size: 32 }));
	if (title) body.push(paragraph(title, { size: 22 }));
	const contact = contactLine(personalInfo);
	if (contact) body.push(paragraph(contact, { size: 18 }));

	const ordered = [...(resume.sections ?? [])]
		.filter((s) => s.visible !== false && s.type !== "personal-info")
		.sort((a, b) => a.order - b.order);

	for (const section of ordered) {
		const content = asRecord(section.content);
		const heading =
			str(content?.title) ||
			TEMPLATE_SECTION_HEADINGS[section.type] ||
			"Section";
		body.push(
			paragraph(heading.toUpperCase(), {
				bold: true,
				size: 20,
				spaceBefore: 240,
			}),
		);

		const data = content?.data;

		if (section.type === "summary") {
			const html = str(content?.html);
			const text = htmlToPlainText(html);
			if (text) body.push(paragraph(text, { size: 20 }));
			continue;
		}

		if (!Array.isArray(data)) continue;

		for (const row of data) {
			const entry = asRecord(row);
			if (!entry) continue;

			if (section.type === "experience" || section.type === "volunteer") {
				const role = [str(entry.position), str(entry.company)]
					.filter(Boolean)
					.join(" — ");
				const dates = dateRange(
					str(entry.startDate),
					str(entry.endDate),
					Boolean(entry.current),
				);
				if (role) {
					body.push(
						paragraph(dates ? `${role}  ·  ${dates}` : role, {
							bold: true,
							size: 20,
							align: "left",
						}),
					);
				}
				const highlights = Array.isArray(entry.highlights)
					? (entry.highlights as unknown[]).filter(
							(h): h is string => typeof h === "string",
						)
					: [];
				for (const h of highlights) {
					body.push(paragraph(`• ${htmlToPlainText(h)}`, { size: 20 }));
				}
				continue;
			}

			if (section.type === "education") {
				const line = [
					str(entry.degree),
					str(entry.field),
					str(entry.institution),
				]
					.filter(Boolean)
					.join(" — ");
				if (line) body.push(paragraph(line, { bold: true, size: 20 }));
				continue;
			}

			if (section.type === "skills") {
				const groups = Array.isArray(entry.groups)
					? (entry.groups as unknown[])
					: [];
				for (const group of groups) {
					const g = asRecord(group);
					if (!g) continue;
					const name = str(g.name);
					const items = Array.isArray(g.skills)
						? (g.skills as unknown[])
								.map((s) =>
									typeof s === "string" ? s : str(asRecord(s)?.name),
								)
								.filter(Boolean)
						: [];
					if (name && items.length > 0) {
						body.push(paragraph(`${name}: ${items.join(", ")}`, { size: 20 }));
					}
				}
				continue;
			}

			if (
				section.type === "certifications" ||
				section.type === "awards" ||
				section.type === "projects" ||
				section.type === "publications" ||
				section.type === "languages" ||
				section.type === "references"
			) {
				const name =
					str(entry.name) ||
					str(entry.title) ||
					str(entry.organization) ||
					str(entry.institution);
				const date = str(entry.date);
				if (name) {
					body.push(paragraph(date ? `${name} — ${date}` : name, { size: 20 }));
				}
				const description =
					htmlToPlainText(str(entry.description)) ||
					(Array.isArray(entry.highlights)
						? (entry.highlights as unknown[])
								.filter((h): h is string => typeof h === "string")
								.map(htmlToPlainText)
								.join(" ")
						: "");
				if (description) body.push(paragraph(description, { size: 20 }));
			}
		}
	}

	const sectPr =
		'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/>' +
		'<w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr>';

	return (
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
		`<w:body>${body.join("")}${sectPr}</w:body></w:document>`
	);
}

const CONTENT_TYPES =
	'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
	'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
	'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
	'<Default Extension="xml" ContentType="application/xml"/>' +
	'<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
	"</Types>";

const ROOT_RELS =
	'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
	'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
	'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
	"</Relationships>";

/**
 * Serialise a resume to a `.docx` byte array.
 *
 * Deterministic: no timestamps, so the same resume always yields the same bytes.
 */
export function resumeToDocx(resume: Resume): Uint8Array {
	const encoder = new TextEncoder();
	const entries: ZipEntry[] = [
		{ name: "[Content_Types].xml", data: encoder.encode(CONTENT_TYPES) },
		{ name: "_rels/.rels", data: encoder.encode(ROOT_RELS) },
		{
			name: "word/document.xml",
			data: encoder.encode(buildDocumentXml(resume)),
		},
	];
	return buildZip(entries);
}

/** The MIME type Word expects, and what `downloadFile` needs. */
export const DOCX_MIME =
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document";
