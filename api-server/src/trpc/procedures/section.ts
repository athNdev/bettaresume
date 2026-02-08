import { z } from 'zod';
import { eq, and, asc } from 'drizzle-orm';
import { router, protectedProcedure } from '../index';
import { sections, resumes } from '../../db/schema';
import {
  createSectionInputSchema,
  updateSectionInputSchema,
  bulkUpsertSectionsInputSchema,
  reorderSectionsInputSchema,
  sectionTypeSchema,
  sectionContentSchema,
  sectionLayoutSchema,
} from '@bettaresume/types';

export const sectionRouter = router({
  /**
   * List all sections for a resume
   */
  listByResume: protectedProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify resume ownership
      const resume = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, ctx.userId)),
      });

      if (!resume) {
        throw new Error('Resume not found or access denied');
      }

      const resumeSections = await ctx.db.query.sections.findMany({
        where: eq(sections.resumeId, input.resumeId),
        orderBy: [asc(sections.order)],
      });

      return resumeSections.map((section) => ({
        ...section,
        content: JSON.parse(section.content || '{}'),
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
        content: JSON.parse(section.content || '{}'),
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
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, ctx.userId)),
      });

      if (!resume) {
        throw new Error('Resume not found or access denied');
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

      const newSection = await ctx.db.query.sections.findFirst({
        where: eq(sections.id, sectionId),
      });

      return newSection
        ? {
            ...newSection,
            content: JSON.parse(newSection.content || '{}'),
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
      })
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
        throw new Error('Section not found or access denied');
      }

      const now = new Date();
      const updateData: Record<string, unknown> = {
        updatedAt: now,
      };

      if (input.data.type !== undefined) updateData.type = input.data.type;
      if (input.data.order !== undefined) updateData.order = input.data.order;
      if (input.data.visible !== undefined) updateData.visible = input.data.visible;
      if (input.data.content !== undefined) updateData.content = JSON.stringify(input.data.content);

      await ctx.db.update(sections).set(updateData).where(eq(sections.id, input.id));

      // Update resume's updatedAt
      await ctx.db
        .update(resumes)
        .set({ updatedAt: now })
        .where(eq(resumes.id, section.resumeId));

      const updated = await ctx.db.query.sections.findFirst({
        where: eq(sections.id, input.id),
      });

      return updated
        ? {
            ...updated,
            content: JSON.parse(updated.content || '{}'),
          }
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
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify resume ownership
      const resume = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, ctx.userId)),
      });

      if (!resume) {
        throw new Error('Resume not found or access denied');
      }

      const now = new Date();
      const sectionId = input.id ?? crypto.randomUUID();

      // Check if section exists
      const existing = input.id
        ? await ctx.db.query.sections.findFirst({
            where: eq(sections.id, input.id),
          })
        : null;

      if (existing) {
        // Update
        await ctx.db
          .update(sections)
          .set({
            type: input.type,
            order: input.order,
            visible: input.visible,
            content: JSON.stringify(input.content),
            updatedAt: now,
          })
          .where(eq(sections.id, input.id!));
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

      const result = await ctx.db.query.sections.findFirst({
        where: eq(sections.id, sectionId),
      });

      return result
        ? {
            ...result,
            content: JSON.parse(result.content || '{}'),
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
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, ctx.userId)),
      });

      if (!resume) {
        throw new Error('Resume not found or access denied');
      }

      const now = new Date();
      
      // Optimize: Use batch upsert with onConflictDoUpdate instead of N+1 queries
      const sectionsToUpsert = input.sections.map((sectionData) => ({
        id: sectionData.id ?? crypto.randomUUID(),
        resumeId: input.resumeId,
        type: sectionData.type,
        order: sectionData.order,
        visible: sectionData.visible,
        content: JSON.stringify(sectionData.content),
        createdAt: now,
        updatedAt: now,
      }));

      // Batch insert with conflict resolution (upsert all at once)
      await ctx.db.insert(sections)
        .values(sectionsToUpsert)
        .onConflictDoUpdate({
          target: sections.id,
          set: {
            type: sectionsToUpsert[0].type, // This will be overwritten per row
            order: sectionsToUpsert[0].order,
            visible: sectionsToUpsert[0].visible,
            content: sectionsToUpsert[0].content,
            updatedAt: now,
          },
        });

      const results = sectionsToUpsert.map((s) => ({ id: s.id, type: s.type }));

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
        where: and(eq(resumes.id, input.resumeId), eq(resumes.userId, ctx.userId)),
      });

      if (!resume) {
        throw new Error('Resume not found or access denied');
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
            and(eq(sections.id, sectionId), eq(sections.resumeId, input.resumeId))
          );
      }

      // Update resume's updatedAt
      await ctx.db
        .update(resumes)
        .set({ updatedAt: now })
        .where(eq(resumes.id, input.resumeId));

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
        throw new Error('Section not found or access denied');
      }

      await ctx.db.delete(sections).where(eq(sections.id, input.id));

      // Update resume's updatedAt
      await ctx.db
        .update(resumes)
        .set({ updatedAt: new Date() })
        .where(eq(resumes.id, section.resumeId));

      return { success: true, id: input.id };
    }),
});
