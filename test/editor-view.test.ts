import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The editor shell: what it shows, what it hides, and what it must never disagree with.
 *
 * There is no DOM in CI — the Typst WASM is CDN-loaded and the editor sits behind
 * Clerk — so these assert on source. That is weaker than a render test, and an
 * earlier version of the repo's own review tests learned the lesson the hard way:
 * an assertion that matched a phrase in this file's doc comment was testing the
 * comment, not the product. So every assertion below either strips comments first
 * or targets markup, and each one is paired with the shipped bug it would have
 * caught.
 */

const read = (p: string) => readFileSync(p, "utf8");

const editorSrc = read("src/features/resume-editor/resume-editor.tsx");
const exporterSrc = read("src/components/export/export-buttons.tsx");
const autoSaveSrc = read("src/hooks/use-auto-save.ts");
const variationSrc = read(
	"src/features/resume-editor/components/variation-manager.tsx",
);

/**
 * Comments carry a lot of deliberate reasoning in this repo — including an
 * explanation of the very bug a neighbouring assertion is about. Left in, those
 * comments satisfy the assertion on their own.
 */
const stripComments = (src: string) =>
	src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const editor = stripComments(editorSrc);
const exporter = stripComments(exporterSrc);
const variation = stripComments(variationSrc);

describe("the export matches what the preview shows", () => {
	/*
	 * The single worst defect this overhaul found. `TypstPreview` was handed
	 * `draftResume` and `ExportButtons` was handed `activeResume`. Type an edit, do not
	 * wait for the debounce, export — and the file silently omits the edit you are
	 * looking at. There is no way to notice from outside the app.
	 */
	it("hands the exporter the same resume it hands the preview", () => {
		const exportResume = editor.match(
			/<ExportButtons[\s\S]*?resume=\{([^}]+)\}/,
		)?.[1];
		const previewResume = editor.match(
			/<TypstPreview[\s\S]*?resume=\{([^}]+)\}/,
		)?.[1];

		expect(exportResume, "ExportButtons has no resume prop").toBeTruthy();
		expect(previewResume, "TypstPreview has no resume prop").toBeTruthy();
		expect(exportResume).toBe(previewResume);
	});

	it("uses the draft, not the saved resume, for both", () => {
		// Guarded separately from the equality above so the failure says *which* side
		// regressed rather than just "they differ".
		expect(editor).toMatch(
			/<TypstPreview[\s\S]*?resume=\{draftResume \?\? activeResume\}/,
		);
		expect(editor).not.toMatch(
			/<ExportButtons[\s\S]{0,200}?resume=\{activeResume\}/,
		);
	});

	it("warns in the export menu when the file contains unsaved edits", () => {
		// Exporting the draft is the right call, but the user still has to know the
		// server does not have a copy.
		expect(editor).toMatch(/hasUnsavedChanges=\{isDirty\}/);
		expect(exporter).toMatch(/hasUnsavedChanges/);
		expect(exporter).toMatch(/unsaved changes/i);
	});
});

