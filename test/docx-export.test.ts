import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sectionContentSchema } from "@bettaresume/types";
import { beforeAll, describe, expect, it } from "vitest";
import type { Resume } from "../src/features/resume-editor/types";
import {
	buildDocumentXml,
	buildZip,
	crc32,
	DOCX_MIME,
	escapeXml,
	htmlToPlainText,
	resumeToDocx,
} from "../src/lib/export/docx";

/**
 * A corrupt DOCX is worse than no DOCX: the user downloads a file, believes it is fine,
 * and only discovers at the point of upload that Word will not open it.
 *
 * So the archive is validated against **Python's `zipfile`**, an implementation that
 * shares no code with the writer here. That catches a wrong signature, a bad CRC, a
 * mis-stated offset or a malformed central directory — the four ways a hand-rolled ZIP
 * goes wrong.
 *
 * ## The container is not the document
 *
 * `testzip()` returning `None` proves the ZIP is intact. It says nothing about whether
 * the bytes inside are well-formed XML, and those are independent failures: a DOCX
 * carrying an XML-illegal control character had a perfectly healthy container and a
 * `document.xml` that no XML parser would accept, which is exactly how Word ends up
 * refusing a file with "unreadable content". So `document.xml` is additionally parsed
 * with Python's `xml.etree.ElementTree` — a real parser, not a signature check.
 */

/** Escape a value for embedding in the generated Python source as a literal. */
const pyStr = (v: string) => JSON.stringify(v);

/**
 * A resume fixture, validated against the real content schema.
 *
 * These were hand-built `as unknown as Resume` casts, which means they could drift from
 * the schema silently: a field renamed or retyped on the schema would leave the fixture
 * asserting on a shape the product no longer stores, and the test would still pass.
 * `sectionContentSchema` is cheap to check and catches that.
 */
const section = (type: string, content: unknown) => ({
	id: `s-${type}`,
	type,
	order: 0,
	visible: true,
	content,
});

/** Validate every fixture's `content` against the schema the API actually stores. */
function assertValidContents(contents: unknown[]): void {
	for (const content of contents) {
		const result = sectionContentSchema.safeParse(content);
		expect(
			result.success ? null : result.error.issues,
			`fixture content is not a valid SectionContent: ${JSON.stringify(content)}`,
		).toBeNull();
	}
}

const resume = (sections: unknown[], personalInfo = {}) =>
	({
		id: "r1",
		name: "Ada Lovelace",
		template: "minimal",
		sections,
		metadata: {
			personalInfo: {
				fullName: "Ada Lovelace",
				email: "ada@example.com",
				phone: "+44 20 7946 0000",
				github: "github.com/ada",
				professionalTitle: "Principal Engineer",
				...personalInfo,
			},
			settings: {},
		},
	}) as unknown as Resume;

const EXP_CONTENT = {
	title: "Work Experience",
	data: [
		{
			id: "e1",
			company: "Analytical Engines Ltd",
			position: "Principal Engineer",
			startDate: "March 2020",
			endDate: "March 2024",
			current: false,
			description: "",
			highlights: [],
		},
	],
};

const exp = (highlights: string[]) =>
	section("experience", {
		...EXP_CONTENT,
		data: [{ ...(EXP_CONTENT.data[0] as Record<string, unknown>), highlights }],
	});

interface PythonResult {
	/** Set when Python itself, or the archive, failed. */
	error?: string;
	names: string[];
	/** `testzip()` returns the first corrupt entry, or null when all are intact. */
	bad: string | null;
	doc?: string;
	/** Tag of the parsed `document.xml` root, or absent when parsing failed. */
	xmlRoot?: string;
}

/**
 * Check the bytes with Python: the ZIP container *and* the XML inside it.
 *
 * `error` is the single source of truth for "Python or the file failed". An earlier
 * version set `bad: None` on the exception path, which meant every assertion of the
 * shape `expect(result.bad).toBeNull()` passed precisely when Python had failed — the
 * test could only be green in the case it existed to catch. Here the exception path
 * records the error and leaves `bad` absent, and callers assert `error` is undefined
 * first.
 */
