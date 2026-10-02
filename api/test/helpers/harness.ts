import { readFileSync } from "node:fs";
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

const MIGRATION = fileURLToPath(
	new URL("../../drizzle/0000_init-schema.sql", import.meta.url),
);

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
	callerAs: (userId: string) => Caller;
	section: (id: string) => Promise<SectionRow | undefined>;
	resume: (id: string) => Promise<ResumeRow | undefined>;
	close: () => void;
};

/** Fresh in-memory database with the real migration applied and two tenants seeded. */
export function createHarness(): TestHarness {
	const sqlite = new Database(":memory:");
	// SQLite has FK enforcement off by default; the schema relies on ON DELETE CASCADE.
	sqlite.pragma("foreign_keys = ON");

	for (const statement of readFileSync(MIGRATION, "utf8")
		.split("--> statement-breakpoint")
		.map((s) => s.trim())
		.filter((s) => s.length > 0)) {
		sqlite.exec(statement);
	}

	const db = drizzle(sqlite, { schema });
	const now = Date.now();

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
			user: { id: userId },
			userId,
			env: { ENVIRONMENT: "production" },
			clerkClient: {},
			isDevMode: false,
		} as unknown as Context);

	return {
		db: typed,
		raw: db,
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
