import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Root-workspace test config.
 *
 * Scoped deliberately narrowly: only `test/` at the repository root. The `api/`
 * workspace has its own config (api/vitest.config.mts) driving a real in-memory
 * SQLite database, and `npm test` runs the two suites via `run-s`. Letting this
 * config glob into `src/` would pull server-only modules into a Node
 * environment, and letting it reach `api/` would double-run that suite.
 */
export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src", import.meta.url)),
			"@bettaresume/types": fileURLToPath(
				new URL("./packages/types/src/index.ts", import.meta.url),
			),
		},
	},
	test: {
		environment: "node",
		// `.tsx` as well as `.ts`: the import review screen is asserted by rendering it
		// with `react-dom/server`, which needs JSX. The root vitest config is `node` with
		// no jsdom (see the comment above), so there is nothing that renders React in a
		// DOM here to bypass.
		include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
		pool: "forks",
		// Vitest's default per-test timeout is 5s. That is too tight for the tests here
		// whose first act is a dynamic `import()` of a whole component tree — the
		// review-panel test pays the transform cost for the entire editor graph, and on
		// a ~5 GB node running 29 workers in parallel that alone can exceed 5s.
		//
		// It surfaced as an intermittent red on a suite that was otherwise 100% green,
		// which is the worst kind of gate failure: it trains people to re-run instead of
		// read, and it eventually trains them to ignore the suite. The honest fix is a
		// timeout that reflects what these tests actually cost, not a re-run.
		//
		// 20s is generous for every current test (the slowest is well under 3s in
		// isolation) and still fails a genuine hang in a reasonable time.
		testTimeout: 20_000,
		hookTimeout: 20_000,
	},
});
