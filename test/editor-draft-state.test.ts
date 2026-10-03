import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import {
	draftChangeCount,
	isDraftDirty,
} from "../src/features/resume-editor/lib/draft-state";
import type {
	ResumeSection,
	ResumeWithSections,
} from "../src/features/resume-editor/types";
import { shouldFlushOnUnmount } from "../src/hooks/use-auto-save";

/**
 * The draft/saved split, and the two bugs it caused.
 *
 * The editor holds two documents at once: a draft the preview renders and the forms
 * write into, and the saved resume the server returned. That is what makes the
 * preview live, but it means "is my work saved?" has to be computed rather than
 * assumed, and until this module existed nothing computed it.
 */

/** Order-independent by construction, so the builder controls key order explicitly. */
function section(
	id: string,
	order: number,
	over: Partial<ResumeSection> = {},
): ResumeSection {
	return {
		id,
		resumeId: "r1",
		type: "experience",
		order,
		visible: true,
		content: { title: "Work Experience", data: [{ company: "Acme" }] },
		contentItemId: null,
		...over,
	} as ResumeSection;
}

function resume(over: Partial<ResumeWithSections> = {}): ResumeWithSections {
	return {
		id: "r1",
		name: "Test",
		template: "minimal",
		domain: null,
		sections: [section("s1", 0), section("s2", 1)],
		metadata: {
			personalInfo: { fullName: "Avery Chen", email: "a@b.c" },
			settings: { margins: { top: 1 } },
		},
		isArchived: false,
		tags: [],
		variationType: "base",
		baseResumeId: null,
		...over,
	} as unknown as ResumeWithSections;
}

describe("a draft identical to the saved resume is clean", () => {
	it("is not dirty", () => {
		expect(isDraftDirty(resume(), resume())).toBe(false);
	});

	it("is not dirty when it is a deep clone", () => {
		expect(isDraftDirty(resume(), resume())).toBe(false);
	});

	it("is not dirty before the query resolves", () => {
		// `draftResume` is null until the resume query returns. "Absent" is not "dirty",
		// or the indicator would claim unsaved work during loading.
		expect(isDraftDirty(null, resume())).toBe(false);
		expect(isDraftDirty(resume(), null)).toBe(false);
		expect(isDraftDirty(null, null)).toBe(false);
	});

	it("ignores updatedAt, which no save writes", () => {
		// The draft bumps `updatedAt` on every optimistic edit. Treating that as a change
		// would leave the indicator permanently on "unsaved" with nothing to save.
		const saved = resume();
		const draft = resume({
			sections: [section("s1", 0), section("s2", 1)],
		});
		(saved.sections[0] as ResumeSection).updatedAt = new Date(0).toISOString();
		(draft.sections[0] as ResumeSection).updatedAt = new Date().toISOString();
		expect(isDraftDirty(draft, saved)).toBe(false);
	});

	it("ignores key insertion order", () => {
		// The draft is built by spreading objects in a different order than the server
		// returns them; a naive stringify would report a difference every render.
		const saved = resume();
		const draft = resume();
		draft.metadata = {
			settings: { margins: { top: 1 } },
			personalInfo: { fullName: "Avery Chen", email: "a@b.c" },
		} as ResumeWithSections["metadata"];
		expect(isDraftDirty(draft, saved)).toBe(false);
	});
});

describe("every persisted field is compared", () => {
	/*
	 * `diffSnapshot` already had this bug: it compared only `{id, type, visible,
	 * content}`, so a `metadata`-only edit -- the user's own name and email, the edit
	 * they are most likely to make -- came back clean and was unrecoverable. The same
	 * omission here would produce the same class of loss, so each field gets its own
	 * test rather than one "something changed" assertion.
	 */
	it("detects a metadata-only change", () => {
		const draft = resume();
		draft.metadata = {
			...draft.metadata,
			personalInfo: { fullName: "Avery Chen", email: "new@b.c" },
		} as ResumeWithSections["metadata"];
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects a settings-only change", () => {
		const draft = resume();
		draft.metadata = {
			...draft.metadata,
			settings: { margins: { top: 2 } },
		} as ResumeWithSections["metadata"];
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects a section rename", () => {
		const draft = resume({
			sections: [
				section("s1", 0, { content: { title: "Experience", data: [] } }),
				section("s2", 1),
			],
		});
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects a reorder", () => {
		// Order is content: it decides what the parser reads first.
		const draft = resume({
			sections: [section("s2", 0), section("s1", 1)],
		});
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects a visibility toggle", () => {
		const draft = resume({
			sections: [section("s1", 0, { visible: false }), section("s2", 1)],
		});
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects an added section", () => {
		const draft = resume({
			sections: [section("s1", 0), section("s2", 1), section("s3", 2)],
		});
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects a removed section", () => {
		const draft = resume({ sections: [section("s1", 0)] });
		expect(isDraftDirty(draft, resume())).toBe(true);
	});

	it("detects a template change", () => {
		expect(isDraftDirty(resume({ template: "postgrad" }), resume())).toBe(true);
	});

	it("detects a rename", () => {
		expect(isDraftDirty(resume({ name: "New name" }), resume())).toBe(true);
	});

	it("treats an absent and a null contentItemId as the same thing", () => {
		// `contentItemId` is optional on ResumeSection. A save writes `null` for
		// "not linked", so an absent key and an explicit null must not read as a change.
		const saved = resume();
		const draft = resume({
			sections: [
				section("s1", 0),
				section("s2", 1, { contentItemId: undefined as never }),
			],
		});
		expect(isDraftDirty(draft, saved)).toBe(false);
	});
});

