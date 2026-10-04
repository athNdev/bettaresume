import type { SectionType, TemplateType } from "@bettaresume/types";
import { relations, sql } from "drizzle-orm";
import {
	type AnySQLiteColumn,
	index,
	integer,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";

// ============================================
// Users Table
// ============================================
export const users = sqliteTable("User", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	email: text("email").notNull().unique(),
	name: text("name"),
	emailVerified: integer("emailVerified", { mode: "timestamp" }),
	image: text("image"),
	createdAt: integer("createdAt", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer("updatedAt", { mode: "timestamp" })
		.notNull()
		.$defaultFn(() => new Date()),
});

export const usersRelations = relations(users, ({ many }) => ({
	resumes: many(resumes),
}));

// ============================================
// Resumes Table
// ============================================
export const resumes = sqliteTable(
	"Resume",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		variationType: text("variationType")
			.notNull()
			.default("base")
			.$type<"base" | "variation">(),
		// Self-referencing FK. The `(): AnySQLiteColumn` return annotation is
		// load-bearing: without it TypeScript cannot infer the referenced column's
		// type, because `resumes` is still being initialised when this callback
		// runs, and the declaration becomes circular (TS7022/TS7024).
		baseResumeId: text("baseResumeId").references(
			(): AnySQLiteColumn => resumes.id,
			{
				onDelete: "set null",
			},
		),
		domain: text("domain"),
		template: text("template")
			.notNull()
			.default("minimal")
			.$type<TemplateType>(),
		tags: text("tags").notNull().default("[]"),
		isArchived: integer("isArchived", { mode: "boolean" })
			.notNull()
			.default(false),
		metadata: text("metadata"),
		createdAt: integer("createdAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updatedAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index("Resume_userId_idx").on(table.userId),
		index("Resume_baseResumeId_idx").on(table.baseResumeId),
	],
);

export const resumesRelations = relations(resumes, ({ one, many }) => ({
	user: one(users, { fields: [resumes.userId], references: [users.id] }),
	baseResume: one(resumes, {
		fields: [resumes.baseResumeId],
		references: [resumes.id],
		relationName: "ResumeVariations",
	}),
	variations: many(resumes, { relationName: "ResumeVariations" }),
	sections: many(sections),
}));

// ============================================
// Content Library
// ============================================

/**
 * The master copy of a user's content, separate from where it appears.
 *
 * The problem this solves is the one every commercial builder gets wrong: a resume is
 * both the thing you send and the thing you keep your work history in, so tailoring it
 * for one job destroys the record the next job pulls from.
 *
 * So content lives here once, and a `Section` is a *placement* of a content item. The
 * same achievement can sit in three resume variants without being written three times,
 * which is what makes tailoring a toggle rather than a rewrite.
 *
 * `payload` is a JSON blob rather than normalised columns because the shapes differ
 * across all fourteen section types and adding a fifteenth should not mean a migration.
 * That trades referential integrity inside the blob for not having thirteen nullable
 * columns that are all NULL for any given row.
 *
 * `archivedAt` rather than a hard delete: an archived item stays referenced by the
 * variants that still use it, and "delete" on shared content would otherwise silently
 * empty sections in resumes the user did not have open.
 */
export const contentItems = sqliteTable(
	"content_items",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		/** Which section shape the payload holds: "experience", "skills", ... */
		type: text("type").notNull().$type<SectionType>(),
		/** Short label for the library list, e.g. a job title or skill group name. */
		title: text("title").notNull(),
		/** The content itself, shaped for `type`. */
		payload: text("payload").notNull(),
		/** Soft delete. See the table comment for why this is not a hard delete. */
		archivedAt: integer("archivedAt", { mode: "timestamp" }),
		createdAt: integer("createdAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updatedAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		// The library view: one user's active items, newest first.
		index("content_items_user_archived_idx").on(table.userId, table.archivedAt),
		// Filtering the library by shape, e.g. "show me all my experience blocks".
		index("content_items_user_type_idx").on(table.userId, table.type),
	],
);

export const contentItemsRelations = relations(
	contentItems,
	({ one, many }) => ({
		user: one(users, { fields: [contentItems.userId], references: [users.id] }),
		sections: many(sections),
	}),
);

// ============================================
// Sections Table
// ============================================
export const sections = sqliteTable(
	"Section",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		resumeId: text("resumeId")
			.notNull()
			.references(() => resumes.id, { onDelete: "cascade" }),
		type: text("type").notNull().$type<SectionType>(),
		order: integer("order").notNull().default(0),
		visible: integer("visible", { mode: "boolean" }).notNull().default(true),
		content: text("content").notNull(),
		/**
		 * The master content this section places, when it has one.
		 *
		 * Nullable on purpose: a section created before the library existed, or by a
		 * path that never linked one, must still load. ON DELETE SET NULL rather than
		 * CASCADE because losing a library item should unlink a placement, not delete
		 * the resume content the user can still see and edit.
		 */
		contentItemId: text("contentItemId").references(() => contentItems.id, {
			onDelete: "set null",
		}),
		createdAt: integer("createdAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updatedAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		index("Section_resumeId_idx").on(table.resumeId),
		// "which placements point at this item?" drives the non-destructive divergence
		// check, so it is the second most common query after loading a resume.
		index("Section_contentItemId_idx").on(table.contentItemId),
		// One placement per (resume, item). `content.attach` already avoids this with a
		// read-then-insert, but that read-then-insert is exactly the shape two concurrent
		// requests can interleave, and a duplicate placement silently doubles a section
		// in the exported resume while `divergence` reports two rows for one placement.
		// The database is the only place that cannot be raced, so it enforces the
		// invariant the application code claims to hold.
		//
		// PARTIAL, and the predicate is load-bearing: SQLite treats NULLs as distinct in
		// a unique index, so a plain UNIQUE(resumeId, contentItemId) would let any
		// number of pre-library sections sit in the same resume unlinked -- which is
		// exactly the state the column is nullable to allow.
		uniqueIndex("Section_resume_content_item_unique")
			.on(table.resumeId, table.contentItemId)
			.where(sql`${table.contentItemId} is not null`),
	],
);

export const sectionsRelations = relations(sections, ({ one }) => ({
	resume: one(resumes, {
		fields: [sections.resumeId],
		references: [resumes.id],
	}),
	contentItem: one(contentItems, {
		fields: [sections.contentItemId],
		references: [contentItems.id],
	}),
}));

// ============================================
// Resume Revisions (append-only history)
// ============================================

/**
 * Append-only snapshot history for a resume.
 *
 * There is deliberately no UPDATE path for this table anywhere in the codebase. That
 * omission is the feature: an append-only log cannot be quietly rewritten, which is what
 * makes a history you can trust and roll back to.
 *
 * `snapshotJson` is a blob rather than normalised rows because the only operations are
 * "store a snapshot", "list snapshots newest-first" and "diff two snapshots". Diffing
 * normalised rows would be lossier, not better.
 *
 * See api/drizzle/0002_resume_revisions.sql for the index rationale.
 */
export const resumeRevisions = sqliteTable(
	"resume_revisions",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		resumeId: text("resumeId")
			.notNull()
			.references(() => resumes.id, { onDelete: "cascade" }),
		/** Monotonic per resume. UNIQUE(resumeId, seq). */
		seq: integer("seq").notNull(),
		snapshotJson: text("snapshotJson").notNull(),
		/** Dedupes identical autosaves. UNIQUE(resumeId, contentHash). */
		contentHash: text("contentHash").notNull(),
		label: text("label"),
		createdAt: integer("createdAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [
		// A resume's history, newest first: the only query the UI makes.
		index("resume_revisions_resume_created_idx").on(
			table.resumeId,
			table.createdAt,
		),
		// Monotonic sequence, enforced by the database rather than by a read-then-write
		// in application code that two concurrent requests could interleave.
		uniqueIndex("resume_revisions_resume_seq_unique").on(
			table.resumeId,
			table.seq,
		),
		// Identical autosaves collapse instead of accumulating.
		uniqueIndex("resume_revisions_resume_hash_unique").on(
			table.resumeId,
			table.contentHash,
		),
	],
);

export const resumeRevisionsRelations = relations(
	resumeRevisions,
	({ one }) => ({
		resume: one(resumes, {
			fields: [resumeRevisions.resumeId],
			references: [resumes.id],
		}),
	}),
);
