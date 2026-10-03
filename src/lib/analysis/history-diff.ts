/**
 * Diffing a stored revision against the resume as it is now.
 *
 * Pure on purpose: this is the part worth testing, and it is the part that must not be
 * coupled to React or to the shape of a tRPC response.
 *
 * Two constraints carry through from the revision design:
 *  - **Nothing is auto-applied.** This produces a report. Restoring is a separate,
 *    explicitly confirmed action.
 *  - **No overall score.** "3 of 9 sections changed" is a count of things the user can
 *    look at, not a verdict on the quality of their resume.
 *
 * ## The field set is not decided here
 *
 * Every comparison below is made through the shared projection in `@bettaresume/types`
 * (`projectRevisionContent` / `canonicalRevisionSection` / `canonicalRevisionSlot`), which
 * is the same projection the Worker hashes to decide whether a save is a duplicate.
 *
 * That sharing is the whole point. When this file compared its own smaller field list —
 * name, template, domain, and per-section `content` + `visible` — it reported
 * "no differences" for edits to `metadata` (where the user's name and email actually live),
 * for a reordering, for a changed `type`, and for a changed `contentItemId`. The Restore
 * button is `disabled` when `isIdentical` is true, so all four were also unrecoverable
 * through the UI while the server held the older version.
 *
 * The snapshot stores section `content` as a JSON *string* (it is a TEXT column), while
 * the live resume carries it as an already-parsed object; the shared canonicaliser
 * normalises that so the two compare equal.
 */

import {
	canonicalRevisionSection,
	canonicalRevisionSlot,
	projectRevisionContent,
	type RevisionContentProjection,
} from "@bettaresume/types";

export type ChangeKind = "added" | "removed" | "changed" | "unchanged";

export interface FieldChange {
	kind: ChangeKind;
	label: string;
	before: string | null;
	after: string | null;
}

export interface SectionChange {
	kind: ChangeKind;
	id: string;
	type: string;
	title: string;
	before: string | null;
	after: string | null;
}

export interface HistoryDiff {
	fields: FieldChange[];
	sections: SectionChange[];
	changedCount: number;
	/** True when the resume matches the snapshot exactly, so restoring would be a no-op. */
	isIdentical: boolean;
}

/**
 * A section as it appears on the live side of the comparison.
 *
 * Every field the shared projection treats as content is REQUIRED here, `contentItemId`
 * included (nullable, but never absent). An earlier version made `metadata`, `order` and
 * `contentItemId` optional and compared them only when supplied -- an escape hatch added
 * for the history panel, which passed a reduced shape and therefore never compared them.
 * The panel reported `isIdentical` for a `metadata`-only edit (where the user's name and
 * email live), and `isIdentical` disables the Restore button, so the change was
 * unrecoverable through the UI while the server held the older version. That is the bug
 * the shared projection was written to kill, and the optional fields let it survive a fix
 * aimed squarely at it.
 *
 * Making them required is the point: a caller that omits a field is now a compile error
 * rather than a silently under-reported diff.
 */
type SideSection = {
	id: string;
	type: string;
	visible: boolean;
	content: unknown;
	order: number;
	contentItemId: string | null;
};

/** The projection of one side, indexed for lookup by section id. */
interface Side {
	projection: RevisionContentProjection;
	byId: Map<string, RevisionContentProjection["sections"][number]>;
}

export type ParsedSnapshot = RevisionContentProjection;

/**
 * Accepts either a JSON string or an already-parsed object, and never throws.
 *
 * The string form is what `snapshotJson` holds; the object form is what the editor's own
 * in-memory history (if any) would hold. A corrupt snapshot degrades to "nothing to
 * compare" rather than taking the editor down with it.
 */
export function parseSnapshot(input: unknown): ParsedSnapshot {
	const source =
		typeof input === "string"
			? safeParse(input)
			: ((input ?? {}) as Record<string, unknown>);
	return projectRevisionContent(source);
}

function safeParse(json: string): Record<string, unknown> {
	try {
		const parsed: unknown = JSON.parse(json);
		return parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		// A corrupt snapshot must degrade to "nothing to diff", never crash the editor.
		return {};
	}
}

/**
 * Flatten arbitrary section content into readable text.
 *
 * Section shapes differ across all fourteen types, and adding a fifteenth should not
 * require editing this. So it collects the string leaves and joins them, rather than
 * hard-coding a field per type — a slightly flat summary, but correct for every type
 * including ones that do not exist yet.
 */
export function summariseContent(content: unknown): string {
	const parts: string[] = [];
	collectStrings(toContentObject(content), parts, 0);
	return parts.filter((p) => p.trim().length > 0).join(" · ");
}

/** Section content arrives as a JSON string from the snapshot and as an object live. */
function toContentObject(content: unknown): unknown {
	if (typeof content !== "string") return content;
	try {
		const parsed: unknown = JSON.parse(content);
		return parsed && typeof parsed === "object" ? parsed : content;
	} catch {
		return content;
	}
}

function collectStrings(input: unknown, out: string[], depth: number): void {
	// Bounded: content is user-authored but unbounded in principle, and a pathological
	// nesting depth here would hang the render thread.
	if (depth > 6 || out.length > 60) return;

	if (typeof input === "string") {
		out.push(input);
		return;
	}
	if (Array.isArray(input)) {
		for (const item of input) collectStrings(item, out, depth + 1);
		return;
	}
	if (input && typeof input === "object") {
		for (const value of Object.values(input as Record<string, unknown>)) {
			collectStrings(value, out, depth + 1);
		}
	}
}

