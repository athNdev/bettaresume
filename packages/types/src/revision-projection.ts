/**
 * The one definition of what a resume's *content* is, for revision history.
 *
 * ## Why this file exists
 *
 * Two pieces of code have to agree, exactly, on which fields constitute "the content of
 * this resume":
 *
 *  - the Worker's `revision.create`, which hashes the current state to decide whether a
 *    save is a duplicate of the newest snapshot, and
 *  - the browser's `diffSnapshot`, which tells the user whether anything changed since a
 *    snapshot and therefore whether "Restore this version" should be offered at all.
 *
 * When those two field sets drift, the feature breaks in a way nothing catches: the
 * server stores a new revision for a change the UI reports as "no differences", or the UI
 * says "identical" for a change the server will happily restore over. So the field list
 * and the canonicalisation live here, once, and both sides import them.
 *
 * ## What is deliberately excluded
 *
 * `createdAt` and `updatedAt` (and every other bookkeeping column) are NOT content.
 * `section.update` bumps `updatedAt` on every call, including a call that changed nothing,
 * so a hash taken over the raw rows differs on every autosave and dedupe can never fire.
 *
 * `contentItemId` and section `order` and `type` ARE content: they decide what the resume
 * links to from the content library and in what order it renders, and losing them on
 * restore silently destroys the library links.
 */

/** One section, reduced to the fields that define what the user sees. */
export interface RevisionSectionProjection {
	id: string | null;
	type: string | null;
	/**
	 * `null` when the source has no usable number. A snapshot written before `order` was
	 * included reads as `null` rather than `0`, so it is never confused with a real
	 * section that happens to sit at position 0.
	 */
	order: number | null;
	/** Defaults to `true`, matching the column default and the previous diff semantics. */
	visible: boolean;
	/**
	 * Raw, unnormalised. The snapshot stores it as a JSON string because `Section.content`
	 * is a TEXT column, while live editor state carries it as an object; canonicalisation
	 * reconciles the two (see `canonicalRevisionFingerprint`).
	 */
	content: unknown;
	contentItemId: string | null;
}

export interface RevisionContentProjection {
	name: string | null;
	template: string | null;
	domain: string | null;
	/** Raw, unnormalised, for the same reason as `content`. */
	metadata: unknown;
	sections: RevisionSectionProjection[];
}

/**
 * Anything the three callers can hand over: a Drizzle row, a parsed snapshot, or the
 * editor's own state. Every field is `unknown` because the three genuinely differ.
 */
export interface RevisionContentInput {
	name?: unknown;
	template?: unknown;
	domain?: unknown;
	metadata?: unknown;
	sections?: readonly unknown[] | null;
}

function asStringOrNull(value: unknown): string | null {
	return typeof value === "string" ? value : null;
}

function asSection(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** Project any of the three shapes down to the shared field set. Never throws. */
export function projectRevisionContent(
	input: RevisionContentInput,
): RevisionContentProjection {
	const rawSections = Array.isArray(input.sections) ? input.sections : [];

	const sections: RevisionSectionProjection[] = [];
	for (const candidate of rawSections) {
		const row = asSection(candidate);
		if (!row) continue;
		sections.push({
			id: asStringOrNull(row.id),
			type: asStringOrNull(row.type),
			order: typeof row.order === "number" ? row.order : null,
			visible: typeof row.visible === "boolean" ? row.visible : true,
			content: row.content,
			contentItemId: asStringOrNull(row.contentItemId),
		});
	}

	return {
		name: asStringOrNull(input.name),
		template: asStringOrNull(input.template),
		domain: asStringOrNull(input.domain),
		metadata: input.metadata ?? null,
		sections,
	};
}

/**
 * Parse a JSON-ish slot (section content, resume metadata).
 *
 * A JSON string from the snapshot and the equivalent parsed object from live state must
 * produce the same bytes, or every section reads as edited. Anything unparseable is kept
 * as-is rather than replaced by `{}`, so a corrupt value still differs from a genuinely
 * empty one instead of silently matching it.
 */
function parseJsonSlot(value: unknown): unknown {
	if (typeof value !== "string") return value;
	try {
		const parsed: unknown = JSON.parse(value);
		// `"\"hello\""` is a valid JSON string, not a JSON document; keep the original so
		// plain text content is not mistaken for a serialised object.
		return parsed && typeof parsed === "object" ? parsed : value;
	} catch {
		return value;
	}
}

/**
 * Recursively sort object keys and drop `undefined`.
 *
 * Autosaves re-serialise objects, so property order must not read as an edit. Arrays keep
 * their order because it is meaningful (section bullets, skills, entries).
 */
function canonicalise(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalise);
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.filter(([, v]) => v !== undefined)
				.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
				.map(([k, v]) => [k, canonicalise(v)]),
		);
	}
	return value;
}

function canonicalJson(value: unknown): string {
	return JSON.stringify(canonicalise(value));
}

/**
 * Canonical JSON for a single slot value, with the JSON-string normalisation applied.
 *
 * Exported so the diff compares field by field against exactly the same rules the whole
 * fingerprint uses, rather than a second copy of them.
 */
export function canonicalRevisionSlot(value: unknown): string {
	return canonicalJson(parseJsonSlot(value));
}

/** Canonical JSON for one projected section. */
export function canonicalRevisionSection(
	section: RevisionSectionProjection,
): string {
	return canonicalJson({
		id: section.id,
		type: section.type,
		order: section.order,
		visible: section.visible,
		content: parseJsonSlot(section.content),
		contentItemId: section.contentItemId,
	});
}

/**
 * Canonical JSON for a whole resume: the exact bytes the server hashes and the exact
 * bytes the UI compares.
 *
 * Sections are sorted by `(order, id)` so the fingerprint depends on what the resume says,
 * not on the physical order rows happen to come back from the database. Without that, a
 * restore that re-inserts the same sections in a different row order would hash
 * differently and manufacture a spurious "new" revision out of a no-op.
 */
export function canonicalRevisionFingerprint(
	projection: RevisionContentProjection,
): string {
	const sections = [...projection.sections].sort((a, b) => {
		const ao = a.order ?? Number.POSITIVE_INFINITY;
		const bo = b.order ?? Number.POSITIVE_INFINITY;
		if (ao !== bo) return ao - bo;
		return (a.id ?? "").localeCompare(b.id ?? "");
	});

	return canonicalJson({
		name: projection.name,
		template: projection.template,
		domain: projection.domain,
		metadata: parseJsonSlot(projection.metadata),
		sections: sections.map((s) => ({
			id: s.id,
			type: s.type,
			order: s.order,
			visible: s.visible,
			content: parseJsonSlot(s.content),
			contentItemId: s.contentItemId,
		})),
	});
}

/** Project, then fingerprint. The server's hash input. */
export function revisionContentFingerprint(
	input: RevisionContentInput,
): string {
	return canonicalRevisionFingerprint(projectRevisionContent(input));
}
