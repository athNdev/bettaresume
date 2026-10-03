import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The section outline is the editor's primary navigation: everything else hangs off
 * selecting a section. It had three defects that made it unusable without a mouse,
 * and all three are the kind that review does not catch, because a mouse works.
 *
 * 1. **Selection was mouse-only.** The row was a `div` with an `onClick`, so it was
 *    not focusable and had no keyboard handler. A keyboard user could not select a
 *    section, which means they could not reach any form, so the entire editor was
 *    unreachable. This is the defect that motivated the whole overhaul.
 * 2. **Three icon buttons per row had no accessible name** — a screen reader announced
 *    three consecutive "buttons" with nothing to distinguish them.
 * 3. **The actions were `opacity-0` until `group-hover`.** They stayed in the tab
 *    order while invisible, so keyboard users tabbed onto controls they could not see
 *    and had no way to know they were there.
 *
 * Plus: `DndContext` shipped no announcements, so a keyboard reorder announced
 * dnd-kit's default — "Draggable item 3 moved over droppable area 5", which is two
 * lists of positions and no content, on a list where the position *is* the meaning.
 *
 * Source assertions, because there is no DOM in CI. Comments are stripped first:
 * these files explain the bugs above in prose, and an assertion that matches its own
 * documentation is not testing anything.
 */

const read = (p: string) => readFileSync(p, "utf8");
const stripComments = (src: string) =>
	src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const managerSrc = read(
	"src/features/resume-editor/components/sections-manager.tsx",
);
const manager = stripComments(managerSrc);

