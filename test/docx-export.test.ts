import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
 */

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

const exp = (highlights: string[]) => ({
	id: "s1",
	type: "experience",
	order: 0,
	visible: true,
	content: {
		title: "Work Experience",
		data: [
			{
				company: "Analytical Engines Ltd",
				position: "Principal Engineer",
				startDate: "March 2020",
				endDate: "March 2024",
				current: false,
				highlights,
			},
		],
	},
});

/** Write bytes to a temp file and check them with Python's zipfile. */
interface PythonZipResult {
	error?: string;
	names: string[];
	/** `testzip()` returns the first corrupt entry, or null when all are intact. */
	bad: string | null;
	doc?: string;
}

function validateWithPython(bytes: Uint8Array): PythonZipResult {
	const dir = mkdtempSync(join(tmpdir(), "docx-"));
	const file = join(dir, "out.docx");
	writeFileSync(file, bytes);
	const script = [
		"import zipfile, json",
		`p = ${JSON.stringify(file)}`,
		"try:",
		"    z = zipfile.ZipFile(p)",
		"    bad = z.testzip()",
		"    names = z.namelist()",
		"    doc = z.read('word/document.xml').decode('utf-8') if 'word/document.xml' in names else None",
		"    print(json.dumps({'names': names, 'bad': bad, 'doc': doc}))",
		"except Exception as e:",
		"    print(json.dumps({'error': type(e).__name__ + ': ' + str(e), 'names': [], 'bad': None}))",
	].join("\n");
	// `execFileSync` throws on a non-zero exit, which would surface as an opaque
	// "Command failed" instead of Python's actual complaint. The script handles its
	// own errors and always exits 0 so the message survives.
	const out = execFileSync("python3", ["-c", script], { encoding: "utf8" });
	return JSON.parse(out) as PythonZipResult;
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
	const bytes = resumeToDocx(resume([exp(["Cut costs by 30%"])]));
	const result = validateWithPython(bytes);

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

describe("buildZip", () => {
	it("round-trips content through an independent reader", () => {
		const enc = new TextEncoder();
		const bytes = buildZip([
			{ name: "a.txt", data: enc.encode("hello") },
			{ name: "nested/b.txt", data: enc.encode("world") },
		]);
		const r = validateWithPython(bytes);
		expect(r.error ?? "none").toBe("none");
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

	it("strips HTML to plain text", () => {
		expect(
			htmlToPlainText("<p>Scaled <strong>40%</strong> of traffic</p>"),
		).toBe("Scaled 40% of traffic");
		expect(htmlToPlainText("a<br>b")).toBe("a b");
		expect(htmlToPlainText("&amp;&nbsp;&lt;")).toBe("& <");
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
				{
					id: "s1",
					type: "experience",
					order: 0,
					visible: true,
					content: {
						title: "Work Experience",
						data: [
							{
								company: "Acme",
								position: "Engineer",
								startDate: "March 2024",
								current: true,
								highlights: ["Shipped things"],
							},
						],
					},
				},
			]),
		);
		expect(xml).toContain("Present");
	});

	it("preserves document order across sections", () => {
		const xml = buildDocumentXml(
			resume([
				exp(["A"]),
				{
					id: "s2",
					type: "education",
					order: 1,
					visible: true,
					content: {
						title: "Education",
						data: [{ institution: "Cambridge", degree: "BA", field: "Maths" }],
					},
				},
			]),
		);
		expect(xml.indexOf("WORK EXPERIENCE")).toBeLessThan(
			xml.indexOf("EDUCATION"),
		);
	});

	it("omits hidden sections", () => {
		const xml = buildDocumentXml(resume([{ ...exp(["A"]), visible: false }]));
		expect(xml).not.toContain("WORK EXPERIENCE");
	});

	it("renders the summary from HTML as plain text", () => {
		const xml = buildDocumentXml(
			resume([
				{
					id: "s0",
					type: "summary",
					order: 0,
					visible: true,
					content: {
						title: "Summary",
						data: {},
						html: "<p>Built <em>things</em></p>",
					},
				},
			]),
		);
		expect(xml).toContain("Built things");
		expect(xml).not.toContain("<em>");
	});

	it("is single column, which is the ATS-correct choice", () => {
		// Multi-column is the largest single cause of parse failure, so this exporter
		// must never emit column definitions regardless of the resume's layout setting.
		const xml = buildDocumentXml(resume([exp(["A"])]));
		expect(xml).not.toMatch(/<w:cols[^>]*w:num="[2-9]/);
	});

	it("escapes a section title supplied by the user", () => {
		const xml = buildDocumentXml(
			resume([
				{
					id: "s1",
					type: "custom",
					order: 0,
					visible: true,
					content: { title: "A & B <C>", data: [] },
				},
			]),
		);
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
