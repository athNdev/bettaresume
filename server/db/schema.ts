import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================
// Users Table
// ============================================
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// Resumes Table
// ============================================
export const resumes = sqliteTable('resumes', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  variationType: text('variation_type').notNull().default('base'),
  template: text('template').notNull().default('modern'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// Sections Table
// ============================================
export const sections = sqliteTable('sections', {
  id: text('id').primaryKey(),
  resumeId: text('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // personal-info, summary, experience, education, skills, projects, etc.
  order: integer('order').notNull().default(0),
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  content: text('content', { mode: 'json' }).$type<SectionContent>().notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// ============================================
// Relations
// ============================================
export const usersRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
}));

export const resumesRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, {
    fields: [resumes.userId],
    references: [users.id],
  }),
  sections: many(sections),
}));

export const sectionsRelations = relations(sections, ({ one }) => ({
  resume: one(resumes, {
    fields: [sections.resumeId],
    references: [resumes.id],
  }),
}));

// ============================================
// TypeScript Types (inferred from schema)
// ============================================
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;

export type Section = typeof sections.$inferSelect;
export type NewSection = typeof sections.$inferInsert;

// ============================================
// Section Content Types (JSON structure)
// ============================================
export interface SectionContent {
  title: string;
  data?: unknown;
  html?: string;
}

// Experience Entry
export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  location?: string;
  locationType?: 'onsite' | 'remote' | 'hybrid';
  employmentType?: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship';
  description?: string;
  highlights?: string[];
  technologies?: string[];
}

// Education Entry
export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  gpa?: string;
  maxGpa?: string;
  location?: string;
  achievements?: string[];
  coursework?: string[];
  honors?: string[];
}

// Skill Entry
export interface SkillEntry {
  id: string;
  name: string;
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  yearsOfExperience?: number;
}

// Skill Category
export interface SkillCategory {
  id: string;
  name: string;
  order: number;
  skills: SkillEntry[];
}

// Project Entry
export interface ProjectEntry {
  id: string;
  name: string;
  description?: string;
  url?: string;
  github?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  technologies?: string[];
  highlights?: string[];
}

// Personal Info
export interface PersonalInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  twitter?: string;
  portfolio?: string;
}
