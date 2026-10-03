import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { eq } from "drizzle-orm";
import {
	type BetterSQLite3Database,
	drizzle,
} from "drizzle-orm/better-sqlite3";
import * as schema from "../../src/db/schema";
import { resumes, sections } from "../../src/db/schema";
import { appRouter } from "../../src/root";
import type { Context } from "../../src/trpc/context";

/**
 * Test harness: a real in-memory SQLite database migrated from api/drizzle/*.sql,
 * plus a tRPC caller with a hand-built authenticated context.
 *
 * The database is deliberately NOT mocked. These tests exist to prove that the
 * generated SQL predicates are tenant-scoped, which a mocked db cannot show.
 */

const MIGRATIONS_DIR = fileURLToPath(new URL("../../drizzle", import.meta.url));

/**
 * Every generated migration, in order. Loading only the first file would leave
 * later schema changes (such as the `Resume.baseResumeId` foreign key) unapplied
 * and silently make constraint tests pass vacuously.
 */
const MIGRATIONS = readdirSync(MIGRATIONS_DIR)
	.filter((file) => file.endsWith(".sql"))
	.sort()
	.map((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8"));

export const USER_A = "user-a";
export const USER_B = "user-b";
export const RESUME_A = "resume-a";
export const RESUME_B = "resume-b";
export const SECTION_A = "section-a-experience";
export const SECTION_B = "section-b-experience";
export const SECTION_B_HIDDEN = "section-b-honours";

export type SectionRow = typeof sections.$inferSelect;
export type ResumeRow = typeof resumes.$inferSelect;
export type Caller = ReturnType<typeof appRouter.createCaller>;

export type TestHarness = {
	/** Drizzle handle, typed as the app's Context["db"] so procedures accept it. */
	db: Context["db"];
	/**
	 * The same drizzle instance with its real (better-sqlite3) types, for
	 * synchronous inspection of rows in assertions. `db` is what procedures receive.
	 */
	raw: BetterSQLite3Database<typeof schema>;
	/**
	 * The underlying better-sqlite3 handle. Exposed so tests can assert on
	 * connection state that Drizzle does not surface — notably
	 * `PRAGMA foreign_keys`, without which every FK assertion would pass vacuously.
	 */
	sqlite: Database.Database;
	callerAs: (userId: string) => Caller;
	section: (id: string) => Promise<SectionRow | undefined>;
	resume: (id: string) => Promise<ResumeRow | undefined>;
	close: () => void;
};

/** Fresh in-memory database with the real migrations applied and two tenants seeded. */
export function createHarness(): TestHarness {
	const sqlite = new Database(":memory:");

	for (const migration of MIGRATIONS) {
		for (const statement of migration
			.split("--> statement-breakpoint")
			.map((s) => s.trim())
			.filter((s) => s.length > 0)) {
			sqlite.exec(statement);
		}
	}

	// SQLite ignores FOREIGN KEY clauses unless enforcement is switched on, so the
	// schema's ON DELETE CASCADE / ON DELETE SET NULL rules are inert without this.
	//
	// Set AFTER the migrations, not before: drizzle-kit emits `PRAGMA foreign_keys=ON`
	// at the tail of a table-rebuild migration, which would otherwise silently
	// re-enable enforcement regardless of what this harness asked for — or mask the
	// fact that enforcement was never under test control at all.
	sqlite.pragma("foreign_keys = ON");

	const db = drizzle(sqlite, { schema });
	// SECONDS, not milliseconds. Drizzle's `integer(..., { mode: "timestamp" })`
	// serialises a Date as unix seconds and reads it back as `new Date(value * 1e3)`, so
	// seeding Date.now() writes an epoch that is 1000x too large and every seeded row
	// comes back dated to the year 58725. Nothing crashed while the value stayed
	// constant, which is exactly why it survived -- but any assertion on `updatedAt`
	// recency or on ordering between two rows would have been reading garbage.
	const now = Math.floor(Date.now() / 1000);

	const insertUser = sqlite.prepare(
		"INSERT INTO User (id, email, name, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)",
	);
	insertUser.run(USER_A, "a@example.test", "User A", now, now);
	insertUser.run(USER_B, "b@example.test", "User B", now, now);

	const insertResume = sqlite.prepare(
		"INSERT INTO Resume (id, userId, name, variationType, template, tags, isArchived, createdAt, updatedAt) VALUES (?, ?, ?, 'base', 'minimal', '[]', 0, ?, ?)",
	);
	insertResume.run(RESUME_A, USER_A, "A resume", now, now);
	insertResume.run(RESUME_B, USER_B, "B resume", now, now);

	const insertSection = sqlite.prepare(
		'INSERT INTO Section (id, resumeId, type, "order", visible, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
	);
	insertSection.run(
		SECTION_A,
		RESUME_A,
		"experience",
		0,
		1,
		JSON.stringify({ data: [{ company: "A Corp" }] }),
		now,
		now,
	);
	insertSection.run(
		SECTION_B,
		RESUME_B,
		"experience",
		7,
		1,
		JSON.stringify({ data: [{ company: "B Corp" }] }),
		now,
		now,
	);
	insertSection.run(
		SECTION_B_HIDDEN,
		RESUME_B,
		"custom",
		9,
		0,
		JSON.stringify({ data: [{ note: "do-not-touch" }] }),
		now,
		now,
	);

	const typed = db as unknown as Context["db"];

	const callerAs = (userId: string) =>
		appRouter.createCaller({
			db: typed,
			userId,
			env: { ENVIRONMENT: "production" },
			clerkClient: {},
			// Mirrors the real context: the Clerk user object is resolved on demand
			// rather than eagerly fetched. Tests get a local stub so nothing here
			// reaches Clerk.
			loadUser: async () => ({ id: userId }) as never,
			isDevMode: false,
		} as unknown as Context);

	return {
		db: typed,
		raw: db,
		sqlite,
		callerAs,
		section: async (id) =>
			(await db.select().from(sections).where(eq(sections.id, id)).get()) ??
			undefined,
		resume: async (id) =>
			(await db.select().from(resumes).where(eq(resumes.id, id)).get()) ??
			undefined,
		close: () => sqlite.close(),
	};
}

/** The mutable columns an attacker would be trying to change. */
export function sectionFingerprint(row: SectionRow | undefined) {
	if (!row) return undefined;
	return {
		resumeId: row.resumeId,
		type: row.type,
		order: row.order,
		visible: row.visible,
		content: row.content,
		updatedAt: row.updatedAt,
	};
}

/** Valid SectionContent for a "experience" section. */
export function experienceContent(company: string) {
	return { data: [{ company }] } as const;
}
