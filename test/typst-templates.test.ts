import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { sectionTypeSchema } from "@bettaresume/types";
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

/**
 * The Typst templates are shipped code, but nothing typechecks them.
 *
 * `postgrad.typ` and `undergrad.typ` were **0 bytes** while `TEMPLATE_CONFIGS` advertised
 * three templates and `getTemplateSource` fell back to Minimal. Picking Postgrad produced
 * a Minimal document, the preview looked plausible, and no test, type check or lint rule
 * could see it. Both files now have content; these assertions exist so the next empty one
 * fails here instead of in front of a user.
 *
 * They also cover the dispatcher. `serialize.ts` emits a `{body, items}` payload for
 * `custom` sections, and `render-section` had no branch for it — so a section the editor
 * offered, the preview drew and the API stored exported as nothing. A section type that
 * the product can create has to be renderable by every template.
 */

const DIR = resolve(
	process.cwd(),
	"src/features/resume-editor/typst_templates",
);

const read = (file: string) => readFileSync(resolve(DIR, file), "utf8");

const TEMPLATES = ["minimal.typ", "postgrad.typ", "undergrad.typ"] as const;

describe("every template is a real document", () => {
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
		expect(source).toMatch(/render-section\(section\)/);
	});

	it.each(TEMPLATES)("%s does not silently substitute another template", (file) => {
		// A template that prints another template's source is the failure mode the
		// `|| minimalSource` fallback used to hide.
		expect(read(file)).not.toMatch(/minimalSource|getTemplateSource/);
	});
});

describe("the template registry", () => {
	/*
	 * Read from source rather than importing the barrel: it imports `.typ` files through
	 * webpack's `asset/source` loader, which Vite does not implement, so importing it in
	 * Node parses Typst as JavaScript. The extension files themselves are asserted above,
	 * so this only needs to prove the registry names each one.
	 */
	const registry = codeOf(
		"src/features/resume-editor/typst_templates/index.ts",
	);

	it("registers exactly the three templates the schema declares", () => {
		const keys = [...registry.matchAll(/^\t(minimal|postgrad|undergrad):/gm)].map(
			(m) => m[1],
		);
		expect(keys.sort()).toEqual(["minimal", "postgrad", "undergrad"]);
	});

	it("does not fall back from an empty template to minimal", () => {
		// `undergrad: undergradSource || minimalSource` is what hid two blank files.
		expect(registry).not.toMatch(/\|\|\s*minimalSource/);
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
