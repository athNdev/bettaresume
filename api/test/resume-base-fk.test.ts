import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resumes } from "../src/db/schema";
import {
	createHarness,
	RESUME_A,
	RESUME_B,
	USER_A,
	USER_B,
} from "./helpers/harness";

/**
 * Integration tests for the `Resume.baseResumeId` self-referencing foreign key.
 *
 * `baseResumeId` is the "this resume is a variation of that one" pointer. Before the
 * fix it was a bare text column: nothing stopped a dangling id, an id belonging to a
 * different tenant, or a self-reference from being written and silently stored.
 *
 * These tests drive a real in-memory SQLite database migrated from api/drizzle/*.sql —
 * never a mock — because the thing under test is the SQLite FK constraint itself.
 *
 * The first test is the load-bearing one: SQLite ignores FOREIGN KEY clauses unless
 * `PRAGMA foreign_keys = ON`, so with enforcement off every assertion below would pass
 * while proving nothing. It asserts the pragma before the constraint is trusted.
 */

describe("Resume.baseResumeId foreign key", () => {
	it("has PRAGMA foreign_keys = ON, so the constraint is genuinely enforced", () => {
		const h = createHarness();
		try {
			const enabled = h.sqlite.pragma("foreign_keys", { simple: true });
			expect(enabled).toBe(1);
		} finally {
			h.close();
		}
	});

	it("accepts a baseResumeId that points at an existing resume", async () => {
		const h = createHarness();
		try {
			await h.raw.insert(resumes).values({
				id: "variation-valid",
				userId: USER_A,
				name: "A variation",
				variationType: "variation",
				baseResumeId: RESUME_A,
			});

			const row = await h.resume("variation-valid");
			expect(row?.baseResumeId).toBe(RESUME_A);
		} finally {
			h.close();
		}
	});

	it("rejects a dangling baseResumeId", async () => {
		const h = createHarness();
		try {
			expect(() =>
				h.sqlite
					.prepare(
						"INSERT INTO Resume (id, userId, name, variationType, baseResumeId, template, tags, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, 'variation', ?, 'minimal', '[]', 0, ?, ?)",
					)
					.run(
						"variation-dangling",
						USER_A,
						"Bad variation",
						"no-such-resume",
						0,
						0,
					),
			).toThrow(/FOREIGN KEY constraint failed/);

			// The bad row must not be silently persisted.
			expect(await h.resume("variation-dangling")).toBeUndefined();
		} finally {
			h.close();
		}
	});

	it("NULLs a variant's baseResumeId instead of deleting the variant when the base is deleted", async () => {
		const h = createHarness();
		try {
			await h.raw.insert(resumes).values({
				id: "variation-child",
				userId: USER_A,
				name: "Child variation",
				variationType: "variation",
				baseResumeId: RESUME_B,
			});

			expect((await h.resume("variation-child"))?.baseResumeId).toBe(RESUME_B);

			h.sqlite.prepare("DELETE FROM Resume WHERE id = ?").run(RESUME_B);

			// The variant survives …
			const survivor = await h.resume("variation-child");
			// … with its pointer cleared, not cascade-deleted.
			expect(survivor).toBeDefined();
			expect(survivor?.baseResumeId).toBeNull();
			expect(await h.resume(RESUME_B)).toBeUndefined();
		} finally {
			h.close();
		}
	});

	it("cascades a delete through the userId FK without disturbing unrelated variations", async () => {
		const h = createHarness();
		try {
			await h.raw.insert(resumes).values({
				id: "variation-survivor",
				userId: USER_B,
				name: "Survivor variation",
				variationType: "variation",
				baseResumeId: RESUME_A,
			});

			await h.raw.delete(resumes).where(eq(resumes.userId, USER_A));

			// baseResumeId was nulled, so variant-survivor is still readable.
			const survivor = await h.resume("variation-survivor");
			expect(survivor?.baseResumeId).toBeNull();
			expect(survivor?.userId).toBe(USER_B);

			// Sanity: the AND() path used above really does read back rows.
			const stillThere = await h.raw
				.select()
				.from(resumes)
				.where(
					and(eq(resumes.id, "variation-survivor"), eq(resumes.userId, USER_B)),
				);
			expect(stillThere).toHaveLength(1);
		} finally {
			h.close();
		}
	});
});

/**
 * Regression guard for a production data-loss hazard in the migration itself.
 *
 * SQLite cannot add a constraint to an existing column, so the FK required a
 * table rebuild of `Resume`. `Section.resumeId` is ON DELETE CASCADE, so the
 * rebuild's `DROP TABLE Resume` deletes every section row — unless the pragma
 * that suspends enforcement actually takes effect. It does not inside a
 * transaction, and D1 may wrap migrations in one.
 *
 * Measured with better-sqlite3 against this schema: with drizzle-kit's pragma-only
 * form, applying the rebuild inside a transaction took Section from 2 rows to 0.
 *
 * These tests assert the migration is the safe form, so reverting it to the
 * destructive one fails here rather than in production.
 */
