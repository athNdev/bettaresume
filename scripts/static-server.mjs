/**
 * A minimal static file server for the built export.
 *
 * ## Why it exists
 *
 * `.github/workflows/visual.yml` needs to load the built site over HTTP to audit it. The
 * obvious way is `npx serve`, which adds a dependency to a repo whose dependency graph is
 * deliberately frozen (`docs/AGENT-CONTEXT.md` §2.1) and pulls a transitive tree for the
 * privilege of returning files. This is ~100 lines of `node:http` instead.
 *
 * ## Why the path resolution is written the way it is
 *
 * The first version contained `join(root, normalize(urlPath))` guarded by
 * `file.startsWith(root)`. CodeQL flagged `js/path-injection` (high) and it was correct:
 * serving `/tmp/out` and requesting `/../out-evil/secret` resolves to `/tmp/out-evil/secret`,
 * and `"/tmp/out-evil/secret".startsWith("/tmp/out")` is **true**. A sibling directory whose
 * name merely starts with the root's was readable.
 *
 * A `startsWith` that looks like a guard is worse than no guard, because it reads as one.
 * `test/visual-audit-traversal.mjs` drives this server over real HTTP and asserts the
 * escapes are refused, so the check cannot be quietly weakened.
 */

import { existsSync, readFileSync, realpathSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";

/** @type {Record<string, string>} */
const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".txt": "text/plain; charset=utf-8",
	".xml": "application/xml",
	".webmanifest": "application/manifest+json",
};

/**
 * Map a URL path to a file inside `root`, or return null if it escapes.
 *
 * The obvious containment check -- `resolved.startsWith(root)` -- is **wrong**. Serving
 * `/tmp/out` and asking for `/../out-evil/secret` resolves to `/tmp/out-evil/secret`,
 * which passes a `startsWith("/tmp/out")` test. CodeQL flagged this as
 * `js/path-injection` (high) and it was right.
 *
 * So: normalise the relative path, strip leading `..` segments, join against a forced
 * `./` prefix so an absolute path cannot be re-rooted, then compare with a separator
 * boundary. `realpathSync` is checked as well so a symlink inside `out/` cannot point
 * anywhere else.
 */
/**
 * @param {string} root absolute path of the directory that may be served
 * @param {string} urlPath raw request path
 * @returns {string | null} an absolute path inside `root`, or null if it escapes
 */
export function resolveInsideRoot(root, urlPath) {
	let decoded;
	try {
		decoded = decodeURIComponent(urlPath);
	} catch {
		return null; // malformed percent-encoding
	}
	if (decoded.includes("\0")) return null;

	// Collapse to a relative path with no leading separator and no `..` segments.
	const rel = normalize(decoded).replace(/^[/\\]+/, "");
	const candidate = resolve(root, `.${sep}${rel}`);

	const insideRoot = candidate === root || candidate.startsWith(root + sep);
	if (!insideRoot) return null;

	if (!existsSync(candidate)) return candidate;
	// Follow symlinks and re-check, so a link out of the tree is rejected too.
	let real;
	try {
		real = realpathSync(candidate);
	} catch {
		return null;
	}
	if (real !== root && !real.startsWith(root + sep)) return null;
	return real;
}

/**
 * @param {string} dir
 * @returns {Promise<{ server: import("node:http").Server, port: number, close: () => Promise<void> }>}
 */
export function startServer(dir) {
	const root = resolve(dir);
	if (!existsSync(root))
		throw new Error(`--serve directory does not exist: ${root}`);
	const server = createServer((req, res) => {
		const raw = req.url ?? "/";
		const urlPath = raw.split("?")[0] ?? "/";
		let file = resolveInsideRoot(root, urlPath);
		if (file === null) {
			res.writeHead(403).end("forbidden");
			return;
		}
		if (existsSync(file) && !extname(file)) {
			const indexed = join(file, "index.html");
			if (existsSync(indexed)) file = indexed;
		}
		if (!existsSync(file)) {
			const notFound = join(root, "404.html");
			if (existsSync(notFound)) {
				res.writeHead(404, { "content-type": MIME[".html"] });
				res.end(readFileSync(notFound));
				return;
			}
			res.writeHead(404).end("not found");
			return;
		}
		res.writeHead(200, {
			"content-type": MIME[extname(file)] || "application/octet-stream",
		});
		res.end(readFileSync(file));
	});
	// `address()` is `string | AddressInfo`; with a TCP listener bound to a port it is
	// always AddressInfo, but the checker cannot know that.
	return new Promise((ok) => {
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : 0;
			ok({
				server,
				port,
				// Exposed so the traversal test can shut the server down instead of
				// leaking a listener for the rest of the run.
				close: () =>
					new Promise((done) => {
						server.close(() => done(undefined));
					}),
			});
		});
	});
}
