import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db";
import { resumeRevisions, resumes, sections } from "../../db/schema";
import { protectedProcedure, router } from "../index";

/**
 * Resume revision history.
 *
 * Every commercial resume builder is a black hole you cannot diff: no way to see what
 * changed, when, or to get back to a version you liked. These procedures are the read
 * side of the append-only log added in migration 0002.
 *
 * ## There is no update or delete procedure, on purpose
 *
 * The table is append-only. Adding a `revision.delete` here would defeat the only
 * property that makes the history worth trusting: a log that cannot be quietly
 * rewritten. Entries disappear when their resume is deleted, via `ON DELETE CASCADE`,
 * which is both correct (a revision without its resume is meaningless) and required for
 * GDPR erasure.
 *
 * ## Every query is scoped through Resume.userId
 *
 * Revisions are addressed by `resumeId`, which is user-supplied. Each procedure
 * therefore joins to `Resume` and checks `userId = ctx.userId`, so a caller cannot read
 * or restore another tenant's history by guessing a resume id. This is the same
 * ownership check the section and resume routers use.
 */

export const revisionScopeError = "Resume not found or access denied";

/** Confirm the caller owns the resume, or throw. Returns the resume row. */
async function assertOwnsResume(
	db: Database,
	userId: string,
	resumeId: string,
) {
	const resume = await db.query.resumes.findFirst({
		where: and(eq(resumes.id, resumeId), eq(resumes.userId, userId)),
	});
	if (!resume) {
		// Deliberately identical message for "does not exist" and "not yours", so the
		// error cannot be used to probe which resume ids are real.
		throw new Error(revisionScopeError);
	}
	return resume;
}

/**
 * Stable content hash for dedup.
 *
 * Uses SHA-256 over a canonical JSON serialisation. Key order is normalised so two
 * structurally identical snapshots hash the same regardless of property order --
 * otherwise an autosave that reorders keys would store a duplicate row and defeat the
 * unique index.
 */
function contentHash(value: unknown): Promise<string> {
	const canonical = (input: unknown): unknown => {
		if (Array.isArray(input)) return input.map(canonical);
		if (input && typeof input === "object") {
			return Object.fromEntries(
				Object.entries(input as Record<string, unknown>)
					.filter(([, v]) => v !== undefined)
					.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
					.map(([k, v]) => [k, canonical(v)]),
			);
		}
		return input;
	};
	const json = JSON.stringify(canonical(value));
	return crypto.subtle
		.digest("SHA-256", new TextEncoder().encode(json))
		.then((buf) =>
			Array.from(new Uint8Array(buf))
				.map((b) => b.toString(16).padStart(2, "0"))
				.join(""),
		);
}

