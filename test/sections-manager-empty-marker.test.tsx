import type { ResumeSection } from "@bettaresume/types";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SortableSectionItem } from "@/features/resume-editor/components/sections-manager";

/**
 * The empty-section marker has two halves to it, and only one of them is covered by
 * `isSectionEmpty`'s own tests.
 *
 * The predicate can be right while the marker is never emitted, or emitted for a hidden
 * section as well. Those are wiring failures, and they are exactly what a unit test on a
 * pure function cannot see. Rendering the row to static markup closes that gap.
 *
 * This exists because the editor route does not reliably load in a browser on a 4.9 GB
 * node — `page.goto` exceeded 240s without reaching `domcontentloaded`, repeatedly. The
 * repo already renders components with `renderToStaticMarkup` in a node environment
 * (see `import-review-ui.test.tsx`), so this uses the pattern that already exists
 * rather than adding jsdom.
 */

const base = {
	resumeId: "r",
	order: 0,
	visible: true,
	createdAt: new Date(),
	updatedAt: new Date(),
} satisfies Omit<ResumeSection, "id" | "type" | "content">;

function renderRow(
	content: ResumeSection["content"],
	overrides: Partial<ResumeSection> = {},
): string {
	return renderToStaticMarkup(
		<SortableSectionItem
			describedById="dnd-instructions"
			isSelected={false}
			onDelete={() => {}}
			onSelect={() => {}}
			onToggleVisibility={() => {}}
			section={
				{
					...base,
					id: "s1",
					type: "experience",
					content,
					...overrides,
				} as ResumeSection
			}
		/>,
	);
}

const MARKER = "This section is empty";

describe("SortableSectionItem empty marker", () => {
	it("marks a visible section that has no entries", () => {
		const html = renderRow({ title: "Work Experience", data: [] });
		expect(html).toContain(MARKER);
	});

	it("does not mark a section with entries", () => {
		const html = renderRow({
			title: "Work Experience",
			data: [{ company: "Northwind", title: "Staff Engineer" }],
		});
		expect(html).not.toContain(MARKER);
	});

	it("suppresses the marker on a hidden section, which already says Hidden", () => {
		// Two signals on one row is noise. A hidden section states its own condition.
		const html = renderRow(
			{ title: "Work Experience", data: [] },
			{ visible: false },
		);
		expect(html).not.toContain(MARKER);
		expect(html).toContain("Hidden");
	});

	it("still marks a hidden-but-empty section's counterpart correctly", () => {
		// Guards the negation: visible+empty is marked, hidden+empty is not, so the
		// condition is genuinely about visibility and not merely about emptiness.
		expect(renderRow({ title: "Work Experience", data: [] })).toContain(MARKER);
		expect(
			renderRow({ title: "Work Experience", data: [] }, { visible: false }),
		).not.toContain(MARKER);
	});

	it("reads summary rich text from html, so a written summary is not marked empty", () => {
		const html = renderRow({
			title: "Professional Summary",
			html: "<p>Platform engineer focused on reliability.</p>",
		});
		expect(html).not.toContain(MARKER);
	});

	it("gives the marker an accessible name rather than a bare decoration", () => {
		// It carries meaning, so it cannot be aria-hidden. A screen reader has to be able
		// to hear that a section is empty, which is the entire point of the feature.
		const html = renderRow({ title: "Work Experience", data: [] });
		expect(html).toContain('aria-label="This section is empty"');
		expect(html).toContain('role="img"');
	});

	it("keeps the section title in the row either way", () => {
		expect(renderRow({ title: "Work Experience", data: [] })).toContain(
			"Work Experience",
		);
		expect(
			renderRow({ title: "Work Experience", data: [{ company: "Acme" }] }),
		).toContain("Work Experience");
	});
});
