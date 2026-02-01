import type { SectionType, TemplateType } from "@bettaresume/types";
import { relations } from "drizzle-orm";
import {
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
	accounts: many(accounts),
	sessions: many(sessions),
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
		baseResumeId: text("baseResumeId"),
		domain: text("domain"),
		template: text("template")
			.notNull()
			.default("modern")
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
		createdAt: integer("createdAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
		updatedAt: integer("updatedAt", { mode: "timestamp" })
			.notNull()
			.$defaultFn(() => new Date()),
	},
	(table) => [index("Section_resumeId_idx").on(table.resumeId)],
);

export const sectionsRelations = relations(sections, ({ one }) => ({
	resume: one(resumes, {
		fields: [sections.resumeId],
		references: [resumes.id],
	}),
}));

// ============================================
// NextAuth Models
// ============================================
export const accounts = sqliteTable(
	"Account",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("userId")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		type: text("type").notNull(),
		provider: text("provider").notNull(),
		providerAccountId: text("providerAccountId").notNull(),
		refresh_token: text("refresh_token"),
		access_token: text("access_token"),
		expires_at: integer("expires_at"),
		token_type: text("token_type"),
		scope: text("scope"),
		id_token: text("id_token"),
		session_state: text("session_state"),
		refresh_token_expires_in: integer("refresh_token_expires_in"),
	},
	(table) => [
		uniqueIndex("Account_provider_providerAccountId_key").on(
			table.provider,
			table.providerAccountId,
		),
	],
);

export const accountsRelations = relations(accounts, ({ one }) => ({
	user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = sqliteTable("Session", {
	id: text("id")
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	sessionToken: text("sessionToken").notNull().unique(),
	userId: text("userId")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expires: integer("expires", { mode: "timestamp" }).notNull(),
});

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = sqliteTable(
	"VerificationToken",
	{
		identifier: text("identifier").notNull(),
		token: text("token").notNull().unique(),
		expires: integer("expires", { mode: "timestamp" }).notNull(),
	},
	(table) => [
		uniqueIndex("VerificationToken_identifier_token_key").on(
			table.identifier,
			table.token,
		),
	],
);
