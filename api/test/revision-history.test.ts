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
 * Revision history is addressed by `resumeId` and `revisionId` — both user-supplied.
 * The property that matters is therefore cross-tenant isolation: user B must not be
 * able to read or restore user A's history by guessing an id.
 *
 * The log is also APPEND-ONLY, and that is enforced by what does not exist rather than
 * by what does: there is no `revision.update` and no `revision.delete`. A test asserts
 * that, because a future "let users delete a bad snapshot" convenience is exactly the
 * change that quietly destroys the only property worth having.
 */

let h: TestHarness;

beforeEach(() => {
	h = createHarness();
});

const asA = () => h.callerAs(USER_A);
const asB = () => h.callerAs(USER_B);

describe("creating a revision", () => {
	it("records a snapshot for a resume the caller owns", async () => {
		const result = await asA().revision.create({
			resumeId: RESUME_A,
			label: "First pass",
		});

		expect(result.created).toBe(true);
		expect(result.revision?.seq).toBe(1);
		expect(result.revision?.label).toBe("First pass");
	});

	it("numbers revisions monotonically per resume", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		// The content must actually change: an identical snapshot is deduped, so
		// creating twice with no edit would store one row and prove nothing.
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Second") },
		});
		await asA().revision.create({ resumeId: RESUME_A, label: "Second" });

		const list = await asA().revision.list({ resumeId: RESUME_A });
		expect([...list].sort((x, y) => x.seq - y.seq).map((r) => r.seq)).toEqual([
			1, 2,
		]);
	});

	it("numbers per resume, not globally", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Changed") },
		});
		await asA().revision.create({ resumeId: RESUME_A });
		expect((await asA().revision.list({ resumeId: RESUME_A })).length).toBe(2);

		// A different resume starts its own sequence, which is what makes `seq`
		// usable as a total order within a resume.
		const other = await asB().revision.create({ resumeId: RESUME_B });
		expect(other.revision?.seq).toBe(1);
	});

	it("dedupes an identical snapshot instead of appending a duplicate row", async () => {
		// An autosave firing with no real change would otherwise append a row every few
		// seconds and make the history useless.
		const first = await asA().revision.create({ resumeId: RESUME_A });
		const second = await asA().revision.create({ resumeId: RESUME_A });

		expect(first.created).toBe(true);
		expect(second.created).toBe(false);
		expect((await asA().revision.count({ resumeId: RESUME_A })).count).toBe(1);
	});

	it("records again once the content actually changes", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("New Company") },
		});
		const third = await asA().revision.create({ resumeId: RESUME_A });

		expect(third.created).toBe(true);
		expect((await asA().revision.count({ resumeId: RESUME_A })).count).toBe(2);
	});

	it("defaults the label rather than storing null", async () => {
		const r = await asA().revision.create({ resumeId: RESUME_A });
		expect(r.revision?.label).toBe("Autosave");
	});

	it("rejects a resume the caller does not own", async () => {
		await expect(asB().revision.create({ resumeId: RESUME_A })).rejects.toThrow(
			/not found or access denied/i,
		);
	});
});

describe("cross-tenant isolation", () => {
	it("cannot list another tenant's history", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		await expect(asB().revision.list({ resumeId: RESUME_A })).rejects.toThrow(
			/not found or access denied/i,
		);
	});

	it("cannot count another tenant's history", async () => {
		await expect(asB().revision.count({ resumeId: RESUME_A })).rejects.toThrow(
			/not found or access denied/i,
		);
	});

	it("cannot read a snapshot by guessing a revision id", async () => {
		const created = await asA().revision.create({ resumeId: RESUME_A });
		const id = created.revision?.id as string;

		await expect(asB().revision.get({ revisionId: id })).rejects.toThrow(
			/not found or access denied/i,
		);
	});

	it("cannot restore another tenant's revision", async () => {
		const created = await asA().revision.create({ resumeId: RESUME_A });
		const id = created.revision?.id as string;

		await expect(asB().revision.restore({ revisionId: id })).rejects.toThrow(
			/not found or access denied/i,
		);
	});

	it("gives the same error for missing and forbidden, so ids cannot be probed", async () => {
		let missing = "";
		let forbidden = "";
		try {
			await asA().revision.list({ resumeId: "resume-does-not-exist" });
		} catch (e) {
			missing = (e as Error).message;
		}
		try {
			await asB().revision.list({ resumeId: RESUME_A });
		} catch (e) {
			forbidden = (e as Error).message;
		}
		// A distinct "not found" for real-but-not-yours vs "does not exist" would let a
		// caller enumerate which resume ids are real.
		expect(missing).toBe(forbidden);
	});
});

