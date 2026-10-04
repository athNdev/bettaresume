import { execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * `scripts/postbuild.js` injects `<!--email_off-->` into every generated page so
 * Cloudflare's Email Address Obfuscation cannot rewrite email addresses in the served
 * HTML.
 *
 * ## Why this gate exists
 *
 * Cloudflare obfuscation replaced `avery@chen.dev` with an injected
 * `<a class="__cf_email__">[email protected]</a>` element in the deployed HTML. React's
 * client tree expected the literal string, so every page load logged React #418 and
 * React discarded the server markup for that subtree.
 *
 * The failure was invisible to the whole repo because nothing ever fetched the deployed
 * HTML. A gate that only checks the *source* would pass forever while the served page
 * stayed broken — which is precisely how this defect shipped.
 *
 * So this asserts the marker is present in the generated HTML, and that it precedes the
 * body content Cloudflare would rewrite.
 */

const OFF = "<!--email_off-->";
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let dir: string;

beforeEach(() => {
	dir = mkdtempSync(join(tmpdir(), "postbuild-"));
	mkdirSync(join(dir, "out", "app"), { recursive: true });
	// The build this script runs against.
	writeFileSync(
		join(dir, "out", "index.html"),
		"<!doctype html><html><head><title>home</title></head><body><p>avery@chen.dev</p></body></html>",
	);
	writeFileSync(
		join(dir, "out", "app", "index.html"),
		"<!doctype html><html><head><title>app</title></head><body>avery@chen.dev</body></html>",
	);
	// A file the script must not touch.
	writeFileSync(join(dir, "out", "asset.js"), "console.log('avery@chen.dev')");
	writeFileSync(
		join(dir, "out", "404.html"),
		"<!doctype html><html><head></head><body>nf</body></html>",
	);
	mkdirSync(join(dir, "public"), { recursive: true });
	writeFileSync(
		join(dir, "public", "404.html"),
		"<!doctype html><html><head></head><body>custom 404</body></html>",
	);
});

afterEach(() => {
	rmSync(dir, { recursive: true, force: true });
});

/**
 * Run the real script as a subprocess against the fixture, passing the directories it
 * should operate on.
 *
 * Two earlier attempts were wrong and both are worth not repeating:
 *
 *   1. Importing the module in-process. It caches after the first import, so a second run
 *      is a no-op, which made the idempotency test meaningless.
 *   2. `process.chdir()` into a fixture with a hardcoded absolute repo path. Green on one
 *      node, `ENOENT: chdir` on every CI runner, because the checkout lives elsewhere --
 *      and it also mutates shared process state for every other test file in the worker.
 *
 * A subprocess with explicit paths tests what the build actually executes and touches
 * nothing outside the fixture.
 */
function run() {
	execFileSync(
		process.execPath,
		[
			join(repoRoot, "scripts/postbuild.js"),
			join(dir, "out"),
			join(dir, "public"),
		],
		{ cwd: dir, stdio: "pipe" },
	);
}

describe("postbuild disables Cloudflare email obfuscation", () => {
	it("adds the opt-out marker to every generated page", () => {
		run();

		for (const page of ["out/index.html", "out/app/index.html"]) {
			const html = readFileSync(join(dir, page), "utf8");
			expect(html, `${page} is missing ${OFF}`).toContain(OFF);
		}
	});

	it("puts the marker inside <head>, before any body content", () => {
		run();
		const html = readFileSync(join(dir, "out/index.html"), "utf8");
		const headEnd = html.indexOf("</head>");
		const marker = html.indexOf(OFF);
		expect(marker).toBeGreaterThan(html.indexOf("<head>"));
		expect(marker).toBeLessThan(headEnd);
	});

	it("still copies the custom 404 page", () => {
		run();
		expect(readFileSync(join(dir, "out/404.html"), "utf8")).toContain(
			"custom 404",
		);
	});

	it("leaves non-HTML assets alone", () => {
		run();
		const js = readFileSync(join(dir, "out/asset.js"), "utf8");
		expect(js).not.toContain(OFF);
	});

	it("is idempotent, so a second run does not double up the marker", () => {
		run();
		const afterFirst = readFileSync(join(dir, "out/index.html"), "utf8");
		run();
		const afterSecond = readFileSync(join(dir, "out/index.html"), "utf8");
		expect(afterSecond).toBe(afterFirst);
		expect(afterSecond.split(OFF)).toHaveLength(2);
	});
});
