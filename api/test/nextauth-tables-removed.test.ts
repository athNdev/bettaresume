import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { createTableRelationsHelpers } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import * as schema from "../src/db/schema";

/**
 * The NextAuth/Auth.js legacy tables must not come back.
 *
 * `Account`, `Session` and `VerificationToken` were declared in schema.ts as part of the
 * initial create-t3-app scaffold and carried forward verbatim through the move of
 * `api-server/src/db/schema.ts` to `api/src/db/schema.ts` (5cd5b65). No runtime path ever
 * read or wrote them -- see the reasoning in `0005_drop_nextauth_tables.sql`, which drops
 * them from every environment including production D1.
 *
 * The reason this needs a test is that "dead" is not self-enforcing. The declarations
 * produce no type error, no lint warning and no runtime failure: a re-added `accounts`
 * export compiles cleanly, appears in the next drizzle-kit snapshot, and every later
 * generated migration carries three more tables that the product does not have. Nothing
 * breaks; the migration surface just quietly grows again. So both halves are pinned here:
 * the schema must not declare them, and a database built from the migrations must not
 * contain them.
 */

const drizzleDir = fileURLToPath(new URL("../drizzle", import.meta.url));

const LEGACY_TABLES = ["Account", "Session", "VerificationToken"] as const;

/** The exported symbols that declared those tables. */
const LEGACY_EXPORTS = ["accounts", "sessions", "verificationTokens"] as const;

function applyMigrations(sqlite: Database.Database) {
	const files = readdirSync(drizzleDir)
		.filter((f) => f.endsWith(".sql"))
		.sort();

	for (const file of files) {
		const sql = readFileSync(`${drizzleDir}/${file}`, "utf8");
		for (const statement of sql
			.split("--> statement-breakpoint")
			.map((s) => s.trim())
			.filter((s) => s.length > 0)) {
			sqlite.exec(statement);
		}
	}
}

function tableNames(sqlite: Database.Database): string[] {
	return sqlite
		.prepare("SELECT name FROM sqlite_master WHERE type = 'table'")
		.all()
		.map((r) => (r as { name: string }).name);
}

describe("the schema no longer declares the NextAuth tables", () => {
	it("exports no legacy table symbol", () => {
		for (const name of LEGACY_EXPORTS) {
			expect(
				name in schema,
				`schema.ts re-declares '${name}'. If a real need for it appears, revive it deliberately -- do not let it drift back in as dead schema.`,
			).toBe(false);
		}
	});

	it("still declares the tables the product actually uses", () => {
		// Guards against the removal above having been achieved by gutting the file.
		for (const name of [
			"users",
			"resumes",
			"sections",
			"contentItems",
			"resumeRevisions",
		]) {
			expect(name in schema, `schema.ts lost '${name}'`).toBe(true);
		}
	});

	it("does not relate them to users either", () => {
		// `usersRelations` previously carried `accounts: many(accounts)` and
		// `sessions: many(sessions)`. Leaving those behind would keep the tables
		// reachable from the one relation object that does have consumers.
		// `relations()` stores the builder callback that produced the relation map. Invoking it
		// with drizzle's OWN relation helpers -- rather than hand-rolled stubs -- is what
		// drizzle itself does when it normalises the relational config, so the relation keys
		// asserted here are the keys the query builder would actually honour.
		const helpers = createTableRelationsHelpers(schema.users);
		const relationMap = (
			schema.usersRelations as unknown as {
				config: (h: unknown) => Record<string, unknown>;
			}
		).config(helpers);
		expect(Object.keys(relationMap).sort()).toEqual(["resumes"]);
	});

	it("keeps them out of the drizzle snapshots future migrations diff against", () => {
		// The snapshots are what actually made the dead tables persist: 0000 recorded
		// them, so every subsequent snapshot inherited them. The latest snapshot must be
		// free of them or the next `drizzle-kit generate` will re-emit the DROPs.
		const snapshotFiles = readdirSync(`${drizzleDir}/meta`)
			.filter((f) => f.endsWith("_snapshot.json"))
			.sort();
		expect(snapshotFiles.length).toBeGreaterThan(0);

		const latest = snapshotFiles[snapshotFiles.length - 1];
		if (!latest) throw new Error("no snapshot files found");

		const snapshot = readFileSync(`${drizzleDir}/meta/${latest}`, "utf8");
		for (const table of LEGACY_TABLES) {
			expect(
				snapshot,
				`${latest} still records '${table}'; the next generated migration would try to drop it again`,
			).not.toContain(`"${table}"`);
		}
	});
});

