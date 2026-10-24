import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Copy the Typst WASM modules into `public/` so the browser loads them from this
 * origin instead of jsDelivr.
 *
 * ## Why
 *
 * `src/lib/typst/compiler.ts` used to point `getModule` at a hardcoded
 * `https://cdn.jsdelivr.net/npm/@myriaddreamin/...@0.7.0-rc2/...wasm` URL. That is a
 * third-party request on the export path, which costs three things:
 *
 *   - **Availability.** Export fails whenever jsDelivr is slow, blocked, or has dropped
 *     the pinned pre-release tag. The npm package is already installed locally, so the
 *     bytes were on disk the whole time.
 *   - **Supply chain.** The CDN decides what it serves for that path. There is no
 *     Subresource Integrity attribute on a `WebAssembly.instantiateStreaming` fetch, so
 *     the pin was a version string and a promise, not a hash.
 *   - **Privacy.** A resume export is a personal document. The request leaked the
 *     visitor's IP to a third-party CDN for a file we already shipped.
 *
 * ## What it costs
 *
 * The compiler module is ~28 MB. That is the same bytes jsDelivr was sending, so the
 * download does not change — it stops being somebody else's to serve. It is
 * `public/wasm/`, generated at build time, and gitignored: the source of truth is the
 * lockfile, and committing 29 MB of binaries to re-export them on every build would be
 * worse.
 *
 * Runs from `prebuild` and `predev`, so `npm run dev` and `npm run build` both have the
 * files. The test suite does not need them: it skips Typst compilation when the binary
 * is absent, and `test/typst-assets.test.ts` asserts the *wiring* rather than the files.
 */

/** package name -> [source path inside the package, public filename] */
const ASSETS = [
	[
		"@myriaddreamin/typst-ts-web-compiler",
		"pkg/typst_ts_web_compiler_bg.wasm",
		"typst_ts_web_compiler_bg.wasm",
	],
	[
		"@myriaddreamin/typst-ts-renderer",
		"pkg/typst_ts_renderer_bg.wasm",
		"typst_ts_renderer_bg.wasm",
	],
];

const require = createRequire(import.meta.url);
const OUT_DIR = join(process.cwd(), "public", "wasm");

mkdirSync(OUT_DIR, { recursive: true });

let copied = 0;
for (const [pkg, source, filename] of ASSETS) {
	// Resolve through the package's own main entry, then walk to the package root. The
	// `.wasm` file is not an entry point, so `require.resolve` cannot find it directly.
	const entry = require.resolve(pkg);
	let root = dirname(entry);
	while (!existsSync(join(root, "package.json"))) {
		const parent = dirname(root);
		if (parent === root) throw new Error(`Could not find the root of ${pkg}`);
		root = parent;
	}

	const from = join(root, source);
	const to = join(OUT_DIR, filename);
	copyFileSync(from, to);
	const mb = (statSync(to).size / 1024 / 1024).toFixed(1);
	console.log(`✓ ${filename} (${mb} MB) from ${pkg}`);
	copied++;
}

console.log(`✓ Typst WASM self-hosted: ${copied} module(s) in public/wasm/`);