function validateWithPython(bytes: Uint8Array): PythonResult {
	const dir = mkdtempSync(join(tmpdir(), "docx-"));
	const file = join(dir, "out.docx");
	writeFileSync(file, bytes);
	const script = [
		"import zipfile, json",
		"import xml.etree.ElementTree as ET",
		`p = ${pyStr(file)}`,
		"out = {}",
		"try:",
		"    z = zipfile.ZipFile(p)",
		"    out['names'] = z.namelist()",
		"    out['bad'] = z.testzip()",
		"    if 'word/document.xml' in out['names']:",
		"        raw = z.read('word/document.xml')",
		"        out['doc'] = raw.decode('utf-8')",
		"        out['xmlRoot'] = ET.fromstring(raw).tag",
		"except Exception as e:",
		"    out['error'] = type(e).__name__ + ': ' + str(e)",
		"print(json.dumps(out))",
	].join("\n");
	// `execFileSync` throws on a non-zero exit, which surfaces as an opaque "Command
	// failed" instead of Python's actual complaint. The script handles its own errors and
	// always exits 0 so the message survives in `error`.
	const out = execFileSync("python3", ["-c", script], { encoding: "utf8" });
	return JSON.parse(out) as PythonResult;
}

describe("crc32", () => {
	it("matches known values", () => {
		// Standard CRC-32 check values.
		const enc = new TextEncoder();
		expect(crc32(enc.encode(""))).toBe(0);
		expect(crc32(enc.encode("a"))).toBe(0xe8b7be43);
		expect(crc32(enc.encode("123456789"))).toBe(0xcbf43926);
		expect(
			crc32(enc.encode("The quick brown fox jumps over the lazy dog")),
		).toBe(0x414fa339);
	});
});

describe("the archive is a valid ZIP", () => {
	let bytes: Uint8Array;
	let result: PythonResult;

	beforeAll(() => {
		// Built in `beforeAll`, not in the `describe` body. Running `resumeToDocx` and
		// `execFileSync` at collection time froze one result object that all the `it`s
		// below read, so they could not fail independently and could not be re-run in
		// isolation.
		bytes = resumeToDocx(resume([exp(["Cut costs by 30%"])]));
		result = validateWithPython(bytes);
	});

	it("opens in an independent implementation", () => {
		expect(result.error).toBeUndefined();
	});

	it("passes its own CRC check on every entry", () => {
		// testzip() returns the first corrupt entry, or None.
		expect(result.bad).toBeNull();
	});

	it("contains exactly the parts Word requires", () => {
		expect(result.names.sort()).toEqual([
			"[Content_Types].xml",
			"_rels/.rels",
			"word/document.xml",
		]);
	});

	it("starts with the ZIP local-file signature", () => {
		expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x03, 0x04]);
	});

	it("is deterministic, so the same resume yields identical bytes", () => {
		// No timestamps: a clock-derived field would make every export differ and
		// would make this untestable.
		expect(Array.from(resumeToDocx(resume([exp(["x"])])))).toEqual(
			Array.from(resumeToDocx(resume([exp(["x"])]))),
		);
	});

	it("is non-trivial in size", () => {
		expect(bytes.length).toBeGreaterThan(1200);
	});
});