function titleFor(section: { type?: unknown; content?: unknown }): string {
	const content = toContentObject(section.content) as
		| Record<string, unknown>
		| undefined;
	const title = content?.title;
	if (typeof title === "string" && title.trim()) return title;
	return typeof section.type === "string" ? section.type : "section";
}

/**
 * Project one side of the comparison and index it by id.
 *
 * Takes the loose shape on purpose: the snapshot side arrives already projected, and a
 * section with no usable id is skipped rather than rejected. The strictness that matters
 * is on `diffSnapshot`'s `current` parameter, which is what a future caller controls.
 */
function buildSide(input: {
	metadata?: unknown;
	sections?: readonly unknown[] | null;
}): Side {
	const projection = projectRevisionContent(input);
	const byId = new Map<string, RevisionContentProjection["sections"][number]>();
	for (const section of projection.sections) {
		if (section.id !== null) byId.set(section.id, section);
	}
	return { projection, byId };
}

/**
 * Compare a snapshot to the live resume.
 *
 * `current` takes the shape the editor already holds, not the DB row shape, so the editor
 * can diff against state it already has instead of refetching. It must supply the FULL
 * field set: `metadata`, and each section's `order` and `contentItemId`. Those are all
 * content by the shared projection's definition, and `restore` writes all of them back --
 * so omitting one silently hides a change that restoring would actually apply.
 */
export function diffSnapshot(
	snapshotInput: unknown,
	current: {
		name?: string | null;
		template?: string | null;
		domain?: string | null;
		metadata: unknown;
		sections: readonly SideSection[];
	},
): HistoryDiff {
	const snapshot = parseSnapshot(snapshotInput);
	const before = buildSide({ sections: snapshot.sections });
	const after = buildSide({
		metadata: current.metadata,
		sections: current.sections,
	});

	// `metadata` is where the user's name, email and phone live, so a diff that ignored it
	// reported "no differences" for the edit they were most likely to have made.
	const metadataSame =
		canonicalRevisionSlot(snapshot.metadata) ===
		canonicalRevisionSlot(current.metadata);

	const fields: FieldChange[] = (["name", "template", "domain"] as const).map(
		(key) => {
			const fieldBefore = snapshot[key];
			const fieldAfter = current[key] ?? null;
			const same = (fieldBefore ?? null) === (fieldAfter ?? null);
			return {
				kind: same ? "unchanged" : "changed",
				label: key,
				before: fieldBefore,
				after: fieldAfter,
			};
		},
	);

	fields.push({
		kind: metadataSame ? "unchanged" : "changed",
		label: "metadata",
		before: summariseContent(snapshot.metadata) || null,
		after: summariseContent(current.metadata) || null,
	});

	const snapshotIds = snapshot.sections
		.map((s) => s.id)
		.filter((id): id is string => id !== null);
	const liveIds = current.sections
		.map((s) => s.id)
		.filter((id): id is string => typeof id === "string");
	// Snapshot order first, because that is the order the user recognises, then any
	// section that exists only live.
	const ordered = [
		...snapshotIds,
		...liveIds.filter((id) => !snapshotIds.includes(id)),
	];

	const sections: SectionChange[] = ordered.map((id) => {
		const sectionBefore = before.byId.get(id);
		const sectionAfter = after.byId.get(id);

		if (sectionBefore && !sectionAfter) {
			return {
				kind: "removed",
				id,
				type: sectionBefore.type ?? "section",
				title: titleFor(sectionBefore),
				before: summariseContent(sectionBefore.content),
				after: null,
			};
		}
		if (!sectionBefore && sectionAfter) {
			return {
				kind: "added",
				id,
				type: sectionAfter.type ?? "section",
				title: titleFor(sectionAfter),
				before: null,
				after: summariseContent(sectionAfter.content),
			};
		}

		// Like-for-like comparison: the shared projection puts `order: null` for a
		// section with no usable number, and the live side's is always a number. Both are
		// compared through the live value, because the caller is now required to supply
		// it -- there is no "not provided" case to fall back from.
		const aligned: RevisionContentProjection["sections"][number] = {
			id: sectionAfter?.id ?? sectionBefore?.id ?? null,
			type: sectionAfter?.type ?? sectionBefore?.type ?? null,
			order: sectionAfter?.order ?? sectionBefore?.order ?? null,
			visible: sectionAfter?.visible ?? sectionBefore?.visible ?? true,
			content: sectionAfter?.content,
			contentItemId: sectionAfter?.contentItemId ?? null,
		};

		const same =
			!!sectionBefore &&
			!!sectionAfter &&
			canonicalRevisionSection(sectionBefore) ===
				canonicalRevisionSection(aligned);

		return {
			kind: same ? "unchanged" : "changed",
			id,
			type: sectionAfter?.type ?? sectionBefore?.type ?? "section",
			title: titleFor(sectionAfter ?? sectionBefore ?? {}),
			before: summariseContent(sectionBefore?.content),
			after: summariseContent(sectionAfter?.content),
		};
	});

	const changedCount =
		fields.filter((f) => f.kind !== "unchanged").length +
		sections.filter((s) => s.kind !== "unchanged").length;

	return {
		fields,
		sections,
		changedCount,
		isIdentical: changedCount === 0,
	};
}

/** Compact one-line description of a change, for list rows. */
export function describeChange(change: SectionChange): string {
	switch (change.kind) {
		case "added":
			return "Not in this version";
		case "removed":
			return "Removed since this version";
		case "changed":
			return "Edited since this version";
		default:
			return "Unchanged";
	}
}
