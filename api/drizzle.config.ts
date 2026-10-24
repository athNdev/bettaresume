import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Read an environment variable or fail with the name of the missing one.
 *
 * These were three non-null assertions, so a missing variable became `undefined`
 * and drizzle-kit reported whatever its HTTP client made of that. This is a
 * developer running `db:generate` against production D1; the useful error names
 * the variable and the file it belongs in.
 */
function required(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(
			`${name} is not set. It belongs in api/.dev.vars or the shell.`,
		);
	}
	return value;
}

export default defineConfig({
	schema: "./src/db/schema.ts",
	out: "./drizzle",
	dialect: "sqlite",
	...(process.env.LOCAL_DB_PATH
		? {
				dbCredentials: {
					url: process.env.LOCAL_DB_PATH,
				},
			}
		: {
				driver: "d1-http",
				dbCredentials: {
					accountId: required("CLOUDFLARE_ACCOUNT_ID"),
					databaseId: required("CLOUDFLARE_DATABASE_ID"),
					token: required("CLOUDFLARE_D1_TOKEN"),
				},
			}),
});
