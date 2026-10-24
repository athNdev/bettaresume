import { describe, expect, it } from "vitest";
import {
	escapeTypst,
	proseMirrorToRuns,
	richContentToPlain,
	richContentToRuns,
	richContentToTypst,
	richTextToPlain,
	runsToPlainText,
	runsToTypst,
} from "../src/lib/rich-text";

/**
 * The mark-preserving run walker.
 *
 * The editor stores a ProseMirror document (`content.json`) and before this change
 * every export flattened it to a plain string first — the user could bold a sentence
 * and no export carried it. These tests pin the mapping (bold → `#strong[]` /
 * `<w:b/>`, …), the deliberate drops (colour, highlight, code, alignment), and the
 * property that keeps the product honest: the TEXT of the runs is the text
 * `richTextToPlain` derives from the equivalent HTML, so marks change styling and
 * never the words a parser reads.
 */

/** A TipTap-shaped document with every supported mark. */
const MARKED_DOC = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			attrs: { textAlign: "right" },
			content: [
				{ type: "text", text: "Plain " },
				{ type: "text", text: "bold", marks: [{ type: "bold" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "italic", marks: [{ type: "italic" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "underlined", marks: [{ type: "underline" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "struck", marks: [{ type: "strike" }] },
				{ type: "text", text: " " },
				{
					type: "text",
					text: "linked",
					marks: [{ type: "link", attrs: { href: "https://example.dev/x" } }],
				},
			],
		},
	],
};

describe("marks survive the walk", () => {
	it("maps the palette to runs, keeping every word", () => {
		const runs = proseMirrorToRuns(MARKED_DOC);
		expect(runs).toContainEqual({ text: "bold", bold: true });
		expect(runs).toContainEqual({ text: "italic", italic: true });
		expect(runs).toContainEqual({ text: "underlined", underline: true });
		expect(runs).toContainEqual({ text: "struck", strike: true });
		expect(runs).toContainEqual({
			text: "linked",
			href: "https://example.dev/x",
		});
	});

	it("spells the link target out after the label", () => {
		// The link target is content. `richTextToPlain` renders `label [url]`, the
		// preview shows `label [url]`, so the text layer says `label [url]` in
		// every format — a URL must never live only in an annotation layer.
		const runs = proseMirrorToRuns(MARKED_DOC);
		expect(runs[runs.length - 1]).toEqual({
			text: " [https://example.dev/x]",
		});
		expect(runsToPlainText(runs)).toBe(
			"Plain bold italic underlined struck linked [https://example.dev/x]",
		);
	});

	it("drops colour, highlight, code and alignment — but never the text", () => {
		const runs = proseMirrorToRuns({
			type: "doc",
			content: [
				{
					type: "paragraph",
					attrs: { textAlign: "center" },
					content: [
						{
							type: "text",
							text: "kept",
							marks: [
								{ type: "textStyle", attrs: { color: "#ff0000" } },
								{ type: "highlight", attrs: { color: "#ffff00" } },
								{ type: "code" },
							],
						},
					],
				},
			],
		});
		expect(runs).toEqual([{ text: "kept" }]);
	});

	it("joins blocks with a blank line and list items like the HTML converter", () => {
		const runs = proseMirrorToRuns({
			type: "doc",
			content: [
				{ type: "paragraph", content: [{ type: "text", text: "one" }] },
				{
					type: "bulletList",
					content: [
						{
							type: "listItem",
							content: [
								{ type: "paragraph", content: [{ type: "text", text: "a" }] },
							],
						},
						{
							type: "listItem",
							content: [
								{ type: "paragraph", content: [{ type: "text", text: "b" }] },
							],
						},
					],
				},
				{ type: "paragraph", content: [{ type: "text", text: "two" }] },
			],
		});
		expect(runsToPlainText(runs)).toBe("one\n\n• a\n• b\n\ntwo");
	});

	it("renders a hard break as a newline and skips a decorative rule", () => {
		const runs = proseMirrorToRuns({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "a" },
						{ type: "hardBreak" },
						{ type: "text", text: "b" },
					],
				},
				{ type: "horizontalRule" },
				{ type: "paragraph", content: [{ type: "text", text: "c" }] },
			],
		});
		expect(runsToPlainText(runs)).toBe("a\nb\n\nc");
	});

	it("treats a non-document as absent, like the editor does", () => {
		expect(proseMirrorToRuns({})).toEqual([]);
		expect(proseMirrorToRuns({ type: "paragraph" })).toEqual([]);
	});
});

