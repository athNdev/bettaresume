/**
 * The static server in `scripts/static-server.mjs` must not be walkable.
 *
 * ## The bug this exists for
 *
 * The first version of that server resolved a request path with
 * `join(root, normalize(urlPath))` and guarded it with `file.startsWith(root)`.
 * CodeQL flagged `js/path-injection` (high) and it was **right**:
 *
 *     serve   /tmp/x
 *     request /../x-evil/secret.txt
 *     resolves to           /tmp/x-evil/secret.txt
 *     startsWith("/tmp/x")  true      <-- readable
 *
 * A sibling directory whose name merely begins with the root's was fully readable. That
 * is the worst kind of bug in a containment check: it *reads* like a guard, so a reviewer
 * approves it, and it does nothing.
 *
 * ## Why an HTTP test and not a unit test on the resolver
 *
 * Calling `resolveInsideRoot` directly would test the function I wrote. Driving the real
 * server over real HTTP tests what an attacker would actually reach, including the
 * `decodeURIComponent` step and the index.html rewrite. The resolver is also exported, so
 * this file checks both: the resolved paths, and the end-to-end responses.
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
import { resolveInsideRoot, startServer } from "../scripts/static-server.mjs";

const SECRET = "TOP-SECRET-OUTSIDE-THE-ROOT";

let base: string;
let root: string;
let sibling: string;
let origin: string;
let close: () => Promise<void>;

beforeAll(async () => {
	base = mkdtempSync(join(tmpdir(), "visual-audit-traversal-"));
	root = join(base, "out");
	sibling = join(base, "out-evil");
	mkdirSync(root, { recursive: true });
	mkdirSync(sibling, { recursive: true });

	writeFileSync(
		join(root, "index.html"),
		"<!doctype html><title>in-root</title><main>ok</main>",
	);
	writeFileSync(join(root, "app.js"), "console.log(1)");
	writeFileSync(join(sibling, "secret.txt"), SECRET);
	// A symlink inside the root that points out of it.
	symlinkSync(join(sibling, "secret.txt"), join(root, "link.txt"));

	const started = await startServer(root);
	origin = `http://127.0.0.1:${started.port}`;
	close = started.close;
});

afterAll(async () => {
	if (close) await close();
	rmSync(base, { recursive: true, force: true });
});

async function get(path: string) {
	const res = await fetch(origin + path, { redirect: "manual" });
	return { status: res.status, body: await res.text() };
}

describe("the static server serves its own root", () => {
	it("serves the index at /", async () => {
		const r = await get("/");
		expect(r.status).toBe(200);
		expect(r.body).toContain("in-root");
	});

	it("serves a nested asset", async () => {
		const r = await get("/app.js");
		expect(r.status).toBe(200);
		expect(r.body).toContain("console.log");
	});
});

describe("the static server cannot be walked out of its root", () => {
	it("never serves the sibling-directory bypass that a startsWith check allows", async () => {
		// This is the exact input that `resolved.startsWith(root)` wrongly accepted.
		//
		// The server answers it by collapsing `..` and re-rooting inside `root`, so the
		// request lands on `<root>/out-evil/secret.txt` and 404s rather than 403ing. The
		// security property is "the secret is never served"; the exact status code is not
		// the point, so assert the property and record the code.
		const r = await get("/../out-evil/secret.txt");
		expect(r.body).not.toContain(SECRET);
		expect(r.status).toBeGreaterThanOrEqual(400);
	});

	it("refuses percent-encoded traversal", async () => {
		const r = await get("/%2e%2e%2fout-evil%2fsecret.txt");
		expect(r.body).not.toContain(SECRET);
	});

	it("refuses a deeper encoded traversal", async () => {
		const r = await get("/%2E%2E%2F%2E%2E%2Fout-evil%2Fsecret.txt");
		expect(r.body).not.toContain(SECRET);
	});

	it("refuses a symlink that points out of the root", async () => {
		const r = await get("/link.txt");
		expect(r.body).not.toContain(SECRET);
	});

	it("does not serve from the filesystem root via an absolute-looking path", async () => {
		const r = await get("//etc/hostname");
		expect(r.status).toBeGreaterThanOrEqual(400);
	});

	it("refuses a NUL byte in the path", () => {
		expect(resolveInsideRoot(root, "/index.html\0.png")).toBeNull();
	});

	it("refuses malformed percent-encoding", () => {
		// `decodeURIComponent("%")` throws; an unhandled throw in the request handler
		// would take the server down on one request.
		expect(resolveInsideRoot(root, "/%")).toBeNull();
	});

	it("resolves legitimate paths inside the root", () => {
		const resolved = resolveInsideRoot(root, "/index.html");
		expect(resolved).not.toBeNull();
		expect(resolved?.endsWith("index.html")).toBe(true);
	});

	it("keeps the prefix check honest about the separator boundary", () => {
		// Direct proof of the original defect, so a future refactor cannot reintroduce it
		// without failing here. This is what `startsWith(root)` wrongly accepts.
		expect("/tmp/out-evil/secret.txt".startsWith("/tmp/out")).toBe(true);

		// Whatever the resolver returns for that input, it must be inside the root or
		// nothing. Returning a path under the root is fine -- that is what collapsing
		// does -- but returning the sibling is not.
		const resolved = resolveInsideRoot(root, "/../out-evil/secret.txt");
		if (resolved !== null) {
			expect(resolved === root || resolved.startsWith(root + "/")).toBe(true);
		}
	});
});
