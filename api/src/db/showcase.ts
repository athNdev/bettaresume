/**
 * The showcase documents — one source of truth for the dev seed and for every new user.
 *
 * `docs/SHOWCASE.md` describes the fixture: one fictional persona (Priya Raman) and two
 * resumes (a one-page `compact` and a two-page `academic` variation of it) that between
 * them exercise every section type, layout flag, mark, variant link, revision and content
 * library placement the product ships.
 *
 * ## Why the data lives in JSON and not in `seed.sql`
 *
 * The fixture has two consumers:
 *
 *   1. `api/src/db/seed.sql` — the local dev database, applied by `npm run db:reset-seed`.
 *   2. `user.upsert` — the first sign-in of a real user, so the dashboard's "View the
 *      example" entry point is a promise rather than a description of the dev seed.
 *
 * Writing the data twice would have them drift, and the drift would be invisible: the dev
 * seed would keep passing `api/test/showcase.test.ts` while real users received an older
 * document. So `showcase.json` is the source, the SQL block inside `seed.sql` is
 * **generated** from it (`npm run showcase:render`), and `api/test/showcase-seed.test.ts`
 * fails when the two disagree.
 *
 * ## Why the ids are a prefix and a key
 *
 * `seed.sql` owns the rows for `user-1`, so its ids can be global (`showcase-base`). Real
 * users each need their own copy, so the runtime composes `${prefix}${key}`
 * (`user_2abc…-showcase-base`). Every id in the fixture is stored as the part after the
 * prefix, and every cross-reference (`baseResumeId`, `contentItemId`, `baseSectionId`) is
 * a key too, so a copy is a prefix substitution rather than a re-linking step.
 *
 * The ids *inside* `content` and `metadata` (bullet ids, export-history ids) are not
 * rewritten: they are opaque document ids scoped to one resume, and the reader never
 * joins on them.
 *
 * ## Created once, then it is the user's
 *
 * The seed runs in the branch of `user.upsert` that creates the user, never on later
 * sign-ins. So: **once per user**, **deletable** like any other resume, and it **does not
 * come back**. Re-creating it on every sign-in would make "delete" a button that undoes
 * itself, and a document the user cannot delete is worse than one they have to restore
 * by hand. The recovery path is the same builder — a future "restore the example" action
 * is one call away — and it is documented in `docs/SHOWCASE.md`.
 */
import type { SectionType } from "@bettaresume/types";
import type {
	contentItems,
	resumeRevisions,
	resumes,
	sections,
} from "./schema";
import fixtureJson from "./showcase.json";

// -------------------------------------------------------
// Fixture shape
// -------------------------------------------------------

interface FixtureSection {
	key: string;
	type: string;
	order: number;
	visible: boolean;
	content: Record<string, unknown>;
	layout: Record<string, unknown> | null;
	contentItemKey: string | null;
	baseSectionKey: string | null;
	linkedToBase: boolean;
	createdAtOffsetSec: number;
	updatedAtOffsetSec: number;
}

interface FixtureResume {
	key: string;
	name: string;
	variationType: "base" | "variation";
	baseResumeKey: string | null;
	domain: string | null;
	template: string;
	tags: string[];
	isArchived: boolean;
	metadata: Record<string, unknown> | null;
	createdAtOffsetSec: number;
	updatedAtOffsetSec: number;
	sections: FixtureSection[];
}

interface FixtureContentItem {
	key: string;
	type: string;
	title: string;
	payload: Record<string, unknown>;
	archivedAtOffsetSec: number | null;
	createdAtOffsetSec: number;
	updatedAtOffsetSec: number;
}

interface FixtureRevision {
	key: string;
	resumeKey: string;
	seq: number;
	snapshot: Record<string, unknown>;
	contentHash: string;
	label: string | null;
	createdAtOffsetSec: number;
}

export interface ShowcaseFixture {
	contentItems: FixtureContentItem[];
	resumes: FixtureResume[];
	revisions: FixtureRevision[];
}

/**
 * The parsed fixture. The JSON import is cast once, here, so the rest of the module reads
 * a named type instead of TypeScript's structural inference of a 120 KB literal.
 */
export const SHOWCASE: ShowcaseFixture =
	fixtureJson as unknown as ShowcaseFixture;

/** Prefix the dev seed uses, so `seed.sql` keeps the ids its tests were written against. */
export const SEED_PREFIX = "showcase-";

