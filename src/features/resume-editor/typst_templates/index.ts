/**
 * Barrel export for all Typst resume templates.
 *
 * Each .typ file is loaded as a raw string by webpack's `asset/source` loader
 * (configured in next.config.js).  Import individual templates by name, or
 * use `getTemplateSource` to look one up by the TemplateType string stored on
 * the resume.
 *
 * To add a new template:
 *   1. Create `<name>.typ` in this directory
 *   2. Import it below
 *   3. Add it to TEMPLATE_SOURCES with the matching TemplateType key
 */

import minimalSource from "./minimal.typ";
import postgradSource from "./postgrad.typ";
import sectionsSource from "./sections.typ";
import undergradSource from "./undergrad.typ";

export { minimalSource, postgradSource, sectionsSource, undergradSource };

// ── Template registry ────────────────────────────────────────────────────────
//
// Keys must match the TemplateType union from @bettaresume/types:
//   "minimal" | "postgrad" | "undergrad"
//
// Every template is a real file. `postgrad.typ` and `undergrad.typ` used to be 0 bytes
// while `TEMPLATE_CONFIGS` advertised all three, and the `|| minimalSource` fallback made
// that invisible: picking Postgrad produced a Minimal document with no warning anywhere.
// The fallback is gone and `test/typst-templates.test.ts` asserts each file has content
// and sets a page, so an empty template fails CI instead of silently rendering the wrong
// thing.

export const TEMPLATE_SOURCES: Record<string, string> = {
	minimal: minimalSource,
	postgrad: postgradSource,
	undergrad: undergradSource,
};

/**
 * Returns the fully assembled Typst source for the given template name.
 *
 * `sections.typ` is always prepended because it defines all `render-*` helpers and the
 * `render-section` dispatcher that every template calls. Falls back to `minimal` for an
 * unrecognised template name — that is a forward-compatibility allowance for a stored
 * resume naming a template this build does not have, not a fallback for a missing file.
 */
export function getTemplateSource(template: string): string {
	const body = TEMPLATE_SOURCES[template] ?? TEMPLATE_SOURCES.minimal ?? minimalSource;
	return `${sectionsSource}\n\n${body}`;
}
