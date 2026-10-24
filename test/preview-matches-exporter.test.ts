import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * One layout, everywhere.
 *
 * This file used to describe a compromise: `resumeSettingsSchema.layout` accepted
 * `"single-column" | "two-column" | "sidebar"`, the toolbar offered all three, and
 * `preview.tsx` faithfully drew two-column and sidebar. But **no Typst template ever read
 * `layout`**, so a user could pick "Sidebar", watch the preview reflow, and export a
 * single-column PDF that looked nothing like what they approved.
 *
 * The compromise that followed was to keep the field, keep the dropdown, and offer one
 * option — "Single column" — with the preview ignoring the value. That is the same broken
 * promise with less code: a control you can click that cannot change anything.
 *
 * The field, the dropdown, the diagnostics check and both dead render branches are now
 * gone. Single-column is not a preference this product takes; it is what the product is.
 * It is also the only defensible choice — multi-column layouts are the largest single
 * cause of ATS parse failure, and Typst's guaranteed single-column text layer is this
 * product's structural advantage over browser-rendered competitors.
 *
 * These assert on source because there is no DOM in CI (the Typst WASM is loaded at
 * runtime), so a render test would be theatre. The assertions are pinned tightly and the
 * reasoning lives here.
 */

const read = (p: string) => readFileSync(p, "utf8");

const TEMPLATES = "src/features/resume-editor/typst_templates";

describe("there is no layout setting to diverge", () => {
	it("the settings schema has no layout field", () => {
		// Backward compatibility is not at risk: the object is non-strict, so a stored
		// resume that still carries `layout` parses and the key is dropped.
		const schemas = read("packages/types/src/schemas.ts");
		expect(schemas).not.toMatch(/\blayout: z\.enum/);
	});

	it("the settings type has no layout field", () => {
		const types = read("packages/types/src/types.ts");
		const settings = types.slice(
			types.indexOf("export interface ResumeSettings"),
			types.indexOf("export interface PartialResumeSettings"),
		);
		expect(settings).not.toMatch(/\blayout\??:/);
		expect(settings).not.toMatch(/\bshowIcons\??:/);
	});

	it("the toolbar offers no layout control", () => {
		const toolbar = read(
			"src/features/resume-editor/components/formatting-toolbar.tsx",
		);
		expect(toolbar).not.toMatch(/SelectItem value="single-column"/);
		expect(toolbar).not.toMatch(/onSettingsChange\(\{ layout/);
	});

	it("the Typst serialiser does not pass a layout or icon flag", () => {
		const serialize = read("src/lib/typst/serialize.ts");
		expect(serialize).not.toMatch(/\blayout:/);
		expect(serialize).not.toMatch(/\bshowIcons\b/);
	});
});

describe("the preview cannot diverge from the exporter", () => {
	const preview = read("src/features/resume-editor/components/preview.tsx");

	it("has no two-column or sidebar rendering path", () => {
		expect(preview).not.toMatch(/isTwoColumn/);
		expect(preview).not.toMatch(/isSidebar/);
		expect(preview).not.toMatch(/renderColumnPages/);
	});

	it("explains why, so the single-column path is not 'generalised' back into a bug", () => {
		// A future reader seeing one hard-coded path will reasonably try to parameterise
		// it. The comment is the guard against that.
		expect(preview).toMatch(/single-column is what this\s+\* product is/);
		expect(preview).toMatch(/largest\s+\* cause of ATS parse failure/);
	});
});

describe("no Typst template claims to support a layout it does not render", () => {
	it("the Typst sources contain no layout branch", () => {
		const offenders = readdirSync(TEMPLATES)
			.filter((f) => f.endsWith(".typ"))
			.filter((f) =>
				/layout\s*==|two-column|sidebar/.test(read(`${TEMPLATES}/${f}`)),
			);

		expect(offenders).toEqual([]);
	});
});

describe("the document's own section headings do not depend on an icon flag", () => {
	it("no template reads showIcons", () => {
		const offenders = readdirSync(TEMPLATES)
			.filter((f) => f.endsWith(".typ"))
			.filter((f) => /showIcons|show_icons/.test(read(`${TEMPLATES}/${f}`)));

		expect(offenders).toEqual([]);
	});
});
