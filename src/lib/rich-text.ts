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

/* ─────────────────────────────────────────────────────────────────────
 * Mark-preserving runs — ProseMirror JSON → Typst / DOCX / plain text
 * ─────────────────────────────────────────────────────────────────────
 *
 * `richTextToPlain` above answers "what does this content SAY". This half answers
 * "how is it EMPHASISED", which the editor lets the user express and every export
 * used to throw away: `serialize.ts` flattened the stored markup to a plain string
 * before Typst ever saw it, so no PDF carried a single bold run.
 *
 * ## Where the marks come from
 *
 * The stored ProseMirror document (`content.json`, written by the editor — see
 * `stored-content.ts`). It is lossless by construction: marks are structured data,
 * so no tag parsing is involved and no entity table can be incomplete. Content
 * without a document (imported from PDF/DOCX, or written before the editor stored
 * one) falls back to `content.html` as plain text — the same bytes as before this
 * change, so legacy rows export exactly as they always did.
 *
 * ## The mark palette, and what is deliberately dropped
 *
 * | TipTap mark | Typst | DOCX | plain text |
 * |---|---|---|---|
 * | bold | `#strong[]` | `<w:b/>` | words only |
 * | italic | `#emph[]` | `<w:i/>` | words only |
 * | underline | `#underline[]` | `<w:u/>` | words only |
 * | strikethrough | `#strike[]` | `<w:strike/>` | words only |
 * | link | `#link(url)[text]` | `<w:hyperlink>` | `text [url]` |
 * | colour, fontFamily (`textStyle`) | dropped | dropped | dropped |
 * | highlight | dropped | dropped | dropped |
 * | code | dropped | dropped | dropped |
 * | alignment (block attr) | dropped | dropped | dropped |
 *
 * Colour, highlight and per-run font break the template's typographic contract
 * (docs/research/template-research.md §6 deletes coloured text outright), `code`
 * would need a monospace font the document did not choose, and alignment is a
 * block attribute the single-column templates own. All of them degrade to their
 * TEXT — never to nothing.
 *
 * ## Plain text shows words, not decorations
 *
 * The plain-text export is the predicted text layer — the thing a parser reads out
 * of the PDF or DOCX — and a text layer carries words, not styling. So styling
 * marks render as nothing (the words survive intact), while a link's target is
 * CONTENT, not decoration, and is spelled out as `text [url]`: the exact
 * representation `richTextToPlain` has always produced, so the three export paths
 * cannot disagree about what the document says.
 */

export interface RichRun {
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	/** Link target; the run's text is the label. */
	href?: string;
}

/** The same shape check `stored-content.ts` applies: a doc is `{type:"doc", content:[…]}`. */
function isProseMirrorDoc(value: unknown): boolean {
	if (!value || typeof value !== "object" || Array.isArray(value)) return false;
	const candidate = value as { type?: unknown; content?: unknown };
	return candidate.type === "doc" && Array.isArray(candidate.content);
}

interface PmNode {
	type?: unknown;
	text?: unknown;
	marks?: unknown;
	content?: unknown;
	attrs?: unknown;
}

function asNodes(value: unknown): PmNode[] {
	return Array.isArray(value) ? (value as PmNode[]) : [];
}

function typeOf(node: PmNode): string {
	return typeof node.type === "string" ? node.type : "";
}

/** The kept marks of a ProseMirror text node. Unknown marks are dropped (see table). */
function marksOf(value: unknown): Omit<RichRun, "text"> {
	const marks: Omit<RichRun, "text"> = {};
	for (const mark of asNodes(value)) {
		switch (typeOf(mark)) {
			case "bold":
				marks.bold = true;
				break;
			case "italic":
				marks.italic = true;
				break;
			case "underline":
				marks.underline = true;
				break;
			case "strike":
				marks.strike = true;
				break;
			case "link": {
				const attrs = mark.attrs as Record<string, unknown> | undefined;
				const href = attrs?.href;
				if (typeof href === "string" && href !== "") marks.href = href;
				break;
			}
			default:
				break;
		}
	}
	return marks;
}

