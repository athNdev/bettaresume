import { revisionContentFingerprint } from "@bettaresume/types";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db";
import {
	contentItems,
	resumeRevisions,
	resumes,
	sections,
} from "../../db/schema";
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

/** What `appendRevision` stores. Kept in sync with `projectResumeForSnapshot`. */
type RevisionSnapshot = ReturnType<typeof projectResumeForSnapshot>;

type AppendResult = {
	created: boolean;
	revision: typeof resumeRevisions.$inferSelect;
};

/**
 * Append a snapshot to the log, or return the revision that already holds this content.
 *
 * ## Dedupe is against the WHOLE history, not just the newest revision
 *
 * The original implementation compared `contentHash` only against the newest row. That
 * reads as sufficient because the case it handles -- an autosave firing with nothing
 * changed -- is always newest. It is not: `UNIQUE(resumeId, contentHash)` spans the whole
 * log, so undoing an edit and re-saving the content you had two versions ago passed the
 * newest-only check and then died on the insert with
 * `UNIQUE constraint failed: resume_revisions.resumeId, resume_revisions.contentHash`,
 * surfacing to the user as "Could not save a version: UNIQUE constraint failed".
 *
 * Undo-then-save is the canonical use of a revision history, so that path has to work.
 * The three ways to make it work were:
 *
 *  (a) Dedupe against the whole history and return `created: false`.  **Chosen.**
 *  (b) Drop `UNIQUE(resumeId, contentHash)` and dedupe newest-only.
 *  (c) Catch the violation and treat it as a duplicate.
 *
 * (b) is rejected on purpose. Re-recording a state that is already recorded adds no
 * recoverability -- restoring the existing revision puts the resume back into a
 * byte-identical state -- and it would mean deleting the index that is the only
 * race-proof enforcement of dedupe. Two concurrent saves of identical content would then
 * both append, which is the exact "history fills with rows nobody asked for" problem the
 * index exists to prevent. Trading a database-enforced invariant for a redundant row is
 * a bad trade, and it would additionally require a migration (see api/drizzle/) that this
 * fix has no reason to impose.
 *
 * (c) is kept only as a backstop, not as the mechanism. The pre-check below makes the
 * happy path deterministic; the catch covers the window where two concurrent requests
 * both read "no match" and both try to insert. It is a safety net for a race, not the
 * dedupe.
 *
 * So: `created: false` means "this exact resume is already saved, here is its revision".
 * That is truthful rather than an error, and the caller can select that revision.
 */
async function appendRevision(
	db: Database,
	resumeId: string,
	label: string,
	snapshot: RevisionSnapshot,
	hash: string,
): Promise<AppendResult> {
	// Whole-history dedupe, resolved by the `resume_revisions_resume_hash_unique` index,
	// so this is an index lookup rather than a scan of every snapshot ever taken.
	const existing = await db.query.resumeRevisions.findFirst({
		where: and(
			eq(resumeRevisions.resumeId, resumeId),
			eq(resumeRevisions.contentHash, hash),
		),
	});
	if (existing) {
		return { created: false, revision: existing };
	}

	// `seq` is UNIQUE per resume, so it is the only total order available. `createdAt`
	// has millisecond resolution: two saves in the same millisecond tie, SQLite returns
	// an arbitrary row, and the `seq` allocated from it collides with an existing row --
	// UNIQUE(resumeId, seq) then fails the insert. Ordering by seq also makes "newest
	// first" deterministic, which a timestamp tie cannot.
	const latest = await db.query.resumeRevisions.findFirst({
		where: eq(resumeRevisions.resumeId, resumeId),
		orderBy: [desc(resumeRevisions.seq)],
	});
	const nextSeq = ((latest?.seq ?? 0) as number) + 1;

	try {
		const [inserted] = await db
			.insert(resumeRevisions)
			.values({
				resumeId,
				seq: nextSeq,
				snapshotJson: JSON.stringify(snapshot),
				contentHash: hash,
				label,
			})
			.returning();
		if (!inserted) {
			// An INSERT that reports success but returns no row is not something the caller
			// can be told is a dedupe. Fail loudly rather than hand back `undefined` and let
			// the UI quietly behave as though a version was saved.
			throw new Error("Revision append returned no row");
		}
		return { created: true, revision: inserted };
	} catch (err) {
		// The unique index is the real enforcement, and it is the only thing that can
		// settle a genuine race. SQLite aborts the failed *statement* (not the
		// surrounding transaction, which is what makes this safe to catch and continue),
		// so re-reading is valid. If nothing is there the failure was something else and
		// must surface rather than be mislabelled as a duplicate.
		const raced = await db.query.resumeRevisions.findFirst({
			where: and(
				eq(resumeRevisions.resumeId, resumeId),
				eq(resumeRevisions.contentHash, hash),
			),
		});
		if (raced) return { created: false, revision: raced };
		throw err;
	}
}