/**
 * Prefix a real user's copy gets. The user id is included so two users' copies can share a
 * database without colliding, and so a row that escapes into a log is traceable.
 */
export function userShowcasePrefix(userId: string): string {
	return `${userId}-showcase-`;
}

// -------------------------------------------------------
// Logical rows (ids resolved, JSON serialised, still relative in time)
// -------------------------------------------------------

export interface LogicalShowcase {
	contentItems: Array<{
		id: string;
		userId: string;
		type: string;
		title: string;
		payload: string;
		archivedAtOffsetSec: number | null;
		createdAtOffsetSec: number;
		updatedAtOffsetSec: number;
	}>;
	resumes: Array<{
		id: string;
		userId: string;
		name: string;
		variationType: "base" | "variation";
		baseResumeId: string | null;
		domain: string | null;
		template: string;
		tags: string;
		isArchived: boolean;
		metadata: string | null;
		createdAtOffsetSec: number;
		updatedAtOffsetSec: number;
	}>;
	sections: Array<{
		id: string;
		resumeId: string;
		type: string;
		order: number;
		visible: boolean;
		content: string;
		layout: string | null;
		contentItemId: string | null;
		baseSectionId: string | null;
		linkedToBase: boolean;
		createdAtOffsetSec: number;
		updatedAtOffsetSec: number;
	}>;
	revisions: Array<{
		id: string;
		resumeId: string;
		seq: number;
		snapshotJson: string;
		contentHash: string;
		label: string | null;
		createdAtOffsetSec: number;
	}>;
}

/**
 * Resolve the fixture into rows whose ids are real, with the time fields still expressed
 * as offsets so the two back ends can choose their own representation.
 *
 * Inserts are ordered for the foreign keys: library items, then the base resume, then its
 * sections and revisions, then the variation and its sections and revisions.
 */
export function logicalShowcase(opts: {
	userId: string;
	prefix: string;
}): LogicalShowcase {
	const { userId, prefix } = opts;
	const id = (key: string | null) => (key === null ? null : `${prefix}${key}`);

	const library = SHOWCASE.contentItems.map((item) => ({
		id: `${prefix}${item.key}`,
		userId,
		type: item.type,
		title: item.title,
		payload: JSON.stringify(item.payload),
		archivedAtOffsetSec: item.archivedAtOffsetSec,
		createdAtOffsetSec: item.createdAtOffsetSec,
		updatedAtOffsetSec: item.updatedAtOffsetSec,
	}));

	const resumeRows: LogicalShowcase["resumes"] = [];
	const sectionRows: LogicalShowcase["sections"] = [];
	const revisionRows: LogicalShowcase["revisions"] = [];

	for (const resume of SHOWCASE.resumes) {
		resumeRows.push({
			id: `${prefix}${resume.key}`,
			userId,
			name: resume.name,
			variationType: resume.variationType,
			baseResumeId: id(resume.baseResumeKey),
			domain: resume.domain,
			template: resume.template,
			tags: JSON.stringify(resume.tags),
			isArchived: resume.isArchived,
			metadata:
				resume.metadata === null ? null : JSON.stringify(resume.metadata),
			createdAtOffsetSec: resume.createdAtOffsetSec,
			updatedAtOffsetSec: resume.updatedAtOffsetSec,
		});

		for (const section of resume.sections) {
			sectionRows.push({
				id: `${prefix}${section.key}`,
				resumeId: `${prefix}${resume.key}`,
				type: section.type,
				order: section.order,
				visible: section.visible,
				content: JSON.stringify(section.content),
				layout: section.layout === null ? null : JSON.stringify(section.layout),
				contentItemId: id(section.contentItemKey),
				baseSectionId: id(section.baseSectionKey),
				linkedToBase: section.linkedToBase,
				createdAtOffsetSec: section.createdAtOffsetSec,
				updatedAtOffsetSec: section.updatedAtOffsetSec,
			});
		}

		for (const revision of SHOWCASE.revisions) {
			if (revision.resumeKey !== resume.key) continue;
			revisionRows.push({
				id: `${prefix}${revision.key}`,
				resumeId: `${prefix}${resume.key}`,
				seq: revision.seq,
				snapshotJson: JSON.stringify(revision.snapshot),
				contentHash: revision.contentHash,
				label: revision.label,
				createdAtOffsetSec: revision.createdAtOffsetSec,
			});
		}
	}

	return {
		contentItems: library,
		resumes: resumeRows,
		sections: sectionRows,
		revisions: revisionRows,
	};
}

