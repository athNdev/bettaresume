import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
	buildShowcaseRows,
	renderShowcaseSqlBlock,
	SEED_PREFIX,
	SHOWCASE_SEED_HEADER,
} from "../src/db/showcase";

/**
 * The showcase has **one** source, and this file is what enforces it.
 *
 * `api/src/db/showcase.json` feeds two very different consumers:
 *
 *   1. `api/src/db/seed.sql` — the local dev database, applied by `npm run db:reset-seed`.
 *   2. `user.upsert` — the first sign-in of a real user, so the dashboard's "View the
 *      example" button opens a real document.
 *
 * Two hand-maintained copies would drift, and the drift would be invisible: the dev
 * fixture would keep satisfying `showcase.test.ts` while new users received something
 * older. So the SQL is generated, and the assertions below are the tripwire:
 *
 *   - the committed block equals what the generator produces (re-run
 *     `npm run showcase:render` after editing the JSON);
 *   - the runtime builder, given the seed's ids, materialises exactly the rows the SQL
 *     inserts. That is the claim "same fixture, same document", checked rather than
 *     assumed.
 */
const seedSql = readFileSync(
	fileURLToPath(new URL("../src/db/seed.sql", import.meta.url)),
	"utf8",
);
const drizzleDir = fileURLToPath(new URL("../drizzle", import.meta.url));

describe("the showcase seed block is generated from the shared fixture", () => {
	it("matches `npm run showcase:render` byte for byte", () => {
		const at = seedSql.indexOf(SHOWCASE_SEED_HEADER);
		expect(
			at,
			`seed.sql has no showcase header. Expected:\n${SHOWCASE_SEED_HEADER}`,
		).toBeGreaterThan(-1);

		expect(
			seedSql.slice(at).trimEnd(),
			"seed.sql's showcase block is stale. Run: npm run showcase:render",
		).toBe(renderShowcaseSqlBlock().trimEnd());
	});

	it("seeds a real user with the same rows the dev seed inserts", () => {
		const db = new Database(":memory:");
		db.pragma("foreign_keys = ON");
		for (const file of readdirSync(drizzleDir)
			.filter((name) => name.endsWith(".sql"))
			.sort()) {
			db.exec(
				readFileSync(`${drizzleDir}/${file}`, "utf8").replaceAll(
					"--> statement-breakpoint",
					"",
				),
			);
		}
		db.exec(seedSql);

		const fromSeed = {
			contentItems: db
				.prepare(
					"SELECT * FROM content_items WHERE id LIKE 'showcase-%' ORDER BY id",
				)
				.all(),
			resumes: db
				.prepare(
					`SELECT * FROM Resume WHERE tags LIKE '%"showcase"%' ORDER BY id`,
				)
				.all(),
			sections: db
				.prepare(
					`SELECT s.* FROM Section s JOIN Resume r ON r.id = s.resumeId
					 WHERE r.tags LIKE '%"showcase"%' ORDER BY s.id`,
				)
				.all(),
			revisions: db
				.prepare(
					`SELECT rv.* FROM resume_revisions rv JOIN Resume r ON r.id = rv.resumeId
					 WHERE r.tags LIKE '%"showcase"%' ORDER BY rv.id`,
				)
				.all(),
		} as Record<string, Record<string, unknown>[]>;
		db.close();

		const built = buildShowcaseRows({ userId: "user-1", prefix: SEED_PREFIX });
		const seconds = (value: unknown) =>
			value instanceof Date ? Math.floor(value.getTime() / 1000) : value;
		// SQLite stores booleans as 0/1; Drizzle's insert types say `boolean`. Same value,
		// two representations — compare the stored form.
		const stored = (value: unknown) => {
			if (typeof value === "boolean") return value ? 1 : 0;
			if (value === null || value === undefined) return value;
			return seconds(value);
		};

		const runtime = {
			contentItems: [...built.contentItems].sort((a, b) =>
				String(a.id).localeCompare(String(b.id)),
			),
			resumes: [...built.resumes].sort((a, b) =>
				String(a.id).localeCompare(String(b.id)),
			),
			sections: [...built.sections].sort((a, b) =>
				String(a.id).localeCompare(String(b.id)),
			),
			revisions: [...built.revisions].sort((a, b) =>
				String(a.id).localeCompare(String(b.id)),
			),
		};

		for (const table of Object.keys(runtime)) {
			const seeded = fromSeed[table] ?? [];
			const produced = runtime[table as keyof typeof runtime];
			expect(produced.length, `${table}: row count`).toBe(seeded.length);

			for (const [index, row] of seeded.entries()) {
				const other = produced[index] as Record<string, unknown>;
				for (const [column, value] of Object.entries(row)) {
					// `now - offset` in SQL and `Date` arithmetic in the runtime are taken a
					// second apart; the offsets themselves are the shared data and are
					// exercised by the fixture. Comparing the instants would be flaky.
					if (column === "createdAt" || column === "updatedAt") {
						expect(typeof seconds(other[column])).toBe("number");
						continue;
					}
					expect(
						stored(other[column]),
						`${table}[${index}].${column} (${String(row.id)})`,
					).toEqual(stored(value));
				}
			}
		}
	});
});
