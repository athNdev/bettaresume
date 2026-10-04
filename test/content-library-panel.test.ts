import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The content library is the most destructive panel in the editor: `propagate`
 * overwrites a resume section, `content.create` inserts a master item, and
 * `backfill` writes across every unlinked section the user owns.
 *
 * There is no DOM in CI (the Typst WASM is CDN-loaded) and the root vitest config is
 * `environment: "node"` with no jsdom or testing-library installed, so — exactly as
 * `test/review-panel.test.ts` states for itself — these assert on source rather than on
 * a render. That is weaker than a render test and this file says so. What it can still
 * do is pin the *structural* invariants that let these bugs ship: a write with no
 * confirmation, a cache left stale after a write, and a failed read reported as
 * emptiness.
 *
 * Comments are stripped before every assertion about what the user sees, for the reason
 * documented in `review-panel.test.ts`: this file's own doc comment contains the words
 * "empty" and "confirmation", and a test that cannot tell a comment from the product is
 * not testing the product.
 */
const panel = readFileSync(
	"src/features/resume-editor/components/content-library-panel.tsx",
	"utf8",
);

const stripComments = (src: string) =>
	src
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/(^|[^:])\/\/.*$/gm, "$1")
		.replace(/^\s*\*.*$/gm, "")
		.replace(/^\s*\/\*\*?/gm, "");

const ui = stripComments(panel);

/**
 * Body of a named JS/TS block, so "does X invalidate the resume" can be asked of X's
 * own `onSuccess` rather than of the file as a whole. Brace-balanced.
 */
function blockOf(source: string, anchor: RegExp): string {
	const start = source.search(anchor);
	if (start === -1) throw new Error(`anchor not found: ${anchor}`);
	let depth = 0;
	let seen = false;
	for (let i = start; i < source.length; i++) {
		const c = source[i];
		if (c === "{") {
			depth++;
			seen = true;
		} else if (c === "}") {
			depth--;
			if (seen && depth === 0) return source.slice(start, i + 1);
		}
	}
	throw new Error(`unbalanced block at anchor: ${anchor}`);
}

/**
 * A JSX element's children. Brace-balancing cannot be used on JSX: `{title}` closes
 * itself and would truncate the search at the first interpolation.
 */
function elementOf(source: string, tag: string): string {
	const open = `<${tag}`;
	const start = source.indexOf(open);
	if (start === -1) throw new Error(`element not found: ${tag}`);
	const end = source.indexOf(`</${tag}>`, start);
	if (end === -1) throw new Error(`element not closed: ${tag}`);
	return source.slice(start, end + tag.length + 3);
}