const BLOCK_SEPARATOR = "\n\n";
const ITEM_SEPARATOR = "\n";

/**
 * Walk a ProseMirror document into flat runs in reading order.
 *
 * Blocks join with a blank line and list items with a single newline — the same
 * shape `html-to-text` produces for the equivalent HTML, so the text layer is
 * identical whether the content arrived as JSON or as the derived HTML. A link run
 * is followed by its ` [url]` twin for the same reason (see the plain-text row of
 * the table above).
 */
export function proseMirrorToRuns(json: unknown): RichRun[] {
	if (!isProseMirrorDoc(json)) return [];
	const runs: RichRun[] = [];
	emitBlocks(asNodes((json as PmNode).content), runs);
	return runs;
}

function emitBlocks(nodes: PmNode[], runs: RichRun[]): void {
	for (const [index, node] of nodes.entries()) {
		if (index > 0) runs.push({ text: BLOCK_SEPARATOR });
		emitBlock(node, runs);
	}
}

function emitBlock(node: PmNode, runs: RichRun[]): void {
	const type = typeOf(node);
	if (type === "bulletList" || type === "orderedList") {
		const ordered = type === "orderedList";
		for (const [index, item] of asNodes(node.content).entries()) {
			if (index > 0) runs.push({ text: ITEM_SEPARATOR });
			runs.push({ text: ordered ? `${index + 1}. ` : "• " });
			emitListItem(item, runs);
		}
		return;
	}
	if (type === "horizontalRule") {
		// Decorative, and the research deletes decorative rules outright — they
		// extract as graphics. Nothing rendered for one before this either.
		return;
	}
	// paragraph, heading, blockquote, codeBlock and anything unknown degrade to
	// their text in reading order. Headings keep no size: the section body is one
	// type size owned by the template.
	emitInline(asNodes(node.content), runs);
}

function emitListItem(item: PmNode, runs: RichRun[]): void {
	for (const [index, block] of asNodes(item.content).entries()) {
		if (index > 0) runs.push({ text: " " });
		if (typeOf(block) === "bulletList" || typeOf(block) === "orderedList") {
			emitBlock(block, runs);
		} else {
			emitInline(asNodes(block.content), runs);
		}
	}
}

function emitInline(nodes: PmNode[], runs: RichRun[]): void {
	for (const node of nodes) {
		if (typeOf(node) === "text") {
			pushRun(
				runs,
				typeof node.text === "string" ? node.text : "",
				marksOf(node.marks),
			);
			continue;
		}
		if (typeOf(node) === "hardBreak") {
			runs.push({ text: "\n" });
			continue;
		}
		emitInline(asNodes(node.content), runs);
	}
}

function pushRun(
	runs: RichRun[],
	text: string,
	marks: Omit<RichRun, "text">,
): void {
	if (text === "") return;
	runs.push({ text, ...marks });
	// The link target is content: spelled out after the label, exactly as
	// `richTextToPlain` renders the equivalent HTML, so the text layer a parser
	// reads is the same document in every export format.
	if (marks.href) runs.push({ text: ` [${marks.href}]` });
}

/**
 * Escape user text for the Typst **markup** channel.
 *
 * The marked fields are laid out via `#eval(..., mode: "markup")`, so their text is
 * parsed as Typst markup and every markup character in it must be defused:
 * `# [ ] @ $ _ * \` < > \ ~ ' "` (the documented special set, plus the straight
 * quotes — the parser would smart-quote them, changing the text layer).
 *
 * Also defused, because the parser transforms them too and the plain-text export
 * does not: `...` (ellipsis shorthand), `//` (a comment to end of line — every URL
 * contains one), and `= - + /` at the start of a line (headings and lists).
 *
 * Plain fields (names, companies, bullets) are interpolated as Typst STRINGS and
 * never re-parsed, so they must NOT be escaped — a backslash there would render.
 * The Typst escape conventions for the JSON payload itself are `JSON.stringify`'s
 * problem and match Typst's (docs/AGENT-CONTEXT.md §2.12); this escaper is only for
 * the text INSIDE the payload.
 */
