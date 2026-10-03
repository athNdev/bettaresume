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
	},
});
