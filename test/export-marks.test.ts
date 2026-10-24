import { describe, expect, it } from "vitest";
import type { Resume } from "../src/features/resume-editor/types";
import { buildDocumentXml, resumeToDocx } from "../src/lib/export/docx";
import { buildPlainText } from "../src/lib/export/text";

/**
 * The same marks in DOCX and plain text.
 *
 * DOCX carries them as WordprocessingML — `<w:b/>`, `<w:i/>`, `<w:u/>`,
 * `<w:strike/>` and `<w:hyperlink>` (the target lives in
 * `word/_rels/document.xml.rels`, which is emitted only when a link exists, so a
 * link-free document keeps the exact part list Word requires). The plain-text
 * export shows the words: a text layer has no styling to carry, so bold and
 * friends render as nothing while a link's target — content, not decoration — is
 * spelled out as `label [url]`, the representation `richTextToPlain` has always
 * produced. That keeps the .txt, the PDF text layer and the preview in agreement
 * about what the document says.
 */

const MARKED_SUMMARY_DOC = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Plain " },
				{ type: "text", text: "boldword", marks: [{ type: "bold" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "italicword", marks: [{ type: "italic" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "underword", marks: [{ type: "underline" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "struckword", marks: [{ type: "strike" }] },
				{ type: "text", text: " " },
				{
					type: "text",
					text: "linkedword",
					marks: [{ type: "link", attrs: { href: "https://example.dev/x" } }],
				},
			],
		},
	],
};

const resumeWith = (sections: Array<Record<string, unknown>>): Resume =>
	({
		id: "r1",
		userId: "u1",
		name: "Marks",
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "standard",
		tags: [],
		isArchived: false,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		metadata: {
			personalInfo: { fullName: "Avery Chen", email: "avery@chen.dev" },
			settings: { dateFormat: "MMM YYYY" },
		},
		sections: sections.map((content, order) => ({
			id: `s${order}`,
			order,
			visible: true,
			...content,
		})),
	}) as unknown as Resume;

const markedSummaryResume = () =>
	resumeWith([
		{
			type: "summary",
			content: { title: "Summary", json: MARKED_SUMMARY_DOC },
		},
	]);

describe("DOCX carries the marks", () => {
	it("emits the run properties Word understands", () => {
		const xml = buildDocumentXml(markedSummaryResume());
		expect(xml).toContain("<w:b/>");
		expect(xml).toContain("<w:i/>");
		expect(xml).toContain("<w:u/>");
		expect(xml).toContain("<w:strike/>");
		// Every word is kept — marks are styling on top of the text layer.
		expect(xml).toContain("boldword");
		expect(xml).toContain("italicword");
		expect(xml).toContain("underword");
		expect(xml).toContain("struckword");
	});

	it("emits a real hyperlink plus the target as text", () => {
		const xml = buildDocumentXml(markedSummaryResume());
		expect(xml).toMatch(/<w:hyperlink r:id="rIdH1">/);
		expect(xml).toContain("linkedword");
		expect(xml).toContain(" [https://example.dev/x]");
	});

	it("ships the hyperlink relationship, and only when needed", () => {
		// The rels part is what makes `r:id` resolve in Word. A document without
		// links must keep the exact part list the DOCX contract pins.
		const linked = new TextDecoder().decode(
			resumeToDocx(markedSummaryResume()),
		);
		expect(linked).toContain("word/_rels/document.xml.rels");
		expect(linked).toContain(
			'Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"',
		);
		expect(linked).toContain('Target="https://example.dev/x"');
		expect(linked).toContain('TargetMode="External"');

		const unlinked = new TextDecoder().decode(
			resumeToDocx(
				resumeWith([{ type: "summary", content: { html: "<p>Hi</p>" } }]),
			),
		);
		expect(unlinked).not.toContain("word/_rels/document.xml.rels");
	});

	it("stays deterministic", () => {
		expect(Array.from(resumeToDocx(markedSummaryResume()))).toEqual(
			Array.from(resumeToDocx(markedSummaryResume())),
		);
	});

	it("keeps legacy HTML summaries plain and contiguous", () => {
		// Content without a stored document has no marks to recover; it exports
		// exactly as it always has.
		const xml = buildDocumentXml(
			resumeWith([
				{
					type: "summary",
					content: { title: "Summary", html: "<p>Built <em>things</em></p>" },
				},
			]),
		);
		expect(xml).toContain("Built things");
		expect(xml).not.toContain("<w:i/>");
	});
});

describe("plain text shows words, not decorations", () => {
	it("keeps every word and the link target, drops the styling", () => {
		const text = buildPlainText(markedSummaryResume());
		expect(text).toContain(
			"Plain boldword italicword underword struckword linkedword [https://example.dev/x]",
		);
		// No invented decorations: the text layer of every export format carries
		// words, so `**bold**`-style markup would describe a document nobody exports.
		expect(text).not.toContain("#strong");
		expect(text).not.toContain("**");
		expect(text).not.toContain("__");
	});

	it("keeps legacy HTML summaries byte-identical", () => {
		const text = buildPlainText(
			resumeWith([
				{
					type: "summary",
					content: {
						title: "Summary",
						html: "<p>Built <strong>payments</strong> &amp; billing.</p>",
					},
				},
			]),
		);
		expect(text).toContain("Built payments & billing.");
	});
});
