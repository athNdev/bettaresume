/**
 * Reading a source file as code rather than as prose.
 *
 * Exists because of a mistake made twice in this repo.
 *
 * `docs/AGENT-CONTEXT.md` §2.20 records the first one: a guard matched a setter name in raw
 * source, so the comment *documenting* the defect satisfied the "is it written?" check and the
 * bug passed. The same thing then happened again in the test written to close that finding — a
 * `not.toContain("window.location.reload()")` assertion failed on the word appearing in the
 * explanatory comment describing the removal, not on any call site.
 *
 * A test that can be satisfied, or failed, by prose is not a test of the code. Anything
 * asserting that an identifier is *absent* — or present — has to look at code.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Strip comments from a source file.
 *
 * Deliberately conservative about `//`: only a line whose first non-whitespace characters are
 * `//` is treated as a comment. A trailing `//` is left alone, because `//` also appears inside
 * URLs, regex literals and string contents, and mangling those would turn a source assertion
 * into a coin flip.
 */
export function codeOf(relativePath: string): string {
	// Anchored to the working directory, which Vitest sets to the repository root, rather
	// than to `import.meta.url`. Climbing out of `test/helpers/` with `../..` reads better,
	// but it resolves against whatever the runner considers the module URL — one more thing
	// to be wrong about in a file whose entire purpose is being precise.
	const source = readFileSync(resolve(process.cwd(), relativePath), "utf8");

	return source
		.replace(/\/\*[\s\S]*?\*\//g, "")
		.replace(/^([\t ]*)\/\/[^\n]*/gm, "$1");
}