export function escapeTypst(text: string): string {
	return escapeTypstFrom(text, { atLineStart: true });
}

interface EscapeState {
	atLineStart: boolean;
}

function escapeTypstFrom(text: string, state: EscapeState): string {
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const ch = text[i] ?? "";
		const next = text[i + 1];
		const afterNext = text[i + 2];
		if (ch === "." && next === "." && afterNext === ".") {
			out += "\\.\\.\\.";
			i += 2;
			state.atLineStart = false;
			continue;
		}
		if (ch === "/" && (next === "/" || state.atLineStart)) {
			out += "\\/";
			state.atLineStart = false;
			continue;
		}
		if (LINE_START_GUARDS.has(ch) && state.atLineStart) {
			out += `\\${ch}`;
			state.atLineStart = false;
			continue;
		}
		if (MARKUP_SPECIALS.has(ch)) {
			out += `\\${ch}`;
			state.atLineStart = false;
			continue;
		}
		out += ch;
		if (ch === "\n") state.atLineStart = true;
		else if (ch !== " " && ch !== "\t") state.atLineStart = false;
	}
	return out;
}

const MARKUP_SPECIALS = new Set([
	"\\",
	"`",
	"*",
	"_",
	"#",
	"[",
	"]",
	"@",
	"<",
	">",
	"~",
	"$",
	"'",
	'"',
]);

const LINE_START_GUARDS = new Set(["=", "-", "+", "/"]);

/** Escape a URL for a Typst string literal (`#link("…")`). */
function escapeTypstString(text: string): string {
	let out = "";
	for (const ch of text) {
		if ((ch.codePointAt(0) ?? 0) < 0x20) continue; // control chars in a URL
		out += ch === "\\" || ch === '"' ? `\\${ch}` : ch;
	}
	return out;
}

/** The whitespace tail `richTextToPlain` applies; shared so every path agrees. */
function normalizePlain(text: string): string {
	return text
		.replace(/\u00a0/g, " ")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/** Runs → the plain-text layer: words plus link targets, no styling. */
export function runsToPlainText(runs: RichRun[]): string {
	let out = "";
	for (const run of runs) out += run.text;
	return normalizePlain(out);
}

/** Runs → Typst inline markup for `#eval(..., mode: "markup")`. */
export function runsToTypst(runs: RichRun[]): string {
	const state: EscapeState = { atLineStart: true };
	let out = "";
	for (const run of runs) {
		let inner = escapeTypstFrom(run.text, state);
		if (run.strike) inner = `#strike[${inner}]`;
		if (run.underline) inner = `#underline[${inner}]`;
		if (run.italic) inner = `#emph[${inner}]`;
		if (run.bold) inner = `#strong[${inner}]`;
		if (run.href) inner = `#link("${escapeTypstString(run.href)}")[${inner}]`;
		out += inner;
	}
	return normalizePlain(out);
}

/**
 * Stored rich content → runs, for emitters that need the mark structure (DOCX).
 * The ProseMirror document wins; anything without one becomes a single plain run.
 */
export function richContentToRuns(
	json: unknown,
	plainFallback: string,
): RichRun[] {
	if (isProseMirrorDoc(json)) return proseMirrorToRuns(json);
	return plainFallback === "" ? [] : [{ text: plainFallback }];
}

/**
 * Stored rich content → Typst markup. The ProseMirror document wins; anything
 * without one is escaped as plain text (the legacy/imported path).
 */
export function richContentToTypst(
	json: unknown,
	plainFallback: string,
): string {
	return runsToTypst(richContentToRuns(json, plainFallback));
}

/** Stored rich content → the plain-text layer (see the plain-text policy above). */
export function richContentToPlain(
	json: unknown,
	plainFallback: string,
): string {
	return runsToPlainText(richContentToRuns(json, plainFallback));
}
