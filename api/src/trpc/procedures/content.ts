import { sectionContentSchema, sectionTypeSchema } from "@bettaresume/types";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Database } from "../../db";
import { contentItems, resumes, sections } from "../../db/schema";
import { protectedProcedure, router } from "../index";

/**
 * Content library: the master copy of a user's content, separate from placement.
 *
 * The failure this fixes is the one every commercial builder shares: a resume is both
 * the document you send and the place you keep your work history, so tailoring it for
 * one job destroys the record the next job pulls from. Here, content is written once and
 * a `Section` is a *placement* of a content item, so the same achievement can sit in
 * three variants without being written three times.
 *
 * ## Tenancy
 *
 * Every query filters on `contentItems.userId = ctx.userId`. Content items are addressed
 * by id alone, so without that filter any guessed id would be readable and writable
 * across tenants. Placements are additionally verified through their resume.
 *
 * ## Sync is never destructive
 *
 * There is no "overwrite all variants from the master" and no cascade. The three
 * mechanisms the design calls for are all opt-in and additive:
 *
 *  - additive: newly added library items are *offered*, never pushed (see `additions`)
 *  - opt-in: `propagate` writes the master to placements, only when asked, per placement
 *  - non-destructive: `divergence` reports where a placement has drifted, so the user
 *    chooses per placement instead of being silently overwritten
 *
 * A "just sync everything" button is the thing this whole feature exists to avoid.
 */

const scopeError = "Content item not found or access denied";

/** Confirm the caller owns the item, or throw. */
async function assertOwnsItem(
	ctx: { db: Database; userId: string },
	itemId: string,
) {
	const item = await ctx.db.query.contentItems.findFirst({
		where: and(
			eq(contentItems.id, itemId),
			eq(contentItems.userId, ctx.userId),
		),
	});
	if (!item) throw new Error(scopeError);
	return item;
}

/**
 * Confirm a section exists and belongs to one of the caller's resumes.
 * Returns the section row plus its owning resume.
 */
async function assertOwnsSection(
	ctx: { db: Database; userId: string },
	sectionId: string,
) {
	const section = (await ctx.db.query.sections.findFirst({
		where: eq(sections.id, sectionId),
		with: { resume: true },
	})) as
		| {
				id: string;
				resumeId: string;
				content: string;
				contentItemId: string | null;
				resume: { userId: string };
		  }
		| undefined;
	if (!section || section?.resume?.userId !== ctx.userId) {
		throw new Error("Section not found or access denied");
	}
	return section;
}

/** Canonical JSON, matching the server-side content hash used by revision dedupe. */
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

/**
 * Structural equality, tolerant of key order.
 *
 * Must agree with the revision-history canonicaliser: if this reported drift where the
 * history said "unchanged", the same edit would look simultaneously saved and
 * conflicting.
 */
