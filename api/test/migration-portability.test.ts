import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Migrations must run under `wrangler d1 migrations apply`, not just under the test
 * harness.
 *
 * These tests exist because that distinction was invisible until it hurt:
 * `api/test/seed-integrity.test.ts` applies every migration and passed, while
 * `npm run db:reset` -- and therefore the documented `npm run dev` setup path -- failed
 * on a CLEAN CHECKOUT with:
 *
 *     ERROR  not authorized: SQLITE_AUTH
 *
 * Two separate causes, both invisible to the harness because it does not sandbox the
 * way miniflare's local D1 does:
 *
 *   1. `PRAGMA foreign_keys=OFF` -- miniflare sandboxes PRAGMA entirely.
 *   2. `CREATE TEMP TABLE` -- TEMP requires attaching SQLite's separate temp database,
 *      which miniflore's local D1 also denies.
 *
 * Neither was load-bearing. Section was snapshotted to a scratch table and fully cleared
 * BEFORE `DROP TABLE Resume`, so the parent-delete cascade had no child rows to remove,
 * and the scratch table declares no FK so the cascade cannot reach it. That is the
 * actual protection; the PRAGMA and the TEMP were belt-and-braces that cost the whole
 * setup path.
 *
 * These assertions are cheap and would have caught both before a deploy.
 */

const MIGRATIONS_DIR = "drizzle";

function migrationFiles() {
	return readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith(".sql"))
		.sort();
}

/** Strip `--` comments so prose about PRAGMA does not trip the assertions. */
function stripSqlComments(sql: string): string {
	return sql
		.split("\n")
		.map((line) => {
			// Only treat `--` as a comment when it is not inside a string literal.
			const idx = line.indexOf("--");
			return idx === -1 ? line : line.slice(0, idx);
		})
		.join("\n");
}

describe("migrations avoid statements miniflare sandboxes", () => {
	it("there are migrations to check", () => {
		expect(migrationFiles().length).toBeGreaterThan(0);
	});

	it("no migration issues a PRAGMA", () => {
		const offenders = migrationFiles().filter((f) =>
			/PRAGMA/i.test(
				stripSqlComments(readFileSync(`${MIGRATIONS_DIR}/${f}`, "utf8")),
			),
		);
		expect(
			offenders,
			"PRAGMA is denied by miniflare's local D1 (SQLITE_AUTH); it was never load-bearing here",
		).toEqual([]);
	});

	it("no migration creates a TEMP table", () => {
		const offenders = migrationFiles().filter((f) =>
			/CREATE\s+TEMP/i.test(
				stripSqlComments(readFileSync(`${MIGRATIONS_DIR}/${f}`, "utf8")),
			),
		);
		expect(
			offenders,
			"CREATE TEMP needs the temp database attached, which miniflare denies (SQLITE_AUTH)",
		).toEqual([]);
	});

	it("no migration issues ATTACH or DETACH", () => {
		const offenders = migrationFiles().filter((f) =>
			/\b(ATTACH|DETACH)\b/i.test(
				stripSqlComments(readFileSync(`${MIGRATIONS_DIR}/${f}`, "utf8")),
			),
		);
		expect(offenders).toEqual([]);
	});
});

describe("the journal lists every migration file exactly once", () => {
	it("is in sync on disk", async () => {
		const journal = JSON.parse(
			readFileSync(`${MIGRATIONS_DIR}/meta/_journal.json`, "utf8"),
		) as { entries: { tag: string; idx: number }[] };

		const tags = journal.entries.map((e) => `${e.tag}.sql`);
		expect(tags.sort()).toEqual(migrationFiles());

		// Indices must be contiguous, or wrangler applies them out of order.
		journal.entries.forEach((e, i) => {
			expect(e.idx).toBe(i);
		});
	});
});

describe("wrangler can actually apply every migration", () => {
	it("applies cleanly to a fresh local D1", () => {
		// The end-to-end check the harness could never give us. Slow, and worth it:
		// this is the command `npm run db:reset` runs, so a failure here is a broken
		// setup path rather than a hypothetical.
		execFileSync("rm", ["-rf", ".wrangler/state/v3/d1"]);

		const out = execFileSync(
			"npx",
			[
				"wrangler",
				"d1",
				"migrations",
				"apply",
				"bettaresume_d1",
				"--local",
				"--config",
				"wrangler.dev.jsonc",
			],
			{ encoding: "utf8", input: "Y\n", cwd: process.cwd() },
		);

		expect(out).not.toMatch(/SQLITE_AUTH/);
		expect(out).toMatch(/executed successfully/);
	}, 180_000);
});

describe("the revisions table the schema declares is what the migration builds", () => {
	it("has the columns the schema declares", () => {
		const sql = readFileSync(
			`${MIGRATIONS_DIR}/0002_resume_revisions.sql`,
			"utf8",
		);
		for (const column of [
			"id",
			"resumeId",
			"seq",
			"snapshotJson",
			"contentHash",
			"label",
			"createdAt",
		]) {
			expect(sql, `migration is missing ${column}`).toContain(column);
		}
	});

	it("dedupes identical autosaves at the database level, not in app code", () => {
		const sql = readFileSync(
			`${MIGRATIONS_DIR}/0002_resume_revisions.sql`,
			"utf8",
		);
		// An autosave that fires with no real change would otherwise append an identical
		// row every few seconds. The UNIQUE index is the enforcement; a read-then-write
		// check in application code can be interleaved by two concurrent requests.
		expect(sql).toMatch(/UNIQUE INDEX.*resume_revisions_resume_hash_unique/);
	});

	it("makes the sequence monotonic per resume, enforced by the database", () => {
		const sql = readFileSync(
			`${MIGRATIONS_DIR}/0002_resume_revisions.sql`,
			"utf8",
		);
		expect(sql).toMatch(/UNIQUE INDEX.*resume_revisions_resume_seq_unique/);
	});

	it("cascades on resume delete, so erasure takes the history with it", () => {
		// GDPR erasure requires the history to go too, and a revision without its
		// resume is meaningless.
		const sql = readFileSync(
			`${MIGRATIONS_DIR}/0002_resume_revisions.sql`,
			"utf8",
		);
		expect(sql).toMatch(
			/FOREIGN KEY \(`?resumeId`?\) REFERENCES (?:`?Resume`?|\w+)\(`?id`?\)[^\n]*ON DELETE CASCADE/i,
		);
	});
});