describe("the text layer is the same words as the HTML path", () => {
	it("matches richTextToPlain for the equivalent HTML", () => {
		const html =
			"<p>Built <strong>payments</strong> &amp; billing.</p><ul><li>Cut latency 40%</li><li>Led 3 engineers</li></ul>";
		const json = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "Built " },
						{ type: "text", text: "payments", marks: [{ type: "bold" }] },
						{ type: "text", text: " & billing." },
					],
				},
				{
					type: "bulletList",
					content: [
						{
							type: "listItem",
							content: [
								{
									type: "paragraph",
									content: [{ type: "text", text: "Cut latency 40%" }],
								},
							],
						},
						{
							type: "listItem",
							content: [
								{
									type: "paragraph",
									content: [{ type: "text", text: "Led 3 engineers" }],
								},
							],
						},
					],
				},
			],
		};
		expect(runsToPlainText(proseMirrorToRuns(json))).toBe(
			richTextToPlain(html),
		);
	});

	it("matches richTextToPlain for a link, target included", () => {
		const html = '<p>See <a href="https://x.dev">site</a> now</p>';
		const json = {
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{ type: "text", text: "See " },
						{
							type: "text",
							text: "site",
							marks: [{ type: "link", attrs: { href: "https://x.dev" } }],
						},
						{ type: "text", text: " now" },
					],
				},
			],
		};
		expect(runsToPlainText(proseMirrorToRuns(json))).toBe(
			richTextToPlain(html),
		);
	});
});

describe("the Typst emitter", () => {
	it("emits one wrapper per mark, nesting them when combined", () => {
		// Built through the walker, because the ` [url]` twin of a link is the
		// walker's convention (the text layer of every format carries it).
		const runs = proseMirrorToRuns({
			type: "doc",
			content: [
				{
					type: "paragraph",
					content: [
						{
							type: "text",
							text: "both",
							marks: [{ type: "bold" }, { type: "italic" }],
						},
						{ type: "text", text: " and " },
						{
							type: "text",
							text: "url",
							marks: [{ type: "link", attrs: { href: "https://x.dev/a" } }],
						},
					],
				},
			],
		});
		// Note the target in the suffix text: the `//` of a URL is a Typst comment
		// opener, so the first slash is escaped — it renders as itself.
		expect(runsToTypst(runs)).toBe(
			'#strong[#emph[both]] and #link("https://x.dev/a")[url] \\[https:\\//x.dev/a\\]',
		);
	});

	it("is what the fallback path produces for plain content, escaped", () => {
		expect(richContentToTypst(undefined, "a # b")).toBe("a \\# b");
		expect(richContentToPlain(undefined, "a # b")).toBe("a # b");
		expect(richContentToRuns(undefined, "plain")).toEqual([{ text: "plain" }]);
	});
});

describe("escaping: user text renders literally", () => {
	it("defuses every markup character", () => {
		expect(escapeTypst("#[]@$*_`<>~\\")).toBe(
			"\\#\\[\\]\\@\\$\\*\\_\\`\\<\\>\\~\\\\",
		);
	});

	it("defuses the shorthands the parser would rewrite", () => {
		// Smart quotes, the ellipsis shorthand, and `//` — a comment to end of
		// line, which every URL contains. Only the first slash needs defusing.
		expect(escapeTypst('It\'s "q" ... //x')).toBe(
			'It\\\'s \\"q\\" \\.\\.\\. \\//x',
		);
	});

	it("defuses list and heading syntax at the start of a line, only", () => {
		expect(escapeTypst("= head")).toBe("\\= head");
		expect(escapeTypst("- item")).toBe("\\- item");
		expect(escapeTypst("  + item")).toBe("  \\+ item");
		expect(escapeTypst("a - b")).toBe("a - b");
		expect(escapeTypst("state-of-art")).toBe("state-of-art");
	});

	it("keeps newlines and spaces as they are", () => {
		expect(escapeTypst("a\n\n- b")).toBe("a\n\n\\- b");
	});
});
