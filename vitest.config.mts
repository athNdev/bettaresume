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
		include: ["test/**/*.test.ts"],
		pool: "forks",
	},
});