function sameContent(a: unknown, b: unknown): boolean {
	return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

function parsePayload(payload: string): unknown {
	try {
		return JSON.parse(payload);
	} catch {
		return null;
	}
}

/** The key tier-1 import writes its review state under. Mirrors `src/lib/import/library-item.ts`. */
const IMPORT_META_KEY = "importMeta";

/**
 * Has this item been imported and not yet reviewed?
 *
 * Duplicated from `src/lib/import/library-item.ts` rather than imported, because this
 * workspace must not depend on the frontend bundle: `api/` is a Cloudflare Worker with
 * its own `tsconfig` and the shared package does not carry this module. The key is a
 * string contract, and both sides name why they cannot share it.
 *
 * `null` means the item was written by the user, not by an import, so it is not
 * "reviewed" -- it never needed to be. Only an imported item can be unreviewed.
 */
function isUnreviewedPayload(payload: string): boolean {
	const meta = readImportMeta(payload);
	return meta !== null && meta.reviewed === false;
}

/** Where an imported item came from, for the library row to name. Null if not imported. */
function importSourceOf(payload: string): string | null {
	return readImportMeta(payload)?.source ?? null;
}

function readImportMeta(payload: string): {
	reviewed?: boolean;
	source?: string;
} | null {
	const parsed = parsePayload(payload);
	if (!parsed || typeof parsed !== "object") return null;
	const meta = (parsed as Record<string, unknown>)[IMPORT_META_KEY];
	if (!meta || typeof meta !== "object") return null;
	return meta as { reviewed?: boolean; source?: string };
}

function summariseForTitle(type: string, content: unknown): string {
	const c = (content ?? {}) as Record<string, unknown>;
	if (typeof c.title === "string" && c.title.trim()) return c.title;
	const data = c.data;
	if (Array.isArray(data) && data.length > 0) {
		const first = data[0] as Record<string, unknown> | undefined;
		if (first) {
			for (const key of [
				"company",
				"name",
				"institution",
				"school",
				"issuer",
				"award",
			]) {
				if (typeof first[key] === "string" && first[key]) {
					return `${type}: ${first[key]}`;
				}
			}
		}
	}
	return type;
}

export const contentRouter = router({
	/**
	 * The library, newest first. Archived items are excluded by default so the list
	 * stays the working set rather than a graveyard.
	 */
	list: protectedProcedure
		.input(
			z
				.object({
					type: sectionTypeSchema.optional(),
					includeArchived: z.boolean().optional(),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const filters = [eq(contentItems.userId, ctx.userId)];
			if (input?.type) filters.push(eq(contentItems.type, input.type));
			if (!input?.includeArchived)
				filters.push(isNull(contentItems.archivedAt));

			const rows = await ctx.db
				.select({
					id: contentItems.id,
					type: contentItems.type,
					title: contentItems.title,
					archivedAt: contentItems.archivedAt,
					createdAt: contentItems.createdAt,
					updatedAt: contentItems.updatedAt,
					// `payload` is selected only to read the import review state out of it.
					//
					// The obvious place for that state is a `reviewedAt` column, and it is
					// not there: `CLOUDFLARE_API_TOKEN` currently lacks D1 permission, so
					// `wrangler d1 migrations apply --remote` fails in CD with `code 7403`
					// and migrations do not reach production. A new column would query a
					// column the deployed database does not have -- a runtime failure on
					// every library read, for every user, with no code change to blame.
					//
					// The cost is real and bounded: a personal library of resume sections
					// is a few kilobytes per item. It is the thing to revisit the moment a
					// migration path works.
					payload: contentItems.payload,
				})
				.from(contentItems)
				.where(and(...filters))
				.orderBy(desc(contentItems.createdAt));

			return rows.map(({ payload, ...row }) => ({
				...row,
				unreviewed: isUnreviewedPayload(payload),
				importSource: importSourceOf(payload),
			}));
		}),

	/** One item with its payload parsed. */
	get: protectedProcedure
		.input(z.object({ contentItemId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const item = await assertOwnsItem(ctx, input.contentItemId);
			return {
				id: item.id,
				type: item.type,
				title: item.title,
				archivedAt: item.archivedAt,
				createdAt: item.createdAt,
				updatedAt: item.updatedAt,
				payload: parsePayload(item.payload),
			};
		}),

	/** Add an item to the library. It is not placed into any resume. */
	create: protectedProcedure
		.input(
			z.object({
				type: sectionTypeSchema,
				title: z.string().min(1).max(200),
				payload: sectionContentSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [item] = await ctx.db
				.insert(contentItems)
				.values({
					userId: ctx.userId,
					type: input.type,
					title: input.title,
					payload: JSON.stringify(input.payload),
				})
				.returning();
			// A RETURNING insert that produced no row is a real anomaly, not a case to
			// paper over by returning undefined into the client's hands.
			if (!item) throw new Error("Failed to create content item");
			return item;
		}),

	/**
	 * Edit the MASTER copy only.
	 *
	 * Placements are deliberately left alone. Changing the master here makes every
	 * placement that diverged show as drifted in `divergence`, which is the
	 * non-destructive path: the user then decides, per placement, whether to take the
	 * update. Editing the master and having it silently land everywhere would make
	 * "save to all" indistinguishable from "overwrite all", which is the behaviour this
	 * design exists to avoid.
	 */
	update: protectedProcedure
		.input(
			z.object({
				contentItemId: z.string().min(1),
				title: z.string().min(1).max(200).optional(),
				payload: sectionContentSchema.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			await assertOwnsItem(ctx, input.contentItemId);
			const patch: Record<string, unknown> = { updatedAt: new Date() };
			if (input.title !== undefined) patch.title = input.title;
			if (input.payload !== undefined)
				patch.payload = JSON.stringify(input.payload);
			const [item] = await ctx.db
				.update(contentItems)
				.set(patch)
				.where(
					and(
						eq(contentItems.id, input.contentItemId),
						eq(contentItems.userId, ctx.userId),
					),
				)
				.returning();
			return item;
		}),

	/**
	 * Mark an imported item reviewed.
	 *
	 * A dedicated procedure rather than a client-side `get` + `update` round trip,
	 * because the flag lives inside the payload: doing it in the browser means shipping
	 * the whole item back over the wire to change one boolean, and two requests racing
	 * could each write a payload the other had not seen. Here the read and the write
	 * happen against the same row on the server.
	 *
	 * It refuses an item with no import state. That item was written by the user, so
	 * "mark it reviewed" is a category error and would create a state the rest of the
	 * library has no meaning for.
	 */
	markReviewed: protectedProcedure
		.input(z.object({ contentItemId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const item = await assertOwnsItem(ctx, input.contentItemId);
			const parsed = parsePayload(item.payload);
			const meta =
				parsed && typeof parsed === "object"
					? (parsed as Record<string, unknown>)[IMPORT_META_KEY]
					: null;
			if (!meta || typeof meta !== "object") {
				throw new Error("This item was not created by an import");
			}
			const next = {
				...(parsed as Record<string, unknown>),
				[IMPORT_META_KEY]: { ...(meta as object), reviewed: true },
			};
			await ctx.db
				.update(contentItems)
				.set({ payload: JSON.stringify(next), updatedAt: new Date() })
				.where(
					and(
						eq(contentItems.id, item.id),
						eq(contentItems.userId, ctx.userId),
					),
				);
			return { reviewed: true };
		}),

	/**
	 * Archive rather than delete.
	 *
	 * Shared content is referenced by placements in resumes the user may not currently
	 * have open. A hard delete would empty those sections invisibly. Archiving hides it
	 * from the library while leaving existing placements intact.
	 */
	archive: protectedProcedure
		.input(z.object({ contentItemId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await assertOwnsItem(ctx, input.contentItemId);
			await ctx.db
				.update(contentItems)
				.set({ archivedAt: new Date() })
				.where(
					and(
						eq(contentItems.id, input.contentItemId),
						eq(contentItems.userId, ctx.userId),
					),
				);
			return { archived: true };
		}),

	/** Undo an archive. */
	restore: protectedProcedure
		.input(z.object({ contentItemId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await assertOwnsItem(ctx, input.contentItemId);
			await ctx.db
				.update(contentItems)
				.set({ archivedAt: null })
				.where(
					and(
						eq(contentItems.id, input.contentItemId),
						eq(contentItems.userId, ctx.userId),
					),
				);
			return { archived: false };
		}),

	/**
	 * Place a library item into a resume.
	 *
	 * A NEW placement starts hidden. A newly added item appearing visibly in every
	 * variant is the "additive" mechanism done wrong: the user asked for it to be
	 * available, not to be in their CV. Additive sync OFFERS (see `additions`); it never
	 * turns itself on.
	 *
	 * `visible` is optional with NO default. Re-attaching an existing placement must not
	 * touch its visibility unless the caller explicitly asked: a `.default(false)` here
	 * makes `input.visible` never-undefined, which silently turns the "keep what is
	 * there" fallback below into "hide it", and re-attaching is an ordinary double-click.
	 * Losing a visible section to a double-click is data loss in the exported resume, not
	 * a display bug.
	 */
	attach: protectedProcedure
		.input(
			z.object({
				contentItemId: z.string().min(1),
				resumeId: z.string().min(1),
				order: z.number().int().optional(),
				visible: z.boolean().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const item = await assertOwnsItem(ctx, input.contentItemId);
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});
			if (!resume) throw new Error("Resume not found or access denied");

			// A section is a placement of one item, so re-attaching replaces the
			// existing placement rather than duplicating the content in the resume.
			const existing = await ctx.db.query.sections.findFirst({
				where: and(
					eq(sections.resumeId, input.resumeId),
					eq(sections.contentItemId, input.contentItemId),
				),
			});
			if (existing) {
				// Visibility is only written when the caller named it, so re-attaching
				// cannot hide a placement the user can currently see and export.
				await ctx.db
					.update(sections)
					.set({
						...(input.visible === undefined ? {} : { visible: input.visible }),
						updatedAt: new Date(),
					})
					.where(eq(sections.id, existing.id));
				return { sectionId: existing.id, created: false };
			}

			const maxOrder = await ctx.db.query.sections.findMany({
				where: eq(sections.resumeId, input.resumeId),
				orderBy: (t, { desc: d }) => [d(t.order)],
				limit: 1,
			});
			const nextOrder =
				input.order ?? ((maxOrder[0]?.order ?? 0) as number) + 1;

			try {
				const [created] = await ctx.db
					.insert(sections)
					.values({
						resumeId: input.resumeId,
						type: item.type as never,
						order: nextOrder,
						// The one place a default belongs: a placement that did not exist
						// is created hidden.
						visible: input.visible ?? false,
						content: item.payload,
						contentItemId: item.id,
					})
					.returning();
				return { sectionId: created?.id, created: true };
			} catch (cause) {
				// `Section_resume_content_item_unique` is the real enforcement: two
				// concurrent attaches both read "no existing placement" and both insert.
				// The loser must return the winner's section rather than surfacing a
				// constraint error to the user, who did nothing wrong by clicking.
				const raced = await ctx.db.query.sections.findFirst({
					where: and(
						eq(sections.resumeId, input.resumeId),
						eq(sections.contentItemId, input.contentItemId),
					),
				});
				if (!raced) throw cause;
				return { sectionId: raced.id, created: false };
			}
		}),

	/** Detach a placement. The library item itself is untouched. */
	detach: protectedProcedure
		.input(z.object({ sectionId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await assertOwnsSection(ctx, input.sectionId);
			// Nulling the link is the whole operation. The section row and its content
			// survive, because detaching a placement must not delete the user's text.
			await ctx.db
				.update(sections)
				.set({ contentItemId: null, updatedAt: new Date() })
				.where(eq(sections.id, input.sectionId));
			return { detached: true };
		}),

	/**
	 * Placements that no longer match their master copy.
	 *
	 * This is the "Update Available" flag. It reports rather than applies, so the
	 * decision stays with whoever owns the resume.
	 */
	divergence: protectedProcedure
		.input(z.object({ resumeId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});
			if (!resume) throw new Error("Resume not found or access denied");

			const placed = await ctx.db
				.select({
					sectionId: sections.id,
					contentItemId: sections.contentItemId,
					sectionContent: sections.content,
					visible: sections.visible,
					itemPayload: contentItems.payload,
					itemUpdatedAt: contentItems.updatedAt,
				})
				.from(sections)
				.innerJoin(contentItems, eq(sections.contentItemId, contentItems.id))
				.where(
					and(
						eq(sections.resumeId, input.resumeId),
						eq(contentItems.userId, ctx.userId),
					),
				);

			return placed
				.filter(
					(row) =>
						!sameContent(
							parsePayload(row.sectionContent),
							parsePayload(row.itemPayload),
						),
				)
				.map((row) => ({
					sectionId: row.sectionId,
					contentItemId: row.contentItemId,
					visible: row.visible,
					masterUpdatedAt: row.itemUpdatedAt,
				}));
		}),

	/**
	 * Opt-in propagation: write the master copy onto one placement.
	 *
	 * Scoped to a single placement on purpose. "Save to all" as a bulk button is how a
	 * tailoring tool destroys work the user had not looked at yet.
	 */
	propagate: protectedProcedure
		.input(z.object({ sectionId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const section = await assertOwnsSection(ctx, input.sectionId);
			if (!section.contentItemId) {
				throw new Error("Section is not linked to a library item");
			}
			const item = await assertOwnsItem(ctx, section.contentItemId);
			await ctx.db
				.update(sections)
				.set({ content: item.payload, updatedAt: new Date() })
				.where(eq(sections.id, section.id));
			return { propagated: item.id };
		}),

	/**
	 * The additive mechanism, honestly implemented.
	 *
	 * Returns library items the resume does not yet place. It reports candidates and
	 * attaches nothing: "available to add" is additive sync. Silently inserting into
	 * every variant would be the opposite of the design and would put content in front
	 * of employers that the user never chose to send.
	 */
	additions: protectedProcedure
		.input(
			z.object({
				resumeId: z.string().min(1),
				type: sectionTypeSchema.optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});
			if (!resume) throw new Error("Resume not found or access denied");

			const placed = await ctx.db
				.select({ contentItemId: sections.contentItemId })
				.from(sections)
				.where(eq(sections.resumeId, input.resumeId));
			const placedIds = new Set(
				placed.map((r) => r.contentItemId).filter((v): v is string => !!v),
			);

			const filters = [
				eq(contentItems.userId, ctx.userId),
				isNull(contentItems.archivedAt),
			];
			if (input.type) filters.push(eq(contentItems.type, input.type));

			const all = await ctx.db
				.select({
					id: contentItems.id,
					type: contentItems.type,
					title: contentItems.title,
				})
				.from(contentItems)
				.where(and(...filters))
				.orderBy(desc(contentItems.createdAt));

			return all.filter((item) => !placedIds.has(item.id));
		}),

	/**
	 * One-shot backfill: give every unlinked section its own library item.
	 *
	 * Idempotent, and run from the editor rather than the migration on purpose. Doing
	 * it in SQL would need JSON functions whose availability on D1 is not worth betting
	 * a migration on, and a user who never opens a resume has nothing to gain from it.
	 *
	 * Existing content is never modified: each item captures the section's content
	 * exactly as it stands.
	 *
	 * The tenancy predicate is in the JOIN, not in a JS filter afterwards. Selecting
	 * unlinked sections and discarding other tenants' rows in JavaScript still reads
	 * every tenant's `content` blobs across the wire first -- a full table scan and an
	 * allocation proportional to the whole table, on a request the UI fires once per user
	 * the first time they open the library. The join lets the database throw the other
	 * tenants' rows away before they are ever materialised.
	 */
	backfill: protectedProcedure.mutation(async ({ ctx }) => {
		const unlinked = await ctx.db
			.select({
				id: sections.id,
				resumeId: sections.resumeId,
				type: sections.type,
				content: sections.content,
			})
			.from(sections)
			.innerJoin(resumes, eq(sections.resumeId, resumes.id))
			.where(
				and(isNull(sections.contentItemId), eq(resumes.userId, ctx.userId)),
			);

		if (unlinked.length === 0) return { created: 0 };

		let created = 0;
		for (const section of unlinked) {
			const content = parsePayload(section.content);
			const [item] = await ctx.db
				.insert(contentItems)
				.values({
					userId: ctx.userId,
					type: section.type as never,
					title: summariseForTitle(section.type, content),
					payload: section.content,
				})
				.returning({ id: contentItems.id });
			if (!item) continue;
			await ctx.db
				.update(sections)
				.set({ contentItemId: item.id })
				.where(eq(sections.id, section.id));
			created++;
		}
		return { created };
	}),
});
