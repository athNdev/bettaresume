import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { templateTypeSchema } from "@bettaresume/types";
import { describe, expect, it } from "vitest";
import { GALLERY_SAMPLE_RESUME } from "../src/components/marketing/sample-resume";
import {
	buildDesignPlainText,
	DESIGN_DOCX_REFUSAL,
	DESIGN_EXPORT_WARNING,
	DESIGN_SIDEBAR_TYPES,
	DESIGN_TEXT_NOTICE,
	designColumnOf,
	resumeToDesignTypstJson,
	splitDesignSections,
} from "../src/features/resume-editor/design-export";
import type {
	Resume,
	ResumeSection,
} from "../src/features/resume-editor/types";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";
import { buildPlainText } from "../src/lib/export/text";
import { codeOf } from "./helpers/code-source";

/**
 * The design CV is an exception, and exceptions decay.
 *
 * The product's core promise is that the text layer is single-column and the reading order
 * is knowable. A two-column layout is the largest single cause of ATS parse failure, so it
 * must never become a template, a setting, or a quiet seventh entry in the picker. These
 * tests are the wall around the exception:
 *
 *   - the six archetypes and their registry are unchanged;
 *   - the design template lives outside `typst_templates/` and is not in the gallery;
 *   - the standard templates contain no column machinery;
 *   - the text companion is in visual reading order and starts with a label saying so;
 *   - the UI shows the warning in the menu *and* in the confirmation.
 *
 * The last point is the one a future refactor is most likely to remove "for tidiness": a
 * warning that only exists in a tooltip, or only in the dropdown a user scrolled past, is
 * not a warning at the point of export.
 */

const STANDARD_DIR = "src/features/resume-editor/typst_templates";
const DESIGN_DIR = "src/features/resume-editor/design-export";

/** The marketing gallery's fuller sample, plus the sidebar-only section types. */
function sampleResume(): Resume {
	return {
		...GALLERY_SAMPLE_RESUME,
		name: "Avery Chen — design",
		sections: [
			...GALLERY_SAMPLE_RESUME.sections,
			{
				id: "design-languages",
				type: "languages",
				order: 4,
				visible: true,
				content: {
					title: "Languages",
					data: [
						{ id: "l1", name: "English", proficiency: "native" },
						{ id: "l2", name: "German", proficiency: "professional" },
					],
				},
			},
			{
				id: "design-certifications",
				type: "certifications",
				order: 5,
				visible: true,
				content: {
					title: "Certifications",
					data: [
						{
							id: "c1",
							name: "AWS Solutions Architect",
							issuer: "Amazon Web Services",
							date: "2024",
						},
					],
				},
			},
			{
				id: "design-awards",
				type: "awards",
				order: 6,
				visible: true,
				content: {
					title: "Awards",
					data: [
						{
							id: "a1",
							title: "Engineering Excellence",
							issuer: "Northwind",
							date: "2023",
						},
					],
				},
			},
		],
	};
}

