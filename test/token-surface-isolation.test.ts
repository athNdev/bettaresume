import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { codeOf } from "./helpers/code-source";

/**
 * Surface isolation (research R15 / §6.6).
 *
 * The app chrome and the resume document are two design systems, and the
 * document's is measured in points on paper. If a `--br-*` token or the app's
 * font variables leak into the Typst templates, the document's metrics start
 * moving with the screen's — page breaks shift, ATS line parsing drifts, and
 * the change shows up as a PDF nobody can reproduce.
 *
 * Surface B keeps its own scales inside the templates. This test is the wall
 * between them. `.typ` files are included; `codeOf`'s comment stripping works
 * for Typst's line and block comments too.
 */

const SURFACE_B = [
	"src/features/resume-editor/typst_templates",
	// The design CV is a separate export target, but it is still a document rendered on
	// paper. Keeping it inside the same wall stops the app's screen tokens from leaking
	// into the one layout that is already the hardest to reproduce.
	"src/features/resume-editor/design-export",
	"src/lib/typst",
	"src/components/export",
];

const FORBIDDEN = [
	{ pattern: /--br-/, what: "an app design token" },
	{
		pattern: /--font-inter|--font-open-sans|--font-roboto/,
		what: "an app font variable",
	},
	{
		pattern: /--color-background|--color-foreground|--color-surface/,
		what: "an app semantic role",
	},
];

function surfaceBFiles(): string[] {
	const out: string[] = [];
	function walk(dir: string): void {
		const entries = readdirSync(resolve(process.cwd(), dir), {
			withFileTypes: true,
		});
		for (const entry of entries) {
			const child = `${dir}/${entry.name}`;
			if (entry.isDirectory()) {
				walk(child);
			} else if (/\.(tsx?|typ)$/.test(entry.name)) {
				out.push(child);
			}
		}
	}
	for (const dir of SURFACE_B) walk(dir);
	return out;
}

describe("the resume document never reads the app's tokens", () => {
	const files = surfaceBFiles();

	it("has files to check", () => {
		expect(files.length).toBeGreaterThan(5);
	});

	for (const file of surfaceBFiles()) {
		it(`${file} is clean`, () => {
			const code = codeOf(file);
			const hits = FORBIDDEN.filter(({ pattern }) => pattern.test(code)).map(
				({ what }) => what,
			);
			expect(hits, `${file} references ${hits.join(", ")}`).toEqual([]);
		});
	}
});
