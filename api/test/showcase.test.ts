import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";
import {
	awardSchema,
	certificationSchema,
	educationSchema,
	experienceSchema,
	languageSchema,
	personalInfoSchema,
	projectSchema,
	publicationSchema,
	referenceSchema,
	resumeMetadataSchema,
	resumeSettingsSchema,
	sectionContentSchema,
	sectionLayoutSchema,
	sectionTypeSchema,
	skillCategorySchema,
	templateTypeSchema,
	volunteerSchema,
} from "../../packages/types/src/schemas";

/**
 * The showcase is a review fixture, not a screenshot: one seeded resume that is supposed
 * to exercise every feature the app ships. Snapshots rot silently, so this file fails
 * when the showcase stops covering the product's own vocabulary.
 *
 * The three "keep it alive" assertions are deliberately derived from the schemas rather
 * than from a hand-written list:
 *
 *   - every `sectionTypeSchema` option must appear in the showcase
 *   - every `resumeSettingsSchema` key must be present in its settings
 *   - every `sectionLayoutSchema` flag must be used somewhere
 *
 * Add a section type, a setting or a layout flag without updating
 * `api/src/db/seed.sql` and this file names the new key. Update the seed and
 * `docs/SHOWCASE.md` together.
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

interface ResumeRow {
	id: string;
	name: string;
	variationType: "base" | "variation";
	baseResumeId: string | null;
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
	contentItemId: string | null;
	baseSectionId: string | null;
	linkedToBase: number;
}

function showcaseRows(db: Database.Database) {
	const resumes = (
		db
			.prepare(
				`SELECT * FROM Resume WHERE tags LIKE '%"showcase"%' ORDER BY variationType DESC`,
			)
			.all() as ResumeRow[]
	).map((row) => ({ ...row, tags: JSON.parse(row.tags) as string[] }));

	const base = resumes.find((r) => r.variationType === "base");
	const variant = resumes.find((r) => r.variationType === "variation");
	if (!base || !variant) {
		throw new Error(
			`The showcase needs one base and one variation row tagged "showcase"; found ${resumes.length} matching resume(s).`,
		);
	}

	const sections = (resumeId: string) =>
		db
			.prepare('SELECT * FROM Section WHERE resumeId = ? ORDER BY "order"')
			.all(resumeId) as SectionRow[];

	return {
		resumes,
		base,
		variant,
		baseSections: sections(base.id),
		variantSections: sections(variant.id),
	};
}

function metadataOf(row: { id: string; metadata: string | null }) {
	if (!row.metadata) throw new Error(`${row.id} has no metadata`);
	return resumeMetadataSchema.parse(JSON.parse(row.metadata));
}

/** Walk a ProseMirror document and collect every mark type it uses. */
function markTypes(doc: unknown, out = new Set<string>()): Set<string> {
	if (Array.isArray(doc)) {
		for (const item of doc) markTypes(item, out);
		return out;
	}
	if (!doc || typeof doc !== "object") return out;
	const record = doc as Record<string, unknown>;
	if (Array.isArray(record.marks)) {
		for (const mark of record.marks) {
			if (mark && typeof mark === "object") {
				const type = (mark as Record<string, unknown>).type;
				if (typeof type === "string") out.add(type);
			}
		}
	}
	for (const value of Object.values(record)) markTypes(value, out);
	return out;
}

function hasBlockType(doc: unknown, type: string): boolean {
	if (Array.isArray(doc)) return doc.some((item) => hasBlockType(item, type));
	if (!doc || typeof doc !== "object") return false;
	const record = doc as Record<string, unknown>;
	if (record.type === type) return true;
	return Object.values(record).some((value) => hasBlockType(value, type));
}

const ENTRY_SCHEMAS = {
	experience: experienceSchema,
	education: educationSchema,
	skills: skillCategorySchema,
	projects: projectSchema,
	certifications: certificationSchema,
	awards: awardSchema,
	languages: languageSchema,
	publications: publicationSchema,
	volunteer: volunteerSchema,
	references: referenceSchema,
} as const;