export const revisionRouter = router({
	/**
	 * Append a snapshot. Returns `created: false` when this exact content is already in
	 * the history -- see `appendRevision` for why the whole log is consulted -- so the
	 * caller can distinguish "recorded" from "already saved" without a second query, and
	 * `revision` is the row that holds the content either way.
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
			// the snapshot. `contentItemId` in particular -- dropping it unlinks every
			// placement from the content library, which then reports "no divergence" and
			// forks into duplicates on the next backfill. Section `content` stays a raw
			// string here because that is what the TEXT column stores; the shared
			// canonicaliser reconciles it with the object the browser holds.
			const snapshot = projectResumeForSnapshot(resume, resumeSections);
			const hash = await contentHash(snapshot);

			const result = await appendRevision(
				ctx.db,
				input.resumeId,
				input.label ?? "Autosave",
				snapshot,
				hash,
			);
			return {
				created: result.created,
				revision: result.revision,
			};
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
	 * Two things make it actually reliable, and both are load-bearing rather than polish:
	 *
	 *  - **A restore point is written first.** This is the one control in the app that
	 *    destroys work, so before the destructive delete the current state is appended to
	 *    the log as "Before restore to #N". Without it the operation is irreversible, and
	 *    the confirmation dialog was telling users it was reversible.
	 *  - **Content-library placements are reconciled, not overwritten.** See the
	 *    reconcile step below.
	 *
	 * `restorePoint` is returned so the caller can tell the user where the undo lives,
	 * and whether it was a fresh row or a revision that already held this exact content.
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

			// Atomic: the restore point, the delete, the re-insert and the resume update
			// commit together or not at all. As separate statements a failure left the
			// resume with zero sections, and a concurrent `section.update` landing between
			// them was silently discarded.
			//
			// ## The restore point is INSIDE this transaction, deliberately
			//
			// It is tempting to commit the pre-image first so it "survives" a failed
			// restore, but that is backwards. If the restore fails, the rollback undoes the
			// destructive work, so the resume never left the state the pre-image describes
			// and there is nothing to recover -- while a separately-committed pre-image
			// would linger as a "Before restore to #N" row recording a restore that never
			// happened. That is a history entry that lies about what the user did, which is
			// the exact failure mode this log is supposed to make impossible. Inside the
			// transaction, the guarantee is exact: a committed restore always has a
			// committed restore point, and a rolled-back restore leaves no trace at all.
			//
			// Explicit BEGIN/COMMIT/ROLLBACK rather than `ctx.db.transaction`, because that
			// is the only spelling that works on BOTH drivers involved: Drizzle's D1 driver
			// implements `transaction()` itself as exactly these statements (drizzle has no
			// interactive transaction API on D1), while the SQLite driver used by the test
			// harness hands the callback to better-sqlite3, which throws
			// "Transaction function cannot return a promise" for an async body.
			await ctx.db.run(sql.raw("begin"));
			try {
				// Read the pre-restore state inside the transaction, so the restore point
				// describes exactly the state the delete is about to destroy.
				const [resume, liveSections] = await Promise.all([
					ctx.db.query.resumes.findFirst({
						where: and(
							eq(resumes.id, revision.resumeId),
							eq(resumes.userId, ctx.userId),
						),
					}),
					ctx.db
						.select({
							id: sections.id,
							type: sections.type,
							order: sections.order,
							visible: sections.visible,
							content: sections.content,
							contentItemId: sections.contentItemId,
						})
						.from(sections)
						.where(eq(sections.resumeId, revision.resumeId)),
				]);
				if (!resume) throw new Error(revisionScopeError);

				// (1) The restore point, written before anything is destroyed.
				const preImage = projectResumeForSnapshot(resume, liveSections);
				const restorePoint = await appendRevision(
					ctx.db,
					revision.resumeId,
					`Before restore to #${revision.seq}`,
					preImage,
					await contentHash(preImage),
				);

				// (2) Reconcile the content-library placements.
				//
				// A snapshot taken before the library existed faithfully records
				// `contentItemId: null`, and writing that back unlinks every placement --
				// after which `divergence` reports nothing, `additions` re-offers the same
				// items, and the next backfill forks the library into duplicates. Restoring
				// old versions is the *normal* use of this feature, so "old" has to include
				// "predates the library".
				//
				// The rule: honour a non-null `contentItemId` from the snapshot (that is a
				// real, intentional placement the user had at that moment), but where the
				// snapshot says null and the live section is currently linked, keep the
				// live link -- provided that library item still exists.
				//
				// The "provided" clause matters: the snapshot may place item X on section B
				// while section A is now linked to X (the user moved it). Carrying A's live X
				// forward alongside the snapshot's B=X would write X twice and trip
				// Section_resume_content_item_unique, turning a restore into a raw SQLite
				// error. So a live value is only carried forward when this snapshot does not
				// place that item anywhere else.
				const snapshotPlacements = new Map<string, string>();
				for (const s of snapshot.sections ?? []) {
					if (s.contentItemId) snapshotPlacements.set(s.contentItemId, s.id);
				}

				const liveById = new Map(
					liveSections.map((s) => [s.id, s.contentItemId] as const),
				);
				// Sections the snapshot keeps AND leaves unplaced: the only ones a live
				// link may be carried onto.
				const claimable = new Set(
					(snapshot.sections ?? [])
						.filter((s) => !s.contentItemId)
						.map((s) => s.id),
				);
				const carryCandidates = [
					...new Set(
						liveSections
							.filter((s) => claimable.has(s.id))
							.map((s) => s.contentItemId)
							.filter(
								(id): id is string =>
									id !== null && !snapshotPlacements.has(id),
							),
					),
				];

				// Existence is checked rather than assumed: `Section.contentItemId` is
				// ON DELETE SET NULL, but an item can be hard-deleted in ways the FK
				// autocorrect for, and writing a dangling id would fail the insert.
				const survivingItems = new Set<string>();
				if (carryCandidates.length > 0) {
					const found = await ctx.db
						.select({ id: contentItems.id })
						.from(contentItems)
						.where(
							and(
								inArray(contentItems.id, carryCandidates),
								eq(contentItems.userId, ctx.userId),
							),
						);
					for (const row of found) survivingItems.add(row.id);
				}

				await ctx.db
					.delete(sections)
					.where(eq(sections.resumeId, revision.resumeId));

				if (snapshot.sections?.length) {
					await ctx.db.insert(sections).values(
						snapshot.sections.map((s) => {
							const snapshotItemId = s.contentItemId ?? null;
							const liveItemId = liveById.get(s.id) ?? null;
							const keepLiveLink =
								snapshotItemId === null &&
								liveItemId !== null &&
								survivingItems.has(liveItemId) &&
								!snapshotPlacements.has(liveItemId);

							return {
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
								contentItemId: keepLiveLink ? liveItemId : snapshotItemId,
							};
						}),
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

				return {
					restored: revision.id,
					resumeId: revision.resumeId,
					restorePoint: {
						id: restorePoint.revision.id,
						seq: restorePoint.revision.seq,
						label: restorePoint.revision.label,
						// False means this exact content was already in the log, so the
						// existing revision is the restore point and no row was added.
						created: restorePoint.created,
					},
				};
			} catch (err) {
				await ctx.db.run(sql.raw("rollback"));
				throw err;
			}
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