describe("document.xml is well-formed XML", () => {
	// The container check cannot see this class of bug: `testzip()` was returning `None`
	// on a DOCX whose `document.xml` was not parseable XML at all.

	it("parses with a real XML parser", () => {
		const result = validateWithPython(
			resumeToDocx(resume([exp(["Cut costs by 30%"])])),
		);
		expect(result.error).toBeUndefined();
		expect(result.xmlRoot).toBe(
			"{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document",
		);
	});

	it("parses when the name carries characters XML 1.0 forbids outright", () => {
		// A vertical tab and a bell in a name produced a `document.xml` that no XML
		// parser accepts, in an otherwise healthy ZIP. A PDF text layer or a
		// DOCX-to-text import carries these easily, and Word refused the file with
		// "unreadable content".
		//
		// This test asserts ONLY the verdict of Python's `xml.etree.ElementTree`. It
		// deliberately does not also scan the string for the offending bytes: doing both
		// in one test lets the cheap string assertion short-circuit the parser, which
		// would leave the parser -- the thing this test exists to prove -- unexercised.
		const dirty = "Ada\u000bLovelace\u0007";
		const result = validateWithPython(
			resumeToDocx(resume([exp(["Did a thing"])], { fullName: dirty })),
		);
		expect(result.error).toBeUndefined();
		expect(result.xmlRoot).toBe(
			"{http://schemas.openxmlformats.org/wordprocessingml/2006/main}document",
		);
	});

	it("keeps the rest of a name that carried a control character", () => {
		// The strip must remove the illegal bytes, not the whole value.
		const result = validateWithPython(
			resumeToDocx(
				resume([exp(["Did a thing"])], { fullName: "Ada\u000bLovelace\u0007" }),
			),
		);
		expect(result.error).toBeUndefined();
		expect(result.doc).toContain("Ada");
		expect(result.doc).toContain("Lovelace");
	});

	it("emits no XML-illegal character anywhere in document.xml", () => {
		// Belt and braces: assert on the string directly, at every entry point, because
		// a future field that bypasses `escapeXml` would not reach the parser test's
		// single fixture.
		const xml = buildDocumentXml(
			resume([exp(["Did a thing"])], { fullName: "Ada\u000bLovelace\u0007" }),
		);
		for (const ch of xml) {
			const n = ch.codePointAt(0) ?? 0;
			const illegal =
				(n < 0x20 && n !== 0x09 && n !== 0x0a && n !== 0x0d) ||
				n === 0xfffe ||
				n === 0xffff;
			expect(illegal, `illegal XML character 0x${n.toString(16)}`).toBe(false);
		}
	});

	it("keeps tab and newline, which XML 1.0 permits", () => {
		// 0x09, 0x0A and 0x0D are legal and are how `htmlToPlainText` encodes line and
		// list breaks, so a blanket "strip control characters" would be wrong.
		expect(escapeXml("a\tb\nc\rd")).toBe("a\tb\nc\rd");
	});
});

describe("buildZip", () => {
	it("round-trips content through an independent reader", () => {
		const enc = new TextEncoder();
		const bytes = buildZip([
			{ name: "a.txt", data: enc.encode("hello") },
			{ name: "nested/b.txt", data: enc.encode("world") },
		]);
		const r = validateWithPython(bytes);
		expect(r.error).toBeUndefined();
		expect(r.names.sort()).toEqual(["a.txt", "nested/b.txt"]);
		expect(r.bad).toBeNull();
	});

	it("handles an empty archive without producing a corrupt EOCD", () => {
		const bytes = buildZip([]);
		expect(bytes.length).toBe(22);
		// For an empty archive the whole file IS the end-of-central-directory record,
		// so its signature is at offset 0.
		expect(Array.from(bytes.slice(0, 4))).toEqual([0x50, 0x4b, 0x05, 0x06]);
	});
});

