import { convert } from "html-to-text";

/**
 * Stored rich text, turned into the plain text a reader (or a parser) will see.
 *
 * Section content carries user-authored `html` — TipTap's `getHTML()` output, an
 * imported document's paragraphs, or a value written by an older version of the app.
 * Four places needed to turn that HTML into text, and each one did it differently:
 *
 * | Where | How |
 * |---|---|
 * | `preview.tsx` | `html.replace(/<[^>]*>/g, "")` — one pass, no entity decoding |
 * | `typst/serialize.ts` | a hand-rolled loop that re-strips until stable |
 * | `export/docx.ts` | `html-to-text` with list and skip selectors |
 * | `export/text.ts` | `html-to-text` with no selectors at all |
 *
 * So a summary containing `&amp;` rendered as `&` in the PDF and `&amp;` in the
 * preview; a summary containing nested tags could produce different text in each of the
 * four. The product's central claim is that the document you approve and the text layer
 * a parser reads are the same document, and four converters is four ways to break it.
 *
 * ## Why `html-to-text` and not a regex
 *
 * A tag-stripping regex is the classic place an injection gets through: nested or
 * overlapping constructs (`<scr<script>ipt>`) are revealed as new tags by a single pass,
 * and every hand-rolled entity table is incomplete. This library parses the HTML, which
 * removes the class rather than the instance — and it was already a dependency of the
 * export path, so the preview costs nothing extra.
 *
 * ## This is not the XSS fix by itself
 *
 * Nothing here inserts HTML into the DOM: every caller renders the result as a React
 * text node or a Typst string, both of which escape. The sanitiser is what stops a
 * stored `<script>` from *reading* as visible garbage, and what keeps the four render
 * paths telling the user the same thing. `sanitizeTypstSvg` covers the one place raw
 * markup is injected.
 */
export function richTextToPlain(html: string): string {
	if (!html) return "";

	return convert(html, {
		wordwrap: false,
		selectors: [
			// Bullets are the exporter's, not the library's. `li` cannot carry this:
			// giving it `options` forces a `format`, and a leaf format replaces the
			// formatter the parent list calls, which throws `format is not a function`.
			// The prefix belongs to the list, and `unorderedList` is its formatter.
			{
				selector: "ul",
				format: "unorderedList",
				options: { itemPrefix: "• " },
			},
			// A photo is an image, not text. The library's default `[alt]` placeholder
			// would otherwise land in the document's text layer.
			{ selector: "img", format: "skip" },
			// Script and style bodies are content, not text. Emitting them is how a
			// stored payload ends up visible in the document.
			{ selector: "script", format: "skip" },
			{ selector: "style", format: "skip" },
		],
	})
		.replace(/\u00a0/g, " ")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * Attribute values that can execute, or that can embed a document which can.
 *
 * `data:` is included because `data:text/html` in an `href` navigates; `blob:` and
 * `javascript:` are the obvious two. `file:` is Windows-only but free to block.
 */
const UNSAFE_URL = /^(?:javascript|data|vbscript|blob|file):/i;

/**
 * Elements that are never part of a typeset page and exist only to execute or embed.
 *
 * `foreignObject` matters most: it is the one SVG element whose children are interpreted
 * as HTML, so an `<svg><foreignObject><script>` would otherwise be a script tag inside a
 * server-trusted string.
 */
const DANGEROUS_ELEMENTS =
	/<\s*(script|foreignObject|iframe|object|embed|link|meta|base)\b[\s\S]*?<\s*\/\s*\1\s*>|<\s*(script|foreignObject|iframe|object|embed|link|meta|base)\b[^>]*\/?\s*>/gi;

/** `onclick=`, `onload=` and the rest of the event-handler family. */
const EVENT_HANDLER = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;

/**
 * Neutralise compiler output before it is injected with `dangerouslySetInnerHTML`.
 *
 * The SVG comes from the Typst WASM compiler, which escapes the text it lays out — so
 * this is not defending against a known hole. It is defending against the assumption:
 * the string is inserted as markup, and the only thing that currently makes that safe is
 * a property of a third-party compiler that this code does not control and does not
 * assert. One `setCompilerInitOptions` change, one Typst release with an HTML-export
 * feature, or one template that links a user-supplied URL, and the assumption is gone.
 *
 * Stripping is deliberately conservative: it removes elements and attributes that a
 * typeset page never contains, and leaves paths, text, transforms and fill untouched, so
 * a legitimate page comes out byte-identical unless it contained something it should not.
 */
export function sanitizeTypstSvg(svg: string): string {
	if (!svg) return "";

	return (
		svg
			.replace(DANGEROUS_ELEMENTS, "")
			.replace(EVENT_HANDLER, "")
			// `href`/`xlink:href` with an executable scheme. Anchors in a resume point at
			// http(s) or mailto; anything else is not something a CV can mean.
			.replace(
				/\s((?:xlink:)?href)\s*=\s*("([^"]*)"|'([^']*)')/gi,
				(
					match: string,
					_attr: string,
					_quoted: string,
					dq?: string,
					sq?: string,
				) => {
					const value = (dq ?? sq ?? "").trim();
					return UNSAFE_URL.test(value) ? "" : match;
				},
			)
			.trim()
	);
}