describe("the showcase resume exists and says it is fictional", () => {
	it("declares the persona fictional in the seed", () => {
		// A believable example is indistinguishable from a real person's resume. The
		// seed has to say which one it is, in the file someone will actually read.
		expect(seedSql).toMatch(/FICTIONAL/);
		expect(seedSql).toMatch(/Priya Raman/);
	});

	it("has a base and a variation, both tagged as the showcase", () => {
		const db = seededDb();
		try {
			const { base, variant } = showcaseRows(db);
			expect(base.tags).toContain("showcase");
			expect(variant.tags).toContain("showcase");
			expect(variant.baseResumeId).toBe(base.id);
			expect(base.name.startsWith("Showcase")).toBe(true);
			expect(variant.name.startsWith("Showcase")).toBe(true);
		} finally {
			db.close();
		}
	});

	it("uses valid templates and the one-page / two-page pairing", () => {
		const db = seededDb();
		try {
			const { base, variant } = showcaseRows(db);
			expect(templateTypeSchema.safeParse(base.template).success).toBe(true);
			expect(templateTypeSchema.safeParse(variant.template).success).toBe(true);
			expect(base.template).not.toBe(variant.template);
			// The dense one-pager and the multi-page document, on purpose: they are the
			// two ends of the density range the page-fit suite has to handle.
			expect(base.template).toBe("compact");
			expect(variant.template).toBe("academic");
		} finally {
			db.close();
		}
	});
});

describe("the showcase exercises every section type", () => {
	it("covers every option in sectionTypeSchema", () => {
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			const missingFromBase = sectionTypeSchema.options.filter(
				(type) => !baseSections.some((s) => s.type === type),
			);
			expect(
				missingFromBase,
				`The showcase base is missing section type(s): ${missingFromBase.join(", ")}. ` +
					"Add them to the showcase block in api/src/db/seed.sql (visible or hidden) " +
					"and record them in docs/SHOWCASE.md.",
			).toEqual([]);

			const missingFromVariant = sectionTypeSchema.options.filter(
				(type) => !variantSections.some((s) => s.type === type),
			);
			expect(missingFromVariant).toEqual([]);
		} finally {
			db.close();
		}
	});

	it("validates every section against its per-type Zod schema", () => {
		// `sectionContentSchema` is generic by design and would accept almost any object.
		// These are the schemas the editors and serialisers actually consume.
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			for (const section of [...baseSections, ...variantSections]) {
				const content = sectionContentSchema.parse(JSON.parse(section.content));

				if (section.type === "personal-info") {
					personalInfoSchema.parse(content.data);
					continue;
				}
				if (section.type === "summary" || section.type === "custom") {
					expect(
						typeof content.html === "string" && content.html.length > 0,
						`${section.id} must carry html`,
					).toBe(true);
					expect(
						content.json,
						`${section.id} must carry a ProseMirror document so marks export`,
					).toBeDefined();
					continue;
				}

				const schema =
					ENTRY_SCHEMAS[section.type as keyof typeof ENTRY_SCHEMAS];
				expect(schema, `no schema mapped for ${section.type}`).toBeDefined();
				const entries = content.data;
				expect(
					Array.isArray(entries),
					`${section.id} data must be an array`,
				).toBe(true);
				for (const entry of entries as unknown[]) {
					schema.parse(entry);
				}
			}
		} finally {
			db.close();
		}
	});
});

describe("the showcase exercises every resume setting", () => {
	it("covers every key of resumeSettingsSchema", () => {
		const db = seededDb();
		try {
			const { base, variant } = showcaseRows(db);
			const keys = Object.keys(resumeSettingsSchema.shape);
			for (const resume of [base, variant]) {
				const metadata = metadataOf(resume);
				const missing = keys.filter(
					(key) => !(key in (metadata.settings as Record<string, unknown>)),
				);
				expect(
					missing,
					`${resume.id} settings are missing: ${missing.join(", ")}. ` +
						"Add them to the showcase block in api/src/db/seed.sql and update docs/SHOWCASE.md.",
				).toEqual([]);
			}
		} finally {
			db.close();
		}
	});

	it("sets a page target on both documents", () => {
		const db = seededDb();
		try {
			const { base, variant } = showcaseRows(db);
			expect(metadataOf(base).settings.pageTarget).toBe(1);
			expect(metadataOf(variant).settings.pageTarget).toBe(2);
		} finally {
			db.close();
		}
	});

	it("sets a job target so the match panel has something to score", () => {
		const db = seededDb();
		try {
			const { base } = showcaseRows(db);
			const jobTarget = metadataOf(base).jobTarget;
			expect(jobTarget?.title).toBeTruthy();
			expect(jobTarget?.keywords?.length ?? 0).toBeGreaterThan(0);
		} finally {
			db.close();
		}
	});
});

