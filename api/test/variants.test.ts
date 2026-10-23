import { beforeEach, describe, expect, it } from "vitest";
import {
	createHarness,
	experienceContent,
	RESUME_A,
	RESUME_B,
	SECTION_A,
	type TestHarness,
	USER_A,
	USER_B,
} from "./helpers/harness";

/**
 * Variants: a copy that follows its base until you take a part of it over.
 *
 * The properties worth pinning, in the order they are easy to get wrong:
 *
 *  1. **Creation copies.** A variant must be a complete document, not a reference. If it
 *     borrowed sections, it could not be exported or edited independently.
 *  2. **Linkage is per section.** Tailoring a summary while keeping experience bullets
 *     shared is the normal case; a per-resume flag cannot express it.
 *  3. **Editing the base reaches linked copies.** "Linked" that only means "was linked
 *     at creation" is a label, not a relationship.
 *  4. **Editing a copy detaches it.** Otherwise the base's next edit silently overwrites
 *     the user's deliberate change — the exact failure that makes people distrust
 *     variants.
 *  5. **Tenancy.** Creating a variant of, or linking into, another user's resume is
 *     refused with the same message as a missing id.
 */

let h: TestHarness;

beforeEach(() => {
	h = createHarness();
});

const asA = () => h.callerAs(USER_A);
const asB = () => h.callerAs(USER_B);

async function makeVariation(name = "A variant") {
	return asA().resume.createVariation({
		baseResumeId: RESUME_A,
		name,
		domain: "Platform",
	});
}

describe("creating a variant", () => {
	it("copies every section and records where each came from", async () => {
		const variant = await makeVariation();

		expect(variant?.variationType).toBe("variation");
		expect(variant?.baseResumeId).toBe(RESUME_A);
		expect(variant?.sections).toHaveLength(1);

		const copied = variant?.sections[0];
		expect(copied?.id).not.toBe(SECTION_A);
		expect(copied?.baseSectionId).toBe(SECTION_A);
		expect(copied?.linkedToBase).toBe(true);
		// Content is copied, not referenced. A variant rendered from a reference would
		// change under the user whenever the base did, even after they detached it.
		expect(copied?.content).toEqual(experienceContent("A Corp"));
	});

	it("refuses another tenant's resume with the same message as a missing one", async () => {
		await expect(
			asB().resume.createVariation({
				baseResumeId: RESUME_A,
				name: "Stolen",
			}),
		).rejects.toThrow(/not found or access denied/i);
	});

	it("flattens a variation of a variation to the root", async () => {
		const first = await makeVariation("First");
		const second = await asA().resume.createVariation({
			baseResumeId: first?.id as string,
			name: "Second",
		});

		expect(second?.baseResumeId).toBe(RESUME_A);
		// And the pointer is at the ROOT section, not at the intermediate copy.
		expect(second?.sections[0]?.baseSectionId).toBe(SECTION_A);
	});
});