// -------------------------------------------------------
// Runtime: Drizzle insert values
// -------------------------------------------------------

export interface ShowcaseInsertValues {
	contentItems: (typeof contentItems.$inferInsert)[];
	resumes: (typeof resumes.$inferInsert)[];
	sections: (typeof sections.$inferInsert)[];
	revisions: (typeof resumeRevisions.$inferInsert)[];
}

/**
 * The rows `user.upsert` inserts on a user's first sign-in.
 *
 * Timestamps are absolute `Date`s here because the columns are `mode: "timestamp"`; the
 * fixture stores offsets so the copies share a shape ("created 90 days ago") rather than
 * the dev seed's literal instants.
 */
export function buildShowcaseRows(opts: {
	userId: string;
	prefix?: string;
	now?: Date;
}): ShowcaseInsertValues {
	const nowSec = Math.floor((opts.now ?? new Date()).getTime() / 1000);
	const at = (offsetSec: number) => new Date((nowSec - offsetSec) * 1000);
	const logical = logicalShowcase({
		userId: opts.userId,
		prefix: opts.prefix ?? userShowcasePrefix(opts.userId),
	});

	return {
		contentItems: logical.contentItems.map((row) => ({
			id: row.id,
			userId: row.userId,
			type: row.type as SectionType,
			title: row.title,
			payload: row.payload,
			archivedAt:
				row.archivedAtOffsetSec === null ? null : at(row.archivedAtOffsetSec),
			createdAt: at(row.createdAtOffsetSec),
			updatedAt: at(row.updatedAtOffsetSec),
		})),
		resumes: logical.resumes.map((row) => ({
			id: row.id,
			userId: row.userId,
			name: row.name,
			variationType: row.variationType,
			baseResumeId: row.baseResumeId,
			domain: row.domain,
			template: row.template as (typeof resumes.$inferInsert)["template"],
			tags: row.tags,
			isArchived: row.isArchived,
			metadata: row.metadata,
			createdAt: at(row.createdAtOffsetSec),
			updatedAt: at(row.updatedAtOffsetSec),
		})),
		sections: logical.sections.map((row) => ({
			id: row.id,
			resumeId: row.resumeId,
			type: row.type as SectionType,
			order: row.order,
			visible: row.visible,
			content: row.content,
			layout: row.layout,
			contentItemId: row.contentItemId,
			baseSectionId: row.baseSectionId,
			linkedToBase: row.linkedToBase,
			createdAt: at(row.createdAtOffsetSec),
			updatedAt: at(row.updatedAtOffsetSec),
		})),
		revisions: logical.revisions.map((row) => ({
			id: row.id,
			resumeId: row.resumeId,
			seq: row.seq,
			snapshotJson: row.snapshotJson,
			contentHash: row.contentHash,
			label: row.label,
			createdAt: at(row.createdAtOffsetSec),
		})),
	};
}

// -------------------------------------------------------
// Seed: SQL text for `api/src/db/seed.sql`
// -------------------------------------------------------

export const SHOWCASE_SQL_BEGIN =
	"-- BEGIN GENERATED SHOWCASE — edit api/src/db/showcase.json, then run `npm run showcase:render`";
export const SHOWCASE_SQL_END = "-- END GENERATED SHOWCASE";

/**
 * The marker the seed's showcase section starts at. Everything from here to the end of
 * `seed.sql` is generated; everything above it is hand-written dev seed.
 */
export const SHOWCASE_SEED_HEADER =
	"-- ============================================\n-- SHOWCASE — a complete, fictional example resume\n-- ============================================";

const sqlText = (value: string | null): string =>
	value === null ? "NULL" : `'${value.replaceAll("'", "''")}'`;

const sqlNumber = (value: number | null): string =>
	value === null ? "NULL" : String(value);

/**
 * Relative timestamps, exactly as the hand-written seed used them: `now - offset` is
 * evaluated by SQLite when the seed runs, so the fixture never carries an absolute date
 * that goes stale.
 */
const sqlTime = (offsetSec: number): string =>
	`CAST(strftime('%s', 'now') AS INTEGER) - ${offsetSec}`;

