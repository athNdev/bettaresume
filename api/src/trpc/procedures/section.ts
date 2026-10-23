import {
	bulkUpsertSectionsInputSchema,
	createSectionInputSchema,
	reorderSectionsInputSchema,
	sectionContentSchema,
	sectionLayoutSchema,
	setSectionLinkInputSchema,
	sectionTypeSchema,
	updateSectionInputSchema,
} from "@bettaresume/types";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { resumes, sections } from "../../db/schema";
import { protectedProcedure, router } from "../index";
import { sectionScopeError, sectionWriteScope } from "../middleware/ownership";
import { maybeSnapshot } from "./revision";

export const sectionRouter = router({
	/**
	 * List all sections for a resume
	 */
	listByResume: protectedProcedure
		.input(z.object({ resumeId: z.string() }))
		.query(async ({ ctx, input }) => {
			// Verify resume ownership
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!resume) {
				throw new Error("Resume not found or access denied");
			}

			const resumeSections = await ctx.db.query.sections.findMany({
				where: eq(sections.resumeId, input.resumeId),
				orderBy: [asc(sections.order)],
			});

			return resumeSections.map((section) => ({
				...section,
				content: JSON.parse(section.content || "{}"),
			}));
		}),

	/**
	 * Get a single section by ID
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const section = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, input.id),
				with: {
					resume: true,
				},
			});

			if (!section || section.resume.userId !== ctx.userId) {
				return null;
			}

			return {
				...section,
				content: JSON.parse(section.content || "{}"),
			};
		}),

	/**
	 * Create a new section
	 */
	create: protectedProcedure
		.input(createSectionInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify resume ownership
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!resume) {
				throw new Error("Resume not found or access denied");
			}

			const now = new Date();
			const sectionId = crypto.randomUUID();

			// Get max order for existing sections
			const existingSections = await ctx.db.query.sections.findMany({
				where: eq(sections.resumeId, input.resumeId),
			});
			const maxOrder = Math.max(0, ...existingSections.map((s) => s.order));

			await ctx.db.insert(sections).values({
				id: sectionId,
				resumeId: input.resumeId,
				type: input.type,
				order: input.order ?? maxOrder + 1,
				visible: input.visible ?? true,
				content: JSON.stringify(input.content),
				createdAt: now,
				updatedAt: now,
			});

			// Update resume's updatedAt
			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, input.resumeId));

			await maybeSnapshot(ctx.db, input.resumeId);

			const newSection = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, sectionId),
			});

			return newSection
				? {
						...newSection,
						content: JSON.parse(newSection.content || "{}"),
					}
				: null;
		}),

	/**
	 * Update an existing section
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				data: updateSectionInputSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Get section and verify ownership through resume
			const section = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, input.id),
				with: {
					resume: true,
				},
			});

			if (!section || section.resume.userId !== ctx.userId) {
				throw new Error("Section not found or access denied");
			}

			const now = new Date();
			const updateData: Record<string, unknown> = {
				updatedAt: now,
			};

			if (input.data.type !== undefined) updateData.type = input.data.type;
			if (input.data.order !== undefined) updateData.order = input.data.order;
			if (input.data.visible !== undefined)
				updateData.visible = input.data.visible;
			if (input.data.content !== undefined)
				updateData.content = JSON.stringify(input.data.content);

			// "Linked until you edit it" has to be mechanical, or it is a description of
			// intent. Editing a linked variant section *is* taking it over, so the link is
			// dropped here rather than requiring a second, separate gesture the user would
			// never discover. `visible` and `order` are deliberately not enough: a variant
			// exists to hide and reorder sections, and doing so must not freeze their text.
			const changesOwnedContent =
				input.data.content !== undefined || input.data.type !== undefined;
			if (changesOwnedContent && section.baseSectionId && section.linkedToBase) {
				updateData.linkedToBase = false;
			}

			await ctx.db
				.update(sections)
				.set(updateData)
				.where(sectionWriteScope(input.id, section.resumeId));

			// Editing a *base* section propagates to every variant that still follows it.
			// Without this, "linked" means only "was linked at creation time": the base
			// could change all day and no variant would notice, which is the opposite of
			// what a linked section promises. Done in one indexed update rather than a
			// read-then-write per variant.
			if (changesOwnedContent && !section.baseSectionId) {
				const propagated: Record<string, unknown> = { updatedAt: now };
				if (input.data.content !== undefined)
					propagated.content = JSON.stringify(input.data.content);
				if (input.data.type !== undefined) propagated.type = input.data.type;

				await ctx.db
					.update(sections)
					.set(propagated)
					.where(
						and(
							eq(sections.baseSectionId, section.id),
							eq(sections.linkedToBase, true),
						),
					);
			}

			// Update resume's updatedAt
			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, section.resumeId));

			await maybeSnapshot(ctx.db, section.resumeId);

			const updated = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, input.id),
			});

			return updated
				? {
						...updated,
						content: JSON.parse(updated.content || "{}"),
					}
				: null;
		}),

	/**
	 * Link or detach one section from the base resume it mirrors.
	 *
	 * Linking pulls the base content immediately: a link that leaves the two copies
	 * different is not a link, it is a label. Detaching writes only the flag, because
	 * the current copy is what the user chose to keep.
	 *
	 * Deliberately per section. A variant that wants a tailored summary but a shared
	 * experience block is the normal case, not the exception, and a per-resume switch
	 * cannot express it.
	 */
	setLink: protectedProcedure
		.input(setSectionLinkInputSchema)
		.mutation(async ({ ctx, input }) => {
			const section = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, input.id),
				with: { resume: true },
			});

			if (!section || section.resume.userId !== ctx.userId) {
				throw new Error("Section not found or access denied");
			}
			if (!section.baseSectionId) {
				throw new Error("This section has no base counterpart to link to");
			}

			const now = new Date();

			if (!input.linked) {
				await ctx.db
					.update(sections)
					.set({ linkedToBase: false, updatedAt: now })
					.where(sectionWriteScope(section.id, section.resumeId));
			} else {
				const base = await ctx.db.query.sections.findFirst({
					where: eq(sections.id, section.baseSectionId),
					with: { resume: true },
				});

				// The pointer survives the base section's deletion only via ON DELETE SET NULL.
				// If it is dangling anyway, refuse rather than link to nothing.
				if (!base || base.resume.userId !== ctx.userId) {
					throw new Error("The base section is no longer available");
				}

				await ctx.db
					.update(sections)
					.set({
						linkedToBase: true,
						type: base.type,
						content: base.content,
						contentItemId: base.contentItemId ?? null,
						updatedAt: now,
					})
					.where(sectionWriteScope(section.id, section.resumeId));
			}

			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, section.resumeId));

			await maybeSnapshot(ctx.db, section.resumeId, {
				force: true,
				label: input.linked ? "Section linked to base" : "Section detached",
			});

			const updated = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, section.id),
			});

			return updated
				? { ...updated, content: JSON.parse(updated.content || "{}") }
				: null;
		}),

	/**
	 * Upsert a section (create if not exists, update if exists)
	 */
	upsert: protectedProcedure
		.input(
			z.object({
				id: z.string().optional(),
				resumeId: z.string(),
				type: sectionTypeSchema,
				order: z.number(),
				visible: z.boolean(),
				content: sectionContentSchema,
				layout: sectionLayoutSchema.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify resume ownership
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!resume) {
				throw new Error("Resume not found or access denied");
			}

			const now = new Date();
			const sectionId = input.id ?? crypto.randomUUID();

			// Check if the section already exists WITHIN THIS RESUME. The resumeId
			// scope is the authorisation boundary: without it, any authenticated
			// caller could pass another tenant's section id and overwrite that row.
			const existing = input.id
				? await ctx.db.query.sections.findFirst({
						where: sectionWriteScope(input.id, input.resumeId),
					})
				: null;

			// An explicit id that is not inside this resume means either a stale id or
			// an attempt to reach across tenants. Reject instead of silently inserting
			// under someone else's primary key.
			if (input.id && !existing) {
				throw sectionScopeError();
			}

			if (existing) {
				// Update. A linked variant section is detached by the write for the same
				// reason as `update`: this path overwrites content, so it is a takeover.
				await ctx.db
					.update(sections)
					.set({
						type: input.type,
						order: input.order,
						visible: input.visible,
						content: JSON.stringify(input.content),
						...(existing.baseSectionId && existing.linkedToBase
							? { linkedToBase: false }
							: {}),
						updatedAt: now,
					})
					.where(sectionWriteScope(input.id!, input.resumeId));
			} else {
				// Insert
				await ctx.db.insert(sections).values({
					id: sectionId,
					resumeId: input.resumeId,
					type: input.type,
					order: input.order,
					visible: input.visible,
					content: JSON.stringify(input.content),
					createdAt: now,
					updatedAt: now,
				});
			}

			// Update resume's updatedAt
			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, input.resumeId));

			await maybeSnapshot(ctx.db, input.resumeId);

			const result = await ctx.db.query.sections.findFirst({
				where: sectionWriteScope(sectionId, input.resumeId),
			});

			return result
				? {
						...result,
						content: JSON.parse(result.content || "{}"),
					}
				: null;
		}),

	/**
	 * Bulk upsert sections (for saving all sections at once)
	 */
	bulkUpsert: protectedProcedure
		.input(bulkUpsertSectionsInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify resume ownership
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!resume) {
				throw new Error("Resume not found or access denied");
			}

			const now = new Date();
			const results: Array<{ id: string; type: string }> = [];

			// Validate every supplied id BEFORE writing anything. This procedure is
			// not transactional, so a single out-of-scope id discovered mid-loop would
			// leave the earlier entries applied. Same tenant boundary as upsert.
			for (const sectionData of input.sections) {
				if (!sectionData.id) continue;

				const owned = await ctx.db.query.sections.findFirst({
					where: sectionWriteScope(sectionData.id, input.resumeId),
				});

				if (!owned) {
					throw sectionScopeError();
				}
			}

			for (const sectionData of input.sections) {
				const sectionId = sectionData.id ?? crypto.randomUUID();

				// Scoped to this resume: an unscoped lookup here is what let a caller
				// overwrite another tenant's section by passing its id.
				const existing = sectionData.id
					? await ctx.db.query.sections.findFirst({
							where: sectionWriteScope(sectionData.id, input.resumeId),
						})
					: null;

				if (existing) {
					await ctx.db
						.update(sections)
						.set({
							type: sectionData.type,
							order: sectionData.order,
							visible: sectionData.visible,
							content: JSON.stringify(sectionData.content),
							updatedAt: now,
						})
						.where(sectionWriteScope(sectionData.id!, input.resumeId));
				} else {
					await ctx.db.insert(sections).values({
						id: sectionId,
						resumeId: input.resumeId,
						type: sectionData.type,
						order: sectionData.order,
						visible: sectionData.visible,
						content: JSON.stringify(sectionData.content),
						createdAt: now,
						updatedAt: now,
					});
				}

				results.push({ id: sectionId, type: sectionData.type });
			}

			// Update resume's updatedAt
			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, input.resumeId));

			return { success: true, sections: results };
		}),

	/**
	 * Reorder sections
	 */
	reorder: protectedProcedure
		.input(reorderSectionsInputSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify resume ownership
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!resume) {
				throw new Error("Resume not found or access denied");
			}

			const now = new Date();

			// Update order for each section
			for (let i = 0; i < input.sectionIds.length; i++) {
				const sectionId = input.sectionIds[i];
				if (!sectionId) continue;

				await ctx.db
					.update(sections)
					.set({ order: i, updatedAt: now })
					.where(
						and(
							eq(sections.id, sectionId),
							eq(sections.resumeId, input.resumeId),
						),
					);
			}

			// Update resume's updatedAt
			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, input.resumeId));

			await maybeSnapshot(ctx.db, input.resumeId);

			return { success: true };
		}),

	/**
	 * Delete a section
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Get section and verify ownership through resume
			const section = await ctx.db.query.sections.findFirst({
				where: eq(sections.id, input.id),
				with: {
					resume: true,
				},
			});

			if (!section || section.resume.userId !== ctx.userId) {
				throw new Error("Section not found or access denied");
			}

			await ctx.db
				.delete(sections)
				.where(sectionWriteScope(input.id, section.resumeId));

			// Update resume's updatedAt
			await ctx.db
				.update(resumes)
				.set({ updatedAt: new Date() })
				.where(eq(resumes.id, section.resumeId));

			await maybeSnapshot(ctx.db, section.resumeId);

			return { success: true, id: input.id };
		}),
});
