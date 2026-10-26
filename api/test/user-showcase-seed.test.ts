import { beforeEach, describe, expect, it } from "vitest";
import { createHarness, type TestHarness } from "./helpers/harness";

/**
 * The showcase on first sign-in.
 *
 * The landing page says "view the example", so a new account must actually have one. The
 * fixture is the same JSON the dev seed is generated from (`api/src/db/showcase.ts`), and
 * `showcase-seed.test.ts` proves the two paths materialise the same rows.
 *
 * The decisions this file pins, because they are the ones a future change would break:
 *
 *   - **Once.** `user.upsert` runs on every sign-in. Seeding outside the create branch
 *     would resurrect a deleted example on the next visit — a delete button that undoes
 *     itself.
 *   - **Deletable.** The documents are ordinary resumes: no protected flag, no filter that
 *     hides them from `resume.delete`.
 *   - **Per user.** Ids are prefixed with the user id, so two accounts in one database do
 *     not collide and a row in a log is traceable.
 */
let h: TestHarness;

beforeEach(() => {
	h = createHarness();
});

const NEW_USER = "user-new";

async function signIn(userId = NEW_USER) {
	return h.callerAs(userId).user.upsert({ email: `${userId}@example.test` });
}

const ids = (
	table: "Resume" | "Section" | "resume_revisions" | "content_items",
) =>
	(
		h.sqlite
			.prepare(`SELECT id FROM ${table} WHERE id LIKE ? ORDER BY id`)
			.all(`${NEW_USER}%`) as Array<{ id: string }>
	).map((row) => row.id);

describe("the showcase is seeded on a user's first sign-in", () => {
	it("creates both documents, their sections, history and library items", async () => {
		await signIn();

		const resumes = h.sqlite
			.prepare(
				"SELECT id, name, template, tags, variationType FROM Resume WHERE userId = ? ORDER BY id",
			)
			.all(NEW_USER) as Array<{
			id: string;
			name: string;
			template: string;
			tags: string;
			variationType: string;
		}>;

		expect(resumes).toHaveLength(2);
		expect(resumes.map((r) => r.variationType).sort()).toEqual([
			"base",
			"variation",
		]);
		// The UI entry point keys off the tag, not an id (`src/lib/showcase.ts`).
		for (const resume of resumes) {
			expect(JSON.parse(resume.tags)).toContain("showcase");
			expect(resume.name.startsWith("Showcase —")).toBe(true);
		}

		// 26 sections across the two documents, all thirteen section types represented.
		const sectionRows = h.sqlite
			.prepare(
				`SELECT s.type FROM Section s JOIN Resume r ON r.id = s.resumeId WHERE r.userId = ?`,
			)
			.all(NEW_USER) as Array<{ type: string }>;
		expect(sectionRows).toHaveLength(26);
		expect(new Set(sectionRows.map((s) => s.type)).size).toBe(13);

		expect(ids("resume_revisions")).toHaveLength(8);
		expect(ids("content_items")).toHaveLength(2);
	});

	it("prefixes every id with the user, so two accounts do not collide", async () => {
		await signIn("user-alpha");
		await signIn("user-beta");

		const alpha = h.sqlite
			.prepare("SELECT id FROM Resume WHERE userId = 'user-alpha'")
			.all() as Array<{ id: string }>;
		const beta = h.sqlite
			.prepare("SELECT id FROM Resume WHERE userId = 'user-beta'")
			.all() as Array<{ id: string }>;

		expect(alpha).toHaveLength(2);
		expect(beta).toHaveLength(2);
		for (const row of alpha)
			expect(row.id.startsWith("user-alpha-")).toBe(true);
		for (const row of beta) expect(row.id.startsWith("user-beta-")).toBe(true);
		expect(alpha.map((r) => r.id)).not.toEqual(beta.map((r) => r.id));
	});

	it("does not come back: a second sign-in creates nothing", async () => {
		await signIn();
		const before = {
			resumes: ids("Resume"),
			sections: ids("Section"),
			revisions: ids("resume_revisions"),
			items: ids("content_items"),
		};

		await signIn();

		expect(ids("Resume")).toEqual(before.resumes);
		expect(ids("Section")).toEqual(before.sections);
		expect(ids("resume_revisions")).toEqual(before.revisions);
		expect(ids("content_items")).toEqual(before.items);
	});

	it("is the user's to delete, and deleting it is final", async () => {
		await signIn();

		const base = h.sqlite
			.prepare(
				"SELECT id FROM Resume WHERE userId = ? AND variationType = 'base'",
			)
			.get(NEW_USER) as { id: string };

		// The variation points at the base with ON DELETE SET NULL, so both have to go
		// for the library to be empty; deleting one is an ordinary resume delete.
		await h.callerAs(NEW_USER).resume.delete({ id: base.id });
		expect(await h.resume(base.id)).toBeUndefined();

		await signIn();
		expect(await h.resume(base.id)).toBeUndefined();
	});
});
