import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Resume } from "../src/features/resume-editor/types";

/**
 * The review panel is the surface for both analysis engines, so the properties that
 * matter are behavioural guarantees rather than rendering.
 *
 * There is no DOM in CI (the Typst WASM is CDN-loaded), so these assert on source and
 * on the pure `reviewIssueCount` helper. That is weaker than a render test and the file
 * says so — but a render test here would be theatre.
 */

const panel = readFileSync(
	"src/features/resume-editor/components/review-panel.tsx",
	"utf8",
);
const editor = readFileSync(
	"src/features/resume-editor/resume-editor.tsx",
	"utf8",
);

/**
 * Comments are stripped before assertions about what the user sees.
 *
 * The first version of the "no score" test matched the phrase "No overall score" in
 * this file's own doc comment and failed -- proving the assertion was about the source
 * text rather than the rendered UI. A test that cannot tell a comment from the product
 * is not testing the product.
 */
const stripComments = (src: string) =>
	src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const panelUi = stripComments(panel);

const resume = (partial: Partial<Resume> = {}) =>
	({
		id: "r1",
		name: "Test",
		template: "minimal",
		sections: [],
		metadata: { personalInfo: { fullName: "A", email: "a@b.c" }, settings: {} },
		...partial,
	}) as unknown as Resume;

describe("the panel is wired into the editor", () => {
	it("the editor renders the review trigger", () => {
		// Uses the DRAFT resume, not the saved one, so findings track unsaved edits.
		expect(editor).toMatch(/<ReviewTrigger/);
		expect(editor).toMatch(/resume=\{draftResume \?\? activeResume\}/);
	});

	it("imports it exactly once", () => {
		const matches = editor.match(/from "\.\/components\/review-panel"/g) ?? [];
		expect(matches).toHaveLength(1);
	});

	it("uses the draft resume when one exists, so findings track unsaved edits", () => {
		// The editor keeps a local draft while the user types. Auditing the saved
		// resume would report findings the user has already fixed on screen.
		expect(editor).toMatch(/ReviewTrigger/);
		expect(editor).toMatch(/draftResume/);
	});
});

describe("accessibility", () => {
	it("the header back button has an accessible name", () => {
		// It was an icon-only Button with no label at all, so a screen reader
		// announced just "button".
		expect(editor).toMatch(/aria-label="Back to dashboard"/);
	});

	it("the decorative arrow inside it is hidden from assistive tech", () => {
		expect(editor).toMatch(/<ArrowLeft aria-hidden="true"/);
	});

	it("the review trigger button has an accessible name", () => {
		expect(panelUi).toMatch(/aria-label="Review resume for parser fit"/);
	});

	it("the sheet has a title and a description", () => {
		// Radix warns and screen readers announce nothing useful without both.
		expect(panelUi).toMatch(/<SheetTitle/);
		expect(panelUi).toMatch(/<SheetDescription/);
	});
});

describe("the panel refuses to present itself as a score", () => {
	it("contains no percentage or overall-score presentation", () => {
		// A single headline number is the incumbents' credibility failure, and the
		// engines already refuse to produce one. The UI must not reintroduce it.
		expect(panelUi).not.toMatch(/\d+\s*\/\s*100/);
		expect(panelUi).not.toMatch(/ATS score|overall score|resume score/i);
	});

	it("states plainly that nothing is changed automatically", () => {
		expect(panelUi).toMatch(/nothing here is changed for you/i);
	});

	it("shows the fix when the engine supplies one", () => {
		expect(panelUi).toMatch(/Fix: /);
	});
});