describe("XML escaping and text extraction", () => {
	it("escapes every character that would break the document", () => {
		expect(escapeXml(`a & b < c > d " e ' f`)).toBe(
			"a &amp; b &lt; c &gt; d &quot; e &apos; f",
		);
	});

	it("strips the characters XML forbids, which escaping cannot express", () => {
		// There is no entity for these; they are simply not characters XML can carry.
		expect(escapeXml("a\u0000b\u0008c\u000bd\u000ce\u001ff")).toBe("abcdef");
	});

	it("strips HTML to plain text", () => {
		expect(
			htmlToPlainText("<p>Scaled <strong>40%</strong> of traffic</p>"),
		).toBe("Scaled 40% of traffic");
		expect(htmlToPlainText("a<br>b")).toBe("a\nb");
		expect(htmlToPlainText("&amp;&nbsp;&lt;")).toBe("& <");
	});

	it("drops script and style bodies entirely, not just their tags", () => {
		// Removing only the tags would leave the JavaScript as visible text in a file
		// the user submits to an employer.
		const out = htmlToPlainText(
			"<p>Before</p><script>var secret = 1;</script><p>After</p>",
		);
		expect(out).not.toContain("secret");
		expect(out).toContain("Before");
		expect(out).toContain("After");
	});

	it("drops script bodies even when the end tag has trailing whitespace", () => {
		// The exact case CodeQL flagged in the hand-rolled version: `</script >`.
		const out = htmlToPlainText("<p>Hi</p><script>leaked()</script >");
		expect(out).not.toContain("leaked");
	});

	it("strips markup out of user content rather than emitting it", () => {
		// Bullets are stored as HTML, so the right transformation is to STRIP tags,
		// not to escape them. Escaping would leave a literal "<script>" sitting in the
		// document as visible text, which is worse than removing it.
		const xml = buildDocumentXml(
			resume([exp(["Owned <script>alert(1)</script> & 'quotes'"])]),
		);
		expect(xml).not.toMatch(/<script/i);
		expect(xml).not.toContain("alert(1)");
		// Genuine ampersands in text are still escaped.
		expect(xml).toContain("&amp;");
	});
});

