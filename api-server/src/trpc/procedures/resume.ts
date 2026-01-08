import { z } from 'zod';
import { eq, and, desc } from 'drizzle-orm';
import { router, protectedProcedure } from '../index';
import { resumes, sections } from '../../db/schema';
import {
  createResumeInputSchema,
  updateResumeInputSchema,
  templateTypeSchema,
} from '@bettaresume/types';

export const resumeRouter = router({
  /**
   * List all resumes for the current user
   */
  list: protectedProcedure
    .input(
      z.object({
        includeArchived: z.boolean().optional().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const includeArchived = input?.includeArchived ?? false;

      const userResumes = await ctx.db.query.resumes.findMany({
        where: includeArchived
          ? eq(resumes.userId, ctx.userId)
          : and(eq(resumes.userId, ctx.userId), eq(resumes.isArchived, false)),
        with: {
          sections: true,
        },
        orderBy: [desc(resumes.updatedAt)],
      });

      // Parse JSON fields
      return userResumes.map((resume) => ({
        ...resume,
        tags: JSON.parse(resume.tags || '[]') as string[],
        metadata: resume.metadata ? JSON.parse(resume.metadata) : null,
        sections: resume.sections.map((section) => ({
          ...section,
          content: JSON.parse(section.content || '{}'),
        })),
      }));
    }),

  /**
   * Get a single resume by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const resume = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
        with: {
          sections: {
            orderBy: (sections, { asc }) => [asc(sections.order)],
          },
        },
      });

      if (!resume) {
        return null;
      }

      return {
        ...resume,
        tags: JSON.parse(resume.tags || '[]') as string[],
        metadata: resume.metadata ? JSON.parse(resume.metadata) : null,
        sections: resume.sections.map((section) => ({
          ...section,
          content: JSON.parse(section.content || '{}'),
        })),
      };
    }),

  /**
   * Create a new resume
   */
  create: protectedProcedure
    .input(createResumeInputSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const resumeId = crypto.randomUUID();

      // Create default metadata if not provided
      const defaultMetadata = {
        personalInfo: {
          fullName: 'Your Name',
          email: '',
          phone: '',
          location: '',
          professionalTitle: '',
          linkedin: '',
          website: '',
          github: '',
          portfolio: '',
        },
        settings: {
          pageSize: 'Letter' as const,
          margins: { top: 40, right: 40, bottom: 40, left: 40 },
          fontSize: 11,
          fontScale: 1,
          typography: {
            name: 24,
            title: 14,
            sectionHeading: 14,
            itemTitle: 12,
            body: 11,
            small: 9,
          },
          lineHeight: 1.5,
          fontFamily: 'Inter' as const,
          colors: {
            primary: '#2563eb',
            secondary: '#64748b',
            text: '#1e293b',
            heading: '#1e293b',
            accent: '#0891b2',
            background: '#ffffff',
            divider: '#e2e8f0',
          },
          sectionSpacing: 'normal' as const,
          showIcons: true,
          dateFormat: 'MMM YYYY' as const,
          accentStyle: 'underline' as const,
        },
      };

      await ctx.db.insert(resumes).values({
        id: resumeId,
        userId: ctx.userId,
        name: input.name,
        variationType: input.variationType ?? 'base',
        baseResumeId: input.baseResumeId ?? null,
        domain: input.domain ?? null,
        template: input.template ?? 'modern',
        tags: JSON.stringify(input.tags ?? []),
        isArchived: input.isArchived ?? false,
        metadata: JSON.stringify(input.metadata ?? defaultMetadata),
        createdAt: now,
        updatedAt: now,
      });

      return ctx.db.query.resumes.findFirst({
        where: eq(resumes.id, resumeId),
        with: {
          sections: true,
        },
      }).then((resume) => {
        if (!resume) return null;
        return {
          ...resume,
          tags: JSON.parse(resume.tags || '[]') as string[],
          metadata: resume.metadata ? JSON.parse(resume.metadata) : null,
          sections: resume.sections.map((section) => ({
            ...section,
            content: JSON.parse(section.content || '{}'),
          })),
        };
      });
    }),

  /**
   * Update an existing resume
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateResumeInputSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();

      // Verify ownership
      const existing = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
      });

      if (!existing) {
        throw new Error('Resume not found or access denied');
      }

      const updateData: Record<string, unknown> = {
        updatedAt: now,
      };

      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.variationType !== undefined) updateData.variationType = input.data.variationType;
      if (input.data.baseResumeId !== undefined) updateData.baseResumeId = input.data.baseResumeId;
      if (input.data.domain !== undefined) updateData.domain = input.data.domain;
      if (input.data.template !== undefined) updateData.template = input.data.template;
      if (input.data.tags !== undefined) updateData.tags = JSON.stringify(input.data.tags);
      if (input.data.isArchived !== undefined) updateData.isArchived = input.data.isArchived;
      if (input.data.metadata !== undefined) {
        updateData.metadata = input.data.metadata ? JSON.stringify(input.data.metadata) : null;
      }

      await ctx.db.update(resumes).set(updateData).where(eq(resumes.id, input.id));

      return ctx.db.query.resumes.findFirst({
        where: eq(resumes.id, input.id),
        with: {
          sections: true,
        },
      }).then((resume) => {
        if (!resume) return null;
        return {
          ...resume,
          tags: JSON.parse(resume.tags || '[]') as string[],
          metadata: resume.metadata ? JSON.parse(resume.metadata) : null,
          sections: resume.sections.map((section) => ({
            ...section,
            content: JSON.parse(section.content || '{}'),
          })),
        };
      });
    }),

  /**
   * Delete a resume
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
      });

      if (!existing) {
        throw new Error('Resume not found or access denied');
      }

      await ctx.db.delete(resumes).where(eq(resumes.id, input.id));

      return { success: true, id: input.id };
    }),

  /**
   * Duplicate a resume
   */
  duplicate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const newResumeId = crypto.randomUUID();

      // Get original resume with sections
      const original = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
        with: {
          sections: true,
        },
      });

      if (!original) {
        throw new Error('Resume not found or access denied');
      }

      // Create new resume
      await ctx.db.insert(resumes).values({
        id: newResumeId,
        userId: ctx.userId,
        name: input.newName ?? `${original.name} (Copy)`,
        variationType: original.variationType,
        baseResumeId: original.baseResumeId,
        domain: original.domain,
        template: original.template,
        tags: original.tags,
        isArchived: false,
        metadata: original.metadata,
        createdAt: now,
        updatedAt: now,
      });

      // Duplicate sections
      for (const section of original.sections) {
        await ctx.db.insert(sections).values({
          id: crypto.randomUUID(),
          resumeId: newResumeId,
          type: section.type,
          order: section.order,
          visible: section.visible,
          content: section.content,
          createdAt: now,
          updatedAt: now,
        });
      }

      return ctx.db.query.resumes.findFirst({
        where: eq(resumes.id, newResumeId),
        with: {
          sections: true,
        },
      }).then((resume) => {
        if (!resume) return null;
        return {
          ...resume,
          tags: JSON.parse(resume.tags || '[]') as string[],
          metadata: resume.metadata ? JSON.parse(resume.metadata) : null,
          sections: resume.sections.map((section) => ({
            ...section,
            content: JSON.parse(section.content || '{}'),
          })),
        };
      });
    }),

  /**
   * Archive/unarchive a resume
   */
  archive: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        archived: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.query.resumes.findFirst({
        where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
      });

      if (!existing) {
        throw new Error('Resume not found or access denied');
      }

      await ctx.db
        .update(resumes)
        .set({
          isArchived: input.archived,
          updatedAt: new Date(),
        })
        .where(eq(resumes.id, input.id));

      return { success: true, id: input.id, archived: input.archived };
    }),
});