describe("keys and counts", () => {
	it("does not use a render index as a React key", () => {
		// report.bullets is index-aligned with the source, so filtering first and
		// keying on the render index shifts every key.
		expect(panelUi).not.toMatch(/key=\{`\$\{i\}-/);
		expect(panelUi).toMatch(/sourceIndex/);
	});

	it("counts every diagnostic once, not errors twice", () => {
		// `reviewIssueCount` originally added `errors` on top of
		// `diagnostics.length`, double-counting the errors.
		expect(panel).toMatch(
			/return diagnostics\.length \+ collectBulletFindings\(resume\)\.totalNeedingWork;/,
		);
		expect(panel).not.toMatch(/errors \+ diagnostics\.length/);
	});

	it("keys diagnostics by id AND title so distinct fixes stay distinct", () => {
		expect(panelUi).toMatch(/key=\{`\$\{d\.id\}::\$\{d\.title\}`\}/);
	});
});

describe("reviewIssueCount on real shapes", () => {
	it("is zero for a clean resume", async () => {
		const { reviewIssueCount } = await import(
			"../src/features/resume-editor/components/review-panel"
		);
		const clean = resume({
			sections: [
				{
					id: "s1",
					type: "summary",
					order: 0,
					visible: true,
					content: { title: "Summary", data: {} } as never,
				},
			],
			metadata: {
				personalInfo: { fullName: "A", email: "a@b.c" },
				settings: { dateFormat: "MMMM YYYY" },
			} as never,
		});
		expect(reviewIssueCount(clean)).toBe(0);
	});

	it("is greater than zero once a heading is non-standard", async () => {
		const { reviewIssueCount } = await import(
			"../src/features/resume-editor/components/review-panel"
		);
		const risky = resume({
			sections: [
				{
					id: "s1",
					type: "summary",
					order: 0,
					visible: true,
					content: { title: "Professional Summary", data: {} } as never,
				},
			],
		});
		expect(reviewIssueCount(risky)).toBeGreaterThan(0);
	});

	it("survives a resume with no sections at all", async () => {
		const { reviewIssueCount } = await import(
			"../src/features/resume-editor/components/review-panel"
		);
		expect(reviewIssueCount(resume())).toBeGreaterThanOrEqual(0);
	});
});

describe("the job-target tab", () => {
	it("is present in the sheet", () => {
		expect(panel).toMatch(/<TabsTrigger value="job">/);
		expect(panel).toMatch(/<JobMatchPanel/);
	});

	it("keeps required and preferred as separate sections", () => {
		const jm = readFileSync(
			"src/features/resume-editor/components/job-match-panel.tsx",
			"utf8",
		);
		expect(jm).toMatch(/title="Required"/);
		expect(jm).toMatch(/title="Preferred"/);
		// Never a merged total. Comments are stripped for the same reason as
		// elsewhere in this file: the panel's own doc comment says "no overall score".
		const jmUi = stripComments(jm);
		expect(jmUi).not.toMatch(/overall|matchPercent|match percent/i);
	});

	it("expands the RESOLVED canonical for the both-forms hint, not the raw keyword", () => {
		// `expandSkillVariants` looks up by canonical name. Passing the raw keyword
		// ("AWS experience", "5+ years TypeScript") returns nothing, so the hint would
		// silently never render.
		const jm = readFileSync(
			"src/features/resume-editor/components/job-match-panel.tsx",
			"utf8",
		);
		expect(jm).toMatch(
			/item\.canonical\s*\?\s*expandSkillVariants\(item\.canonical\)/,
		);
		expect(jm).not.toMatch(/expandSkillVariants\(\s*item\.keyword\s*\)/);
	});

	it("analyses the draft while typing and persists on demand", () => {
		const jm = readFileSync(
			"src/features/resume-editor/components/job-match-panel.tsx",
			"utf8",
		);
		expect(jm).toMatch(
			/const draft, setDraft|useState\(jobTarget\?\.description/,
		);
		expect(jm).toMatch(/Analysing as you type/);
	});

	it("persists through resume.update, adding no new procedure", () => {
		expect(editor).toMatch(/handleJobTargetChange/);
		expect(editor).toMatch(/metadata:\s*\{\s*jobTarget/);
		// The API already supported this; no new procedure should exist.
		expect(editor).not.toMatch(/jobTarget\.create|jobTarget\.upsert/);
	});

	it("derives the required JobTarget.title rather than leaving it unset", () => {
		// `jobTargetSchema` requires `title`; the panel only collects a description.
		expect(editor).toMatch(/title: \(firstLine \|\| "Untitled role"\)/);
	});

	it("the editor passes the draft resume so findings track unsaved edits", () => {
		expect(editor).toMatch(
			/<ReviewTrigger[\s\S]{0,220}resume=\{draftResume \?\? activeResume\}/,
		);
	});
});
