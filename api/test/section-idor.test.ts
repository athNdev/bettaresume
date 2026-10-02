import { describe, expect, it } from "vitest";
import {
	createHarness,
	experienceContent,
	RESUME_A,
	RESUME_B,
	SECTION_A,
	SECTION_B,
	SECTION_B_HIDDEN,
	sectionFingerprint,
	type TestHarness,
	USER_A,
} from "./helpers/harness";

/**
 * Integration tests for the cross-tenant section-write IDOR.
 *
 * Two tenants are seeded (user-a/resume-a, user-b/resume-b, one visible and one
 * hidden section each for B). Every test drives the real tRPC procedures against a
 * real SQLite database migrated from api/drizzle/*.sql — no database mocks, because
 * the thing under test IS the generated SQL predicate.
 *
 * Error semantics chosen for the fix: a caller-supplied section id that is not inside
 * the caller's own resume yields TRPCError NOT_FOUND ("Section not found in this
 * resume"). NOT_FOUND rather than FORBIDDEN on purpose — FORBIDDEN would confirm that
 * the id exists and turn the endpoint into a probe for enumerating other tenants'
 * section ids. "Not in this resume" is the same answer for "no such id" and
 * "someone else's id".
 */

/** Snapshot of everything user-b owns, for strict before/after comparison. */
async function tenantBSnapshot(h: TestHarness) {
	return {
		section: sectionFingerprint(await h.section(SECTION_B)),
		hidden: sectionFingerprint(await h.section(SECTION_B_HIDDEN)),
		resume: await h.resume(RESUME_B),
	};
}

/** The exact cross-tenant payload used by the upsert tests. */
function crossTenantUpsertPayload() {
	return {
		// The attacker's OWN resume, so the resume ownership check passes …
		resumeId: RESUME_A,
		// … with a victim's section id.
		id: SECTION_B,
		type: "awards" as const,
		order: 99,
		visible: false,
		content: experienceContent("PWNED"),
	};
}

describe("section.upsert — cross-tenant write", () => {
	it("refuses to overwrite another tenant's section and leaves the row byte-identical", async () => {
		const h = createHarness();
		try {
			const before = await tenantBSnapshot(h);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.section.upsert(crossTenantUpsertPayload()),
			).rejects.toThrowError(/not found/i);

			expect(await tenantBSnapshot(h)).toEqual(before);
		} finally {
			h.close();
		}
	});

	it("does not even give the attacker a cosmetic updatedAt bump on their own resume", async () => {
		const h = createHarness();
		try {
			const before = await h.resume(RESUME_A);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.section.upsert(crossTenantUpsertPayload()),
			).rejects.toThrowError(/not found/i);

			// Pre-fix, this bump made a successful cross-tenant write look routine.
			expect((await h.resume(RESUME_A))?.updatedAt).toEqual(before?.updatedAt);
		} finally {
			h.close();
		}
	});

	it("does not leak whether the victim's id exists", async () => {
		const h = createHarness();
		try {
			const attacker = h.callerAs(USER_A);

			const knownId = attacker.section.upsert(crossTenantUpsertPayload());
			const unknownId = attacker.section.upsert({
				...crossTenantUpsertPayload(),
				id: "does-not-exist-anywhere",
			});

			const known = await knownId.catch((e: Error) => e.message);
			const unknown = await unknownId.catch((e: Error) => e.message);

			// Identical responses: the endpoint is not an existence oracle.
			expect(known).toBe(unknown);
		} finally {
			h.close();
		}
	});

	it("positive control: the owner can still upsert their own section by id", async () => {
		const h = createHarness();
		try {
			const owner = h.callerAs(USER_A);

			const result = await owner.section.upsert({
				resumeId: RESUME_A,
				id: SECTION_A,
				type: "experience",
				order: 3,
				visible: false,
				content: experienceContent("A Corp Renamed"),
			});

			expect(result?.id).toBe(SECTION_A);
			expect(result?.order).toBe(3);
			expect(result?.visible).toBe(false);
			// The procedure already parses Section.content for the caller.
			expect(result?.content).toEqual({
				data: [{ company: "A Corp Renamed" }],
			});

			const row = await h.section(SECTION_A);
			expect(row?.order).toBe(3);
			expect(row?.visible).toBe(false);
		} finally {
			h.close();
		}
	});

	it("positive control: the owner can still insert a new section without an id", async () => {
		const h = createHarness();
		try {
			const owner = h.callerAs(USER_A);
			const result = await owner.section.upsert({
				resumeId: RESUME_A,
				type: "skills",
				order: 4,
				visible: true,
				content: { data: [] },
			});

			expect(result?.id).toBeTruthy();
			expect((await h.section(result?.id ?? ""))?.resumeId).toBe(RESUME_A);
		} finally {
			h.close();
		}
	});
});