describe("the showcase exercises every section layout flag", () => {
	/**
	 * `columns`, `alignment` and `showDivider` are legacy fields with no reader in the
	 * serializer or any template. Covering them would look like coverage and prove
	 * nothing, so they are excluded -- but a NEW layout key is not, and fails here until
	 * the showcase uses it.
	 */
	const LEGACY_LAYOUT_KEYS = new Set(["columns", "alignment", "showDivider"]);

	it("covers every layout flag the renderer reads", () => {
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			const layouts = [...baseSections, ...variantSections]
				.map((s) => s.layout)
				.filter((layout): layout is string => layout !== null)
				.map((layout) => JSON.parse(layout) as Record<string, unknown>);

			const used = new Set(layouts.flatMap((layout) => Object.keys(layout)));
			const required = Object.keys(sectionLayoutSchema.shape).filter(
				(key) => !LEGACY_LAYOUT_KEYS.has(key),
			);

			const missing = required.filter((key) => !used.has(key));
			expect(
				missing,
				`The showcase does not exercise layout flag(s): ${missing.join(", ")}. ` +
					"Add one section using each flag in api/src/db/seed.sql and update docs/SHOWCASE.md.",
			).toEqual([]);
		} finally {
			db.close();
		}
	});

	it("uses each flag with a value that visibly does something", () => {
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			const layouts = [...baseSections, ...variantSections]
				.map((s) => s.layout)
				.filter((layout): layout is string => layout !== null)
				.map((layout) => JSON.parse(layout) as Record<string, unknown>);

			expect(layouts.some((l) => l.keepTogether === "always")).toBe(true);
			expect(layouts.some((l) => l.keepSectionTogether === true)).toBe(true);
			expect(layouts.some((l) => l.pageBreakBefore === true)).toBe(true);
			expect(
				layouts.some(
					(l) =>
						l.spacing === "compact" ||
						l.spacing === "normal" ||
						l.spacing === "spacious",
				),
			).toBe(true);
			expect(
				layouts.some((l) => {
					const entries = l.entries;
					return (
						!!entries &&
						typeof entries === "object" &&
						!Array.isArray(entries) &&
						Object.keys(entries).length > 0
					);
				}),
			).toBe(true);
		} finally {
			db.close();
		}
	});
});

describe("the showcase exercises the content library and variants", () => {
	it("places a library item identically in one resume and diverged in the other", () => {
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			const items = db
				.prepare(`SELECT * FROM content_items WHERE id LIKE 'showcase-item-%'`)
				.all() as { id: string; payload: string }[];
			expect(items.length).toBeGreaterThanOrEqual(2);

			const placed = items.find((item) =>
				[...baseSections, ...variantSections].some(
					(s) => s.contentItemId === item.id,
				),
			);
			expect(
				placed,
				"at least one showcase library item must be placed in a resume",
			).toBeDefined();

			const basePlacement = baseSections.find(
				(s) => s.contentItemId === placed?.id,
			);
			const variantPlacement = variantSections.find(
				(s) => s.contentItemId === placed?.id,
			);
			expect(basePlacement).toBeDefined();
			expect(variantPlacement).toBeDefined();

			// One placement still matches its master...
			expect(JSON.parse(basePlacement?.content as string)).toEqual(
				JSON.parse(placed?.payload as string),
			);
			// ...and the other has been tailored, which is what `content.divergence` reports.
			expect(JSON.parse(variantPlacement?.content as string)).not.toEqual(
				JSON.parse(placed?.payload as string),
			);
		} finally {
			db.close();
		}
	});

	it("leaves one library item unplaced so the additions offer has content", () => {
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			const placedIds = new Set(
				[...baseSections, ...variantSections]
					.map((s) => s.contentItemId)
					.filter(Boolean),
			);
			const unplaced = db
				.prepare(`SELECT id FROM content_items WHERE id LIKE 'showcase-item-%'`)
				.all() as { id: string }[];
			expect(
				unplaced.some((item) => !placedIds.has(item.id)),
				"the library needs an unplaced showcase item for the additions panel",
			).toBe(true);
		} finally {
			db.close();
		}
	});

	it("has a variation with both linked and detached sections", () => {
		const db = seededDb();
		try {
			const { variantSections } = showcaseRows(db);
			expect(variantSections.every((s) => s.baseSectionId !== null)).toBe(true);

			const linked = variantSections.filter((s) => s.linkedToBase === 1);
			const detached = variantSections.filter((s) => s.linkedToBase === 0);
			expect(
				linked.length,
				"the variation must still follow some base sections",
			).toBeGreaterThan(0);
			expect(
				detached.length,
				"the variation must have taken over some sections",
			).toBeGreaterThan(0);

			// Taking a section over is a content edit, so the detached set must include
			// the sections the full CV actually rewrites: the summary, the longer
			// history, the academic skills and the diverged project placement.
			for (const type of [
				"summary",
				"experience",
				"education",
				"skills",
				"projects",
				"custom",
			]) {
				const section = variantSections.find((s) => s.type === type);
				expect(section?.linkedToBase, `${type} should be detached`).toBe(0);
			}
		} finally {
			db.close();
		}
	});
});