describe("0001 migration does not cascade-delete sections", () => {
	const migration = readFileSync(
		fileURLToPath(
			new URL("../drizzle/0001_resume_base_resume_fk.sql", import.meta.url),
		),
		"utf8",
	);

	it("backs sections up somewhere the parent-delete cascade cannot reach", () => {
		// The scratch table used to be `CREATE TEMP TABLE`. It is now an ORDINARY table,
		// because TEMP requires attaching SQLite's separate temp database and miniflare's
		// local D1 denies that outright -- `not authorized: SQLITE_AUTH` -- which broke
		// `npm run db:reset`, and with it the documented `npm run dev` setup path, on a
		// clean checkout. See api/test/migration-portability.test.ts.
		//
		// The protection is unchanged and does not come from being TEMP: the scratch
		// table declares no foreign key, so `DROP TABLE Resume`'s cascade has nothing to
		// reach it through. Combined with `DELETE FROM Section` running BEFORE the drop,
		// the cascade has no child rows to remove at all.
		// Executable statements only. The migration's comment block NAMES
		// `CREATE TEMP TABLE` while explaining why it was removed, so matching the raw
		// file finds the prose. A sibling test in this file hit exactly that.
		const sql = migration
			.split("\n")
			.filter((line) => !line.trimStart().startsWith("--"))
			.join("\n");

		expect(sql).toMatch(/CREATE TABLE[^;]*_br_section_backup/i);
		// It must NOT be TEMP, for the reason above.
		expect(sql).not.toMatch(/CREATE\s+TEMP\s+TABLE/i);
		expect(migration).toMatch(
			/INSERT INTO [`"]?Section[`"]?\s+SELECT \* FROM [`"]?_br_section_backup/i,
		);
	});

	it("uses a scratch table with no foreign key, so the cascade cannot reach it", () => {
		// This is the property that actually matters, and it is what replaced the
		// TEMP-table guarantee.
		const sql = migration
			.split("\n")
			.filter((line) => !line.trimStart().startsWith("--"))
			.join("\n");
		const create =
			sql.match(/CREATE TABLE[^;]*_br_section_backup[^;]*;/i)?.[0] ?? "";
		expect(create).not.toMatch(/FOREIGN\s+KEY/i);
	});

	it("clears sections before the rebuild and restores them after", () => {
		// Search the executable statements only. The migration's comment block names
		// `DROP TABLE Resume` while explaining the hazard, so matching the raw file
		// would find the prose before the real statement.
		const sql = migration
			.split("\n")
			.filter((line) => !line.trimStart().startsWith("--"))
			.join("\n");
		const del = sql.search(/DELETE FROM [`"]?Section/i);
		const drop = sql.search(/DROP TABLE [`"]?Resume[`"]?/i);
		const restore = sql.search(
			/INSERT INTO [`"]?Section[`"]?[^;]*_br_section_backup/i,
		);
		expect(del).toBeGreaterThan(-1);
		expect(drop).toBeGreaterThan(del);
		expect(restore).toBeGreaterThan(drop);
	});

	it("repairs dangling and self-referential pointers before the copy", () => {
		// Without this the INSERT..SELECT aborts on a violating row and the whole
		// migration fails, taking the deploy with it.
		const repair = migration.search(/SET `baseResumeId` = NULL/i);
		expect(repair).toBeGreaterThan(-1);
		expect(migration).toMatch(/baseResumeId`? = `?id`?/i);
		expect(migration).toMatch(/NOT IN \(SELECT `?id`? FROM `?Resume`?\)/i);
	});

	it("actually preserves section rows when applied inside a transaction", () => {
		const db = new Database(":memory:");
		try {
			db.pragma("foreign_keys = ON");
			for (const file of readdirSync(
				fileURLToPath(new URL("../drizzle", import.meta.url)),
			)
				.filter((f) => f.endsWith(".sql"))
				.sort()) {
				db.exec(
					readFileSync(
						fileURLToPath(new URL(`../drizzle/${file}`, import.meta.url)),
						"utf8",
					).replaceAll("--> statement-breakpoint", ""),
				);
			}
			db.prepare(
				"INSERT INTO User(id,email,createdAt,updatedAt) VALUES(?,?,?,?)",
			).run("u-mig", "m@example.com", 1, 1);
			db.prepare(
				"INSERT INTO Resume(id,userId,name,createdAt,updatedAt) VALUES(?,?,?,?,?)",
			).run("r-mig", "u-mig", "Base", 1, 1);
			for (const [id, order] of [
				["s-mig-1", 0],
				["s-mig-2", 1],
			]) {
				db.prepare(
					'INSERT INTO Section(id,resumeId,type,"order",content,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)',
				).run(id, "r-mig", "summary", order, "{}", 1, 1);
			}
			const before = db.prepare("SELECT COUNT(*) AS c FROM Section").get() as {
				c: number;
			};

			// The hazardous case: migration applied within a transaction, where
			// `PRAGMA foreign_keys=OFF` is a no-op.
			db.exec("BEGIN");
			db.exec(migration.replaceAll("--> statement-breakpoint", ""));
			db.exec("COMMIT");

			const after = db.prepare("SELECT COUNT(*) AS c FROM Section").get() as {
				c: number;
			};
			expect(after.c).toBe(before.c);
			expect(after.c).toBe(2);

			// And the constraint is genuinely live afterwards.
			expect(() =>
				db
					.prepare(
						"INSERT INTO Resume(id,userId,name,baseResumeId,createdAt,updatedAt) VALUES(?,?,?,?,?,?)",
					)
					.run("r-mig-bad", "u-mig", "Bad", "does-not-exist", 1, 1),
			).toThrow(/FOREIGN KEY constraint failed/);
		} finally {
			db.close();
		}
	});
});
