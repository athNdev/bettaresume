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
//   "minimal" | "modern" | "classic" | "professional" | "creative" | "executive" | "tech"
//
// Templates that don't yet have a dedicated .typ file fall back to minimalSource.

export const TEMPLATE_SOURCES: Record<string, string> = {
	// ── Implemented ──────────────────────────────────────────────────────────
	minimal: minimalSource,

	// ── University variants — falls back to minimal until .typ files are filled ─
	undergrad: undergradSource || minimalSource,
	postgrad: postgradSource || minimalSource,
};

/**
 * Returns the fully assembled Typst source for the given template name.
 *
 * `sections.typ` is always prepended because it defines all `render-*`
 * helpers and the `render-section` dispatcher that every template calls.
 * Falls back to `minimal` for any unrecognised template name.
 */
export function getTemplateSource(template: string): string {
	const body = TEMPLATE_SOURCES[template] ?? TEMPLATE_SOURCES.minimal ?? minimalSource;
	return `${sectionsSource}\n\n${body}`;
}
