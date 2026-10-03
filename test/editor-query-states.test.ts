import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Every query in the editor must be able to say "this failed".
 *
 * A tRPC/React Query `data` is `undefined` in two situations that look identical in
 * code: there is genuinely nothing to show, and the request failed. An
 * `isPending` → `length === 0` chain cannot tell them apart, so it falls through to
 * the *empty* message on a failure.
 *
 * That is not a cosmetic gap. In `history-panel.tsx` the empty branch read "No saved
 * versions yet. Save one before a big rewrite so you can get back to it." — so a
 * failed history request told the user their history was empty and invited them to
 * overwrite it. And the snapshot query fell through to `null`, leaving the pane
 * silently blank, indistinguishable from loading.
 *
 * This is asserted structurally, per query, because the failure is structural: it is
 * a missing branch, not a wrong string. Comments are stripped first — these files
 * explain the bugs above in prose, and an assertion that matches its own
 * documentation is testing the comment.
 */

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
	src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const ui = read("src/components/ui/panel-state.tsx");
const history = stripComments(
	read("src/features/resume-editor/components/history-panel.tsx"),
);
const library = stripComments(
	read("src/features/resume-editor/components/content-library-panel.tsx"),
);
const editor = stripComments(
	read("src/features/resume-editor/resume-editor.tsx"),
);

/**
 * For each `xxx.useQuery(...)` binding, is there an `xxx.isError` branch anywhere in
 * the same file?
 *
 * Loose by design — file scope rather than expression scope — because the real
 * requirement is "the user can be told", and a panel may reasonably route all of its
 * error reporting through one branch or a wrapper. The precise ordering that actually
 * produced the lie is asserted separately, on the file that had it.
 */
function queryBindings(src: string) {
	return [...src.matchAll(/const (\w+) = api\.\w+\.\w+\.useQuery\(/g)].map(
		(m) => m[1] as string,
	);
}

describe("no query in the editor is mute", () => {
	it("found the queries to check", () => {
		expect(queryBindings(history).length).toBeGreaterThanOrEqual(2);
		expect(queryBindings(library).length).toBeGreaterThanOrEqual(3);
	});

	it.each([
		["history-panel", history, queryBindings(history)],
		["content-library-panel", library, queryBindings(library)],
	])("%s handles an error for every query it makes", (_name, src, bindings) => {
		const missing = bindings.filter((b) => !src.includes(`${b}.isError`));
		expect(missing, `no error branch for: ${missing.join(", ")}`).toEqual([]);
	});

	it("the shared error primitive exists for them to use", () => {
		expect(ui).toMatch(/export function PanelError/);
		expect(ui).toMatch(/role="alert"/);
		// A retry must be possible, or "failed" is a dead end.
		expect(ui).toMatch(/onRetry\?: \(\) => void/);
	});
});

describe("the error branch is checked before the empty branch", () => {
	/*
	 * Presence of `isError` is not enough. This is the exact ordering that shipped the
	 * lie in `history-panel.tsx`: `isPending` → `length === 0` → the empty message, with
	 * no `isError` in between, so a failure rendered "No saved versions yet".
	 */
	it("history panel checks isError between loading and empty", () => {
		const pending = history.indexOf("list.isPending");
		const error = history.indexOf("list.isError");
		const empty = history.indexOf("revisions.length === 0");

		expect(pending, "no loading branch").toBeGreaterThan(-1);
		expect(error, "no error branch").toBeGreaterThan(-1);
		expect(empty, "no empty branch").toBeGreaterThan(-1);
		expect(error, "error branch is after the empty branch").toBeLessThan(empty);
		expect(error).toBeGreaterThan(pending);
	});

	it("the empty message no longer doubles as the failure message", () => {
		// If the failed-load text and the genuinely-empty text are the same string, the
		// ordering fix above is the only thing holding it together.
		const emptyMsg = history.match(/No saved versions yet[^<"]*/)?.[0];
		expect(emptyMsg).toBeTruthy();
		expect(history).toMatch(/Could not load your saved versions/);
		expect(history).not.toMatch(
			/No saved versions yet[\s\S]{0,80}isError[\s\S]{0,200}No saved versions/,
		);
	});

	it("a failed snapshot is reported, not rendered as nothing", () => {
		// Previously `diff` was null on failure and the branch ended in `: null`, so the
		// pane went blank with no error at all.
		expect(history).toMatch(/snapshot\.isError/);
		expect(history).toMatch(/Could not load that version/);
	});
});

describe("mutations report failure too", () => {
	it("the history panel surfaces failed writes", () => {
		expect(history).toMatch(/createRevision\.isError/);
		expect(history).toMatch(/restore\.isError/);
		expect(history.match(/role="alert"/g)?.length ?? 0).toBeGreaterThanOrEqual(
			2,
		);
	});

	it("the editor has one alert surface for its own writes", () => {
		expect(editor).toMatch(/editorError \? \(/);
		expect(editor).toMatch(/role="alert"/);
	});

	it("no console remains as the error surface", () => {
		for (const [name, src] of [
			["resume-editor", editor],
			["history-panel", history],
		] as const) {
			expect(
				src.match(/console\.(error|log)\(/g) ?? [],
				`${name} still uses the console`,
			).toEqual([]);
		}
	});
});