describe("nothing destructive happens without the user confirming it", () => {
	it("'Use latest' is an AlertDialog trigger, not a bare button", () => {
		// It fired `propagate.mutate` from a bare `Button`. `content.propagate` does
		// `.set({ content: item.payload })` unconditionally, so one click discarded the
		// user's local edits to that section with no warning — while the review panel's
		// own doc comment promises "Nothing is auto-applied".
		expect(ui).toMatch(/<AlertDialog>/);
		expect(ui).toMatch(/<AlertDialogTrigger asChild>/);
		expect(ui).toMatch(/Use latest/);
		// The button that says "Use latest" carries no onClick of its own.
		expect(ui).not.toMatch(
			/<Button[^>]*onClick=\{[^}]*propagate[^>]*>[\s\S]{0,120}?Use latest/,
		);
		expect(ui).not.toMatch(/onClick=\{\(\) => propagate\.mutate/);
	});

	it("propagate is only called from the confirming action", () => {
		const calls = ui.match(/propagate\.mutate\(/g) ?? [];
		expect(calls).toHaveLength(1);
		const dialog = elementOf(ui, "AlertDialogContent");
		expect(dialog).toMatch(/propagate\.mutate\(\{ sectionId: s\.id \}\)/);
		expect(dialog).toMatch(/<AlertDialogAction/);
	});

	it("the confirmation offers a Cancel and states what is discarded", () => {
		// Mirrors `HistoryPanel`'s restore dialog. Naming the section matters: the user
		// has to know WHICH work is about to go before they agree to it.
		const dialog = elementOf(ui, "AlertDialogContent");
		expect(dialog).toMatch(/<AlertDialogCancel>Cancel<\/AlertDialogCancel>/);
		expect(dialog).toMatch(/discarded/);
		expect(dialog).toMatch(/\{title\}/);
	});

	it("the panel reports rather than applies, as its contract claims", () => {
		expect(ui).not.toMatch(/sync all|save to all/i);
	});
});

describe("a write leaves no stale cache behind it", () => {
	it("backfill invalidates the resume, not just the library list", () => {
		// `content.backfill` sets `contentItemId` on every unlinked section. Invalidating
		// only `content.list` left `resume.sections` stale, so the just-linked sections
		// kept rendering under "Not yet in the library" with a live "Save to library"
		// button. `content.create` has no duplicate guard, so clicking it inserted a
		// SECOND master item with an identical payload: two masters for one achievement,
		// free to drift.
		const onSuccess = blockOf(ui, /const backfill = api\.content\.backfill/);
		expect(onSuccess).toMatch(/utils\.content\.list\.invalidate\(\)/);
		expect(onSuccess).toMatch(
			/utils\.resume\.getById\.invalidate\(\{ id: resume\.id \}\)/,
		);
		expect(onSuccess).toMatch(
			/utils\.content\.additions\.invalidate\(\{ resumeId: resume\.id \}\)/,
		);
		expect(onSuccess).toMatch(
			/utils\.content\.divergence\.invalidate\(\{ resumeId: resume\.id \}\)/,
		);
	});

	it("the unlinked list is the resume's own sections, so an invalidated resume empties it", () => {
		// This is what makes the assertion above mean something rather than being a
		// cache-shaped incantation: `unlinked` has no other source to go stale from.
		expect(ui).toMatch(
			/const unlinked = \(resume\.sections \?\? \[\]\)\.filter\(\(s\) => !s\.contentItemId\)/,
		);
		expect(ui).toMatch(/\{unlinked\.length > 0 \?/);
	});

	it("saving to the library also refreshes the resume", () => {
		// Same failure one click later: the row would otherwise keep offering itself.
		const save = blockOf(ui, /const saveToLibrary = api\.content\.create/);
		expect(save).toMatch(/utils\.content\.list\.invalidate\(\)/);
		expect(save).toMatch(
			/utils\.resume\.getById\.invalidate\(\{ id: resume\.id \}\)/,
		);
	});
});

describe("a failed read is never reported as an empty library", () => {
	it("all three queries have an error surface", () => {
		// `library.isError`, `additions.isError` and `divergence.isError` were all
		// unhandled. Three reads with no failure path is not a style nit: on a
		// `content.list` failure the panel said the library was empty, which is a claim
		// about the user's data it had not made.
		expect(ui).toMatch(/\{library\.isError \?/);
		expect(ui).toMatch(/\{additions\.isError \?/);
		expect(ui).toMatch(/\{divergence\.isError \?/);
	});

	it("each error message names which query failed", () => {
		expect(ui).toMatch(
			/Could not load your library: \{library\.error\.message\}/,
		);
		expect(ui).toMatch(/additions\.error\.message/);
		expect(ui).toMatch(/divergence\.error\.message/);
	});

	it("the emptiness copy is unreachable while the query has errored", () => {
		// Ordered so `isError` wins over `items.length === 0`: on error `data` is
		// undefined, so `items` is `[]` and the empty branch would otherwise render.
		expect(ui).toMatch(
			/library\.isError \? \([\s\S]{0,400}?could not be loaded[\s\S]{0,400}?\) : items\.length === 0 \?/,
		);
		expect(ui).toMatch(
			/additions\.isError \? \([\s\S]{0,400}?could not be loaded[\s\S]{0,400}?\) : \(additions\.data \?\? \[\]\)\.length === 0 \?/,
		);
	});

	it("each error is announced to assistive tech", () => {
		const alerts = ui.match(/role="alert"/g) ?? [];
		expect(alerts.length).toBeGreaterThanOrEqual(4);
	});

	it("backfill does not fire because a read failed", () => {
		// The worst combination on this panel: a transient read error triggered a WRITE
		// the user never asked for, because the only guards were `requested.current ||
		// library.isPending` and a failed query has `isPending === false`.
		const effect = blockOf(ui, /useEffect\(\(\) =>/);
		expect(effect).toMatch(/if \(library\.isError\) return;/);
		expect(effect).toMatch(/if \(library\.isPending\) return;/);
		// The guard must precede the write, not trail it.
		expect(effect.indexOf("if (library.isError) return;")).toBeLessThan(
			effect.indexOf("backfillMutate();"),
		);
	});

	it("a later successful read can still adopt the sections", () => {
		// `requested` is only set once we actually intend to fire, so an errored mount
		// that recovers on refetch backfills instead of silently doing nothing forever.
		const effect = blockOf(ui, /useEffect\(\(\) =>/);
		expect(effect).toMatch(
			/if \(library\.isError\) return;\s*[\s\S]{0,400}?requested\.current = true;/,
		);
		expect(effect).not.toMatch(
			/library\.isError\) return;[\s\S]{0,80}?requested\.current = true;[\s\S]{0,80}?library\.isError/,
		);
	});
});

describe("the backfill effect depends on stable values", () => {
	it("lists `backfill.mutate`, not the `backfill` result object", () => {
		// A react-query result object is a new identity every render, so it re-ran the
		// effect every render. Harmless today only because `requested` gates it — which
		// is exactly the kind of dependency array that hides a bug until the guard moves.
		// Assert against the whole source, not blockOf(): blockOf stops at the effect's
		// closing brace, which sits BEFORE the dependency array, so the deps are not
		// inside the block it returns.
		expect(ui).toMatch(
			/\}, \[library\.isPending, library\.isError, library\.data, backfillMutate\]\);/,
		);
		// The guard must call the stable `mutate`, never `backfill.mutate()` on the
		// result object inside the effect body.
		expect(ui).not.toMatch(/backfillMutate\(\);[^}]*backfill\./);
	});

	it("explains why the backfill must not re-run per render", () => {
		expect(panel).toMatch(/STABLE|stable/i);
		expect(panel).toMatch(/every render/);
	});
});
