import { describe, expect, it } from "vitest";
import { createHarness, RESUME_A, SECTION_A, USER_A } from "./helpers/harness";

/**
 * Section break flags are layout, and layout must actually persist.
 *
 * `sectionLayoutSchema` has been an accepted input of `section.create`, `update`,
 * `upsert` and `bulkUpsert` since the router was written, and `SectionLayout` has been
 * on `ResumeSection` — but there was no column behind either. Every write validated the
 * flag and dropped it, so a client could ask for "keep this entry together", receive a
 * success, and find the flag gone on the next read. The page-fit suite is the first
 * caller that depends on the answer, which is how a schema with no storage was found.
 *
 * These assert the round trip through the real procedure and the real database, because
 * a unit test of the serialiser would have passed the whole time the column was missing.
 */

const LAYOUT = {
	keepTogether: "always",
	keepSectionTogether: true,
	pageBreakBefore: true,
	entries: { entry_1: "never" },
} as const;

describe("a section's break flags persist", () => {
	it("are returned by the update that wrote them", async () => {
		const h = createHarness();
		const updated = await h
			.callerAs(USER_A)
			.section.update({ id: SECTION_A, data: { layout: LAYOUT } });

		expect(updated?.layout).toEqual(LAYOUT);
	});

	it("survive a separate read", async () => {
		const h = createHarness();
		await h
			.callerAs(USER_A)
			.section.update({ id: SECTION_A, data: { layout: LAYOUT } });

		const sections = await h
			.callerAs(USER_A)
			.section.listByResume({ resumeId: RESUME_A });

		expect(sections.find((s) => s.id === SECTION_A)?.layout).toEqual(LAYOUT);
	});

	it("come back with the resume, not just the section endpoint", async () => {
		const h = createHarness();
		await h
			.callerAs(USER_A)
			.section.update({ id: SECTION_A, data: { layout: LAYOUT } });

		const resume = await h.callerAs(USER_A).resume.getById({ id: RESUME_A });

		expect(resume?.sections.find((s) => s.id === SECTION_A)?.layout).toEqual(
			LAYOUT,
		);
	});

	it("do not detach a linked variant section, because a break is not content", async () => {
		const h = createHarness();
		const variant = await h.callerAs(USER_A).resume.createVariation({
			baseResumeId: RESUME_A,
			name: "Break-tested variant",
			domain: "Platform",
		});
		const copied = variant?.sections[0];
		expect(copied?.linkedToBase).toBe(true);

		// The variant inherits the base's breaks for free, then re-breaks one section.
		const updated = await h.callerAs(USER_A).section.update({
			id: copied?.id as string,
			data: { layout: { keepSectionTogether: true } },
		});

		expect(updated?.layout).toEqual({ keepSectionTogether: true });
		expect(updated?.linkedToBase, "a layout change is not a takeover").toBe(
			true,
		);
	});

	it("copies onto a variant when it is created", async () => {
		const h = createHarness();
		await h
			.callerAs(USER_A)
			.section.update({ id: SECTION_A, data: { layout: LAYOUT } });

		const variant = await h.callerAs(USER_A).resume.createVariation({
			baseResumeId: RESUME_A,
			name: "Inherits breaks",
			domain: "Platform",
		});

		expect(variant?.sections[0]?.layout).toEqual(LAYOUT);
	});
});
