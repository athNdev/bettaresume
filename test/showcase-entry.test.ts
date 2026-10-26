import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

/**
 * The showcase's UI half: it has to be obvious which resume is the example, and there
 * has to be a way to reach it from both the populated dashboard and the empty state.
 *
 * Source assertions, for the reason `test/content-library-panel.test.ts` gives: CI has no
 * DOM and does not mount the dashboard. `codeOf()` is used for every absence check so a
 * comment cannot satisfy it.
 */

const showcase = codeOf("src/lib/showcase.ts");
const dashboard = codeOf("src/features/dashboard/dashboard.tsx");
const card = codeOf("src/features/dashboard/components/resume-card.tsx");
const editor = codeOf("src/features/resume-editor/resume-editor.tsx");

describe("the showcase is identifiable by tag, not by id", () => {
	it("exports the tag the seed writes", () => {
		expect(showcase).toMatch(/SHOWCASE_TAG = "showcase"/);
		expect(showcase).toMatch(/export function isShowcase/);
		expect(showcase).toMatch(/export function findShowcase/);
	});

	it("prefers the base document over a variation", () => {
		// The one-pager is the document to open; the full CV is reachable from it.
		expect(showcase).toMatch(/variationType === "base"/);
	});

	it("does not hard-code the seeded id in the dashboard", () => {
		// Re-seeding must not break the entry point.
		expect(dashboard).not.toMatch(/showcase-base|showcase-variant/);
	});
});

describe("the dashboard marks the example and links to it", () => {
	it("renders a Showcase badge on the card", () => {
		expect(card).toMatch(/isShowcase\(resume\)/);
		expect(card).toMatch(/Showcase/);
	});

	it("offers the example from the populated dashboard", () => {
		expect(dashboard).toMatch(/findShowcase/);
		expect(dashboard).toMatch(/handleViewShowcase/);
		expect(dashboard).toMatch(/Example resume/);
		expect(dashboard).toMatch(/Open the example resume/);
		expect(dashboard).toMatch(/onClick=\{handleViewShowcase\}/);
	});

	it("also offers it from the empty state", () => {
		// Both entry points, as the brief asks: the banner and the empty state use the
		// same handler so they cannot drift.
		expect(dashboard).toMatch(
			/onViewExample=\{showcase \? handleViewShowcase : undefined\}/,
		);
		expect(dashboard).toMatch(/onViewExample\?: \(\) => void/);
		expect(dashboard).toMatch(/onClick=\{onViewExample\}/);
	});

	it("says the same thing in both places", () => {
		// Two labels for one destination is how an entry point becomes a puzzle.
		const labels = dashboard.match(/Open the example resume/g) ?? [];
		expect(labels.length).toBeGreaterThanOrEqual(2);
	});

	it("names the showcase in the editor header too", () => {
		expect(editor).toMatch(/isShowcase\(activeResume\)/);
		expect(editor).toMatch(/Showcase · /);
	});

	it("is reachable from the editor, not only the dashboard", () => {
		// The report was "I don't see the example resume anywhere". Someone who works
		// in the editor never returns to the dashboard, so the entry point has to be
		// there too — found by tag, and quietly labelled in the same words.
		expect(editor).toMatch(/findShowcase/);
		expect(editor).toMatch(/aria-label="Open the example resume"/);
		expect(editor).toMatch(/showcaseResume\.id !== activeResume\.id/);
	});
});
