/**
 * Barrel export for all Typst resume templates.
 *
 * Each .typ file is loaded as a raw string by webpack's `asset/source` loader
 * (configured in next.config.js). Import individual templates by name, or
 * use `getTemplateSource` to look one up by the TemplateType string stored on
 * the resume.
 *
 * To add a new archetype:
 *   1. Create `<name>.typ` in this directory (or reuse an existing file and say why)
 *   2. Import it below and add it to TEMPLATE_SOURCES
 *   3. Add the `TEMPLATE_CONFIGS` entry in `../types.ts`, including `sourceFile`
 *   4. Run `npm run templates:render`
 */

import type { TemplateType } from "@bettaresume/types";
import { normalizeTemplateId } from "@bettaresume/types";
import academicSource from "./academic.typ";
import executiveSource from "./executive.typ";
import graduateSource from "./graduate.typ";
import sectionsSource from "./sections.typ";
import standardSource from "./standard.typ";
import technicalSource from "./technical.typ";

export {
	academicSource,
	executiveSource,
	graduateSource,
	sectionsSource,
	standardSource,
	technicalSource,
};

// ── Template registry ────────────────────────────────────────────────────────
//
// Keys are the six archetypes in `templateTypeSchema`. Every entry is a real file, except
// `compact`, which is deliberately the *same* file as `standard`: that archetype changes
// only density, so a second copy would be two sources of truth for one layout. Its
// settings defaults (which are what make it compact) live in `TEMPLATE_CONFIGS`.
//
// The old three files were removed with the archetypes, not left as aliases. A missing
// template is a bug; `test/typst-templates.test.ts` asserts every schema id has a source
// and every source has content.

export const TEMPLATE_SOURCES: Record<TemplateType, string> = {
	standard: standardSource,
	compact: standardSource,
	technical: technicalSource,
	graduate: graduateSource,
	academic: academicSource,
	executive: executiveSource,
};

/**
 * Returns the fully assembled Typst source for the given template id.
 *
 * `sections.typ` is always prepended because it defines all `render-*` helpers and the
 * `render-section` dispatcher that every template calls. The id is resolved through
 * `normalizeTemplateId`, the one place a pre-archetype id (`minimal`, `postgrad`,
 * `undergrad`) is translated to its successor — so a resume stored before this change
 * renders the closest archetype instead of silently rendering the default.
 */
export function getTemplateSource(template: string): string {
	const body = TEMPLATE_SOURCES[normalizeTemplateId(template)];
	return `${sectionsSource}\n\n${body}`;
}
