import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { errorMessageToShow } from "@/components/ui/save-status-indicator";

/**
 * Every section form must be able to say *what* failed, not only that something did.
 *
 * ## The defect
 *
 * `useAutoSave` captures a message on failure and every form passes it down:
 *
 *     <SaveStatusIndicator error={error} onRetry={retrySave} status={status} />
 *
 * `SaveStatusIndicator` destructured `error` and never rendered it. The indicator showed
 * a red "Save failed" and a Retry button, so the one piece of information that would let
 * someone tell a network blip from a validation rejection never reached the screen. It was
 * the only unused prop in the component, and its own doc comment promised
 * `"Save failed"` with a retry button while describing an error state it did not show.
 *
 * Separately, `rich-text-editor.tsx` destructured `status` and `error` from the same hook
 * and ignored both — making it the **only** section form in the app that autosaved with
 * no visible state while its siblings all reported theirs.
 *
 * ## Why `errorMessageToShow` is tested rather than the component
 *
 * The component cannot be verified by rendering it. `displayState` begins as `"hidden"`
 * and only becomes `"error"` inside an effect, so a server render always produces the
 * hidden markup and would pass whether or not the message is ever displayed. That is the
 * same trap this repo has already hit twice — `renderToStaticMarkup` and the
 * duplicate-key warning — where the thing worth asserting is unreachable from the render a
 * test can perform.
 *
 * So the decision is extracted into a pure function and tested directly, and the wiring
 * itself is asserted against the source. That split is honest about what is proven where.
 */

const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("errorMessageToShow", () => {
	it("returns a real message", () => {
		expect(errorMessageToShow("Network request failed")).toBe(
			"Network request failed",
		);
	});

	it("returns null when there is no message", () => {
		expect(errorMessageToShow(undefined)).toBeNull();
		expect(errorMessageToShow(null)).toBeNull();
		expect(errorMessageToShow("")).toBeNull();
		expect(errorMessageToShow("   \n\t ")).toBeNull();
	});

	it("refuses a non-string, so an Error or stack cannot reach a toolbar slot", () => {
		expect(errorMessageToShow(new Error("boom"))).toBeNull();
		expect(errorMessageToShow({ message: "boom" })).toBeNull();
		expect(errorMessageToShow(42)).toBeNull();
	});

	it("collapses whitespace, because a multi-line stack must not break the layout", () => {
		expect(
			errorMessageToShow("Failed to save\n\n  at save()\n  at save()"),
		).toBe("Failed to save at save() at save()");
	});
});

describe("the indicator renders the message it is given", () => {
	const source = read("../src/components/ui/save-status-indicator.tsx");

	it("puts the message in the DOM rather than only in a title attribute", () => {
		// Both, actually: visible text plus the full string on `title` for pointer users.
		expect(source).toContain("errorMessageToShow(error)");
		expect(source).toContain("title={message}");
		expect(source).toContain("{message}");
	});

	it("no longer destructures the error prop without using it", () => {
		// The lint finding that marked this is what made it visible in the first place.
		expect(source).not.toMatch(
			/\{\s*status,\s*error,\s*onRetry,\s*className\s*\}\s*:\s*SaveStatusIndicatorProps/,
		);
	});
});

describe("the rich-text editor reports its save state like every other form", () => {
	const source = read(
		"../src/components/rich-text-editor/rich-text-editor.tsx",
	);

	it("renders SaveStatusIndicator", () => {
		expect(source).toContain("<SaveStatusIndicator");
	});

	it("passes all three of status, error and onRetry", () => {
		// Passing status alone would still hide failures; passing error alone would still
		// hide pending writes. All three or it is not reporting anything.
		expect(source).toMatch(
			/<SaveStatusIndicator[\s\S]{0,200}error=\{error\}[\s\S]{0,200}onRetry=\{retrySave\}[\s\S]{0,200}status=\{status\}/,
		);
	});

	it("takes retrySave from the hook so Retry actually retries", () => {
		// Matched with whitespace tolerance rather than an exact substring: the first
		// version asserted `toContain("retrySave } = useAutoSave(")`, and the formatter
		// re-wrapped that destructure across several lines, so the test then failed on
		// layout rather than on behaviour. That is the wrong thing for a test to assert.
		const destructure = source.match(
			/const\s*\{[\s\S]{0,240}?\}\s*=\s*useAutoSave\(/,
		);
		expect(
			destructure,
			"expected useAutoSave to be destructured",
		).not.toBeNull();
		expect(destructure?.[0]).toContain("retrySave");
		expect(destructure?.[0]).toContain("status");
		expect(destructure?.[0]).toContain("error");
	});

	it("does not gate the save state behind showToolbar", () => {
		// Save state is not optional. Sharing a visibility flag with the formatting
		// toolbar would hide it for anyone who turns the toolbar off.
		const indicatorIndex = source.indexOf("<SaveStatusIndicator");
		const toolbarIndex = source.indexOf("<MenuBar editor={editor} />");
		expect(indicatorIndex).toBeGreaterThan(-1);
		expect(indicatorIndex).toBeLessThan(toolbarIndex);
	});
});

describe("the import panel surfaces a section that failed to save", () => {
	const source = read(
		"../src/features/resume-editor/components/import-review-panel.tsx",
	);

	it("renders the captured error rather than only holding it in state", () => {
		// The panel has three outcomes — reading, refusing to read, reviewing — and the
		// refusal case has a full explanation. A section that then failed to *save* had no
		// surface at all: the row turned red and the server's message was dropped.
		expect(source).toContain("<PanelError");
		expect(source).toContain("message={error}");
	});

	it("offers a retry that re-saves that specific section", () => {
		expect(source).toContain("failedSectionIndex");
		expect(source).toMatch(
			/onRetry=\{[\s\S]{0,320}handleAdd\(failedSectionIndex\)/,
		);
		// A retry that cannot name what it is retrying is an affordance with no action.
		expect(source).toContain("Save this section again");
	});

	it("forgets the failed section when the error is cleared", () => {
		// Otherwise a later, unrelated failure would inherit a retry target from an earlier
		// one and re-save the wrong section.
		const cleared = source.match(/setError\(undefined\);/g) ?? [];
		expect(cleared.length).toBeGreaterThan(0);
		expect(source).toContain("setFailedSectionIndex(undefined)");
	});

	it("records the failing index at the point of failure", () => {
		expect(source).toMatch(
			/onError:[\s\S]{0,200}setFailedSectionIndex\(sectionIndex\)/,
		);
	});
});