describe("the change count describes writes, not quality", () => {
	it("is zero when clean", () => {
		expect(draftChangeCount(resume(), resume())).toBe(0);
	});

	it("counts one for a single changed area", () => {
		expect(draftChangeCount(resume({ template: "postgrad" }), resume())).toBe(
			1,
		);
	});

	it("counts metadata and sections separately", () => {
		const draft = resume({
			template: "postgrad",
			sections: [section("s2", 0), section("s1", 1)],
		});
		draft.metadata = {
			...draft.metadata,
			settings: { margins: { top: 9 } },
		} as ResumeWithSections["metadata"];
		expect(draftChangeCount(draft, resume())).toBe(3);
	});

	it("never exceeds the number of areas it compares", () => {
		// Five areas: name, template, domain, metadata, sections. If this ever reports a
		// sixth thing it is counting something a save does not write.
		const draft = resume({
			name: "x",
			template: "postgrad",
			domain: "d",
			sections: [],
		});
		draft.metadata = {
			...draft.metadata,
			settings: { margins: { top: 3 } },
		} as unknown as ResumeWithSections["metadata"];
		expect(draftChangeCount(draft, resume())).toBeLessThanOrEqual(5);
	});
});

describe("unmount flushes a pending save instead of dropping it", () => {
	/*
	 * The editor unmounts a section's form the moment another section is selected --
	 * the most common action in the app. The cleanup used to clear the debounce timer
	 * and return, so "type, click another section, come back" silently discarded the
	 * edit while the preview still showed it, because `onLocalUpdate` had already put
	 * it in the draft.
	 */
	const base = {
		enabled: true,
		hasPendingTimer: true,
		localJson: '{"a":1}',
		savedJson: '{"a":0}',
	};

	it("flushes when there is unsaved work pending", () => {
		expect(shouldFlushOnUnmount(base)).toBe(true);
	});

	it("does not flush when nothing is pending", () => {
		expect(shouldFlushOnUnmount({ ...base, hasPendingTimer: false })).toBe(
			false,
		);
	});

	it("does not flush when the local data already matches the saved data", () => {
		// Guards StrictMode's mount/unmount/mount, and avoids a pointless request.
		expect(shouldFlushOnUnmount({ ...base, localJson: base.savedJson })).toBe(
			false,
		);
	});

	it("does not flush when auto-save is disabled", () => {
		// A disabled hook must not write on the way out.
		expect(shouldFlushOnUnmount({ ...base, enabled: false })).toBe(false);
	});

	it("never flushes with two of the three conditions false", () => {
		for (const override of [
			{ hasPendingTimer: false },
			{ enabled: false },
			{ localJson: base.savedJson },
		]) {
			expect(shouldFlushOnUnmount({ ...base, ...override })).toBe(false);
		}
	});
});

describe("the unmount cleanup is wired to the predicate", () => {
	/*
	 * Mutation-checked and initially missed. The predicate was unit-tested and the
	 * wiring was asserted in a *different* file, so deleting the call from the cleanup
	 * failed nothing: the predicate kept working, it was simply never consulted. The
	 * two halves belong in the same file, because "the rule is right" is worthless if
	 * the rule is not applied.
	 */
	const autoSave = readFileSync("src/hooks/use-auto-save.ts", "utf8");

	it("calls the predicate from the unmount cleanup", () => {
		expect(autoSave).toMatch(/shouldFlushOnUnmount\(\{/);
		expect(autoSave).toMatch(
			/isMountedRef\.current = false;[\s\S]*?shouldFlushOnUnmount\(\{/,
		);
	});

	it("performs the save when the predicate says to", () => {
		expect(autoSave).toMatch(/if \(flush\) void onSaveRef\.current\?\.\(/);
	});

	it("does not simply clear the pending timer and return", () => {
		// The original bug in its original shape: unmount cancelled the debounce, so the
		// edit died with the component.
		const cleanup = autoSave.slice(
			autoSave.indexOf("isMountedRef.current = false;"),
		);
		expect(cleanup.slice(0, 400)).not.toMatch(
			/clearTimeout\(debounceTimerRef\.current\);\s*}\s*;/,
		);
	});
});