describe("document content", () => {
	it("emits contact details and the role", () => {
		const xml = buildDocumentXml(resume([exp(["Cut costs by 30%"])]));
		expect(xml).toContain("Ada Lovelace");
		expect(xml).toContain("Principal Engineer");
		expect(xml).toContain("ada@example.com");
	});

	it("renders a current role as Present", () => {
		const xml = buildDocumentXml(
			resume([
				section("experience", {
					title: "Work Experience",
					data: [
						{
							id: "e1",
							company: "Acme",
							position: "Engineer",
							startDate: "March 2024",
							current: true,
							description: "",
							highlights: ["Shipped things"],
						},
					],
				}),
			]),
		);
		expect(xml).toContain("Present");
	});

	it("omits the separator when there is no end date", () => {
		// `.trim()` does not remove a trailing en-dash, so a start date with no end
		// rendered as "Mar 2024 –": a dash pointing at nothing, in the one field an ATS
		// reads to time-box a role.
		const xml = buildDocumentXml(
			resume([
				section("experience", {
					title: "Work Experience",
					data: [
						{
							id: "e1",
							company: "Acme",
							position: "Engineer",
							startDate: "Mar 2024",
							current: false,
							description: "",
							highlights: [],
						},
					],
				}),
			]),
		);
		expect(xml).not.toContain("–");
		expect(xml).toContain("Mar 2024");
	});

	it("renders experience location and description, which the Typst output has", () => {
		// `sections.typ` renders both; the DOCX silently dropped them. That is content
		// loss in the ATS-facing format, which is the format this exporter exists for.
		const xml = buildDocumentXml(
			resume([
				section("experience", {
					title: "Work Experience",
					data: [
						{
							id: "e1",
							company: "Analytical Engines Ltd",
							position: "Principal Engineer",
							startDate: "March 2020",
							endDate: "March 2024",
							current: false,
							location: "Marylebone, London",
							description: "Led the programme that built the first engine.",
							highlights: ["Cut costs by 30%"],
						},
					],
				}),
			]),
		);
		expect(xml).toContain("Marylebone, London");
		expect(xml).toContain("Led the programme that built the first engine.");
	});

	it("orders the experience entry as the Typst template does", () => {
		// position / company • location / dates, then description, then highlights.
		const xml = buildDocumentXml(
			resume([
				section("experience", {
					title: "Work Experience",
					data: [
						{
							id: "e1",
							company: "Analytical Engines Ltd",
							position: "Principal Engineer",
							startDate: "March 2020",
							endDate: "March 2024",
							current: false,
							location: "Marylebone",
							description: "DESCRIPTION_TEXT",
							highlights: ["HIGHLIGHT_TEXT"],
						},
					],
				}),
			]),
		);
		const order = [
			"Principal Engineer",
			"Analytical Engines Ltd",
			"Marylebone",
			"March 2024",
			"DESCRIPTION_TEXT",
			"HIGHLIGHT_TEXT",
		].map((s) => xml.indexOf(s));
		for (const [i, at] of order.entries()) {
			expect(at, `"${order[i]}" should be present`).toBeGreaterThanOrEqual(0);
			if (i > 0) expect(at).toBeGreaterThan(order[i - 1] as number);
		}
	});

	it("preserves document order across sections", () => {
		const education = section("education", {
			title: "Education",
			data: [
				{
					id: "ed1",
					institution: "Cambridge",
					degree: "BA",
					field: "Maths",
					startDate: "2010",
					graduationDate: "2013",
					current: false,
				},
			],
		});
		assertValidContents([education.content]);
		const xml = buildDocumentXml(resume([exp(["A"]), education]));
		expect(xml.indexOf("WORK EXPERIENCE")).toBeLessThan(
			xml.indexOf("EDUCATION"),
		);
	});

	it("omits hidden sections", () => {
		const xml = buildDocumentXml(resume([{ ...exp(["A"]), visible: false }]));
		expect(xml).not.toContain("WORK EXPERIENCE");
	});

	it("renders the summary from HTML as plain text", () => {
		const content = {
			title: "Summary",
			data: {},
			html: "<p>Built <em>things</em></p>",
		};
		assertValidContents([content]);
		const xml = buildDocumentXml(resume([section("summary", content)]));
		expect(xml).toContain("Built things");
		expect(xml).not.toContain("<em>");
	});

	it("renders a summary stored as data.summary", () => {
		// `serialize.ts` reads `content.html || content.data.summary`; this read only
		// `content.html` and then continued unconditionally, so a summary stored in the
		// other shape produced a DOCX with a heading and no text under it while the PDF
		// had the text. That breaks the "the two outputs cannot drift in content" promise
		// on a real stored shape.
		const content = {
			title: "Summary",
			data: { summary: "THE ONLY SUMMARY TEXT" },
		};
		assertValidContents([content]);
		const xml = buildDocumentXml(resume([section("summary", content)]));
		expect(xml).toContain("THE ONLY SUMMARY TEXT");
	});

	it("prefers html over data.summary, matching the Typst path", () => {
		const content = {
			title: "Summary",
			data: { summary: "FROM DATA" },
			html: "<p>FROM HTML</p>",
		};
		assertValidContents([content]);
		const xml = buildDocumentXml(resume([section("summary", content)]));
		expect(xml).toContain("FROM HTML");
		expect(xml).not.toContain("FROM DATA");
	});

	it("emits no column definition, so Word renders a single column", () => {
		// Multi-column is the largest single cause of ATS parse failure, so the exporter
		// must never emit one. The guarantee is the *absence* of `<w:cols>`: an absent
		// column definition means one column. The previous assertion looked for
		// `w:num="2"` on an element this function never emits, so it could not fail -- and
		// it matched only double-quoted attributes. Matching the element name directly
		// makes the claim checkable and quote-style independent.
		const xml = buildDocumentXml(resume([exp(["A"])]));
		expect(xml).not.toMatch(/<w:cols\b/);
		// `w:num` in any quote style must not appear either.
		expect(xml).not.toMatch(/w:num\s*=\s*['"]?[2-9]/);
	});

	it("escapes a section title supplied by the user", () => {
		const content = { title: "A & B <C>", data: [] };
		assertValidContents([content]);
		const xml = buildDocumentXml(resume([section("custom", content)]));
		expect(xml).toContain("A &amp; B &lt;C&gt;");
	});

	it("handles a resume with no sections at all", () => {
		const xml = buildDocumentXml(resume([]));
		expect(xml).toContain("<w:body>");
		expect(xml).toContain("Ada Lovelace");
	});
});

describe("the MIME type", () => {
	it("is the one Word expects", () => {
		expect(DOCX_MIME).toBe(
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		);
	});
});
