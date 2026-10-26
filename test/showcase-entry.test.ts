import { describe, expect, it } from "vitest";
import { orderShowcaseFirst } from "@/lib/showcase";
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

describe("the library order is a decision, not a timestamp", () => {
	const resume = (
		id: string,
		tags: string[] | null,
		variationType?: string,
	) => ({ id, tags, variationType });

	it("pins the example's base first, then its variations, then the rest", () => {
		const library = [
			resume("other-new", null),
			resume("cv", ["showcase"], "variation"),
			resume("other-old", ["platform"]),
			resume("one-pager", ["showcase"], "base"),
		];
		expect(orderShowcaseFirst(library).map((r) => r.id)).toEqual([
			"one-pager",
			"cv",
			"other-new",
			"other-old",
		]);
	});

	it("leaves a library with no example exactly as the query returned it", () => {
		const library = [resume("a", null), resume("b", ["x"])];
		expect(orderShowcaseFirst(library).map((r) => r.id)).toEqual(["a", "b"]);
	});

	it("does not mutate the input", () => {
		const library = [resume("a", null), resume("b", ["showcase"])];
		orderShowcaseFirst(library);
		expect(library.map((r) => r.id)).toEqual(["a", "b"]);
	});
});

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

	it("orders the library by the example first, not by recency", () => {
		// The seed's full CV has a later `updatedAt`, so recency put the weaker
		// artefact first and could separate the pair.
		expect(dashboard).toMatch(/orderShowcaseFirst\(matched\)/);
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

	it("anchors the result count to the grid", () => {
		// It used to sit against the page's right edge, above the filter rail and
		// unconnected to the cards it counted.
		expect(dashboard).toMatch(/data-grid-count/);
		const count = dashboard.indexOf("data-grid-count");
		const card = dashboard.indexOf("pagedResumes.map");
		expect(card).toBeGreaterThan(-1);
		expect(count).toBeLessThan(card);
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

	it("distinguishes a failed library load from a library without an example", () => {
		// Both used to render nothing, so "we could not load it" and "there is not
		// one" looked identical.
		expect(editor).toMatch(/data-example-unavailable/);
		expect(editor).toMatch(/Example unavailable/);
		expect(editor).toMatch(/refetchDocuments/);
	});

	it("gives the narrow header a designed variant instead of a truncation", () => {
		expect(editor).toMatch(/compact: isNarrowHeader/);
	});
});
