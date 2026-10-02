import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		// API integration tests. They drive the real Drizzle schema against a real
		// in-memory SQLite database (see test/helpers/harness.ts) — never a mock.
		environment: "node",
		include: ["test/**/*.test.ts"],
		// Each file builds its own in-memory database.
		pool: "forks",
	},
});