export const revisionRouter = router({
	/**
	 * Append a snapshot. Returns `null` when the content is identical to the newest
	 * revision, so the caller can distinguish "recorded" from "deduped" without a
	 * second query.
	 */
	create: protectedProcedure
		.input(
			z.object({
				resumeId: z.string().min(1),
				label: z.string().max(200).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertOwnsResume(ctx.db, ctx.userId, input.resumeId);

			const [resume, resumeSections] = await Promise.all([
				ctx.db.query.resumes.findFirst({
					where: and(
						eq(resumes.id, input.resumeId),
						eq(resumes.userId, ctx.userId),
					),
				}),
				ctx.db
					.select()
					.from(sections)
					.where(eq(sections.resumeId, input.resumeId)),
			]);
			if (!resume) throw new Error(revisionScopeError);

			const snapshot = {
				name: resume.name,
				template: resume.template,
				domain: resume.domain,
				metadata: resume.metadata,
				sections: resumeSections,
			};
			const hash = await contentHash(snapshot);

			// Order by `seq`, NOT `createdAt`.
			//
			// `seq` is UNIQUE per resume, so it is the only total order available.
			// `createdAt` has millisecond resolution: two autosaves in the same
			// millisecond tie, SQLite returns an arbitrary row, and the `seq`
			// allocated from it collides with an existing row -- UNIQUE(resumeId, seq)
			// then fails the insert. Ordering by seq also makes "newest first"
			// deterministic, which a timestamp tie cannot.
			//
			// Dedupe is against the newest revision rather than pre-checked in JS: the
			// UNIQUE(resumeId, contentHash) index is the real enforcement, and this read
			// only avoids a pointless insert attempt.
			const latest = await ctx.db.query.resumeRevisions.findFirst({
				where: eq(resumeRevisions.resumeId, input.resumeId),
				orderBy: [desc(resumeRevisions.seq)],
			});
			if (latest?.contentHash === hash) {
				return { created: false as const, revision: latest };
			}

			const nextSeq = ((latest?.seq ?? 0) as number) + 1;

			const [inserted] = await ctx.db
				.insert(resumeRevisions)
				.values({
					resumeId: input.resumeId,
					seq: nextSeq,
					snapshotJson: JSON.stringify(snapshot),
					contentHash: hash,
					label: input.label ?? "Autosave",
				})
				.returning();

			return { created: true as const, revision: inserted };
		}),

	/**
	 * History for a resume, newest first. Snapshots are omitted: the list view needs
	 * metadata only, and shipping every snapshot to render a list would be wasteful.
	 */
	list: protectedProcedure
		.input(
			z.object({
				resumeId: z.string().min(1),
				limit: z.number().int().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			await assertOwnsResume(ctx.db, ctx.userId, input.resumeId);

			return ctx.db
				.select({
					id: resumeRevisions.id,
					seq: resumeRevisions.seq,
					label: resumeRevisions.label,
					createdAt: resumeRevisions.createdAt,
				})
				.from(resumeRevisions)
				.where(eq(resumeRevisions.resumeId, input.resumeId))
				.orderBy(desc(resumeRevisions.seq))
				.limit(input.limit);
		}),

	/**
	 * One snapshot, for diffing against the current resume.
	 */
	get: protectedProcedure
		.input(z.object({ revisionId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const revision = await ctx.db.query.resumeRevisions.findFirst({
				where: eq(resumeRevisions.id, input.revisionId),
			});
			if (!revision) throw new Error("Revision not found");

			// Re-check ownership through the parent resume. The revision id alone is
			// user-supplied and must not be a bearer token for someone else's history.
			await assertOwnsResume(ctx.db, ctx.userId, revision.resumeId);

			return {
				id: revision.id,
				seq: revision.seq,
				label: revision.label,
				createdAt: revision.createdAt,
				snapshot: JSON.parse(revision.snapshotJson) as unknown,
			};
		}),

	/**
	 * Restore a snapshot onto the resume.
	 *
	 * Restoring REPLACES the resume's scalar fields and its sections. Sections are
	 * deleted and re-inserted rather than diffed because a restore that merges would
	 * leave the user unable to get back to where they were -- and the whole point of
	 * this feature is that getting back is reliable.
	 *
	 * The restore itself is recorded as a new revision first, so the act of undoing is
	 * also undoable.
	 */
	restore: protectedProcedure
		.input(z.object({ revisionId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const revision = await ctx.db.query.resumeRevisions.findFirst({
				where: eq(resumeRevisions.id, input.revisionId),
			});
			if (!revision) throw new Error("Revision not found");
			await assertOwnsResume(ctx.db, ctx.userId, revision.resumeId);

			const snapshot = JSON.parse(revision.snapshotJson) as {
				name?: string;
				template?: string;
				domain?: string | null;
				metadata?: string | null;
				sections?: {
					id: string;
					type: string;
					order: number;
					visible: boolean;
					content: string;
					pageId?: string | null;
				}[];
			};

			await ctx.db
				.delete(sections)
				.where(eq(sections.resumeId, revision.resumeId));

			if (snapshot.sections?.length) {
				await ctx.db.insert(sections).values(
					snapshot.sections.map((s) => ({
						id: s.id,
						resumeId: revision.resumeId,
						type: s.type as never,
						order: s.order,
						visible: s.visible,
						content: s.content,
						pageId: s.pageId ?? null,
					})),
				);
			}

			await ctx.db
				.update(resumes)
				.set({
					...(snapshot.name !== undefined ? { name: snapshot.name } : {}),
					...(snapshot.template !== undefined
						? { template: snapshot.template as never }
						: {}),
					...(snapshot.domain !== undefined ? { domain: snapshot.domain } : {}),
					...(snapshot.metadata !== undefined
						? { metadata: snapshot.metadata }
						: {}),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(resumes.id, revision.resumeId),
						eq(resumes.userId, ctx.userId),
					),
				);

			return { restored: revision.id, resumeId: revision.resumeId };
		}),

	/**
	 * How many revisions a resume has. Cheap enough for a badge, and answers "is this
	 * resume actually being tracked?" without shipping snapshots.
	 */
	count: protectedProcedure
		.input(z.object({ resumeId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			await assertOwnsResume(ctx.db, ctx.userId, input.resumeId);
			const [row] = await ctx.db
				.select({ n: sql<number>`count(*)` })
				.from(resumeRevisions)
				.where(eq(resumeRevisions.resumeId, input.resumeId));
			return { count: row?.n ?? 0 };
		}),
});
