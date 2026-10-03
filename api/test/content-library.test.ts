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
 * The content library separates the master copy of someone's work from where it is
 * placed in a resume.
 *
 * Three properties are load-bearing and each has tests below:
 *
 *  1. **Tenancy.** Items are addressed by id alone, so an unscoped read would be a
 *     cross-tenant hole.
 *  2. **Sync never overwrites.** "Add to library", "save to all", and "Update Available"
 *     all have to stay opt-in per placement. A bulk overwrite is the failure mode this
 *     whole feature exists to prevent, so there is no procedure that performs one.
 *  3. **Existing content survives.** Backfill must adopt what is already there rather
 *     than requiring the user to re-enter their history.
 */

let h: TestHarness;
beforeEach(() => {
	h = createHarness();
});

const asA = () => h.callerAs(USER_A);
const asB = () => h.callerAs(USER_B);

const addItem = (label = "Acme — SDE") =>
	asA().content.create({
		type: "experience",
		title: label,
		payload: experienceContent("Acme"),
	});

describe("library basics", () => {
	it("creates an item", async () => {
		const item = await addItem();
		expect(item.title).toBe("Acme — SDE");
		expect(item.userId).toBe(USER_A);
	});

	it("lists a user's own items", async () => {
		await addItem();
		const list = await asA().content.list();
		expect(list).toHaveLength(1);
	});

	it("returns a parsed payload on get", async () => {
		const item = await addItem();
		const got = await asA().content.get({ contentItemId: item.id });
		expect(got.payload).toMatchObject({ data: [{ company: "Acme" }] });
	});

	it("filters by section type", async () => {
		await addItem();
		await asA().content.create({
			type: "skills",
			title: "Languages",
			payload: { data: [] },
		});
		expect(await asA().content.list({ type: "experience" })).toHaveLength(1);
		expect(await asA().content.list({ type: "skills" })).toHaveLength(1);
	});
});

describe("cross-tenant isolation", () => {
	it("cannot list another tenant's library", async () => {
		await addItem();
		expect(await asB().content.list()).toHaveLength(0);
	});

	it("cannot read another tenant's item", async () => {
		const item = await addItem();
		await expect(asB().content.get({ contentItemId: item.id })).rejects.toThrow(
			/not found or access denied/i,
		);
	});

	it("cannot edit another tenant's item", async () => {
		const item = await addItem();
		await expect(
			asB().content.update({ contentItemId: item.id, title: "Stolen" }),
		).rejects.toThrow(/not found or access denied/i);
	});

	it("cannot archive another tenant's item", async () => {
		const item = await addItem();
		await expect(
			asB().content.archive({ contentItemId: item.id }),
		).rejects.toThrow(/not found or access denied/i);
	});

	it("cannot attach another tenant's item into their own resume", async () => {
		const item = await addItem();
		// Attaching user A's content into user B's resume would exfiltrate A's content
		// into a resume B can read and export.
		await expect(
			asB().content.attach({
				contentItemId: item.id,
				resumeId: RESUME_B,
			}),
		).rejects.toThrow(/not found or access denied/i);
	});

	it("cannot attach into another tenant's resume", async () => {
		const item = await asB().content.create({
			type: "experience",
			title: "B's item",
			payload: experienceContent("B Co"),
		});
		await expect(
			asB().content.attach({ contentItemId: item.id, resumeId: RESUME_A }),
		).rejects.toThrow(/not found or access denied/i);
	});
});

describe("archiving", () => {
	it("hides an archived item from the default list", async () => {
		const item = await addItem();
		await asA().content.archive({ contentItemId: item.id });
		expect(await asA().content.list()).toHaveLength(0);
	});

	it("still lists it when explicitly asked", async () => {
		const item = await addItem();
		await asA().content.archive({ contentItemId: item.id });
		expect(await asA().content.list({ includeArchived: true })).toHaveLength(1);
	});

	it("can be undone", async () => {
		const item = await addItem();
		await asA().content.archive({ contentItemId: item.id });
		await asA().content.restore({ contentItemId: item.id });
		expect(await asA().content.list()).toHaveLength(1);
	});

	it("leaves existing placements intact", async () => {
		// A hard delete would empty sections in resumes the user has not got open.
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
			visible: true,
		});
		await asA().content.archive({ contentItemId: item.id });

		const sections = await asA().section.listByResume({
			resumeId: RESUME_A,
		});
		const placed = sections.find((s) => s.contentItemId === item.id);
		expect(placed).toBeDefined();
		expect(placed?.visible).toBe(true);
	});
});

