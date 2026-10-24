import type { ResumeMetadata } from "./types";

/**
 * Merge a metadata patch into stored metadata, recursively.
 *
 * Metadata has nested objects whose fields are individually optional in the patch type:
 * `{ settings: { fontFamily } }` is a complete, valid update that must change one field
 * and leave the other thirty alone. A shallow spread replaces `settings` wholesale, so the
 * result is missing `typography`, `margins` and `colors` — and the difference shows up as
 * the preview losing its layout for a frame, or, when the merge happens server-side, as
 * silently destroyed settings.
 *
 * `undefined` means "not present in this patch", never "set this field to nothing". A
 * client that wants to clear `jobTarget` sends `null`, which is a value and survives.
 *
 * This lived in `api/src/trpc/procedures/resume.ts` and was used only by the server, while
 * the client's optimistic update did `{ ...previous, ...data }` behind an `as any`. That is
 * two implementations of one rule, and the one without the type checking was the one the
 * user sees first. It lives here so both call it.
 */
export function deepMergeMetadata(
	base: Record<string, unknown>,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...base };

	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;

		const existing = out[key];
		const bothPlainObjects =
			value !== null &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			existing !== null &&
			typeof existing === "object" &&
			!Array.isArray(existing);

		out[key] = bothPlainObjects
			? deepMergeMetadata(
					existing as Record<string, unknown>,
					value as Record<string, unknown>,
				)
			: value;
	}

	return out;
}

/**
 * Type-level wrapper for the one call site that knows both sides are metadata.
 *
 * The merge itself has to work on `Record<string, unknown>` because it walks arbitrary
 * JSON; the cast back is the caller's assertion that it passed JSON in.
 */
export function mergeMetadata(
	base: ResumeMetadata | null,
	patch: Record<string, unknown> | null | undefined,
): ResumeMetadata | null {
	if (!patch) return base;
	return deepMergeMetadata(
		(base ?? {}) as Record<string, unknown>,
		patch,
	) as unknown as ResumeMetadata;
}
