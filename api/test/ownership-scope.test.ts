import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { resumes, sections } from "../src/db/schema";
import {
	resumeWriteScope,
	sectionWriteScope,
} from "../src/trpc/middleware/ownership";
import {
	createHarness,
	RESUME_A,
	RESUME_B,
	SECTION_A,
	SECTION_B,
	USER_A,
	USER_B,
} from "./helpers/harness";

/**
 * Unit tests for the tenant predicates themselves.
 *
 * These pin the SHAPE of the SQL (both columns present) so that nobody can later
 * weaken a predicate to `eq(sections.id, ...)` and still pass the integration
 * suite by accident.
 */
describe("sectionWriteScope", () => {
	it("constrains on BOTH the section id and its parent resume", () => {
		const harness = createHarness();
		try {
			const sql = harness.raw
				.select()
				.from(sections)
				.where(sectionWriteScope("x", "y"))
				.toSQL();

			expect(sql.sql).toContain('"Section"."id"');
			expect(sql.sql).toContain('"Section"."resumeId"');
			expect(sql.params).toEqual(["x", "y"]);
		} finally {
			harness.close();
		}
	});

	it("matches a section that belongs to the given resume", async () => {
		const harness = createHarness();
		try {
			const found = await harness.raw
				.select()
				.from(sections)
				.where(sectionWriteScope(SECTION_A, RESUME_A))
				.get();
			expect(found?.id).toBe(SECTION_A);
		} finally {
			harness.close();
		}
	});

	it("matches nothing when the resume is a different tenant's", async () => {
		const harness = createHarness();
		try {
			// The exact cross-tenant combination the IDOR tries to reach.
			const found = await harness.raw
				.select()
				.from(sections)
				.where(sectionWriteScope(SECTION_B, RESUME_A))
				.get();
			expect(found).toBeUndefined();
		} finally {
			harness.close();
		}
	});

	it("is not satisfiable by the section id alone", async () => {
		const harness = createHarness();
		try {
			const global = await harness.raw
				.select()
				.from(sections)
				.where(eq(sections.id, SECTION_B))
				.get();
			const scoped = await harness.raw
				.select()
				.from(sections)
				.where(sectionWriteScope(SECTION_B, RESUME_A))
				.get();

			// Documents the difference the fix relies on.
			expect(global?.id).toBe(SECTION_B);
			expect(scoped).toBeUndefined();
		} finally {
			harness.close();
		}
	});
});

describe("resumeWriteScope", () => {
	it("constrains on BOTH the resume id and its owner", () => {
		const harness = createHarness();
		try {
			const sql = harness.raw
				.select()
				.from(resumes)
				.where(resumeWriteScope(RESUME_A, USER_A))
				.toSQL();
			expect(sql.sql).toContain('"Resume"."id"');
			expect(sql.sql).toContain('"Resume"."userId"');
		} finally {
			harness.close();
		}
	});

	it("matches nothing for a resume owned by another user", async () => {
		const harness = createHarness();
		try {
			const found = await harness.raw
				.select()
				.from(resumes)
				.where(resumeWriteScope(RESUME_B, USER_A))
				.get();
			expect(found).toBeUndefined();
		} finally {
			harness.close();
		}
	});
});