describe("propagation", () => {
	it("carries a base edit into a linked variant section", async () => {
		const variant = await makeVariation();
		const variantSectionId = variant?.sections[0]?.id as string;

		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Renamed Corp") },
		});

		const propagated = await h.section(variantSectionId);
		expect(propagated?.content).toContain("Renamed Corp");
		expect(propagated?.linkedToBase).toBe(true);
	});

	it("detaches a variant section when the user edits it, and never touches the base", async () => {
		const variant = await makeVariation();
		const variantSectionId = variant?.sections[0]?.id as string;

		await asA().section.update({
			id: variantSectionId,
			data: { content: experienceContent("Tailored for this role") },
		});

		const detached = await h.section(variantSectionId);
		expect(detached?.linkedToBase).toBe(false);

		const base = await h.section(SECTION_A);
		expect(base?.content).toContain("A Corp");
		expect(base?.content).not.toContain("Tailored");
	});

	it("leaves a detached section alone when the base changes", async () => {
		const variant = await makeVariation();
		const variantSectionId = variant?.sections[0]?.id as string;

		await asA().section.update({
			id: variantSectionId,
			data: { content: experienceContent("Mine") },
		});
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Base moved on") },
		});

		expect((await h.section(variantSectionId))?.content).toContain("Mine");
	});

	it("re-pulls only linked sections on an explicit sync", async () => {
		const variant = await makeVariation();
		const linkedId = variant?.sections[0]?.id as string;

		// Add a second section to the variant and detach its copy.
		const extra = await asA().section.create({
			resumeId: variant?.id as string,
			type: "summary",
			content: { title: "Summary", html: "<p>local</p>" },
		});
		await asA().section.update({
			id: linkedId,
			data: { content: experienceContent("Locally edited") },
		});

		await asA().resume.pullFromBase({ resumeId: variant?.id as string });

		// The detached copy keeps the local text ...
		expect((await h.section(linkedId))?.content).toContain("Locally edited");
		// ... and the section that was never linked is untouched.
		expect((await h.section(extra?.id as string))?.content).toContain("local");
	});

	it("re-attaching pulls the base content and resumes following it", async () => {
		const variant = await makeVariation();
		const variantSectionId = variant?.sections[0]?.id as string;

		await asA().section.update({
			id: variantSectionId,
			data: { content: experienceContent("Local") },
		});
		await asA().section.setLink({ id: variantSectionId, linked: true });

		const reattached = await h.section(variantSectionId);
		expect(reattached?.linkedToBase).toBe(true);
		expect(reattached?.content).toContain("A Corp");

		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("After re-link") },
		});
		expect((await h.section(variantSectionId))?.content).toContain(
			"After re-link",
		);
	});

	it("refuses to link a base section, which has no counterpart", async () => {
		await expect(
			asA().section.setLink({ id: SECTION_A, linked: true }),
		).rejects.toThrow(/no base counterpart/i);
	});

	it("orphans a variant copy when the base section is deleted", async () => {
		const variant = await makeVariation();
		const variantSectionId = variant?.sections[0]?.id as string;

		await asA().section.delete({ id: SECTION_A });

		const orphan = await h.section(variantSectionId);
		expect(orphan).toBeDefined();
		expect(orphan?.baseSectionId).toBeNull();
		expect(orphan?.content).toContain("A Corp");
	});
});

describe("listing variants", () => {
	it("returns the same set whether asked from the root or from a variant", async () => {
		const variant = await makeVariation("V1");
		await asA().resume.createVariation({
			baseResumeId: RESUME_A,
			name: "V2",
		});

		const fromRoot = await asA().resume.listVariations({
			baseResumeId: RESUME_A,
		});
		const fromVariant = await asA().resume.listVariations({
			baseResumeId: variant?.id as string,
		});

		expect(fromRoot.map((r) => r.name).sort()).toEqual(["V1", "V2"]);
		expect(fromVariant.map((r) => r.id).sort()).toEqual(
			fromRoot.map((r) => r.id).sort(),
		);
	});

	it("never includes another tenant's variants", async () => {
		await asB().resume.createVariation({
			baseResumeId: RESUME_B,
			name: "B variant",
		});
		await makeVariation("A variant");

		const aVariants = await asA().resume.listVariations({
			baseResumeId: RESUME_A,
		});
		expect(aVariants).toHaveLength(1);
		expect(aVariants[0]?.name).toBe("A variant");

		// And B cannot ask about A's base at all.
		await expect(
			asB().resume.listVariations({ baseResumeId: RESUME_A }),
		).rejects.toThrow(/not found or access denied/i);
	});
});

describe("history", () => {
	it("records the initial state of a new variant", async () => {
		const variant = await makeVariation();
		const history = await asA().revision.list({
			resumeId: variant?.id as string,
		});

		expect(history).toHaveLength(1);
		expect(history[0]?.label).toBe("Created from base");
	});

	it("records a revision after an ordinary base edit, without a button press", async () => {
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Autosaved") },
		});

		const history = await asA().revision.list({ resumeId: RESUME_A });
		expect(history.length).toBeGreaterThanOrEqual(1);
		expect(history[0]?.label).toBe("Autosave");
	});
});
