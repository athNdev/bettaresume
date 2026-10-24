import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";

/**
 * The dashboard's own query, checked against the real migrations.
 *
 * `resume.list` filters on `userId` (and `isArchived` when archived rows are hidden) and
 * orders by `updatedAt DESC`. `Resume_userId_idx` covered only the first column, so SQLite
 * sorted the whole result in a temp b-tree before returning a page — invisible at three
 * resumes, and the entire cost of the dashboard once a library is worth managing.
 *
 * Asserting that `schema.ts` declares an index would only prove the declaration exists.
 * This applies every migration to an in-memory database and reads the query plan, because
 * the property that matters is that SQLite *uses* it and does not add a sort step.
 */

const MIGRATIONS = join(process.cwd(), "drizzle");

function migratedDatabase(): DatabaseSync {
	const db = new DatabaseSync(":memory:");
	// D1 enables foreign keys; the plan is unaffected but a real migration would fail
	// on order if the schema had a forward reference without it.
	db.exec("PRAGMA foreign_keys = OFF");

	for (const file of readdirSync(MIGRATIONS)
		.filter((f) => f.endsWith(".sql"))
		.sort()) {
		const sql = readFileSync(join(MIGRATIONS, file), "utf8");
		for (const statement of sql.split("--> statement-breakpoint")) {
			const trimmed = statement.trim();
			if (trimmed) db.exec(trimmed);
		}
	}

	return db;
}

const plan = (db: DatabaseSync, sql: string): string[] =>
	db
		.prepare(`EXPLAIN QUERY PLAN ${sql}`)
		.all()
		.map((row) => String((row as { detail?: unknown }).detail ?? ""));

describe("resume.list uses an index and does not sort", () => {
	const db = migratedDatabase();
	const unarchived =
		"SELECT * FROM Resume WHERE userId = 'u1' AND isArchived = 0 ORDER BY updatedAt DESC";
	const all =
		"SELECT * FROM Resume WHERE userId = 'u1' ORDER BY updatedAt DESC";

	it("searches the composite index", () => {
		expect(plan(db, unarchived).join(" | ")).toContain(
			"Resume_userId_archived_updated_idx",
		);
	});

	it("needs no temp b-tree for the sort", () => {
		// This is the regression. It is the line SQLite prints when it could not use the
		// index's order, and it is invisible unless you look.
		expect(plan(db, unarchived).join(" | ")).not.toMatch(/TEMP B-TREE/i);
	});

	it("still avoids a sort when archived rows are included", () => {
		// The prefix `(userId, isArchived, updatedAt)` cannot satisfy `userId` + order by
		// `updatedAt` alone — SQLite would need to merge two ranges. It does, and the
		// plan must not fall back to a full scan plus sort.
		const details = plan(db, all).join(" | ");
		expect(details).toMatch(/Resume_userId/);
		expect(details).not.toMatch(/SCAN Resume/i);
	});
});
