import sectionsSource from "@/features/resume-editor/typst_templates/sections.typ";
import designColumnSource from "./design-column.typ";

/**
 * The assembled design template.
 *
 * Kept in its own module so `design-export/index.ts` — the constants, the column split
 * and the text layer — stays importable in Node without Vite trying to parse Typst as
 * JavaScript. `export-buttons.tsx` loads this module dynamically, at the moment the user
 * confirms the design export, so the standard export's import graph is unchanged.
 *
 * `sections.typ` is prepended for the same reason `getTemplateSource` does it: the design
 * document uses the shared header-independent helpers (`gaps`, `typo`, `render-section`,
 * `entry-block`, the marks) and there must not be a second copy of that vocabulary.
 */
export const DESIGN_TEMPLATE_SOURCE = `${sectionsSource}\n\n${designColumnSource}`;