/**
 * The showcase rows as SQL statements, for `api/src/db/seed.sql`.
 *
 * `now` is deliberately not a parameter: this output is committed, so any absolute
 * timestamp in it would be both meaningless tomorrow and a diff on every run.
 */
export function renderShowcaseSql(): string {
	const rows = logicalShowcase({ userId: "user-1", prefix: SEED_PREFIX });
	const out: string[] = [];

	for (const row of rows.contentItems) {
		out.push(
			[
				'INSERT INTO "content_items" (id, userId, type, title, payload, archivedAt, createdAt, updatedAt)',
				"VALUES (",
				[
					sqlText(row.id),
					sqlText(row.userId),
					sqlText(row.type),
					sqlText(row.title),
					sqlText(row.payload),
					sqlNumber(row.archivedAtOffsetSec),
					sqlTime(row.createdAtOffsetSec),
					sqlTime(row.updatedAtOffsetSec),
				]
					.map((v) => `    ${v}`)
					.join(",\n"),
				");",
			].join("\n"),
		);
	}

	for (const row of rows.resumes) {
		out.push(
			[
				'INSERT INTO "Resume" (',
				"    id, userId, name, variationType, baseResumeId, domain, template, tags,",
				"    isArchived, metadata, createdAt, updatedAt",
				")",
				"VALUES (",
				[
					sqlText(row.id),
					sqlText(row.userId),
					sqlText(row.name),
					sqlText(row.variationType),
					sqlText(row.baseResumeId),
					sqlText(row.domain),
					sqlText(row.template),
					sqlText(row.tags),
					row.isArchived ? "1" : "0",
					sqlText(row.metadata),
					sqlTime(row.createdAtOffsetSec),
					sqlTime(row.updatedAtOffsetSec),
				]
					.map((v) => `    ${v}`)
					.join(",\n"),
				");",
			].join("\n"),
		);
	}

	for (const row of rows.sections) {
		out.push(
			[
				'INSERT INTO "Section" (id, resumeId, type, "order", visible, content, layout, contentItemId, baseSectionId, linkedToBase, createdAt, updatedAt)',
				"VALUES (",
				[
					sqlText(row.id),
					sqlText(row.resumeId),
					sqlText(row.type),
					sqlNumber(row.order),
					row.visible ? "1" : "0",
					sqlText(row.content),
					sqlText(row.layout),
					sqlText(row.contentItemId),
					sqlText(row.baseSectionId),
					row.linkedToBase ? "1" : "0",
					sqlTime(row.createdAtOffsetSec),
					sqlTime(row.updatedAtOffsetSec),
				]
					.map((v) => `    ${v}`)
					.join(",\n"),
				");",
			].join("\n"),
		);
	}

	for (const row of rows.revisions) {
		out.push(
			[
				'INSERT INTO "resume_revisions" (id, resumeId, seq, snapshotJson, contentHash, label, createdAt)',
				"VALUES (",
				[
					sqlText(row.id),
					sqlText(row.resumeId),
					sqlNumber(row.seq),
					sqlText(row.snapshotJson),
					sqlText(row.contentHash),
					sqlText(row.label),
					sqlTime(row.createdAtOffsetSec),
				]
					.map((v) => `    ${v}`)
					.join(",\n"),
				");",
			].join("\n"),
		);
	}

	return out.join("\n\n");
}

/** The exact tail of `seed.sql`: prose, sentinels and the statements. */
export function renderShowcaseSqlBlock(): string {
	return [
		SHOWCASE_SEED_HEADER,
		"--",
		"-- Priya Raman is a FICTIONAL persona. Nothing here describes a real person,",
		"-- employer or publication. The record exists so the app has one document that",
		'-- exercises every feature, and so a reviewer can see what "done" looks like.',
		"-- `docs/SHOWCASE.md` explains how to keep it current.",
		"--",
		"-- GENERATED from `api/src/db/showcase.json` by `npm run showcase:render`. Edit the",
		"-- JSON and re-run; do not hand-edit the statements below. The same fixture seeds",
		"-- every new user on first sign-in (`user.upsert`), so this block and that copy can",
		"-- never describe different documents.",
		"--",
		"-- The `showcase` tag is the UI contract: the dashboard badge and the",
		'-- "View the example" entry point both key off it.',
		"",
		SHOWCASE_SQL_BEGIN,
		renderShowcaseSql(),
		SHOWCASE_SQL_END,
	].join("\n");
}
