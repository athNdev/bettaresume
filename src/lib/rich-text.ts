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
 * paths telling the user the same thing.
 *
 * The one place the app injects markup — the Typst preview — no longer does. It renders
 * the compiled page as an `<img>` with a blob URL, which is an image context: scripts do
 * not run there and external references are not fetched, by specification rather than by
 * a strip this code maintains. See `typst-preview.tsx`.
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
