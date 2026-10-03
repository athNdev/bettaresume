import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
	PanelClear,
	PanelEmpty,
	PanelError,
	PanelLoading,
} from "../src/components/ui/panel-state";
import { SaveState } from "../src/features/resume-editor/components/save-state";

/**
 * Rendered for real, not asserted on source.
 *
 * These four are plain function components with no hooks and no data fetching, so
 * `renderToStaticMarkup` produces exactly the HTML a browser would receive. That
 * matters here more than usual: the whole reason `panel-state.tsx` exists is that a
 * failed request and an empty result look identical in JavaScript (`data` is
 * `undefined` in both cases), so the only way to be confident a panel tells the
 * truth is to check what it actually renders in each state.
 *
 * The distinction being protected is the one this repo has already shipped wrong:
 * `history-panel.tsx` had `isPending` → `length === 0`, so a failed history query
 * rendered "No saved versions yet. Save one before a big rewrite…" — telling the
 * user their history was empty when the request had simply failed, and inviting the
 * one action that made the gap permanent.
 */

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) =>
	renderToStaticMarkup(node);

describe("a failure is never rendered as emptiness", () => {
	it("marks a failure as an alert, so it is announced", () => {
		// An error that only changes pixels is invisible to a screen-reader user, who
		// is left looking at a panel that appears to have nothing in it.
		const out = html(
			createElement(PanelError, {
				message: "Could not load your library:boom",
			}),
		);
		expect(out).toContain('role="alert"');
	});

	it("shows the underlying reason", () => {
		const out = html(
			createElement(PanelError, {
				message: "Could not load: network unreachable",
			}),
		);
		expect(out).toContain("Could not load: network unreachable");
	});

	it("does not read as an empty state", () => {
		const out = html(createElement(PanelError, { message: "boom" }));
		expect(out).not.toMatch(/nothing|no items|no results|empty/i);
	});

	it("offers a retry that the caller can wire", () => {
		const out = html(
			createElement(PanelError, {
				message: "boom",
				onRetry: () => undefined,
				retryLabel: "Reload",
			}),
		);
		expect(out).toContain("Reload");
		expect(out).toMatch(/<button/);
	});

	/**
	 * An error that renders in the same ink as an empty state is one people learn to
	 * scan past. Caught by mutation: removing the destructive styling from the message
	 * failed nothing until this was asserted.
	 */
	it("looks like a failure, not like an empty panel", () => {
		const out = html(createElement(PanelError, { message: "boom" }));
		// Scoped to the element that carries the message. Asserting "somewhere in the
		// output" passed even after the message itself lost its colour, because the icon
		// and the border still had it -- which is the mutation that found this gap.
		const messageEl = out.match(/<p class="([^"]*)">boom<\/p>/)?.[1];
		expect(messageEl, "no message element").toBeTruthy();
		expect(messageEl).toMatch(/text-destructive/);
		expect(out).toMatch(/border-destructive/);

		const emptyOut = html(createElement(PanelEmpty, { title: "Nothing here" }));
		expect(emptyOut).not.toMatch(/text-destructive/);
		expect(emptyOut).not.toMatch(/border-destructive/);
	});

	it("gives the two states different borders, not only different words", () => {
		const err = html(createElement(PanelError, { message: "boom" }));
		const empty = html(createElement(PanelEmpty, { title: "Nothing here" }));
		expect(err).not.toBe(empty);
	});

	it("omits the retry when there is nothing to retry", () => {
		// A dead retry button is a control that does nothing.
		const out = html(createElement(PanelError, { message: "boom" }));
		expect(out).not.toMatch(/<button/);
	});
});

describe("loading is announced as busy, not just animated", () => {
	it("sets aria-busy and a live region", () => {
		const out = html(createElement(PanelLoading, {}));
		expect(out).toContain('aria-busy="true"');
		expect(out).toContain('aria-live="polite"');
	});

	it("names what is loading", () => {
		expect(html(createElement(PanelLoading, {}))).toContain("Loading");
		expect(
			html(createElement(PanelLoading, { label: "Loading your library…" })),
		).toContain("Loading your library");
	});

	it("reads as loading, not as a result", () => {
		const out = html(createElement(PanelLoading, {}));
		expect(out).not.toMatch(/no results|nothing found/i);
	});
});