describe("the editor tells the user when a write fails", () => {
	/*
	 * Every mutation handler here used to `console.error` and return. A rejected write
	 * was invisible in the product: the form kept claiming unsaved changes with no way
	 * to tell a slow network from a refusal, and a section that failed to add simply
	 * never appeared. A console is not an error state.
	 */
	it("has no swallowed failures left", () => {
		const swallowed = editor.match(/console\.(error|log)\(/g) ?? [];
		expect(swallowed, `still swallowing: ${swallowed.join(", ")}`).toEqual([]);
	});

	it("reports through one surface rather than eight consoles", () => {
		expect(editor).toMatch(/const \[editorError, setEditorError\]/);
		expect(editor).toMatch(/reportError\(/);
		// Every failure path goes through the reporter.
		expect(editor.match(/reportError\(/g)?.length ?? 0).toBeGreaterThanOrEqual(
			7,
		);
	});

	it("renders the error where a keyboard user will reach it, and announces it", () => {
		expect(editor).toMatch(/editorError \? \(/);
		expect(editor).toMatch(/role="alert"/);
		expect(editor).toMatch(/aria-label="Dismiss this error"/);
	});

	it("can clear an error", () => {
		// An error that cannot be dismissed becomes wallpaper.
		expect(editor).toMatch(/onClick=\{\(\) => setEditorError\(null\)\}/);
	});
});

describe("no control is shipped that does nothing", () => {
	/*
	 * `handleCreateVariation` was a `console.log` behind a complete, working-looking
	 * dialog: fill in a name, press the button, nothing happened, no error. The class
	 * of bug is the same one that shipped a `TabsContent` with no `TabsTrigger` — a
	 * surface that looks like a feature and is not reachable to a real outcome.
	 */
	it("does not ship a create-variation handler that only logs", () => {
		expect(editor).not.toMatch(/handleCreateVariation/);
	});

	it("hides the create control when the host cannot create", () => {
		expect(variation).toMatch(/onCreateVariation\?:/);
		expect(variation).toMatch(/\{onCreateVariation \? \(/);
	});

	it("drops the activity log, which was permanently empty", () => {
		// `currentActivityLog` was a hardcoded `[]` with a "can be implemented later"
		// comment, so the rail permanently offered an Activity section reading
		// "0 changes / No activity yet" -- implying a feature that did not exist and
		// occupying prime space above the Sections list.
		expect(editor).not.toMatch(/currentActivityLog/);
		expect(editor).not.toMatch(/Activity/);
		expect(editor).not.toMatch(/ChangeLog/);
	});
});

describe("the panes are proportioned for the task", () => {
	/*
	 * Was 20 / 30 / 50. The rail holds lists; the form is where all the editing
	 * happens; the preview is a fixed-aspect page that scrolls anyway. The form being
	 * the narrowest working surface was backwards.
	 */
	const sizes = () => {
		const found: Record<string, string> = {};
		for (const m of editor.matchAll(
			/<Panel[^>]*?id="([a-z-]+)"[^>]*?defaultSize="([^"]+)"/g,
		)) {
			if (m[1] && m[2]) found[m[1]] = m[2];
		}
		for (const m of editor.matchAll(
			/<Panel[^>]*?defaultSize="([^"]+)"[^>]*?id="([a-z-]+)"/g,
		)) {
			if (m[2] && m[1] && !found[m[2]]) found[m[2]] = m[1];
		}
		return found;
	};

	it("gives the form more room than the rail", () => {
		const s = sizes();
		expect(s["left-panel"]).toBeTruthy();
		expect(s["form-panel"]).toBeTruthy();
		const pct = (v: string) => Number.parseInt(v, 10);
		expect(pct(s["form-panel"] as string)).toBeGreaterThan(
			pct(s["left-panel"] as string),
		);
	});

	it("gives the form more room than it used to", () => {
		expect(sizes()["form-panel"]).toBe("38%");
	});

	it("does not let any pane collapse to nothing", () => {
		for (const id of ["left-panel", "form-panel", "right-panel"]) {
			const min = editor.match(
				new RegExp(`<Panel[^>]*?id="${id}"[^>]*?minSize="([^"]+)"`),
			)?.[1];
			expect(min, `${id} has no minSize`).toBeTruthy();
			expect(Number.parseInt(min as string, 10)).toBeGreaterThanOrEqual(12);
		}
	});

	it("does not double-specify the body height", () => {
		// `flex-1` plus `calc(100vh - 56px)` went stale the moment the error banner was
		// added above it, and would have clipped the bottom of the panes.
		expect(editor).not.toMatch(/calc\(100vh/);
		expect(editor).toMatch(/className="min-h-0 flex-1 overflow-hidden"/);
	});
});

describe("controls stop competing with the document", () => {
	/*
	 * `FormattingToolbar` is 692 lines of typography, margins, colour and scale. It
	 * used to sit permanently above the preview in the same column, so on a laptop the
	 * document you opened the editor to look at was permanently smaller than the
	 * controls that shape it.
	 */
	it("collapses the typography controls by default", () => {
		expect(editor).toMatch(
			/const \[typeControlsOpen, setTypeControlsOpen\] = useState\(false\)/,
		);
		expect(editor).toMatch(/<CollapsibleContent>\s*<FormattingToolbar/);
	});

	it("gives every disclosure its own flag", () => {
		// One `designOpen` driving two disclosures on opposite sides of the screen meant
		// opening the rail's Templates also shoved the preview's toolbar open.
		const owners = [
			...editor.matchAll(/onOpenChange=\{(set[A-Za-z]+)\}/g),
		].map((m) => m[1] as string);
		expect(new Set(owners).size, "two disclosures share one flag").toBe(
			owners.length,
		);
		for (const flag of [
			"setTypeOpen",
			"setTypeControlsOpen",
			"setLibraryOpen",
		]) {
			expect(owners, `${flag} drives no disclosure`).toContain(flag);
		}
	});

	it("collapses the rail's template list by default too", () => {
		expect(editor).toMatch(
			/const \[typeOpen, setTypeOpen\] = useState\(false\)/,
		);
	});

	it("collapses the content library by default", () => {
		// It runs three queries and competes with the Sections list, which is the thing
		// reached for constantly.
		expect(editor).toMatch(
			/const \[libraryOpen, setLibraryOpen\] = useState\(false\)/,
		);
	});
});

describe("unsaved work survives leaving a section", () => {
	/*
	 * `useAutoSave`'s unmount cleanup cleared the debounce timer and returned, so an
	 * edit made inside the debounce window was dropped when the form unmounted --
	 * which happens on every section switch, the most common action in the editor.
	 * The edit was invisible in its absence because `onLocalUpdate` had already put it
	 * in the draft, so the preview kept showing it.
	 */
	it("flushes on unmount rather than clearing the timer", () => {
		expect(autoSaveSrc).toMatch(/shouldFlushOnUnmount\(\{/);
		expect(autoSaveSrc).not.toMatch(
			/clearTimeout\(debounceTimerRef\.current\);\s*}\s*;\s*}, \[\]\);/,
		);
	});

	it("derives dirty from the data, not from the status label", () => {
		// `status` is a label for the debounce. Between "user typed" and "debounce
		// fired" it was briefly `saved`, so `isDirty` reported false with an edit
		// genuinely unsaved -- and `useBeforeUnload` is wired to it.
		expect(autoSaveSrc).toMatch(
			/const isDirty = JSON\.stringify\(localData\) !== savedDataRef\.current;/,
		);
	});
});
