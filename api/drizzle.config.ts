import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit configuration.
 *
 * ## Why nothing here throws on a missing variable
 *
 * `db:generate` only needs `schema` and `out` — it diffs two files and never opens a
 * connection. The credentials below are for `db:push`/`db:migrate`/`db:studio`. Building
 * them eagerly means a missing secret fails `generate` too, which is how a CI drift check
 * ("does `generate` produce an empty migration?") would require production credentials it
 * has no business holding.
 *
 * They were three non-null assertions, so a missing variable silently became `undefined`.
 * Now they are empty strings: `generate` works with no environment at all, and the
 * commands that actually connect report a missing credential through drizzle-kit's own
 * validation, which names the field.
 *
 * ## Which database
 *
 * `LOCAL_DB_PATH` selects a local SQLite file. Anything that connects without it goes to
 * the real D1 over HTTP — that is the intended default for `db:studio`, and the reason
 * `db:migrate` in this repo goes through `wrangler d1 migrations apply` instead.
 */
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
					accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? "",
					databaseId: process.env.CLOUDFLARE_DATABASE_ID ?? "",
					token: process.env.CLOUDFLARE_D1_TOKEN ?? "",
				},
			}),
});