describe("the showcase exercises revision history", () => {
	it("has several automatic snapshots and at least two named versions", () => {
		const db = seededDb();
		try {
			const { base } = showcaseRows(db);
			const revisions = db
				.prepare(
					`SELECT seq, label, snapshotJson FROM resume_revisions WHERE resumeId = ? ORDER BY seq`,
				)
				.all(base.id) as {
				seq: number;
				label: string | null;
				snapshotJson: string;
			}[];

			expect(revisions.length).toBeGreaterThanOrEqual(5);
			expect(
				revisions.filter((r) => r.label === null).length,
				"the history needs automatic snapshots",
			).toBeGreaterThanOrEqual(2);
			expect(
				revisions.filter((r) => r.label !== null).length,
				"the history needs at least two named versions",
			).toBeGreaterThanOrEqual(2);
		} finally {
			db.close();
		}
	});

	it("stores a restorable snapshot whose newest entry matches the live document", () => {
		const db = seededDb();
		try {
			const { base, baseSections } = showcaseRows(db);
			const revisions = db
				.prepare(
					`SELECT seq, snapshotJson FROM resume_revisions WHERE resumeId = ? ORDER BY seq`,
				)
				.all(base.id) as { seq: number; snapshotJson: string }[];

			for (const revision of revisions) {
				const snapshot = JSON.parse(revision.snapshotJson) as {
					name: string;
					template: string;
					metadata: string | null;
					sections: {
						id: string;
						type: string;
						order: number;
						visible: boolean;
						content: string;
						contentItemId: string | null;
					}[];
				};
				expect(snapshot.name).toBeTruthy();
				expect(snapshot.template).toBeTruthy();
				expect(Array.isArray(snapshot.sections)).toBe(true);
				for (const section of snapshot.sections) {
					expect(typeof section.content).toBe("string");
					expect(() => JSON.parse(section.content)).not.toThrow();
				}
			}

			// The newest snapshot is byte-identical to the live document, so the History
			// panel reads "No differences" rather than inventing a diff.
			const newest = revisions[revisions.length - 1];
			const snapshot = JSON.parse(newest?.snapshotJson as string) as {
				sections: { id: string; content: string }[];
			};
			expect(snapshot.sections.map((s) => s.id).sort()).toEqual(
				baseSections.map((s) => s.id).sort(),
			);
			for (const section of baseSections) {
				const stored = snapshot.sections.find((s) => s.id === section.id);
				expect(stored?.content).toBe(section.content);
			}
		} finally {
			db.close();
		}
	});
});

describe("the showcase exercises rich-text marks", () => {
	it("keeps bold, italic and links in the summary and in rich bullets", () => {
		const db = seededDb();
		try {
			const { baseSections, variantSections } = showcaseRows(db);
			const summary = baseSections.find((s) => s.type === "summary");
			const custom = variantSections.find((s) => s.type === "custom");
			expect(summary).toBeDefined();
			expect(custom).toBeDefined();

			for (const section of [summary, custom]) {
				const content = JSON.parse(section?.content as string) as {
					json?: unknown;
				};
				const marks = markTypes(content.json);
				expect(marks.has("bold"), `${section?.id} needs bold`).toBe(true);
				expect(marks.has("italic"), `${section?.id} needs italic`).toBe(true);
				expect(marks.has("link"), `${section?.id} needs a link`).toBe(true);
			}

			// The custom section's marks are in a bullet list, which is the only place a
			// bullet can carry a mark: experience highlights are plain strings.
			const customContent = JSON.parse(custom?.content as string) as {
				json?: unknown;
			};
			expect(hasBlockType(customContent.json, "bulletList")).toBe(true);
		} finally {
			db.close();
		}
	});
});