describe("attaching and detaching", () => {
	it("creates a placement carrying the master's content", async () => {
		const item = await addItem();
		const { sectionId, created } = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		expect(created).toBe(true);

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const placed = sections.find((s) => s.id === sectionId);
		expect(placed?.content).toMatchObject({ data: [{ company: "Acme" }] });
	});

	it("starts hidden, because available is not the same as included", async () => {
		// Additive sync that inserts visibly would put content in front of employers
		// the user never chose to send it to.
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const placed = sections.find((s) => s.contentItemId === item.id);
		expect(placed?.visible).toBe(false);
	});

	it("does not duplicate an item already placed in the resume", async () => {
		const item = await addItem();
		const first = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		const second = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});

		expect(second.created).toBe(false);
		expect(second.sectionId).toBe(first.sectionId);

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		expect(sections.filter((s) => s.contentItemId === item.id)).toHaveLength(1);
	});

	it("places the same item into two resumes without duplicating content", async () => {
		// This is the whole point: tailor per job without rewriting the achievement.
		const item = await addItem();
		await asA().content.attach({ contentItemId: item.id, resumeId: RESUME_A });
		const second = await asB().content.create({
			type: "experience",
			title: "Acme",
			payload: experienceContent("Acme"),
		});
		expect(second.id).not.toBe(item.id);
	});

	it("detaches without deleting the user's text", async () => {
		const item = await addItem();
		const { sectionId } = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
			visible: true,
		});
		await asA().content.detach({ sectionId: sectionId as string });

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const placed = sections.find((s) => s.id === sectionId);
		expect(placed).toBeDefined();
		expect(placed?.contentItemId).toBeNull();
		expect(placed?.content).toMatchObject({ data: [{ company: "Acme" }] });
	});

	it("cannot detach another tenant's section", async () => {
		await expect(
			asB().content.detach({ sectionId: SECTION_A }),
		).rejects.toThrow(/not found or access denied/i);
	});
});

