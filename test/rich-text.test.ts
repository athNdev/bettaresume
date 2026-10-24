import { describe, expect, it } from "vitest";
import type {
	Resume,
	ResumeSection,
} from "../src/features/resume-editor/types";
import { buildPlainText } from "../src/lib/export/text";
import { richTextToPlain, sanitizeTypstSvg } from "../src/lib/rich-text";
import { resumeToTypstJson } from "../src/lib/typst/serialize";

/**
 * One converter, every render path.
 *
 * Section content holds user-authored `html`. Four code paths turn it into text — the
 * HTML preview, the Typst serialiser that produces the PDF, the plain-text export, and
 * the DOCX writer — and before this file existed all four did it differently:
 *
 *   - `preview.tsx` used a single-pass `replace(/<[^>]*>/g, "")` with no entity decoding
 *   - `typst/serialize.ts` used a re-stripping loop with a six-entry entity table
 *   - `export/docx.ts` used `html-to-text` with list and skip selectors
 *   - `export/text.ts` used `html-to-text` with no selectors
 *
 * The consequence was not cosmetic. The product's central claim is that the document you
 * approve and the text layer a parser reads are the same document; four converters is
 * four answers to "what does this summary say". `&amp;` rendered as `&` in one path and
 * `&amp;` in another; a list item was `• x` in two and `x` in the rest.
 *
 * These tests pin the properties that made the divergence visible, plus the safety
 * property that motivated the item: a stored `<script>` or `<img onerror>` must render
 * inert.
 */

const resumeWithSummary = (html: string): Resume =>
	({
		id: "r1",
		userId: "u1",
		name: "Test",
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "minimal",
		tags: [],
		isArchived: false,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		metadata: {
			personalInfo: { fullName: "Avery Chen", email: "avery@chen.dev" },
			settings: { dateFormat: "MMM YYYY" },
		},
		sections: [
			{
				id: "s1",
				type: "summary",
				order: 0,
				visible: true,
				content: { title: "Summary", html },
			} satisfies ResumeSection,
		],
	}) as unknown as Resume;

describe("stored markup renders as text, not as markup", () => {
	it("drops a script body rather than showing it", () => {
		// A naive strip leaves `alert(1)` visible in the document. Skipping the element
		// is what "inert" means for a text renderer.
		expect(richTextToPlain("<p>Before</p><script>alert(1)</script>")).toBe(
			"Before",
		);
	});

	it("drops an img with an event handler", () => {
		const out = richTextToPlain('<p>Hi</p><img src=x onerror="alert(1)">');
		// `img` is skipped entirely: a photo has no text, and the library's default
		// `[alt]` placeholder would otherwise land in the document's text layer.
		expect(out).toBe("Hi");
		expect(out).not.toMatch(/onerror|alert|</);
	});

	it("does not resurrect a tag from a nested payload", () => {
		// `<scr<script>ipt>` is the classic single-pass regex bypass: one strip reveals a
		// new `<script>` tag. Parsing the HTML removes the class of bug, not the instance.
		//
		// What is left is inert, if ugly, text -- it becomes a React text node, which
		// escapes. The assertion is that no markup survives, not that the residue is
		// pretty: `<` can legitimately appear in prose ("2 < 3"), so the guarantee is
		// specifically about the opening delimiter.
		const out = richTextToPlain("<scr<script>ipt>alert(1)</script>");
		expect(out).not.toContain("<");
	});

	it("leaves no angle brackets from ordinary formatting either", () => {
		const out = richTextToPlain(
			"<p>Shipped <strong>40%</strong> faster &amp; cheaper</p>",
		);
		expect(out).toBe("Shipped 40% faster & cheaper");
	});
});

describe("one converter, so every path agrees", () => {
	const html =
		"<p>Built <strong>payments</strong> &amp; billing.</p><ul><li>Cut latency 40%</li><li>Led 3 engineers</li></ul>";

	it("the preview and the Typst payload are the same string", () => {
		const resume = resumeWithSummary(html);
		const typed = JSON.parse(resumeToTypstJson(resume)) as {
			sections: Array<{ summaryText?: string }>;
		};
		expect(typed.sections[0]?.summaryText).toBe(richTextToPlain(html));
	});

	it("the plain-text export is built from the same string", () => {
		const resume = resumeWithSummary(html);
		expect(buildPlainText(resume)).toContain(richTextToPlain(html));
	});

	it("decodes entities the same way everywhere", () => {
		// The specific mismatch: a hand-rolled table decoded `&amp;` but not `&#39;`,
		// so the PDF said `it's` and the preview said `it&#39;s`.
		const apostrophe = "<p>It&#39;s &amp; more</p>";
		expect(richTextToPlain(apostrophe)).toBe("It's & more");
		expect(buildPlainText(resumeWithSummary(apostrophe))).toContain(
			"It's & more",
		);
	});
});

describe("sanitizeTypstSvg", () => {
	const page = (body: string) =>
		`<svg width="100" height="200" viewBox="0 0 100 200">${body}</svg>`;

	it("leaves legitimate compiler output byte-identical", () => {
		// A page with text, a path and a fill. This is what Typst actually emits, and a
		// sanitiser that rewrites it would be a rendering bug.
		const legit = page(
			'<g transform="translate(10 20)"><path d="M0 0L5 5" fill="#000"/><text x="1">Avery Chen</text></g>',
		);
		expect(sanitizeTypstSvg(legit)).toBe(legit);
	});

	it("removes a script element", () => {
		const out = sanitizeTypstSvg(
			page("<script>alert(1)</script><text>x</text>"),
		);
		expect(out).not.toContain("script");
		expect(out).toContain("<text>x</text>");
	});

	it("removes foreignObject, the one SVG element that interprets HTML", () => {
		const out = sanitizeTypstSvg(
			page('<foreignObject><img src=x onerror="alert(1)"></foreignObject>'),
		);
		expect(out).not.toContain("foreignObject");
		expect(out).not.toContain("onerror");
	});

	it("removes event handlers from otherwise legitimate elements", () => {
		const out = sanitizeTypstSvg(page('<path d="M0 0" onload="alert(1)"/>'));
		expect(out).not.toContain("onload");
		expect(out).toContain('<path d="M0 0"');
	});

	it("removes an executable href but keeps a real one", () => {
		const bad = sanitizeTypstSvg(page('<a href="javascript:alert(1)">x</a>'));
		expect(bad).not.toMatch(/javascript:/);

		const good = sanitizeTypstSvg(page('<a href="https://example.com">x</a>'));
		expect(good).toContain('href="https://example.com"');
	});

	it("handles an empty string without throwing", () => {
		expect(sanitizeTypstSvg("")).toBe("");
	});
});

describe("the preview does not keep a private stripper", () => {
	it("preview.tsx imports the shared converter", async () => {
		const { readFileSync } = await import("node:fs");
		const preview = readFileSync(
			"src/features/resume-editor/components/preview.tsx",
			"utf8",
		);
		expect(preview).toMatch(
			/import \{ richTextToPlain \} from "@\/lib\/rich-text"/,
		);
		expect(preview).not.toMatch(/replace\(\/<\[\^>\]\*>\/g/);
	});

	it("the Typst serialiser imports the shared converter", async () => {
		const { readFileSync } = await import("node:fs");
		const serialize = readFileSync("src/lib/typst/serialize.ts", "utf8");
		expect(serialize).toMatch(
			/import \{ richTextToPlain \} from "@\/lib\/rich-text"/,
		);
	});
});
