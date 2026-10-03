import { revisionContentFingerprint } from "@bettaresume/types";
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
 * Revisions are addressed by `resumeId` or `revisionId`, both user-supplied. Each procedure
 * therefore joins to `Resume` and checks `userId = ctx.userId`, so a caller cannot read
 * or restore another tenant's history by guessing an id. This is the same ownership check
 * the section and resume routers use.
 *
 * ## The hash input is not written here
 *
 * Which columns count as "content" — and how they are canonicalised — lives in
 * `@bettaresume/types` (`projectRevisionContent` / `canonicalRevisionFingerprint`) and is
 * imported by the browser's diff as well. Defining the field set in only one of the two
 * places is what let the UI report "no differences" for a change the server was holding an
 * older version of, with the Restore button disabled because of it.
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
 * Load a revision the caller owns, or throw the same scope error as every other refusal.
 *
 * The revision row and its ownership are resolved in ONE query, joined through `Resume`.
 * A caller therefore cannot tell "this revision id does not exist" from "this revision id
 * belongs to someone else" — a separate "Revision not found" would be a working oracle for
 * enumerating which revision ids are real.
 */
async function assertOwnsRevision(
	db: Database,
	userId: string,
	revisionId: string,
) {
	const [row] = await db
		.select({ revision: resumeRevisions })
		.from(resumeRevisions)
		.innerJoin(resumes, eq(resumeRevisions.resumeId, resumes.id))
		.where(and(eq(resumeRevisions.id, revisionId), eq(resumes.userId, userId)))
		.limit(1);

	if (!row) {
		throw new Error(revisionScopeError);
	}
	return row.revision;
}

/**
 * The snapshot document stored in `snapshotJson`.
 *
 * Deliberately the same shape the shared projection produces, with section `content` left
 * as the raw JSON string the TEXT column stores, so `restore` can write it straight back
 * without re-serialising it.
 */
function projectResumeForSnapshot(
	resume: {
		name: string;
		template: string;
		domain: string | null;
		metadata: string | null;
	},
	resumeSections: readonly {
		id: string;
		type: string;
		order: number;
		visible: boolean;
		content: string;
		contentItemId: string | null;
	}[],
) {
	return {
		name: resume.name,
		template: resume.template,
		domain: resume.domain,
		metadata: resume.metadata,
		sections: resumeSections.map((s) => ({
			id: s.id,
			type: s.type,
			order: s.order,
			visible: s.visible,
			content: s.content,
			contentItemId: s.contentItemId ?? null,
		})),
	};
}

/**
 * Stable content hash for dedup.
 *
 * SHA-256 over the canonical projection from `@bettaresume/types`. The projection is what
 * excludes `createdAt`/`updatedAt`: `section.update` bumps `updatedAt` on every call, so
 * hashing the raw rows made every autosave "different" and the dedupe — plus the
 * `created: false` path the UI relies on — could never fire.
 */
async function contentHash(value: {
	name: string;
	template: string;
	domain: string | null;
	metadata: string | null;
	sections: readonly unknown[];
}): Promise<string> {
	const json = revisionContentFingerprint(value);
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
			const [resume, resumeSections] = await Promise.all([
				assertOwnsResume(ctx.db, ctx.userId, input.resumeId),
				ctx.db
					.select()
					.from(sections)
					.where(eq(sections.resumeId, input.resumeId)),
			]);

			// The stored snapshot is the projection, not the raw rows: it carries exactly the
			// fields restore writes back, so a restore cannot silently drop one that was in
			// the snapshot. `contentItemId` in particular — dropping it unlinks every
			// placement from the content library, which then reports "no divergence" and
			// forks into duplicates on the next backfill. Section `content` stays a raw
			// string here because that is what the TEXT column stores; the shared
			// canonicaliser reconciles it with the object the browser holds.
			const snapshot = projectResumeForSnapshot(resume, resumeSections);
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
			// Ownership is resolved in the same query as the lookup, so a revision that does
			// not exist and one owned by another tenant are indistinguishable.
			const revision = await assertOwnsRevision(
				ctx.db,
				ctx.userId,
				input.revisionId,
			);

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
			// Checked before the delete, and in a single query: the ownership check must
			// never be reachable after the sections are already gone.
			const revision = await assertOwnsRevision(
				ctx.db,
				ctx.userId,
				input.revisionId,
			);

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
					content: unknown;
					contentItemId?: string | null;
				}[];
			};

			// Atomic: delete, re-insert and the resume update commit together or not at
			// all. As separate statements a failure left the resume with zero sections, and
			// a concurrent `section.update` landing between them was silently discarded.
			//
			// Explicit BEGIN/COMMIT/ROLLBACK rather than `ctx.db.transaction`, because that
			// is the only spelling that works on BOTH drivers involved: Drizzle's D1 driver
			// implements `transaction()` itself as exactly these statements (drizzle has no
			// interactive transaction API on D1), while the SQLite driver used by the test
			// harness hands the callback to better-sqlite3, which throws
			// "Transaction function cannot return a promise" for an async body.
			await ctx.db.run(sql.raw("begin"));
			try {
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
							// `content` is a TEXT column. Snapshots store the string as-is;
							// the object form only appears if a snapshot was hand-written, so
							// serialise rather than write "[object Object]".
							content:
								typeof s.content === "string"
									? s.content
									: JSON.stringify(s.content ?? {}),
							// Restoring a snapshot must not unlink the section from the
							// content library: dropping it makes every placement look
							// un-diverged and the next backfill forks the library.
							contentItemId: s.contentItemId ?? null,
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
						...(snapshot.domain !== undefined
							? { domain: snapshot.domain }
							: {}),
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

				await ctx.db.run(sql.raw("commit"));
			} catch (err) {
				await ctx.db.run(sql.raw("rollback"));
				throw err;
			}

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