describe("the design CV is a separate target, not a template", () => {
	it("is not one of the six archetypes", () => {
		expect(templateTypeSchema.options).toHaveLength(6);
		expect(templateTypeSchema.options).not.toContain("design-column");
		expect(Object.keys(TEMPLATE_CONFIGS).sort()).toEqual(
			[...templateTypeSchema.options].sort(),
		);
		for (const config of Object.values(TEMPLATE_CONFIGS)) {
			expect(config.sourceFile).not.toBe("design-column");
		}
	});

	it("lives outside the standard template directory", () => {
		// `preview-matches-exporter.test.ts` scans every `.typ` in the standard directory
		// for a layout branch. Being outside it is not a loophole: it is what stops the
		// design document from being mistaken for an archetype by that test, by the
		// gallery, or by a future contributor adding it to the picker.
		expect(existsSync(resolve(DESIGN_DIR, "design-column.typ"))).toBe(true);
		expect(existsSync(resolve(STANDARD_DIR, "design-column.typ"))).toBe(false);
		const standardFiles = readdirSync(STANDARD_DIR).filter((file) =>
			file.endsWith(".typ"),
		);
		expect(standardFiles).not.toContain("design-column.typ");
	});

	it("is not in the template registry or reachable from getTemplateSource", () => {
		const registry = codeOf(`${STANDARD_DIR}/index.ts`);
		expect(registry).not.toMatch(/design-column|design-export/);
		expect(registry).toMatch(/export const TEMPLATE_SOURCES/);
	});

	it("is not in the marketing gallery", () => {
		// The gallery is generated from TEMPLATE_CONFIGS, so a stray SVG would be the
		// first sign that the design document had been promoted into the picker.
		expect(existsSync(resolve("public/templates/design-column.svg"))).toBe(
			false,
		);
	});

	it("the standard templates remain single-column", () => {
		const files = readdirSync(STANDARD_DIR).filter((file) =>
			file.endsWith(".typ"),
		);
		expect(files.length).toBeGreaterThanOrEqual(6);
		for (const file of files) {
			const source = codeOf(`${STANDARD_DIR}/${file}`);
			// `grid(columns: (1fr, auto))` is an entry row, not page columns. The
			// patterns below are the layout-level primitives.
			expect(source, `${file} uses page columns`).not.toMatch(
				/\bcolumns\s*\(\s*\d/,
			);
			expect(source, `${file} uses a column break`).not.toMatch(
				/\bcolbreak\s*\(/,
			);
		}
	});
});

describe("the design template is a real two-column document", () => {
	const design = codeOf(`${DESIGN_DIR}/design-column.typ`);

	it("uses two columns and a column break", () => {
		expect(design).toMatch(/columns\(\s*2/);
		expect(design).toMatch(/colbreak\(\)/);
	});

	it("takes its type and spacing from the existing scales", () => {
		// The brief's constraint: no raw `v(4pt)` literals and no second typographic
		// vocabulary. The design document is a document, not a skin.
		expect(design).toMatch(/gaps\.(section|heading|entry|bullet|meta|header)/);
		expect(design).toMatch(/typo\.(name|title|body|small|sectionTitle)/);
		expect(design).not.toMatch(/\bv\(\s*\d/);
	});

	it("draws every section type the sidebar claims to support", () => {
		for (const type of DESIGN_SIDEBAR_TYPES) {
			expect(design, `${type} is in the sidebar set but not drawn`).toContain(
				`t == "${type}"`,
			);
		}
	});
});

describe("the design text layer is labelled and in visual reading order", () => {
	const resume = sampleResume();

	it("splits the same sections into the same two columns the template draws", () => {
		const { sidebar, main } = splitDesignSections(resume.sections);
		expect(sidebar.map((section) => section.type)).toEqual([
			"skills",
			"languages",
			"certifications",
			"awards",
		]);
		expect(main.map((section) => section.type)).toEqual([
			"summary",
			"experience",
			"education",
		]);

		const payload = JSON.parse(resumeToDesignTypstJson(resume)) as {
			design: {
				hasSidebar: boolean;
				sidebar: Array<{ type: string }>;
				main: Array<{ type: string }>;
			};
		};
		expect(payload.design.hasSidebar).toBe(true);
		expect(payload.design.sidebar.map((section) => section.type)).toEqual([
			"skills",
			"languages",
			"certifications",
			"awards",
		]);
		expect(payload.design.main.map((section) => section.type)).toEqual([
			"summary",
			"experience",
			"education",
		]);
	});

	it("classifies every section type explicitly", () => {
		expect(designColumnOf({ type: "skills" })).toBe("sidebar");
		expect(designColumnOf({ type: "languages" })).toBe("sidebar");
		expect(designColumnOf({ type: "certifications" })).toBe("sidebar");
		expect(designColumnOf({ type: "awards" })).toBe("sidebar");
		expect(designColumnOf({ type: "experience" })).toBe("main");
		expect(designColumnOf({ type: "education" })).toBe("main");
		expect(designColumnOf({ type: "custom" })).toBe("main");
	});

	it("starts with a label that says it is neither parser-safe nor document-ordered", () => {
		const text = buildDesignPlainText(resume);
		expect(text.startsWith(DESIGN_TEXT_NOTICE)).toBe(true);
		expect(text).toContain("NOT PARSER-SAFE");
		expect(text).toContain("sidebar top to bottom, then the main column");
		expect(text).toContain(DESIGN_EXPORT_WARNING);
	});

	it("writes the sidebar before the main column, not document order", () => {
		const text = buildDesignPlainText(resume);
		const at = (heading: string) => text.indexOf(`\n${heading}\n`);
		const order = [
			"Contact",
			"Skills",
			"Languages",
			"Certifications",
			"Awards",
			"--- MAIN COLUMN (right column, top to bottom) ---",
			"Summary",
			"Work Experience",
			"Education",
		];
		let cursor = -1;
		for (const needle of order) {
			const position = needle.startsWith("---")
				? text.indexOf(needle)
				: at(needle);
			expect(position, `missing or out of order: ${needle}`).toBeGreaterThan(
				cursor,
			);
			cursor = position;
		}
	});

	it("leaves the standard plain-text layer in document order", () => {
		// The two builders share their words and differ only in section order. Pinning both
		// is what stops a well-meaning "one text layer" refactor from making the standard
		// export describe a two-column page it never produces.
		const standard = buildPlainText(resume);
		expect(standard.startsWith(DESIGN_TEXT_NOTICE)).toBe(false);
		expect(standard).not.toContain("--- SIDEBAR");
		expect(standard.indexOf("\nSummary\n")).toBeGreaterThan(-1);
		expect(standard.indexOf("\nSummary\n")).toBeLessThan(
			standard.indexOf("\nSkills\n"),
		);
	});

	it("writes skill names, not `[object Object]`", () => {
		// Skills are objects in the payload. `inline()` used to call `String()` on them,
		// so both text layers said "Languages: [object Object], …". The design export is
		// the target that made it visible; the standard layer had the same defect.
		for (const text of [buildPlainText(resume), buildDesignPlainText(resume)]) {
			expect(text).not.toContain("[object Object]");
			expect(text).toContain("Go, TypeScript, Python");
		}
	});
});

describe("the warning is at the point of export", () => {
	const ui = codeOf("src/components/export/export-buttons.tsx");

	it("renders the warning in the menu, permanently", () => {
		expect(ui).toContain("{DESIGN_EXPORT_WARNING}");
		expect(ui).toMatch(/data-design-export-warning/);
		expect(ui).toMatch(/role="note"/);
	});

	it("requires a confirmation that repeats the warning", () => {
		expect(ui).toMatch(/data-design-export-confirm/);
		expect(ui).toMatch(/Export design CV/);
		expect(ui).toMatch(/setIsDesignDialogOpen\(true\)/);
	});

	it("loads the design template only when the design export runs", () => {
		// A static import would put the two-column source in the standard export's graph
		// (and force the `.typ` loader into every test that imports this component).
		expect(ui).toContain("design-export/source");
		expect(ui).toMatch(/await import\(/);
		expect(ui).not.toMatch(
			/import\s+\w+\s+from\s+["'][^"']*design-column\.typ/,
		);
	});

	it("states why the design target has no DOCX", () => {
		expect(DESIGN_DOCX_REFUSAL).toMatch(/PDF-only/);
		expect(DESIGN_DOCX_REFUSAL).toMatch(/Word/);
		expect(DESIGN_DOCX_REFUSAL).toMatch(/silent scramble/);
	});
});

describe("the design payload is built from the one serialiser", () => {
	it("keeps the standard payload and adds the two column arrays", () => {
		const payload = JSON.parse(
			resumeToDesignTypstJson(sampleResume()),
		) as Record<string, unknown>;
		expect(payload.personalInfo).toBeTruthy();
		expect(payload.settings).toBeTruthy();
		expect(payload.sections).toBeTruthy();
		expect(payload.design).toBeTruthy();
	});

	it("falls back to one column when there is nothing for a sidebar", () => {
		const resume: Resume = {
			...sampleResume(),
			metadata: {
				...(GALLERY_SAMPLE_RESUME.metadata as NonNullable<Resume["metadata"]>),
				personalInfo: {
					fullName: "Avery Chen",
					email: "",
					phone: "",
					location: "",
					linkedin: "",
					github: "",
					website: "",
					portfolio: "",
					professionalTitle: "",
				},
			},
			sections: GALLERY_SAMPLE_RESUME.sections.filter(
				(section: ResumeSection) => section.type !== "skills",
			),
		};
		const payload = JSON.parse(resumeToDesignTypstJson(resume)) as {
			design: { hasSidebar: boolean };
		};
		expect(payload.design.hasSidebar).toBe(false);
		const text = buildDesignPlainText(resume);
		expect(text).toContain("--- MAIN COLUMN (single column) ---");
		expect(text).not.toContain("--- SIDEBAR");
	});
});