describe("the drop migration exists and is well-formed", () => {
	it("is named descriptively rather than with a generated name", () => {
		// drizzle-kit names files from a word pair (`0005_big_micromax.sql`). Renaming to
		// match the existing convention is the whole point of a migration file name.
		const files = readdirSync(drizzleDir).filter((f) => f.endsWith(".sql"));
		expect(files.some((f) => f.includes("micromax"))).toBe(false);
		expect(files).toContain("0005_drop_nextauth_tables.sql");
	});

	it("drops exactly the three legacy tables and nothing else", () => {
		const sql = readFileSync(
			`${drizzleDir}/0005_drop_nextauth_tables.sql`,
			"utf8",
		).replace(/^--.*$/gm, "");

		const dropped = [...sql.matchAll(/DROP TABLE [`"]?(\w+)[`"]?/gi)].map(
			(m) => m[1],
		);
		expect(dropped.sort()).toEqual([...LEGACY_TABLES].sort());

		// A DROP of a product table here would destroy real user data.
		for (const product of ["User", "Resume", "Section"]) {
			expect(
				new RegExp(`DROP TABLE [\`"]?${product}[\`"]?`, "i").test(sql),
				`0005 must not drop ${product}`,
			).toBe(false);
		}
	});

	it("keeps migration count and ordering coherent", () => {
		const files = readdirSync(drizzleDir)
			.filter((f) => f.endsWith(".sql"))
			.sort();
		const journal = JSON.parse(
			readFileSync(`${drizzleDir}/meta/_journal.json`, "utf8"),
		) as { entries: { tag: string; idx: number }[] };

		const tags = journal.entries.map((e) => `${e.tag}.sql`);
		expect(tags.sort()).toEqual(files);
		journal.entries.forEach((e, i) => {
			expect(e.idx).toBe(i);
		});

		// The drop must be last, so a fresh database builds the full product schema and
		// only then removes the legacy tables.
		expect(tags[tags.length - 1]).toBe("0005_drop_nextauth_tables.sql");
	});

	it("documents why, since the migration is irreversible", () => {
		const sql = readFileSync(
			`${drizzleDir}/0005_drop_nextauth_tables.sql`,
			"utf8",
		);
		expect(sql.trimStart().startsWith("--")).toBe(true);
		// A reader hitting this in a diff needs the reversibility note.
		expect(sql).toMatch(/irreversible/i);
	});
});

describe("a migrated database contains no NextAuth tables", () => {
	it("applies every migration and ends up without them", () => {
		const sqlite = new Database(":memory:");
		try {
			applyMigrations(sqlite);

			const present = tableNames(sqlite);
			for (const table of LEGACY_TABLES) {
				expect(
					present,
					`'${table}' still exists after migration`,
				).not.toContain(table);
			}
		} finally {
			sqlite.close();
		}
	});

	it("still contains the product tables, so the drop did not over-reach", () => {
		const sqlite = new Database(":memory:");
		try {
			applyMigrations(sqlite);
			const present = tableNames(sqlite);
			for (const table of ["User", "Resume", "Section"]) {
				expect(present).toContain(table);
			}
		} finally {
			sqlite.close();
		}
	});

	it("drops them from a database that already had them populated", () => {
		// The realistic production shape: 0000 created the tables, so they exist before
		// 0005 runs. Reproduce that by applying only 0000, inserting the sort of rows
		// NextAuth would have left, then applying the rest.
		const sqlite = new Database(":memory:");
		try {
			const files = readdirSync(drizzleDir)
				.filter((f) => f.endsWith(".sql"))
				.sort();

			const apply = (file: string) => {
				const sql = readFileSync(`${drizzleDir}/${file}`, "utf8");
				for (const statement of sql
					.split("--> statement-breakpoint")
					.map((s) => s.trim())
					.filter((s) => s.length > 0)) {
					sqlite.exec(statement);
				}
			};

			const first = files[0];
			if (!first) throw new Error("no migrations");
			apply(first);

			sqlite
				.prepare(
					"INSERT INTO User (id, email, createdAt, updatedAt) VALUES (?, ?, 0, 0)",
				)
				.run("legacy-user", "legacy@example.test");
			sqlite
				.prepare(
					"INSERT INTO Session (id, sessionToken, userId, expires) VALUES (?, ?, ?, ?)",
				)
				.run("s1", "token-1", "legacy-user", 0);
			sqlite
				.prepare(
					"INSERT INTO Account (id, userId, type, provider, providerAccountId) VALUES (?, ?, ?, ?, ?)",
				)
				.run("a1", "legacy-user", "oauth", "discord", "discord-1");
			sqlite
				.prepare(
					"INSERT INTO VerificationToken (identifier, token, expires) VALUES (?, ?, ?)",
				)
				.run("legacy@example.test", "vt-1", 0);

			for (const file of files.slice(1)) apply(file);

			const present = tableNames(sqlite);
			for (const table of LEGACY_TABLES) {
				expect(present).not.toContain(table);
			}
			// The rows went with the tables, but the user they referenced must survive:
			// these tables reference User, nothing references them.
			expect(present).toContain("User");
			const user = sqlite
				.prepare("SELECT id FROM User WHERE id = ?")
				.get("legacy-user");
			expect(user).toBeDefined();
		} finally {
			sqlite.close();
		}
	});
});
