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

/**
 * The body of every `catch (err) {` block, by brace matching.
 *
 * An earlier version of this split the file on the literal `catch (err) {` and took each
 * segment as a body. That is wrong twice over: a segment runs to the *next* handler rather
 * than to the end of its own block, so one handler's toast can appear inside another's, and a
 * `console.error(` wrapped onto the next line does not contain the substring being searched
 * for. Both mistakes were found by this test failing on correct code.
 *
 * Comments are stripped by the caller first, so braces inside them cannot unbalance the count.
 */
export function catchBodies(code: string): string[] {
	const bodies: string[] = [];
	const marker = /catch \(err\) \{/g;

	// A plain loop rather than `while ((match = marker.exec(code)) !== null)`: the
	// assignment-in-condition trips `noAssignInExpressions`, and this file is read by every
	// source-asserting test, so it should not be the thing that raises the lint baseline.
	for (;;) {
		const match = marker.exec(code);
		if (match === null) break;

		const start = match.index + match[0].length;
		let depth = 1;
		let i = start;

		for (; i < code.length && depth > 0; i++) {
			if (code[i] === "{") depth++;
			else if (code[i] === "}") depth--;
		}

		bodies.push(code.slice(start, i - 1));
		// Resume past this block, so a `catch` nested inside it is not reported twice.
		marker.lastIndex = i;
	}

	return bodies;
}
