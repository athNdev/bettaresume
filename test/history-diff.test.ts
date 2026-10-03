import { describe, expect, it } from "vitest";
import {
	describeChange,
	diffSnapshot,
	parseSnapshot,
	summariseContent,
} from "@/lib/analysis/history-diff";

/**
 * The diff is what the user reads before deciding to discard their current work, so a
 * false "unchanged" or a missed change is worse than no history at all: it makes them
 * restore, or not restore, on a lie.
 */

const snapshotOf = (sections: unknown[], extra: Record<string, unknown> = {}) =>
	JSON.stringify({
		name: "My Resume",
		template: "minimal",
		domain: null,
		metadata: null,
		// Normalise real section objects, but pass junk through untouched: one test
		// feeds this helper nulls and strings to prove parseSnapshot survives them.
		sections: sections.map((sec, i) =>
			sec && typeof sec === "object"
				? { visible: true, order: i, contentItemId: null, ...sec }
				: sec,
		),
		...extra,
	});

const live = (
	sections: {
		id: string;
		type: string;
		content?: unknown;
		visible?: boolean;
		// Required by the diff, and that is the point: `order` and `contentItemId` were
		// both invisible to it while the server hashed them, which is how a reorder or
		// a library detach could read as "identical".
		order?: number;
		contentItemId?: string | null;
	}[],
	extra: Record<string, unknown> = {},
) => ({
	name: "My Resume",
	template: "minimal",
	domain: null,
	// Required by the diff: metadata holds personalInfo, which is where the user's
	// real name and email live, so omitting it is exactly what disabled Restore before.
	metadata: null,
	sections: sections.map((s, i) => ({
		id: s.id,
		type: s.type,
		order: s.order ?? i,
		visible: s.visible ?? true,
		content: s.content ?? null,
		contentItemId: s.contentItemId ?? null,
	})),
	...extra,
});

describe("parseSnapshot", () => {
	it("reads a JSON string, which is how the column stores it", () => {
		const parsed = parseSnapshot(snapshotOf([{ id: "a", type: "summary" }]));
		expect(parsed.sections).toHaveLength(1);
	});

	it("accepts an already-parsed object", () => {
		const parsed = parseSnapshot({ name: "X", sections: [{ id: "a" }] });
		expect(parsed.name).toBe("X");
	});

	it("degrades to empty on corrupt JSON rather than crashing the editor", () => {
		// A corrupt snapshot must not take the editor down with it.
		expect(() => parseSnapshot("{not json")).not.toThrow();
		expect(parseSnapshot("{not json").sections).toEqual([]);
	});

	it("survives null, undefined, and non-objects", () => {
		for (const input of [null, undefined, 42, "null"]) {
			expect(() => parseSnapshot(input)).not.toThrow();
		}
	});

	it("drops non-object entries from the sections array", () => {
		const parsed = parseSnapshot(snapshotOf([null, "x", { id: "a" }]));
		expect(parsed.sections).toHaveLength(1);
	});
});

describe("summariseContent", () => {
	it("parses JSON-string content", () => {
		expect(
			summariseContent(JSON.stringify({ data: [{ company: "Acme" }] })),
		).toContain("Acme");
	});

	it("summarises an object directly", () => {
		expect(summariseContent({ data: [{ company: "Acme" }] })).toContain("Acme");
	});

	it("works for a section type it has never seen", () => {
		// Deliberately generic: a fifteenth section type should not need an edit here.
		const exotic = { brandNewThing: { nested: ["alpha", "beta"] } };
		const out = summariseContent(exotic);
		expect(out).toContain("alpha");
		expect(out).toContain("beta");
	});

	it("returns an empty string for empty content", () => {
		expect(summariseContent({})).toBe("");
		expect(summariseContent(null)).toBe("");
	});

	it("drops whitespace-only strings rather than emitting a line of separators", () => {
		expect(summariseContent({ a: "   ", b: "x" })).toBe("x");
	});

	it("terminates on deeply nested content instead of hanging", () => {
		let deep: unknown = "leaf";
		for (let i = 0; i < 5000; i++) deep = { next: deep };
		expect(() => summariseContent(deep)).not.toThrow();
	});
});

