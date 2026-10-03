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

/** A section as it appears on one side of the comparison. */
type SideSection = {
	id: unknown;
	type?: unknown;
	visible?: unknown;
	content?: unknown;
	order?: unknown;
	contentItemId?: unknown;
};

/** The projection of one side, plus what the caller actually supplied. */
interface Side {
	projection: RevisionContentProjection;
	byId: Map<string, RevisionContentProjection["sections"][number]>;
	hasMetadata: boolean;
	/** Fields the live side did not supply, so a partial caller cannot fake a difference. */
	provided: Map<string, { order: boolean; contentItemId: boolean }>;
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

function buildSide(input: {
	metadata?: unknown;
	sections?: readonly SideSection[] | null;
}): Side {
	const projection = projectRevisionContent(input);
	const byId = new Map<string, RevisionContentProjection["sections"][number]>();
	for (const section of projection.sections) {
		if (section.id !== null) byId.set(section.id, section);
	}
	const provided = new Map<
		string,
		{ order: boolean; contentItemId: boolean }
	>();
	for (const raw of input.sections ?? []) {
		if (typeof raw.id !== "string") continue;
		provided.set(raw.id, {
			order: raw.order !== undefined,
			contentItemId: raw.contentItemId !== undefined,
		});
	}
	return {
		projection,
		byId,
		provided,
		hasMetadata: input.metadata !== undefined,
	};
}

/**
 * Compare a snapshot to the live resume.
 *
 * `current` takes the shape the editor already holds, not the DB row shape, so the editor
 * can diff against state it already has instead of refetching.
 *
 * ## Partial live shape
 *
 * `metadata`, and each section's `order` and `contentItemId`, are compared **only when the
 * caller supplies them**. A caller that omits a field has not asserted it is unchanged —
 * it simply has not looked — and treating "absent" as "different" would pin the Restore
 * button on permanently for every caller that passes a reduced shape. A caller that wants
 * full coverage (and the invariant that `isIdentical` implies the server dedupes) must
 * pass all of them; the history panel does not yet.
 */
export function diffSnapshot(
	snapshotInput: unknown,
	current: {
		name?: string | null;
		template?: string | null;
		domain?: string | null;
		metadata?: unknown;
		sections?: readonly SideSection[] | null;
	},
): HistoryDiff {
	const snapshot = parseSnapshot(snapshotInput);
	const before = buildSide({ sections: snapshot.sections });
	const after = buildSide({
		metadata: current.metadata,
		sections: current.sections ?? [],
	});

	// `metadata` is where the user's name, email and phone live, so a diff that ignored it
	// reported "no differences" for the edit they were most likely to have made.
	const metadataSame =
		!after.hasMetadata ||
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

	if (after.hasMetadata) {
		fields.push({
			kind: metadataSame ? "unchanged" : "changed",
			label: "metadata",
			before: summariseContent(snapshot.metadata) || null,
			after: summariseContent(current.metadata) || null,
		});
	}

	const snapshotIds = snapshot.sections
		.map((s) => s.id)
		.filter((id): id is string => id !== null);
	const liveIds = (current.sections ?? [])
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

		// Fall back to the snapshot for any field the live side did not supply, so a
		// partial `current` compares like-for-like instead of reporting a difference the
		// caller never claimed. Note the fallback keys off the RAW input, not the
		// projection: `contentItemId: null` is a real value meaning "detached from the
		// library", and must not be mistaken for "not provided".
		const supplied = after.provided.get(id);
		const aligned: RevisionContentProjection["sections"][number] = {
			id: sectionAfter?.id ?? sectionBefore?.id ?? null,
			type: sectionAfter?.type ?? sectionBefore?.type ?? null,
			order:
				supplied?.order === true
					? (sectionAfter?.order ?? null)
					: (sectionBefore?.order ?? null),
			visible: sectionAfter?.visible ?? sectionBefore?.visible ?? true,
			content: sectionAfter?.content,
			contentItemId:
				supplied?.contentItemId === true
					? (sectionAfter?.contentItemId ?? null)
					: (sectionBefore?.contentItemId ?? null),
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
