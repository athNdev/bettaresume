import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

/**
 * Wave 4 pins the affordances that make the editor honest about what it is doing:
 * a template you can recognise without trying it, a library you can search before it
 * outgrows a scrollbar, and import copy that explains what a variation is for.
 *
 * These assert on source for the reason `test/content-library-panel.test.ts` states:
 * there is no DOM in CI, so a render assertion is not available. `codeOf()` is used
 * for every absence check so a comment cannot satisfy it.
 */

const templates = codeOf(
	"src/features/resume-editor/components/template-selector.tsx",
);
const library = codeOf(
	"src/features/resume-editor/components/content-library-panel.tsx",
);
const variations = codeOf(
	"src/features/resume-editor/components/variation-manager.tsx",
);
const dashboard = codeOf("src/features/dashboard/dashboard.tsx");
const editor = codeOf("src/features/resume-editor/resume-editor.tsx");

describe("the template selector shows the template, not its name", () => {
	it("each row renders a specimen as well as a label", () => {
		expect(templates).toMatch(/function TemplateSpecimen/);
		expect(templates).toMatch(/<TemplateSpecimen template=\{template\} \/>/);
		// The name alone was the whole of the old control.
		expect(templates).not.toMatch(
			/type="button"\s*>\s*\{template\.name\}\s*<\/button>/,
		);
	});

	it("the specimen reads its colours from TEMPLATE_CONFIGS", () => {
		// A selector that painted its own idea of a template would drift from the PDF
		// the moment either the config or the Typst file changed.
		expect(templates).toMatch(/template\.defaultColors/);
		expect(templates).not.toMatch(/#[0-9a-f]{6}/i);
	});

	it("every archetype gets a specimen, from data rather than a branch", () => {
		// The map is `Record<TemplateType, Specimen>`, so adding a seventh archetype is a
		// type error instead of a selector that quietly draws the standard specimen for it.
		expect(templates).toMatch(/Record<TemplateType, Specimen>/);
		expect(templates).toMatch(/SPECIMENS\[template\.id\]/);
		// The old selector branched on three hard-coded ids; the archetypes are data now.
		expect(templates).not.toMatch(/isPostgrad|isUndergrad/);
	});

	it("the specimen is decorative, not a second announcement", () => {
		expect(templates).toMatch(/aria-hidden="true"/);
		expect(templates).toMatch(/pointer-events-none/);
	});

	it("the current template is announced as pressed", () => {
		expect(templates).toMatch(/aria-pressed=\{isCurrent\}/);
	});
});

describe("the content library can be searched", () => {
	it("has a query input labelled for assistive tech", () => {
		expect(library).toMatch(/aria-label="Search your library"/);
		expect(library).toMatch(
			/onChange=\{\(e\) => setQuery\(e\.target\.value\)\}/,
		);
	});

	it("filters the rendered list, not a copy of it", () => {
		// Rendering `items` while filtering `filteredItems` is the classic version of
		// this bug: the search box appears to do nothing.
		expect(library).toMatch(/filteredItems\.map\(/);
		expect(library).not.toMatch(/items\.map\(\(item\) => \(/);
	});

	it("says so when the search matches nothing", () => {
		// An empty list under a search box reads as "your library is empty", which is
		// a claim about the user's data that is not true.
		expect(library).toMatch(/Nothing in your library matches that search/);
	});

	it("only offers a type filter when there is more than one type", () => {
		expect(library).toMatch(/availableTypes\.length > 1/);
	});

	it("the search is memoised against the same values it reads", () => {
		expect(library).toMatch(/\}, \[items, query, typeFilter\]\);/);
	});
});

describe("creating a variation explains what it does", () => {
	it("the copy covers linking, detaching and when to fork", () => {
		// The formatter rewraps JSX text, so match across line breaks.
		expect(variations).toMatch(/every\s+section\s+linked\s+to\s+it/);
		expect(variations).toMatch(/detach/);
		expect(variations).toMatch(/keeps\s+following\s+the\s+base/);
	});

	it("does not promise a variation is a plain copy", () => {
		// The old copy said "customize for a specific role", which describes a copy with
		// no link — the opposite of what createVariation does.
		expect(variations).not.toMatch(
			/customize for a\s*specific role or company/,
		);
	});
});

describe("importing from the dashboard cannot silently replace a document", () => {
	it("asks before anything is written for a document it had to read", () => {
		// The JSON branch is a restore of an exact export: nothing was interpreted, so
		// there is nothing to review. The gate is for the formats that had to be parsed,
		// where a heading can be misread.
		const handler = dashboard.slice(
			dashboard.indexOf("const handleImportResume"),
		);
		const parsedPath = handler.slice(
			handler.indexOf("const result = sectionResumeText(text)"),
		);
		const confirmAt = parsedPath.indexOf("await confirm(");
		const writeAt = parsedPath.indexOf("bulkUpsertSections.mutateAsync(");
		expect(confirmAt).toBeGreaterThan(-1);
		expect(writeAt).toBeGreaterThan(-1);
		expect(confirmAt).toBeLessThan(writeAt);
	});

	it("aborts the import when the user declines", () => {
		expect(dashboard).toMatch(/if \(!confirmed\) return;/);
	});

	it("the question names the sections found and promises no overwrite", () => {
		expect(dashboard).toMatch(/Found: \$\{names\}\$\{more\}/);
		expect(dashboard).toMatch(/nothing in an existing one is changed/);
	});

	it("still reports a failed parse rather than swallowing it", () => {
		const handler = dashboard.slice(
			dashboard.indexOf("const handleImportResume"),
		);
		expect(handler).toMatch(/catch \(err\)/);
		expect(handler).toMatch(/Could not import/);
	});
});

describe("the editor saves what is on screen", () => {
	it("binds the platform save shortcut", () => {
		expect(editor).toMatch(/metaKey|ctrlKey/);
		expect(editor).toMatch(/flushPendingSaves/);
	});

	it("shows the name and type of the section being edited", () => {
		expect(editor).toMatch(/selectedSection/);
	});

	it("reports the page count next to the preview", () => {
		expect(editor).toMatch(/pageCount|pages/);
	});
});
