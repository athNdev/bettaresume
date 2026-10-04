/**
 * A minimal static file server for the built export.
 *
 * ## Why it exists
 *
 * `.github/workflows/visual.yml` needs to load the built site over HTTP to audit it. The
 * obvious way is `npx serve`, which adds a dependency to a repo whose dependency graph
 * is deliberately frozen (`docs/AGENT-CONTEXT.md` §2.1) and pulls a transitive tree for
 * the privilege of returning files. This is `node:http` and nothing else.
 *
 * ## Why it does not build paths from the request
 *
 * The first two versions derived a filesystem path from the URL and then tried to prove
 * the result was safe. That is the wrong shape, and it failed twice:
 *
 *   v1  join(root, normalize(urlPath)) guarded by file.startsWith(root)
 *       CodeQL: js/path-injection (high). It was right. Serving `/tmp/out` and
 *       requesting `/../out-evil/secret.txt` resolves to `/tmp/out-evil/secret.txt`,
 *       and `"/tmp/out-evil/secret.txt".startsWith("/tmp/out")` is **true**. A sibling
 *       directory whose name merely begins with the root's was readable.
 *
 *   v2  normalise, strip leading `..`, re-root with a `./` prefix, compare on a
 *       separator boundary, then re-check `realpathSync`.
 *       Secure — `test/visual-audit-traversal.test.ts` proves it — but CodeQL still
 *       flagged it, because the JavaScript extractor does not model `normalize`,
 *       `realpathSync` or a separator-boundary prefix test as sanitizers.
 *
 * So this version removes the possibility instead of arguing about it: **the set of
 * files that can be served is enumerated up front**, and a request is answered only by a
 * lookup in that immutable map. No path is ever constructed from a request, so there is
 * no traversal to defend and nothing for a static analyser to flag. A directory that
 * changes after startup is not reflected, which for a build artefact is the correct
 * trade: what CI audits is exactly what the build produced.
 *
 * The trade is real and worth stating: a 30,000-file export is scanned once at startup.
 * That costs a few milliseconds and removes an entire vulnerability class.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, relative, resolve, sep } from "node:path";

/** @type {Record<string, string>} */
const MIME = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".avif": "image/avif",
	".gif": "image/gif",
	".ico": "image/x-icon",
	".woff2": "font/woff2",
	".woff": "font/woff",
	".ttf": "font/ttf",
	".otf": "font/otf",
	".txt": "text/plain; charset=utf-8",
	".xml": "application/xml",
	".webmanifest": "application/manifest+json",
};

/**
 * Every servable file under `root`, keyed by the URL path that reaches it.
 *
 * Keys are exact: `/`, `/index.html`, `/app/page.html`. Nothing is matched loosely and
 * nothing is derived from a request, so `..`, absolute paths, encoded separators, NUL
 * bytes and doubled slashes are all simply absent from the map — they cannot reach the
 * filesystem at all.
 *
 * @param {string} root absolute directory to serve
 * @returns {Map<string, { absolute: string, type: string }>}
 */
export function buildFileMap(root) {
	/** @type {Map<string, { absolute: string, type: string }>} */
	const files = new Map();

	/** @param {string} dir */
	const walk = (dir) => {
		let entries;
		try {
			entries = readdirSync(dir, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const absolute = join(dir, entry.name);
			if (entry.isSymbolicLink()) continue; // never follow links out of the tree
			if (entry.isDirectory()) {
				walk(absolute);
				continue;
			}
			if (!entry.isFile()) continue;
			const rel = relative(root, absolute);
			if (rel.startsWith("..") || rel.includes(`..${sep}`)) continue;
			const url = `/${rel.split(sep).join("/")}`;
			const type = MIME[extname(absolute).toLowerCase()];
			if (!type) continue; // serve only known asset types
			files.set(url, { absolute, type });
		}
	};

	walk(root);

	// Directory-style URLs resolve to their index.html, exactly as a static host does.
	for (const [url, entry] of [...files]) {
		if (!url.endsWith("/index.html")) continue;
		files.set(url.slice(0, -"index.html".length), entry);
	}
	// A bare "/" means the root index.
	const rootIndex = files.get("/index.html");
	if (rootIndex) files.set("/", rootIndex);

	return files;
}

/**
 * @param {string} dir directory to serve
 * @returns {Promise<{
 *   server: import("node:http").Server,
 *   port: number,
 *   fileCount: number,
 *   close: () => Promise<void>,
 * }>}
 */
export function startServer(dir) {
	const root = resolve(dir);
	let stat;
	try {
		stat = statSync(root);
	} catch {
		return Promise.reject(
			new Error(`--serve directory does not exist: ${root}`),
		);
	}
	if (!stat.isDirectory()) {
		return Promise.reject(
			new Error(`--serve path is not a directory: ${root}`),
		);
	}

	const files = buildFileMap(root);

	const server = createServer((req, res) => {
		const raw = req.url ?? "/";
		const pathname = (raw.split("?")[0] ?? "/").split("#")[0] ?? "/";
		const entry = files.get(pathname);

		if (!entry) {
			const notFound = files.get("/404.html");
			if (notFound) {
				res.writeHead(404, { "content-type": notFound.type });
				res.end(readFileSync(notFound.absolute));
				return;
			}
			res.writeHead(404).end("not found");
			return;
		}

		res.writeHead(200, { "content-type": entry.type });
		res.end(readFileSync(entry.absolute));
	});

	return new Promise((ok) => {
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : 0;
			ok({
				server,
				port,
				fileCount: files.size,
				close: () =>
					new Promise((done) => {
						server.close(() => done(undefined));
					}),
			});
		});
	});
}
