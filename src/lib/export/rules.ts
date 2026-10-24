/**
 * Constants the text layer and the marketing page must agree on.
 *
 * Kept in their own module with no imports so the marketing page can use them
 * without pulling `html-to-text` and the rest of the export path into a static
 * page that ships no client JavaScript.
 *
 * The `=` rule is 50 characters because that is what the exporter has always
 * written. The hero reproduces the export byte for byte — that is the claim the
 * page makes ("this is what a parser reads"), and a prettier rule would undercut
 * it. One definition is what keeps the two honest.
 */

/** The rule the plain-text export writes around every section heading. */
export const SECTION_RULE = "=".repeat(50);