describe("diffSnapshot", () => {
	const snapSections = [
		{
			id: "s1",
			type: "summary",
			content: JSON.stringify({ title: "Summary", data: "Old text" }),
		},
		{
			id: "s2",
			type: "experience",
			content: JSON.stringify({
				title: "Experience",
				data: [{ company: "Acme" }],
			}),
		},
	];

	it("reports no change when nothing moved", () => {
		const diff = diffSnapshot(
			snapshotOf(snapSections),
			live([
				{
					id: "s1",
					type: "summary",
					content: { title: "Summary", data: "Old text" },
				},
				{
					id: "s2",
					type: "experience",
					content: { title: "Experience", data: [{ company: "Acme" }] },
				},
			]),
		);
		expect(diff.isIdentical).toBe(true);
		expect(diff.changedCount).toBe(0);
	});

	it("detects an edited section", () => {
		const diff = diffSnapshot(
			snapshotOf(snapSections),
			live([
				{
					id: "s1",
					type: "summary",
					content: { title: "Summary", data: "New text" },
				},
				{
					id: "s2",
					type: "experience",
					content: { title: "Experience", data: [{ company: "Acme" }] },
				},
			]),
		);
		const summary = diff.sections.find((s) => s.id === "s1");
		expect(summary?.kind).toBe("changed");
		expect(summary?.before).toContain("Old text");
		expect(summary?.after).toContain("New text");
		expect(diff.isIdentical).toBe(false);
	});

	it("detects a section added since the snapshot", () => {
		const diff = diffSnapshot(
			snapshotOf([snapSections[0]]),
			live([
				{
					id: "s1",
					type: "summary",
					content: { title: "Summary", data: "Old text" },
				},
				{
					id: "s2",
					type: "experience",
					content: { title: "Experience", data: [] },
				},
			]),
		);
		expect(diff.sections.find((s) => s.id === "s2")?.kind).toBe("added");
	});

	it("detects a section removed since the snapshot", () => {
		const diff = diffSnapshot(
			snapshotOf(snapSections),
			live([
				{
					id: "s1",
					type: "summary",
					content: { title: "Summary", data: "Old text" },
				},
			]),
		);
		expect(diff.sections.find((s) => s.id === "s2")?.kind).toBe("removed");
	});

	it("treats a visibility toggle as a change", () => {
		const diff = diffSnapshot(
			snapshotOf([{ ...snapSections[0], visible: true }]),
			live([
				{
					id: "s1",
					type: "summary",
					visible: false,
					content: { title: "Summary", data: "Old text" },
				},
			]),
		);
		// Hiding a section changes the rendered resume, so it must not read as identical.
		expect(diff.isIdentical).toBe(false);
	});

	it("detects a renamed resume", () => {
		const diff = diffSnapshot(
			snapshotOf(snapSections),
			live([], { name: "Renamed" }),
		);
		const name = diff.fields.find((f) => f.label === "name");
		expect(name?.kind).toBe("changed");
		expect(name?.before).toBe("My Resume");
		expect(name?.after).toBe("Renamed");
	});

	it("detects a template switch", () => {
		const diff = diffSnapshot(
			snapshotOf(snapSections),
			live([], { template: "postgrad" }),
		);
		expect(diff.fields.find((f) => f.label === "template")?.kind).toBe(
			"changed",
		);
	});

	it("counts changes across fields and sections together", () => {
		const diff = diffSnapshot(
			snapshotOf(snapSections),
			live(
				[
					{
						id: "s1",
						type: "summary",
						content: { title: "Summary", data: "New" },
					},
				],
				{
					name: "Renamed",
				},
			),
		);
		// name + removed experience + edited summary
		expect(diff.changedCount).toBe(3);
	});

	it("does not report a key-order difference as an edit", () => {
		// Autosaves re-serialise objects; a false "changed" on every snapshot would
		// make the history noise.
		const diff = diffSnapshot(
			snapshotOf([{ id: "s1", type: "summary", content: { a: "1", b: "2" } }]),
			live([
				{
					id: "s1",
					type: "summary",
					content: JSON.stringify({ b: "2", a: "1" }),
				},
			]),
		);
		expect(diff.isIdentical).toBe(true);
	});

	it("lists sections in snapshot order, since that is the order the user recognises", () => {
		const diff = diffSnapshot(
			snapshotOf([
				{ id: "z", type: "skills" },
				{ id: "a", type: "summary" },
			]),
			live([]),
		);
		expect(diff.sections.map((s) => s.id)).toEqual(["z", "a"]);
	});

	it("falls back to the type as a title when content has none", () => {
		const diff = diffSnapshot(
			snapshotOf([{ id: "s1", type: "awards" }]),
			live([]),
		);
		expect(diff.sections[0]?.title).toBe("awards");
	});

	it("prefers the content title when present", () => {
		const diff = diffSnapshot(
			snapshotOf([
				{ id: "s1", type: "awards", content: { title: "Awards & Honors" } },
			]),
			live([]),
		);
		expect(diff.sections[0]?.title).toBe("Awards & Honors");
	});

	it("does not crash on a snapshot with no sections key", () => {
		expect(() =>
			diffSnapshot(JSON.stringify({ name: "X" }), live([])),
		).not.toThrow();
	});

	it("does not crash when the live resume has no sections array", () => {
		const diff = diffSnapshot(snapshotOf(snapSections), {
			name: "My Resume",
			template: "minimal",
			domain: null,
			metadata: null,
			sections: [],
		});
		expect(diff.sections.every((s) => s.kind === "removed")).toBe(true);
	});
});

describe("describeChange", () => {
	it("explains each kind in the user's terms, not the schema's", () => {
		const base = {
			id: "s",
			type: "summary",
			title: "Summary",
			before: null,
			after: null,
		};
		expect(describeChange({ ...base, kind: "added" })).toBe(
			"Not in this version",
		);
		expect(describeChange({ ...base, kind: "removed" })).toBe(
			"Removed since this version",
		);
		expect(describeChange({ ...base, kind: "changed" })).toBe(
			"Edited since this version",
		);
		expect(describeChange({ ...base, kind: "unchanged" })).toBe("Unchanged");
	});
});
