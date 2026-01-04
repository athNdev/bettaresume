import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "@/server/api/trpc";
import { ownedResumeProcedure } from "@/server/api/procedures";

// Input schemas
const createResumeInput = z.object({
  name: z.string().min(1),
  variationType: z.string().default("base"),
  baseResumeId: z.string().optional(),
  domain: z.string().optional(),
  template: z.string().default("modern"),
  tags: z.array(z.string()).default([]),
  isArchived: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const updateResumeInput = z.object({
  name: z.string().min(1).optional(),
  variationType: z.string().optional(),
  baseResumeId: z.string().nullable().optional(),
  domain: z.string().nullable().optional(),
  template: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

// Helper to serialize tags/metadata for SQLite (stored as JSON string)
const serializeTags = (tags: string[]): string => JSON.stringify(tags);
const serializeMetadata = (metadata: Record<string, unknown> | null | undefined): string | null => 
  metadata ? JSON.stringify(metadata) : null;

// Helper to parse tags/metadata from SQLite
const parseTags = (tags: string | null): string[] => {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
};

const parseMetadata = (metadata: string | null): Record<string, unknown> | null => {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
};

// Transform resume from DB to API response
const transformResume = (resume: {
  id: string;
  userId: string;
  name: string;
  variationType: string;
  baseResumeId: string | null;
  domain: string | null;
  template: string;
  tags: string;
  isArchived: boolean;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
  sections?: unknown[];
  user?: unknown;
}) => ({
  ...resume,
  tags: parseTags(resume.tags),
  metadata: parseMetadata(resume.metadata),
});

export const resumeRouter = createTRPCRouter({
  // Get resume by ID
  // Uses ownedResumeProcedure: ctx.resume is verified
  getById: ownedResumeProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx }) => {
      // Fetch with relations since middleware only fetches base resume
      const resume = await ctx.db.resume.findUnique({
        where: { id: ctx.resume.id },
        include: { sections: true, user: true },
      });

      return transformResume(resume!);
    }),

  // List all resumes for current user
  list: protectedProcedure
    .input(z.object({
      isArchived: z.boolean().optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const resumes = await ctx.db.resume.findMany({
        where: {
          userId: ctx.session.user.id,
          ...(input?.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
        },
        include: { sections: true },
        orderBy: { updatedAt: "desc" },
      });

      return resumes.map(transformResume);
    }),

  // Get resumes by user ID (for admin or public profiles)
  listByUser: publicProcedure
    .input(z.object({
      userId: z.string(),
      isArchived: z.boolean().optional(),
    }))
    .query(async ({ ctx, input }) => {
      const resumes = await ctx.db.resume.findMany({
        where: {
          userId: input.userId,
          ...(input.isArchived !== undefined ? { isArchived: input.isArchived } : {}),
        },
        include: { sections: true },
        orderBy: { updatedAt: "desc" },
      });

      return resumes.map(transformResume);
    }),

  // Create resume
  create: protectedProcedure
    .input(createResumeInput)
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.db.resume.create({
        data: {
          userId: ctx.session.user.id,
          name: input.name,
          variationType: input.variationType,
          baseResumeId: input.baseResumeId,
          domain: input.domain,
          template: input.template,
          tags: serializeTags(input.tags),
          isArchived: input.isArchived,
          metadata: serializeMetadata(input.metadata),
        },
        include: { sections: true },
      });

      return transformResume(resume);
    }),

  // Update resume
  // Uses ownedResumeProcedure: ctx.resume is verified
  update: ownedResumeProcedure
    .input(z.object({
      id: z.string(),
      data: updateResumeInput,
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};
      
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.variationType !== undefined) updateData.variationType = input.data.variationType;
      if (input.data.baseResumeId !== undefined) updateData.baseResumeId = input.data.baseResumeId;
      if (input.data.domain !== undefined) updateData.domain = input.data.domain;
      if (input.data.template !== undefined) updateData.template = input.data.template;
      if (input.data.tags !== undefined) updateData.tags = serializeTags(input.data.tags);
      if (input.data.isArchived !== undefined) updateData.isArchived = input.data.isArchived;
      if (input.data.metadata !== undefined) updateData.metadata = serializeMetadata(input.data.metadata);

      const resume = await ctx.db.resume.update({
        where: { id: input.id },
        data: updateData,
        include: { sections: true },
      });

      return transformResume(resume);
    }),

  // Delete resume
  // Uses ownedResumeProcedure: ctx.resume is verified
  delete: ownedResumeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.resume.delete({ where: { id: input.id } });
      return true;
    }),

  // Archive resume
  // Uses ownedResumeProcedure: ctx.resume is verified
  archive: ownedResumeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.db.resume.update({
        where: { id: input.id },
        data: { isArchived: true },
        include: { sections: true },
      });

      return transformResume(resume);
    }),

  // Unarchive resume
  // Uses ownedResumeProcedure: ctx.resume is verified
  unarchive: ownedResumeProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const resume = await ctx.db.resume.update({
        where: { id: input.id },
        data: { isArchived: false },
        include: { sections: true },
      });

      return transformResume(resume);
    }),

  // Duplicate resume
  // Uses ownedResumeProcedure: ctx.resume is verified
  duplicate: ownedResumeProcedure
    .input(z.object({
      id: z.string(),
      newName: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get original resume with sections (middleware already verified ownership)
      const original = await ctx.db.resume.findUnique({
        where: { id: ctx.resume.id },
        include: { sections: true },
      });

      // Create new resume
      const newResume = await ctx.db.resume.create({
        data: {
          userId: ctx.session!.user.id,
          name: input.newName,
          variationType: original!.variationType,
          template: original!.template,
          tags: original!.tags,
          isArchived: false,
          domain: original!.domain,
          metadata: original!.metadata,
        },
      });

      // Copy sections
      if (original!.sections.length > 0) {
        await ctx.db.section.createMany({
          data: original!.sections.map((section) => ({
            resumeId: newResume.id,
            type: section.type,
            order: section.order,
            visible: section.visible,
            content: section.content,
          })),
        });
      }

      // Return with sections
      const result = await ctx.db.resume.findUnique({
        where: { id: newResume.id },
        include: { sections: true },
      });

      return transformResume(result!);
    }),
});