describe("a section can be selected with a keyboard", () => {
	it("does not put the click handler on a div", () => {
		// The specific regression. A `div` with onClick is not focusable and generates
		// no keyboard activation.
		expect(manager).not.toMatch(/<div[^>]*onClick=\{\(\) => onSelect/);
		expect(manager).not.toMatch(/onClick=\{\(\) => onSelect\([^)]*\)\}\s*ref=/);
	});

	it("selects through a real button", () => {
		expect(manager).toMatch(
			/<button[\s\S]{0,220}onClick=\{\(\) => onSelect\(section\.id\)\}/,
		);
	});

	it("marks the selected row for assistive tech, not only for sighted users", () => {
		// `aria-current` is what communicates "this is the one you are editing".
		expect(manager).toMatch(
			/aria-current=\{isSelected \? "true" : undefined\}/,
		);
	});

	it("marks the outline as a list with a name", () => {
		expect(manager).toMatch(/<ul[^>]*aria-label="Resume sections/);
		expect(manager).toMatch(/<li key=\{section\.id\}>/);
	});
});

describe("every control in a row has an accessible name", () => {
	/**
	 * A button can be named by `aria-label` or by its text content, and the outline has
	 * exactly three icon-only controls per row. They were three unnamed buttons in a
	 * list of thirteen sections, so a screen-reader user met thirty-nine anonymous
	 * controls with no way to tell "hide this" from "delete this".
	 *
	 * Targeted by name rather than by enumerating every `<button>`: the icons come
	 * from lucide, so the accessible name has to be on the control, not on the glyph.
	 */
	it("names the drag handle after the section it moves", () => {
		expect(manager).toMatch(/aria-label=\{`Reorder \$\{title\}`\}/);
	});

	it("says what the visibility toggle will do, and to which section", () => {
		expect(manager).toMatch(
			/aria-label=\{`\$\{section\.visible \? "Hide" : "Show"\} \$\{title\}`\}/,
		);
	});

	it("names the overflow menu", () => {
		expect(manager).toMatch(/aria-label=\{`More actions for \$\{title\}`\}/);
	});

	it("gives each of the three an aria-label rather than relying on the glyph", () => {
		const labels = [...manager.matchAll(/aria-label=\{`([^`]*)`\}/g)].map(
			(m) => m[1],
		);
		expect(labels).toEqual(
			expect.arrayContaining([
				expect.stringContaining("Reorder"),
				expect.stringContaining("Hide"),
				expect.stringContaining("More actions"),
			]),
		);
	});

	it("includes the section type in the delete action", () => {
		// "Delete Section" thirteen times tells the user nothing about which one.
		expect(manager).toMatch(
			/Delete \{SECTION_CONFIGS\[section\.type\]\.label\}/,
		);
	});

	it("labels the section type of every row through the shared config", () => {
		// The accessible names above are all built from `title`, so the type has to be
		// reachable from it.
		expect(manager).toMatch(/const title = titleOf\(section\);/);
		expect(manager).toMatch(
			/section\.content\.title \|\| SECTION_CONFIGS\[section\.type\]\.defaultTitle/,
		);
	});
});

describe("hidden controls are not focusable", () => {
	it("reveals the actions on focus, not only on hover", () => {
		// `opacity-0 group-hover:opacity-100` leaves the controls in the tab order while
		// invisible.
		expect(manager).toMatch(/group-focus-within:opacity-100/);
	});

	it("shows the drag handle when it is focused", () => {
		expect(manager).toMatch(/focus-visible:opacity-100/);
	});
});

describe("keyboard reordering is announced in terms of the document", () => {
	it("passes announcements to DndContext", () => {
		expect(manager).toMatch(/<DndContext[\s\S]*?accessibility=\{\{/);
		expect(manager).toMatch(
			/accessibility=\{\{ announcements, screenReaderInstructions \}\}/,
		);
	});

	it("gives instructions that name the keys", () => {
		// dnd-kit's default instruction is generic; it has to say which keys do what.
		expect(manager).toMatch(/screenReaderInstructions/);
		expect(manager).toMatch(/Space/);
		expect(manager).toMatch(/arrow keys/i);
		expect(manager).toMatch(/Escape/);
	});

	it("announces each phase of the drag", () => {
		for (const phase of [
			"onDragStart",
			"onDragOver",
			"onDragEnd",
			"onDragCancel",
		]) {
			expect(manager, `no ${phase} announcement`).toContain(phase);
		}
	});

	it("names the section and its position rather than speaking in indices", () => {
		// "Draggable item 3 was moved over droppable area 5" is useless on a document
		// outline, where being third means "your third section".
		expect(manager).toMatch(/Picked up \$\{titleOf\(section\)\}/);
		expect(manager).toMatch(
			/position \$\{[^}]+\} of \$\{sortedSections\.length\}/,
		);
		expect(manager).toMatch(/Dropped \$\{titleOf\(section\)\}/);
		expect(manager).toMatch(/Reordering cancelled/);
	});

	it("does not ship dnd-kit's index-only defaults", () => {
		expect(manager).not.toMatch(/Draggable item \d/);
		expect(manager).not.toMatch(/droppable area \d/);
	});

	it("wires the instructions to the handle, rather than orphaning them", () => {
		// An `sr-only` paragraph nobody references is invisible to everyone.
		expect(manager).toMatch(/aria-describedby=\{describedById\}/);
		expect(manager).toMatch(/id=\{instructionsId\}/);
		expect(manager).toMatch(/describedById=\{instructionsId\}/);
	});
});

describe("the empty state reads as a state, not a caption", () => {
	it("puts the message before the control that resolves it", () => {
		// Previously "Add Section" came first, so "No sections yet" read as a label on
		// the button rather than as the state of the document.
		const emptyAt = manager.indexOf("No sections yet");
		const addAt = manager.indexOf("Add Section");
		expect(emptyAt).toBeGreaterThan(-1);
		expect(addAt).toBeGreaterThan(-1);
		expect(emptyAt, "empty state is below the Add button").toBeLessThan(addAt);
	});
});

describe("nothing in the outline is a colour-only signal", () => {
	it("says Hidden in text as well as lowering opacity", () => {
		// `opacity-60` alone is invisible to a screen reader and unreliable for anyone
		// who cannot perceive the difference.
		expect(manager).toMatch(/uppercase[\s\S]{0,120}Hidden/);
	});
});
