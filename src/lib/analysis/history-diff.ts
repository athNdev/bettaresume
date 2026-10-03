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
 * The snapshot stores section `content` as a JSON *string* (it is a TEXT column), while
 * the live resume carries it as an already-parsed object. Every read therefore goes
 * through `parseSnapshot`, which tolerates both rather than assuming either.
 */

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

interface SnapshotSection {
	id?: unknown;
	type?: unknown;
	visible?: unknown;
	content?: unknown;
}

export interface ParsedSnapshot {
	name: string | null;
	template: string | null;
	domain: string | null;
	sections: SnapshotSection[];
}

/** Accepts either a JSON string or an already-parsed object, and never throws. */
export function parseSnapshot(input: unknown): ParsedSnapshot {
	const raw: Record<string, unknown> =
		typeof input === "string"
			? safeParse(input)
			: ((input ?? {}) as Record<string, unknown>);

	const sections = Array.isArray(raw.sections) ? raw.sections : [];

	return {
		name: typeof raw.name === "string" ? raw.name : null,
		template: typeof raw.template === "string" ? raw.template : null,
		domain: typeof raw.domain === "string" ? raw.domain : null,
		sections: sections.filter(
			(s): s is SnapshotSection => !!s && typeof s === "object",
		),
	};
}

function safeParse(json: string): Record<string, unknown> {
	try {
		const parsed = JSON.parse(json);
		return parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		// A corrupt snapshot must degrade to "nothing to diff", never crash the editor.
		return {};
	}
}

/** Section content arrives as a JSON string from the snapshot and as an object live. */
function toContentObject(content: unknown): unknown {
	if (typeof content === "string") return safeParse(content);
	return content;
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
 * Canonical JSON, so a key-order difference is not reported as an edit.
 *
 * This MUST agree with the canonicaliser behind the server-side content hash. If the
 * server hashes canonically and the UI compared raw `JSON.stringify`, an autosave that
 * merely reordered keys would be deduped as "unchanged" on write yet displayed as
 * "Edited" in the history — the two halves of the same feature disagreeing about
 * whether anything changed.
 */
function canonical(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonical);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.filter(([, v]) => v !== undefined)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([k, v]) => [k, canonical(v)]),
		);
	}
	return value;
}

function stable(value: unknown): string {
	return JSON.stringify(canonical(value ?? null));
}

/**
 * Compare a snapshot to the live resume.
 *
 * `current` takes the shape the editor already holds, not the DB row shape, so the
 * editor can diff against state it already has instead of refetching.
 */
export function diffSnapshot(
	snapshotInput: unknown,
	current: {
		name?: string | null;
		template?: string | null;
		domain?: string | null;
		sections?: {
			id: string;
			type: string;
			visible?: boolean;
			content?: unknown;
		}[];
	},
): HistoryDiff {
	const snapshot = parseSnapshot(snapshotInput);

	const fields: FieldChange[] = (["name", "template", "domain"] as const).map(
		(key) => {
			const before = snapshot[key];
			const after = current[key] ?? null;
			const same = (before ?? null) === (after ?? null);
			return {
				kind: same ? "unchanged" : "changed",
				label: key,
				before,
				after,
			};
		},
	);

	const beforeById = new Map<string, SnapshotSection>();
	for (const s of snapshot.sections) {
		if (typeof s.id === "string") beforeById.set(s.id, s);
	}

	const afterById = new Map<
		string,
		NonNullable<typeof current.sections>[number]
	>();
	for (const s of current.sections ?? []) afterById.set(s.id, s);

	const ids = new Set([...beforeById.keys(), ...afterById.keys()]);
	// Section order in the snapshot is the order the user saw, which is the order they
	// will recognise. Sorting by id instead would scramble the experience.
	const ordered = [...ids].sort((a, b) => {
		const ai = snapshot.sections.findIndex((s) => s.id === a);
		const bi = snapshot.sections.findIndex((s) => s.id === b);
		return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
	});

	const sections: SectionChange[] = ordered.map((id) => {
		const before = beforeById.get(id);
		const after = afterById.get(id);

		if (before && !after) {
			return {
				kind: "removed",
				id,
				type: String(before.type ?? ""),
				title: titleFor(before),
				before: summariseContent(before.content),
				after: null,
			};
		}
		if (!before && after) {
			return {
				kind: "added",
				id,
				type: after.type,
				title: titleFor(after),
				before: null,
				after: summariseContent(after.content),
			};
		}

		// Both sides must be parsed first: the snapshot carries `content` as a JSON
		// string (TEXT column) while the live resume carries it as an object, so
		// comparing them raw reports every section as edited.
		const sameContent =
			stable(toContentObject(before?.content)) ===
			stable(toContentObject(after?.content));
		const sameVisible = (before?.visible ?? true) === (after?.visible ?? true);
		const same = !!before && !!after && sameContent && sameVisible;

		return {
			kind: same ? "unchanged" : "changed",
			id,
			type: after?.type ?? String(before?.type ?? ""),
			title: titleFor(after ?? before ?? {}),
			before: summariseContent(before?.content),
			after: summariseContent(after?.content),
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
