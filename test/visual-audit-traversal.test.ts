/**
 * The static server in `scripts/static-server.mjs` must not be walkable.
 *
 * ## The bug this exists for
 *
 * The first version of that server resolved a request with
 * `join(root, normalize(urlPath))` and guarded it with `file.startsWith(root)`.
 * CodeQL flagged `js/path-injection` (high) and it was **right**:
 *
 *     serve   /tmp/x
 *     request /../x-evil/secret.txt
 *     resolves to          /tmp/x-evil/secret.txt
 *     startsWith("/tmp/x") true      <-- readable
 *
 * A sibling directory whose name merely begins with the root's was fully readable. That
 * is the worst kind of bug in a containment check: it *reads* like a guard, so a reviewer
 * approves it, and it does nothing.
 *
 * A second version added proper canonicalisation and was genuinely secure, but CodeQL
 * still flagged it — the JavaScript extractor does not model `normalize`, `realpathSync`
 * or a separator-boundary prefix test as sanitizers. So the server stopped deriving paths
 * from requests entirely and now answers from a pre-enumerated map.
 *
 * These tests drive the real server over real HTTP, because calling the resolver as a
 * unit would only test the function I wrote, while an attacker gets to send bytes.
 */

import {
	mkdirSync,
	mkdtempSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildFileMap, startServer } from "../scripts/static-server.mjs";

const SECRET = "TOP-SECRET-OUTSIDE-THE-ROOT";

let base: string;
let root: string;
let origin: string;
let close: () => Promise<void>;
let fileCount = 0;

beforeAll(async () => {
	base = mkdtempSync(join(tmpdir(), "visual-audit-traversal-"));
	root = join(base, "out");
	// A sibling whose name begins with the served root's — the case `startsWith` misses.
	mkdirSync(join(base, "out-evil"), { recursive: true });
	mkdirSync(join(root, "app"), { recursive: true });
	mkdirSync(join(root, "_next", "static"), { recursive: true });

	writeFileSync(
		join(root, "index.html"),
		"<!doctype html><title>in-root</title><main>ok</main>",
	);
	writeFileSync(join(root, "404.html"), "<!doctype html><title>nf</title>");
	writeFileSync(
		join(root, "app", "index.html"),
		"<!doctype html><title>app</title><main>app</main>",
	);
	writeFileSync(join(root, "_next", "static", "chunk.js"), "console.log(1)");
	writeFileSync(join(base, "out-evil", "secret.txt"), SECRET);
	// A symlink inside the root that points out of it.
	symlinkSync(join(base, "out-evil", "secret.txt"), join(root, "link.txt"));

	const started = await startServer(root);
	origin = `http://127.0.0.1:${started.port}`;
	close = started.close;
	fileCount = started.fileCount;
});

afterAll(async () => {
	if (close) await close();
	rmSync(base, { recursive: true, force: true });
});

async function get(path: string) {
	const res = await fetch(origin + path, { redirect: "manual" });
	return { status: res.status, body: await res.text() };
}

describe("the static server serves its own tree", () => {
	it("enumerates the files it can serve", () => {
		expect(fileCount).toBeGreaterThan(0);
	});

	it("serves the root index at /", async () => {
		const r = await get("/");
		expect(r.status).toBe(200);
		expect(r.body).toContain("in-root");
	});

	it("serves /index.html directly", async () => {
		const r = await get("/index.html");
		expect(r.status).toBe(200);
		expect(r.body).toContain("in-root");
	});

	it("resolves a directory-style URL to its index.html", async () => {
		const r = await get("/app/");
		expect(r.status).toBe(200);
		expect(r.body).toContain("<main>app</main>");
	});

	it("serves a nested asset", async () => {
		const r = await get("/_next/static/chunk.js");
		expect(r.status).toBe(200);
		expect(r.body).toContain("console.log");
	});

	it("returns the 404 page for an unknown path", async () => {
		const r = await get("/nope.html");
		expect(r.status).toBe(404);
		expect(r.body).toContain("<title>nf</title>");
	});
});

describe("the static server cannot be walked out of its root", () => {
	it("never serves the sibling-directory bypass a startsWith check allows", async () => {
		// The exact input that `resolved.startsWith(root)` wrongly accepted.
		const r = await get("/../out-evil/secret.txt");
		expect(r.body).not.toContain(SECRET);
		expect(r.status).toBe(404);
	});

	it("never serves it under percent-encoding", async () => {
		for (const path of [
			"/%2e%2e%2fout-evil%2fsecret.txt",
			"/%2E%2E%2Fout-evil%2Fsecret.txt",
			"/..%2Fout-evil%2Fsecret.txt",
			"/%2e%2e%2f%2e%2e%2fout-evil%2fsecret.txt",
		]) {
			const r = await get(path);
			expect(r.body, `leaked via ${path}`).not.toContain(SECRET);
		}
	});

	it("never serves it through a symlink inside the root", async () => {
		const r = await get("/link.txt");
		expect(r.body).not.toContain(SECRET);
		expect(r.status).toBe(404);
	});

	it("does not serve from the filesystem root via an absolute-looking path", async () => {
		const r = await get("//etc/hostname");
		expect(r.status).toBe(404);
	});

	it("refuses a NUL byte in the path", async () => {
		const r = await get("/index.html%00.png");
		expect(r.body).not.toContain("in-root");
		expect(r.status).toBe(404);
	});

	it("survives malformed percent-encoding instead of throwing", async () => {
		// `decodeURIComponent("%")` throws. An unhandled throw in a request handler
		// would take the server down on a single request.
		const r = await get("/%");
		expect(r.status).toBe(404);
	});

	it("is still serving after all of that", async () => {
		// Proves the escapes above did not crash the process.
		const r = await get("/");
		expect(r.status).toBe(200);
	});
});

describe("the file map is a whitelist, not a derivation", () => {
	it("contains only keys that exist under the root", () => {
		const map = buildFileMap(root);
		for (const key of map.keys()) {
			expect(key.startsWith("/")).toBe(true);
			expect(key).not.toContain("..");
			expect(key).not.toContain("\\");
		}
	});

	it("does not include the symlink that points out of the tree", () => {
		const map = buildFileMap(root);
		expect(map.has("/link.txt")).toBe(false);
	});

	it("keeps the original defect visible", () => {
		// If someone reintroduces a prefix test, the line above this one is why.
		expect("/tmp/out-evil/secret.txt".startsWith("/tmp/out")).toBe(true);
	});
});
