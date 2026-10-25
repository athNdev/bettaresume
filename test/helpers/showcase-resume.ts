/**
 * The seeded showcase resume, loaded from the same SQL that `npm run db:reset-seed` runs.
 *
 * `docs/SHOWCASE.md` calls the showcase a review fixture: a realistic document that
 * exercises every feature. That makes it the right thing for a layout test to measure —
 * the alternative is a second, hand-maintained fixture that drifts from the one a person
 * actually looks at, and then the test proves the fixture rather than the product.
 *
 * Loading through SQLite (the database the seed is written for) rather than by scraping
 * the SQL text keeps the parse exact: JSON strings with quotes and doubled single quotes
 * in them come back as the values the API would serve.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ResumeMetadata } from "@bettaresume/types";
import Database from "better-sqlite3";
import type {
	Resume,
	ResumeSection,
	SectionLayout,
} from "@/features/resume-editor/types";

const drizzleDir = fileURLToPath(new URL("../../api/drizzle", import.meta.url));
const seedSql = readFileSync(
	fileURLToPath(new URL("../../api/src/db/seed.sql", import.meta.url)),
	"utf8",
);

interface ResumeRow {
	id: string;
	name: string;
	template: string;
	tags: string;
	metadata: string | null;
}

interface SectionRow {
	id: string;
	resumeId: string;
	type: string;
	order: number;
	visible: number;
	content: string;
	layout: string | null;
}

function seededDb(): Database.Database {
	const db = new Database(":memory:");
	db.pragma("foreign_keys = ON");
	for (const file of readdirSync(drizzleDir)
		.filter((name) => name.endsWith(".sql"))
		.sort()) {
		db.exec(
			readFileSync(`${drizzleDir}/${file}`, "utf8").replaceAll(
				"--> statement-breakpoint",
				"",
			),
		);
	}
	db.exec(seedSql);
	return db;
}

/** Every showcase row, ordered as the API orders sections. */
export function loadShowcase(): Resume {
	const db = seededDb();
	try {
		const row = db
			.prepare(
				`SELECT * FROM Resume WHERE tags LIKE '%"showcase"%' AND variationType = 'base'`,
			)
			.get() as ResumeRow | undefined;
		if (!row)
			throw new Error("the showcase base resume is missing from the seed");

		const sections = (
			db
				.prepare('SELECT * FROM Section WHERE resumeId = ? ORDER BY "order"')
				.all(row.id) as SectionRow[]
		).map(
			(section): ResumeSection =>
				({
					id: section.id,
					resumeId: section.resumeId,
					type: section.type,
					order: section.order,
					visible: section.visible === 1,
					content: JSON.parse(section.content) as Record<string, unknown>,
					layout: section.layout
						? (JSON.parse(section.layout) as SectionLayout)
						: undefined,
				}) as unknown as ResumeSection,
		);

		return {
			id: row.id,
			name: row.name,
			template: row.template,
			tags: JSON.parse(row.tags) as string[],
			metadata: row.metadata
				? (JSON.parse(row.metadata) as ResumeMetadata)
				: undefined,
			sections,
		} as unknown as Resume;
	} finally {
		db.close();
	}
}
