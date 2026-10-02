import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
	resumeMetadataSchema,
	sectionContentSchema,
	templateTypeSchema,
	variationTypeSchema,
} from "../../packages/types/src/schemas";

/**
 * Seed-data integrity.
 *
 * `api/src/db/seed.sql` is raw SQL, so it bypasses every Zod schema in
 * `packages/types`. Nothing validates it: there is no DB `CHECK` constraint on
 * `Resume.template`, and `$type<TemplateType>()` is compile-time only. A value the
 * application cannot represent therefore lands in the database silently.
 *
 * That is not hypothetical. At the time of writing, **all four** seeded resumes
 * carried a `template` outside the union:
 *
 *     resume-1  harvard
 *     resume-2  tech
 *     resume-3  modern
 *     resume-4  professional
 *
 * while `templateTypeSchema` accepts only `minimal | postgrad | undergrad`. The UI
 * never showed the corruption: `getTemplateSource()` falls back to `minimal` for an
 * unrecognised name, so the demo rendered as Minimal while claiming to be
 * "Harvard Application".
 *
 * These tests apply the real migrations and then the real seed, and assert the
 * resulting rows satisfy the schemas the application actually enforces.
 */

const drizzleDir = fileURLToPath(new URL("../drizzle", import.meta.url));
const seedSql = readFileSync(
	fileURLToPath(new URL("../src/db/seed.sql", import.meta.url)),
	"utf8",
);

/** Migrations then seed, exactly as `npm run db:reset-seed` does. */
function seededDb(): Database.Database {
	const db = new Database(":memory:");
	db.pragma("foreign_keys = ON");
	for (const file of readdirSorted(drizzleDir)) {
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

function readdirSorted(dir: string): string[] {
	// Small fixed directory; a sorted read keeps migration order deterministic.
	return ["0000_init-schema.sql", "0001_resume_base_resume_fk.sql"].filter(
		(f) => {
			try {
				readFileSync(`${dir}/${f}`);
				return true;
			} catch {
				return false;
			}
		},
	);
}

describe("seed data satisfies the application schemas", () => {
	it("every seeded resume has a template the app can render", () => {
		const db = seededDb();
		try {
			const rows = db
				.prepare("SELECT id, name, template FROM Resume ORDER BY id")
				.all() as { id: string; name: string; template: string }[];

			expect(rows.length).toBeGreaterThan(0);

			const invalid = rows.filter(
				(r) => !templateTypeSchema.safeParse(r.template).success,
			);
			expect(
				invalid.map((r) => `${r.id}=${JSON.stringify(r.template)}`),
				"seeded templates outside templateTypeSchema — the UI silently " +
					"renders these as minimal via getTemplateSource()'s fallback",
			).toEqual([]);
		} finally {
			db.close();
		}
	});

	it("every seeded resume has a valid variationType", () => {
		const db = seededDb();
		try {
			const rows = db.prepare("SELECT id, variationType FROM Resume").all() as {
				id: string;
				variationType: string;
			}[];
			for (const row of rows) {
				expect(
					variationTypeSchema.safeParse(row.variationType).success,
					`${row.id} has variationType=${JSON.stringify(row.variationType)}`,
				).toBe(true);
			}
		} finally {
			db.close();
		}
	});

	it("every seeded resume metadata blob satisfies resumeMetadataSchema", () => {
		const db = seededDb();
		try {
			const rows = db
				.prepare("SELECT id, metadata FROM Resume ORDER BY id")
				.all() as { id: string; metadata: string | null }[];

			for (const row of rows) {
				if (row.metadata === null) continue;
				const parsed = resumeMetadataSchema.safeParse(JSON.parse(row.metadata));
				expect(
					parsed.success,
					`${row.id} metadata failed: ${
						parsed.success
							? ""
							: parsed.error.issues
									.map((i) => `${i.path.join(".")}: ${i.message}`)
									.join("; ")
					}`,
				).toBe(true);
			}
		} finally {
			db.close();
		}
	});

	it("every seeded section content blob satisfies sectionContentSchema", () => {
		const db = seededDb();
		try {
			const rows = db
				.prepare('SELECT id, type, content FROM Section ORDER BY "order"')
				.all() as { id: string; type: string; content: string }[];

			expect(rows.length).toBeGreaterThan(0);
			for (const row of rows) {
				const parsed = sectionContentSchema.safeParse(JSON.parse(row.content));
				expect(
					parsed.success,
					`${row.id} (${row.type}) failed: ${
						parsed.success
							? ""
							: parsed.error.issues
									.map((i) => `${i.path.join(".")}: ${i.message}`)
									.join("; ")
					}`,
				).toBe(true);
			}
		} finally {
			db.close();
		}
	});

	it("seeds a template the frontend gallery actually offers", () => {
		// The three shipped .typ files. If a template is added to the schema it must
		// have real source, or the gallery shows a thumbnail that renders as Minimal.
		const sources = readFileSync(
			fileURLToPath(
				new URL(
					"../../src/features/resume-editor/typst_templates/index.ts",
					import.meta.url,
				),
			),
			"utf8",
		);
		for (const template of templateTypeSchema.options) {
			expect(
				sources.includes(`${template}: `) || sources.includes(`${template}:`),
				`templateTypeSchema allows "${template}" but TEMPLATE_SOURCES has no entry`,
			).toBe(true);
		}
	});
});