describe("section.bulkUpsert — cross-tenant write", () => {
	it("refuses a payload containing another tenant's section id and writes nothing", async () => {
		const h = createHarness();
		try {
			const before = await tenantBSnapshot(h);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.section.bulkUpsert({
					resumeId: RESUME_A,
					sections: [
						{
							id: SECTION_B,
							type: "awards",
							order: 42,
							visible: false,
							content: experienceContent("PWNED"),
						},
					],
				}),
			).rejects.toThrowError(/not found/i);

			expect(await tenantBSnapshot(h)).toEqual(before);
		} finally {
			h.close();
		}
	});

	it("cannot smuggle a victim id alongside the attacker's own section", async () => {
		const h = createHarness();
		try {
			const before = await tenantBSnapshot(h);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.section.bulkUpsert({
					resumeId: RESUME_A,
					sections: [
						{
							id: SECTION_A,
							type: "experience",
							order: 1,
							visible: true,
							content: experienceContent("A Corp"),
						},
						{
							id: SECTION_B_HIDDEN,
							type: "custom",
							order: 2,
							visible: true,
							content: { data: [{ note: "PWNED" }] },
						},
					],
				}),
			).rejects.toThrowError(/not found/i);

			expect(await tenantBSnapshot(h)).toEqual(before);
			// And the legitimate entry earlier in the same loop was not half-applied.
			expect((await h.section(SECTION_A))?.order).toBe(0);
		} finally {
			h.close();
		}
	});

	it("positive control: the owner can still bulk-upsert their own sections", async () => {
		const h = createHarness();
		try {
			const owner = h.callerAs(USER_A);

			const result = await owner.section.bulkUpsert({
				resumeId: RESUME_A,
				sections: [
					{
						id: SECTION_A,
						type: "experience",
						order: 5,
						visible: false,
						content: experienceContent("A Corp Bulk"),
					},
				],
			});

			expect(result.success).toBe(true);
			expect((await h.section(SECTION_A))?.order).toBe(5);
			expect((await h.section(SECTION_A))?.visible).toBe(false);
		} finally {
			h.close();
		}
	});
});

describe("tenant predicate holds across every section/resume write path", () => {
	it("section.update cannot touch another tenant's section", async () => {
		const h = createHarness();
		try {
			const before = await tenantBSnapshot(h);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.section.update({
					id: SECTION_B,
					data: {
						order: 50,
						visible: false,
						content: experienceContent("PWNED"),
					},
				}),
			).rejects.toThrowError(/not found|access denied/i);

			expect(await tenantBSnapshot(h)).toEqual(before);
		} finally {
			h.close();
		}
	});

	it("section.delete cannot delete another tenant's section", async () => {
		const h = createHarness();
		try {
			const before = await tenantBSnapshot(h);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.section.delete({ id: SECTION_B }),
			).rejects.toThrowError(/not found|access denied/i);

			expect(await h.section(SECTION_B)).toBeDefined();
			expect(await tenantBSnapshot(h)).toEqual(before);
		} finally {
			h.close();
		}
	});

	it("section.reorder cannot reorder another tenant's sections", async () => {
		const h = createHarness();
		try {
			const before = await tenantBSnapshot(h);
			const attacker = h.callerAs(USER_A);

			// resumeId is ownership-checked and the per-row predicate carries
			// resumeId too, so the victim's section id must not be reordered.
			await attacker.section.reorder({
				resumeId: RESUME_A,
				sectionIds: [SECTION_B],
			});

			expect((await h.section(SECTION_B))?.order).toBe(
				before.section?.order as number,
			);
			expect(await tenantBSnapshot(h)).toEqual(before);
		} finally {
			h.close();
		}
	});

	it("resume.update cannot rename another tenant's resume", async () => {
		const h = createHarness();
		try {
			const before = await h.resume(RESUME_B);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.resume.update({ id: RESUME_B, data: { name: "PWNED" } }),
			).rejects.toThrowError(/not found|access denied/i);

			expect(await h.resume(RESUME_B)).toEqual(before);
		} finally {
			h.close();
		}
	});

	it("positive control: each write path still works for the owner", async () => {
		const h = createHarness();
		try {
			const owner = h.callerAs(USER_A);

			await owner.section.update({
				id: SECTION_A,
				data: { order: 2, visible: false },
			});
			expect((await h.section(SECTION_A))?.order).toBe(2);
			expect((await h.section(SECTION_A))?.visible).toBe(false);

			await owner.resume.update({ id: RESUME_A, data: { name: "Renamed" } });
			expect((await h.resume(RESUME_A))?.name).toBe("Renamed");

			await owner.section.delete({ id: SECTION_A });
			expect(await h.section(SECTION_A)).toBeUndefined();
		} finally {
			h.close();
		}
	});
});