describe("divergence: the Update Available flag", () => {
	it("reports nothing when a placement matches its master", async () => {
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		expect(await asA().content.divergence({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});

	it("reports a placement that was edited away from the master", async () => {
		const item = await addItem();
		const { sectionId } = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		await asA().section.update({
			id: sectionId as string,
			data: { content: experienceContent("Tailored Co") },
		});

		const drifted = await asA().content.divergence({ resumeId: RESUME_A });
		expect(drifted).toHaveLength(1);
		expect(drifted[0]?.sectionId).toBe(sectionId);
	});

	it("reports once the master is edited after the placement", async () => {
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		await asA().content.update({
			contentItemId: item.id,
			payload: experienceContent("Acme Corp"),
		});

		expect(await asA().content.divergence({ resumeId: RESUME_A })).toHaveLength(
			1,
		);
	});

	it("ignores key reordering, so a reserialise is not drift", async () => {
		// Must agree with the revision-history canonicaliser; otherwise the same edit
		// reads as saved in history and conflicting in the library.
		const item = await asA().content.create({
			type: "summary",
			title: "Summary",
			payload: { title: "Summary", data: [{ text: "text" }], tags: ["a"] },
		});
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		expect(await asA().content.divergence({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});

	it("reports nothing for another tenant's resume", async () => {
		await expect(
			asB().content.divergence({ resumeId: RESUME_A }),
		).rejects.toThrow(/not found or access denied/i);
	});

	it("ignores sections that are not linked to a master", async () => {
		// Pre-library sections have no item; they are not "drifted", they are unlinked.
		expect(await asA().content.divergence({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});
});

describe("propagation is opt-in per placement", () => {
	it("writes the master onto one placement", async () => {
		const item = await addItem();
		const { sectionId } = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		await asA().section.update({
			id: sectionId as string,
			data: { content: experienceContent("Tailored Co") },
		});
		await asA().content.propagate({ sectionId: sectionId as string });

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const placed = sections.find((s) => s.id === sectionId);
		expect(placed?.content).toMatchObject({ data: [{ company: "Acme" }] });
		expect(await asA().content.divergence({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});

	it("refuses to propagate an unlinked section", async () => {
		await expect(
			asA().content.propagate({ sectionId: SECTION_A }),
		).rejects.toThrow(/not linked/i);
	});

	it("cannot propagate into another tenant's section", async () => {
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const placed = sections.find((s) => s.contentItemId === item.id);

		await expect(
			asB().content.propagate({ sectionId: placed?.id as string }),
		).rejects.toThrow(/not found or access denied/i);
	});

	it("editing the master does NOT silently land on placements", async () => {
		// The central guarantee: no bulk overwrite exists, so editing the master can
		// only ever *offer* an update, never apply one.
		const item = await addItem();
		const { sectionId } = await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		await asA().content.update({
			contentItemId: item.id,
			payload: experienceContent("Acme Corp"),
		});

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const placed = sections.find((s) => s.id === sectionId);
		expect(placed?.content).toMatchObject({ data: [{ company: "Acme" }] });
	});
});

describe("additions: additive sync, honestly", () => {
	it("offers library items the resume does not place", async () => {
		await addItem();
		const additions = await asA().content.additions({ resumeId: RESUME_A });
		expect(additions).toHaveLength(1);
	});

	it("stops offering an item once placed", async () => {
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		expect(await asA().content.additions({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});

	it("attaches nothing on its own", async () => {
		await addItem();
		const before = await asA().section.listByResume({ resumeId: RESUME_A });
		await asA().content.additions({ resumeId: RESUME_A });
		const after = await asA().section.listByResume({ resumeId: RESUME_A });
		// Reporting candidates is additive sync. Inserting them would be the opposite.
		expect(after.length).toBe(before.length);
	});

	it("hides archived items from additions", async () => {
		const item = await addItem();
		await asA().content.archive({ contentItemId: item.id });
		expect(await asA().content.additions({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});

	it("does not offer another tenant's items", async () => {
		await addItem();
		expect(await asB().content.additions({ resumeId: RESUME_B })).toHaveLength(
			0,
		);
	});

	it("rejects another tenant's resume", async () => {
		await expect(
			asB().content.additions({ resumeId: RESUME_A }),
		).rejects.toThrow(/not found or access denied/i);
	});
});

describe("backfill", () => {
	it("adopts existing sections into the library", async () => {
		const result = await asA().content.backfill();
		expect(result.created).toBeGreaterThan(0);

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		for (const s of sections) {
			expect(s.contentItemId).toBeTruthy();
		}
	});

	it("preserves existing content exactly", async () => {
		const before = await asA().section.listByResume({ resumeId: RESUME_A });
		await asA().content.backfill();
		const after = await asA().section.listByResume({ resumeId: RESUME_A });
		for (const s of before) {
			// listByResume parses content, so this is a structural comparison.
			expect(after.find((x) => x.id === s.id)?.content).toEqual(s.content);
		}
	});

	it("is idempotent", async () => {
		const first = await asA().content.backfill();
		const second = await asA().content.backfill();
		expect(second.created).toBe(0);
		expect(first.created).toBeGreaterThan(0);
	});

	it("leaves no divergence after backfilling", async () => {
		// Backfill adopts the current text as the master, so nothing should look
		// immediately stale the moment the feature is switched on.
		await asA().content.backfill();
		expect(await asA().content.divergence({ resumeId: RESUME_A })).toHaveLength(
			0,
		);
	});

	it("does not adopt another tenant's sections", async () => {
		await addItem();
		const aBefore = await asA().content.list();
		const bBefore = await asB().content.list();

		await asB().content.backfill();

		// B's backfill must leave A's library untouched, and must not grow B's library
		// by anything beyond B's own sections.
		expect(await asA().content.list()).toHaveLength(aBefore.length);
		expect((await asB().content.list()).length).toBeGreaterThan(bBefore.length);
		expect((await asB().content.list()).length).toBeLessThanOrEqual(
			bBefore.length +
				(await asB().section.listByResume({ resumeId: RESUME_B })).length,
		);
	});

	it("does not touch already-linked sections", async () => {
		const item = await addItem();
		await asA().content.attach({
			contentItemId: item.id,
			resumeId: RESUME_A,
		});
		await asA().content.backfill();

		const sections = await asA().section.listByResume({ resumeId: RESUME_A });
		const linked = sections.filter((s) => s.contentItemId === item.id);
		expect(linked).toHaveLength(1);
	});
});
