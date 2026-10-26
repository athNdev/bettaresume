import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	normalizeTemplateId,
	sectionTypeSchema,
	templateTypeSchema,
} from "@bettaresume/types";
import { describe, expect, it } from "vitest";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";
import { codeOf } from "./helpers/code-source";

/**
 * The Typst templates are shipped code, but nothing typechecks them.
 *
 * `postgrad.typ` and `undergrad.typ` were **0 bytes** while `TEMPLATE_CONFIGS` advertised
 * three templates and `getTemplateSource` fell back to Minimal. Picking Postgrad produced
 * a Minimal document, the preview looked plausible, and no test, type check or lint rule
 * could see it. Those files are gone with the archetypes, but the failure mode is not:
 * these assertions exist so a new archetype with no source, or a source with no content,
 * fails here instead of in front of a user.
 *
 * They also cover the dispatcher. `serialize.ts` emits a `{body, items}` payload for
 * `custom` sections, and `render-section` had no branch for it — so a section the editor
 * offered, the preview drew and the API stored exported as nothing. A section type that
 * the product can create has to be renderable by every template.
 *
 * The archetype list is derived from `templateTypeSchema` and `TEMPLATE_CONFIGS`, so
 * adding a seventh document cannot leave this file pinning the previous five.
 */

const DIR = resolve(
	process.cwd(),
	"src/features/resume-editor/typst_templates",
);

const read = (file: string) => readFileSync(resolve(DIR, file), "utf8");

const ARCHETYPES = templateTypeSchema.options;

/**
 * The `.typ` files actually compiled, deduplicated.
 *
 * `compact` points at `standard.typ` on purpose: its difference is density, which lives in
 * `TEMPLATE_CONFIGS.defaults`. A copy of the file would be a second source of truth for one
 * layout, so sharing is asserted rather than merely allowed.
 */
const SOURCE_FILES = [
	...new Set(ARCHETYPES.map((id) => TEMPLATE_CONFIGS[id].sourceFile)),
];
const TEMPLATES = SOURCE_FILES.map((file) => `${file}.typ`);

