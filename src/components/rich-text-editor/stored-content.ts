import type { RichTextValue } from "@bettaresume/types";

/**
 * What the editor is given, and what it hands back.
 *
 * ## Why the JSON is now stored
 *
 * The editor used to call `editor.getHTML()` and keep only the string. Everything
 * ProseMirror knows about the document — which nodes are structural, which marks are
 * applied to which run, where a list ends — was flattened to markup at the boundary and
 * could not be recovered. That is why the export path has to strip tags instead of
 * walking a document, and why re-opening a summary could subtly reshape it.
 *
 * `content.json` is now the source of truth for content authored in the editor.
 * `content.html` is kept because the Typst, DOCX and plain-text exporters all read it —
 * making them walk the JSON is the separate, ADR-gated change. So the rule is:
 *
 *   - **json** is written by the editor and is what round-trips back into it;
 *   - **html** is derived from the same transaction, for the renderers that predate this;
 *   - content with no `json` (anything imported from PDF/DOCX, or written before this)
 *     still loads, through the HTML fallback.
 *
 * Documenting that split matters more than the code: "we store JSON now" is only true for
 * the editor, and a future reader who assumes it everywhere will be surprised by the
 * import path.
 */
export interface StoredRichText {
	html?: unknown;
	json?: unknown;
}

/**
 * The value to hand to `useEditor({ content })`.
 *
 * JSON wins when present, because it is lossless. Anything else — a legacy row, an
 * imported document — falls back to the HTML string, which the editor parses as it always
 * did. An empty object is treated as absent: `{}` is not a ProseMirror document, and
 * passing it would make the editor start blank over content that exists.
 */
export function editorContentOf(content: StoredRichText): string | object {
	const json = content.json;
	if (json && typeof json === "object" && hasDocShape(json)) return json;
	return typeof content.html === "string" ? content.html : "";
}

/** A ProseMirror document is `{ type: "doc", content: [...] }`. */
function hasDocShape(value: object): boolean {
	const candidate = value as { type?: unknown; content?: unknown };
	return candidate.type === "doc" && Array.isArray(candidate.content);
}

/**
 * The pair written back on every edit.
 *
 * `json` is what the editor produced; `html` is derived from the same document so the two
 * can never describe different content — which is what would happen if one were computed
 * on save and the other on read.
 */
export function storedRichText(html: string, json: unknown): RichTextValue {
	return { html, json };
}