describe("empty says what would fill it", () => {
	it("carries a title and a hint", () => {
		const out = html(
			createElement(PanelEmpty, {
				hint: "Add sections to build your resume.",
				title: "No sections yet",
			}),
		);
		expect(out).toContain("No sections yet");
		expect(out).toContain("Add sections to build your resume.");
	});

	it("is not an alert", () => {
		// Empty is not an error. Announcing it as one trains people to ignore alerts.
		const out = html(createElement(PanelEmpty, { title: "Nothing here" }));
		expect(out).not.toContain('role="alert"');
	});

	it("does not claim a failure", () => {
		const out = html(createElement(PanelEmpty, { title: "Nothing here" }));
		expect(out).not.toMatch(/could not|failed|error/i);
	});
});

describe("a pass state names the check, and never scores the document", () => {
	it("says what passed", () => {
		const out = html(
			createElement(PanelClear, {
				hint: "Reading order is single-column and every heading is in the list.",
				title: "No parser-fit issues found",
			}),
		);
		expect(out).toContain("No parser-fit issues found");
		expect(out).toContain("single-column");
	});

	/**
	 * The product's central refusal, asserted on the component that renders success.
	 * A single 0–100 figure is the credibility failure this whole product is built
	 * against, and it is easiest to reintroduce in the one place that says "you passed".
	 */
	it("carries no overall score", () => {
		const out = html(
			createElement(PanelClear, {
				hint: "3 checks passed",
				title: "All clear",
			}),
		);
		expect(out).not.toMatch(/\b\d{1,3}\s*(\/|out of)\s*100\b/);
		expect(out).not.toMatch(/\bscore\b/i);
		expect(out).not.toMatch(/\brating\b/i);
	});
});

describe("the save indicator tells the truth about the session", () => {
	it("reports a write in flight", () => {
		const out = html(
			createElement(SaveState, { isDirty: true, isSaving: true }),
		);
		expect(out).toContain("Saving");
	});

	/*
	 * A write in flight outranks "unsaved". If something is already heading to the
	 * server, "unsaved changes" is true but not the most useful thing to say — and the
	 * two states were previously indistinguishable on screen.
	 */
	it("prefers 'saving' over 'unsaved' while a write is in flight", () => {
		const out = html(
			createElement(SaveState, {
				changeCount: 2,
				isDirty: true,
				isSaving: true,
			}),
		);
		expect(out).toContain("Saving");
		expect(out).not.toContain("Unsaved");
	});

	it("reports unsaved work, and how many areas", () => {
		const out = html(
			createElement(SaveState, {
				changeCount: 3,
				isDirty: true,
				isSaving: false,
			}),
		);
		expect(out).toContain("Unsaved changes");
		expect(out).toContain("3 areas");
	});

	it("uses the singular for one area", () => {
		const out = html(
			createElement(SaveState, {
				changeCount: 1,
				isDirty: true,
				isSaving: false,
			}),
		);
		expect(out).toContain("1 area");
		expect(out).not.toContain("1 areas");
	});

	it("reports saved when there is nothing outstanding", () => {
		const out = html(
			createElement(SaveState, { isDirty: false, isSaving: false }),
		);
		expect(out).toContain("All changes saved");
		expect(out).not.toContain("Unsaved");
	});

	it("is a live region, so the change is announced rather than only painted", () => {
		for (const props of [
			{ isDirty: true, isSaving: false },
			{ isDirty: false, isSaving: true },
			{ isDirty: false, isSaving: false },
		]) {
			expect(html(createElement(SaveState, props))).toContain('role="status"');
		}
	});

	it("never presents a number as a verdict on the document", () => {
		// It counts pending writes, which is a fact about the session.
		for (const props of [
			{ changeCount: 4, isDirty: true, isSaving: false },
			{ isDirty: false, isSaving: false },
		]) {
			const out = html(createElement(SaveState, props));
			expect(out).not.toMatch(/\b\d{1,3}\s*(\/|out of)\s*100\b/);
			expect(out).not.toMatch(/\bscore\b/i);
		}
	});
});
