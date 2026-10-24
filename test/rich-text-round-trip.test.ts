import { describe, expect, it } from "vitest";
import {
	editorContentOf,
	storedRichText,
} from "../src/components/rich-text-editor/stored-content";
import { codeOf } from "./helpers/code-source";

/**
 * The editor used to store only `getHTML()`.
 *
 * Every ProseMirror guarantee was flattened to markup at the boundary: a walker cannot
 * tell a styled run from a structural node, re-parsing is ambiguous, and re-opening a
 * summary could reshape it. `content.json` is now the document; `content.html` is derived
 * from the same transaction and kept because the three exporters read it.
 *
 * The split is the point, so these tests pin both halves: JSON wins when present, and
 * content without JSON — anything imported from PDF or DOCX, or written before this — still
 * loads through the HTML fallback.
 */

const DOC = { type: "doc", content: [{ type: "paragraph" }] };

describe("editorContentOf", () => {
	it("prefers the ProseMirror document", () => {
		expect(editorContentOf({ html: "<p>stale</p>", json: DOC })).toBe(DOC);
	});

	it("falls back to the HTML for imported or legacy content", () => {
		// PDF and DOCX import produce HTML and nothing else.
		expect(editorContentOf({ html: "<p>Imported</p>" })).toBe(
			"<p>Imported</p>",
		);
	});

	it("treats an empty object as absent", () => {
		// `{}` is not a document. Passing it would start the editor blank over content
		// that exists, which reads to the user as data loss.
		expect(editorContentOf({ html: "<p>Kept</p>", json: {} })).toBe(
			"<p>Kept</p>",
		);
	});

	it("treats a non-document object as absent", () => {
		expect(editorContentOf({ html: "<p>Kept</p>", json: { nodes: [] } })).toBe(
			"<p>Kept</p>",
		);
	});

	it("returns an empty string when there is nothing at all", () => {
		expect(editorContentOf({})).toBe("");
		expect(editorContentOf({ html: null, json: null })).toBe("");
	});
});

describe("storedRichText", () => {
	it("carries both forms from one transaction", () => {
		expect(storedRichText("<p>x</p>", DOC)).toEqual({
			html: "<p>x</p>",
			json: DOC,
		});
	});

	it("round-trips: what is stored is what the editor is given back", () => {
		const stored = storedRichText("<p>x</p>", DOC);
		expect(editorContentOf(stored)).toBe(DOC);
	});
});

describe("the editor is wired to both", () => {
	const editor = codeOf("src/components/rich-text-editor/rich-text-editor.tsx");

	it("reads the stored document, not just the HTML", () => {
		expect(editor).toMatch(/content: editorContentOf\(localData\)/);
		expect(editor).toMatch(/json=\{content\.json\}|json,/);
	});

	it("emits getJSON() alongside getHTML() on every edit", () => {
		// `getHTML()` alone is the regression: it silently drops the document.
		expect(editor).toMatch(/html: editor\.getHTML\(\)/);
		expect(editor).toMatch(/json: editor\.getJSON\(\)/);
	});

	it("passes both to onSave, so the caller can persist them", () => {
		expect(editor).toMatch(
			/onSave: async \(val\) => onChange\(val\.html, val\.json\)/,
		);
	});

	it("no longer stores the HTML string as the autosave payload", () => {
		expect(editor).not.toMatch(/data: content,/);
	});
});

describe("the editor boundary persists both", () => {
	const host = codeOf("src/features/resume-editor/resume-editor.tsx");

	it("writes json next to html for summary and custom sections", () => {
		expect(host).toMatch(
			/content: \{ \.\.\.selectedSection\.content, html, json \}/,
		);
		expect(host).toMatch(
			/content: \{ \.\.\.selectedSection\?\.content, html, json \}/,
		);
	});

	it("hands the stored document back to the editor", () => {
		const jsonProps = host.match(/json=\{content\.json\}/g) ?? [];
		expect(jsonProps).toHaveLength(2);
	});
});