describe("every archetype is a real document", () => {
	it("declares a source file for every id in templateTypeSchema", () => {
		expect(ARCHETYPES).toHaveLength(6);
		for (const id of ARCHETYPES) {
			expect(
				TEMPLATE_CONFIGS[id].sourceFile,
				`${id} has no sourceFile`,
			).toBeTruthy();
		}
	});

	it("shares a source file only between standard and compact", () => {
		const byFile = new Map<string, string[]>();
		for (const id of ARCHETYPES) {
			const file = TEMPLATE_CONFIGS[id].sourceFile;
			byFile.set(file, [...(byFile.get(file) ?? []), id]);
		}
		const shared = [...byFile.values()]
			.filter((ids) => ids.length > 1)
			.map((ids) => [...ids].sort());
		expect(shared).toEqual([["compact", "standard"]]);
		// And the variant is not accidentally identical to the base: compact applies the
		// Tight density and standard the Balanced one, so one file produces two documents.
		expect(TEMPLATE_CONFIGS.compact.defaults).not.toEqual({});
		expect(TEMPLATE_CONFIGS.standard.defaults).not.toEqual({});
		expect(TEMPLATE_CONFIGS.compact.defaults).not.toEqual(
			TEMPLATE_CONFIGS.standard.defaults,
		);
	});

	it.each(TEMPLATES)("%s has content", (file) => {
		const source = read(file);
		expect(source.trim().length).toBeGreaterThan(200);
	});

	it.each(TEMPLATES)("%s sets a page and renders the sections", (file) => {
		const source = read(file);
		// Without `#set page` Typst uses its own default paper size, so the user's A4 /
		// Letter choice is ignored. Without the loop the document has a header and no body.
		expect(source).toMatch(/#set page\(/);
		expect(source).toMatch(/#for section in sections\s*\{/);
		// The archetype profile is passed in, so allow the named argument.
		expect(source).toMatch(/render-section\(section[\s,)]/);
	});

	it.each(TEMPLATES)(
		"%s does not silently substitute another template",
		(file) => {
			// A template that prints another template's source is the failure mode the
			// `|| minimalSource` fallback used to hide.
			expect(read(file)).not.toMatch(/getTemplateSource/);
		},
	);
});

describe("the template registry", () => {
	/*
	 * Read from source rather than importing the barrel: it imports `.typ` files through
	 * webpack's `asset/source` loader, which Vite does not implement, so importing it in
	 * Node parses Typst as JavaScript. The files themselves are asserted above, so this
	 * only needs to prove the registry names each id.
	 */
	const registry = codeOf(
		"src/features/resume-editor/typst_templates/index.ts",
	);

	it("registers exactly the archetypes the schema declares", () => {
		const keys = [...registry.matchAll(/^\t([a-z-]+):/gm)].map((m) => m[1]);
		expect(keys.sort()).toEqual([...ARCHETYPES].sort());
	});

	it("does not fall back from an empty template to another one", () => {
		// `undergrad: undergradSource || minimalSource` is what hid two blank files.
		expect(registry).not.toMatch(/\|\|\s*\w+Source/);
		// An old resume is handled by translating the id, not by substituting a document.
		expect(registry).toMatch(/normalizeTemplateId\(template\)/);
	});
});

describe("resumes stored before the archetypes keep rendering", () => {
	it("maps each retired id to the archetype that replaces it", () => {
		expect(normalizeTemplateId("minimal")).toBe("standard");
		expect(normalizeTemplateId("postgrad")).toBe("academic");
		expect(normalizeTemplateId("undergrad")).toBe("graduate");
	});

	it("leaves shipped ids and an absent one alone", () => {
		for (const id of ARCHETYPES) {
			expect(normalizeTemplateId(id)).toBe(id);
		}
		expect(normalizeTemplateId(null)).toBe("standard");
	});
});

describe("every formatting control reaches the document", () => {
	it("the font scale is applied, not just stored", () => {
		// `fontScale` is a slider in the toolbar. It used to be serialised and read by
		// nothing, so the page never changed. This pins the link between the setting and
		// the type scale.
		const dispatcher = read("sections.typ");
		expect(dispatcher).toMatch(/fontScale/);
		expect(dispatcher).toMatch(/font-scale/);
		// And the scale must feed the values the render helpers use.
		expect(dispatcher).toMatch(/body: scale\(base\.body\)/);
	});
});

describe("semantic page breaks reach Typst", () => {
	it("maps the three flags to the Typst primitives that implement them", () => {
		const dispatcher = read("sections.typ");
		// Keep an entry together / keep a section together / start on a new page.
		expect(dispatcher).toContain("block(breakable: false");
		// A long entry protects its heading only — the "clean hanging continuation" that
		// caps the hole at one heading block instead of a whole entry.
		expect(dispatcher).toMatch(/mode == "head"/);
		expect(dispatcher).toContain("pagebreak(weak: true)");
		// The section flags the serialiser emits, read by the dispatcher.
		expect(dispatcher).toMatch(/layout\.at\("keepSectionTogether"/);
		expect(dispatcher).toMatch(/layout\.at\("pageBreakBefore"/);
		// And the per-entry flag the serialiser resolves onto each item.
		expect(dispatcher).toContain('item.at("keepTogether"');
	});

	it("emits the invisible markers the fit probe reads", () => {
		const dispatcher = read("sections.typ");
		expect(dispatcher).toContain('kind: "entry"');
		expect(dispatcher).toContain('kind: "section"');
		expect(dispatcher).toContain("#let fit-end()");
		for (const file of TEMPLATES) {
			expect(read(file), `${file} must close the probe`).toContain(
				"#fit-end()",
			);
		}
	});

	it("takes every gap from the density profile", () => {
		// The header was five copies that had drifted apart, and the entry and bullet gaps
		// were compile-time constants no preset could reach (`space-efficiency` §3.4).
		// Now the gaps come from `gaps-for`, one table for the whole document, and the
		// header is one helper every archetype calls.
		const dispatcher = read("sections.typ");
		expect(dispatcher).toContain("#let gaps-for(spacing)");
		for (const gap of [
			"section",
			"heading",
			"entry",
			"bullet",
			"meta",
			"header",
			"contact",
		]) {
			expect(dispatcher, `the density profile has no ${gap} gap`).toMatch(
				new RegExp(`\\b${gap}: space-`),
			);
		}
		expect(dispatcher).toContain("#let render-header(");
		for (const file of TEMPLATES) {
			expect(
				read(file),
				`${file} draws its own header instead of calling render-header`,
			).toMatch(/#render-header\(/);
			expect(read(file), `${file} hand-rolls a header block`).not.toMatch(
				/below: header-gap/,
			);
		}
	});
});

describe("the archetype profile changes structure, never decoration", () => {
	const dispatcher = read("sections.typ");

	it("declares the profile the templates pass in", () => {
		expect(dispatcher).toMatch(/#let default-profile = \(/);
		for (const key of [
			"heading",
			"education",
			"skills",
			"projects",
			"publications",
			"experience",
		]) {
			expect(dispatcher, `profile.${key} is not read`).toMatch(
				new RegExp(`profile\\.${key}`),
			);
		}
	});

	it("offers no colour, fill or icon knob", () => {
		const profile = dispatcher.slice(
			dispatcher.indexOf("#let default-profile"),
			dispatcher.indexOf("#let settings"),
		);
		expect(profile).not.toMatch(/colou?r|fill|icon|badge/i);
	});

	it("the full education renderer draws the fields the payload carries", () => {
		// These three have always been serialised and were never drawn.
		for (const field of ["coursework", "honors", "achievements"]) {
			expect(dispatcher, `${field} is not rendered`).toContain(
				`edu.at("${field}"`,
			);
		}
	});
});

describe("the dispatcher can render every section type", () => {
	/**
	 * `personal-info` is deliberately absent: the templates render it as the document
	 * header, not as a section with a heading. Every other type must have a branch.
	 */
	const RENDERED_AS_HEADER = new Set(["personal-info"]);

	it("has a branch for every type in sectionTypeSchema", () => {
		const dispatcher = read("sections.typ");
		const branches = new Set(
			[...dispatcher.matchAll(/t == "([a-z-]+)"/g)].map((m) => m[1]),
		);

		const missing = sectionTypeSchema.options.filter(
			(type) => !RENDERED_AS_HEADER.has(type) && !branches.has(type),
		);

		expect(
			missing,
			"these section types serialise to content that no template draws",
		).toEqual([]);
	});

	it("renders the custom payload that the serialiser actually emits", () => {
		// Pinned to the field names in `serialize.ts`'s `case "custom"`. If that shape
		// changes, this fails rather than the export going blank again.
		const dispatcher = read("sections.typ");
		expect(dispatcher).toMatch(/render-custom/);
		expect(dispatcher).toMatch(/section\.at\("body"/);
		expect(dispatcher).toMatch(/section\.at\("items"/);
	});
});