describe("listing", () => {
	it("returns newest first", async () => {
		await asA().revision.create({ resumeId: RESUME_A, label: "one" });
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Changed") },
		});
		await asA().revision.create({ resumeId: RESUME_A, label: "two" });

		const list = await asA().revision.list({ resumeId: RESUME_A });
		expect(list[0]?.label).toBe("two");
	});

	it("omits snapshots, which a list view does not need", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		const [row] = await asA().revision.list({ resumeId: RESUME_A });
		// Shipping every snapshot to render a list would be wasteful.
		expect(row).not.toHaveProperty("snapshotJson");
	});

	it("respects the limit", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("A") },
		});
		await asA().revision.create({ resumeId: RESUME_A });
		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("B") },
		});
		await asA().revision.create({ resumeId: RESUME_A });

		const list = await asA().revision.list({ resumeId: RESUME_A, limit: 2 });
		expect(list).toHaveLength(2);
	});

	it("rejects an absurd limit rather than allowing unbounded reads", async () => {
		await expect(
			asA().revision.list({ resumeId: RESUME_A, limit: 100_000 }),
		).rejects.toThrow();
	});
});

describe("get", () => {
	it("returns a parsed snapshot", async () => {
		const created = await asA().revision.create({ resumeId: RESUME_A });
		const got = await asA().revision.get({
			revisionId: created.revision?.id as string,
		});

		expect(got.snapshot).toMatchObject({ name: expect.any(String) });
		expect(
			(got.snapshot as { sections: unknown[] }).sections.length,
		).toBeGreaterThan(0);
	});

	it("rejects an unknown revision id", async () => {
		await expect(asA().revision.get({ revisionId: "nope" })).rejects.toThrow(
			/not found/i,
		);
	});
});

describe("restore", () => {
	it("puts the resume back to the snapshot", async () => {
		const created = await asA().revision.create({ resumeId: RESUME_A });
		const revisionId = created.revision?.id as string;

		await asA().section.update({
			id: SECTION_A,
			data: { content: experienceContent("Destroyed Inc") },
		});
		await asA().revision.restore({ revisionId });

		const sections = await asA().section.listByResume({
			resumeId: RESUME_A,
		});
		const experience = sections.find((s) => s.id === SECTION_A) as {
			content: { data?: { company?: string }[] };
		};
		expect(experience.content.data?.[0]?.company).not.toBe("Destroyed Inc");
	});

	it("replaces sections rather than merging them", async () => {
		// A merge would leave the user unable to get back to where they were, and
		// reliable rollback is the entire point of the feature.
		const created = await asA().revision.create({ resumeId: RESUME_A });
		const before = await asA().section.listByResume({ resumeId: RESUME_A });

		await asA().section.create({
			resumeId: RESUME_A,
			type: "skills",
			visible: true,
			content: { title: "Skills", data: [] },
		});
		const grown = await asA().section.listByResume({ resumeId: RESUME_A });
		expect(grown.length).toBe(before.length + 1);

		await asA().revision.restore({
			revisionId: created.revision?.id as string,
		});
		const after = await asA().section.listByResume({ resumeId: RESUME_A });
		expect(after.length).toBe(before.length);
	});

	it("rejects an unknown revision id", async () => {
		await expect(
			asA().revision.restore({ revisionId: "nope" }),
		).rejects.toThrow(/not found/i);
	});
});

describe("the log is append-only", () => {
	it("exposes no update procedure", () => {
		// The property that makes the history trustworthy is that it cannot be
		// rewritten. A `revision.update` added for convenience would destroy it.
		expect("update" in asA().revision).toBe(false);
		expect("patch" in asA().revision).toBe(false);
	});

	it("exposes no delete procedure", () => {
		// History disappears only when its resume is deleted, via ON DELETE CASCADE,
		// which is required for GDPR erasure rather than a user-facing convenience.
		expect("delete" in asA().revision).toBe(false);
		expect("remove" in asA().revision).toBe(false);
	});

	it("removes history when the resume is deleted, and only then", async () => {
		await asA().revision.create({ resumeId: RESUME_A });
		expect((await asA().revision.count({ resumeId: RESUME_A })).count).toBe(1);

		await asA().resume.delete({ id: RESUME_A });

		// The resume is gone, so its history is unreachable through the API.
		await expect(asA().revision.list({ resumeId: RESUME_A })).rejects.toThrow(
			/not found or access denied/i,
		);
	});
});

describe("cross-resume safety", () => {
	it("keeps user B's history separate from user A's", async () => {
		await asA().revision.create({ resumeId: RESUME_A, label: "mine" });
		await asB().revision.create({ resumeId: RESUME_B, label: "theirs" });

		expect(await asA().revision.list({ resumeId: RESUME_A })).toHaveLength(1);
		expect(await asB().revision.list({ resumeId: RESUME_B })).toHaveLength(1);
		expect((await asA().revision.list({ resumeId: RESUME_A }))[0]?.label).toBe(
			"mine",
		);
	});
});
