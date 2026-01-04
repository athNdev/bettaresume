import { z } from "zod";
import { createTRPCRouter } from "@/server/api/trpc";
import {
  ownedResumeProcedure,
  ownedSectionProcedure,
} from "@/server/api/procedures";

// Input schemas
const createSectionInput = z.object({
  resumeId: z.string(),
  type: z.string().min(1),
  order: z.number().int().default(0),
  visible: z.boolean().default(true),
  content: z.record(z.string(), z.unknown()),
});

const updateSectionInput = z.object({
  type: z.string().min(1).optional(),
  order: z.number().int().optional(),
  visible: z.boolean().optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

// Helper to serialize/parse content for SQLite
const serializeContent = (content: Record<string, unknown>): string =>
  JSON.stringify(content);

const parseContent = (content: string): Record<string, unknown> => {
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
};

// Transform section from DB to API response
const transformSection = (section: {
  id: string;
  resumeId: string;
  type: string;
  order: number;
  visible: boolean;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}) => ({
  ...section,
  content: parseContent(section.content),
});

export const sectionRouter = createTRPCRouter({
  // Get section by ID
  // Uses ownedSectionProcedure: ctx.section and ctx.resume are verified
  getById: ownedSectionProcedure
    .input(z.object({ id: z.string() }))
    .query(({ ctx }) => {
      return transformSection(ctx.section);
    }),

  // List sections by resume
  // Uses ownedResumeProcedure: ctx.resume is verified
  listByResume: ownedResumeProcedure
    .input(z.object({ resumeId: z.string() }))
    .query(async ({ ctx, input }) => {
      const sections = await ctx.db.section.findMany({
        where: { resumeId: input.resumeId },
        orderBy: { order: "asc" },
      });

      return sections.map(transformSection);
    }),

  // Create section
  // Uses ownedResumeProcedure: ctx.resume is verified
  create: ownedResumeProcedure
    .input(createSectionInput)
    .mutation(async ({ ctx, input }) => {
      const section = await ctx.db.section.create({
        data: {
          resumeId: input.resumeId,
          type: input.type,
          order: input.order,
          visible: input.visible,
          content: serializeContent(input.content),
        },
      });

      return transformSection(section);
    }),

  // Update section
  // Uses ownedSectionProcedure: ctx.section and ctx.resume are verified
  update: ownedSectionProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateSectionInput,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};

      if (input.data.type !== undefined) updateData.type = input.data.type;
      if (input.data.order !== undefined) updateData.order = input.data.order;
      if (input.data.visible !== undefined) updateData.visible = input.data.visible;
      if (input.data.content !== undefined)
        updateData.content = serializeContent(input.data.content);

      const section = await ctx.db.section.update({
        where: { id: input.id },
        data: updateData,
      });

      return transformSection(section);
    }),

  // Delete section
  // Uses ownedSectionProcedure: ctx.section and ctx.resume are verified
  delete: ownedSectionProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.section.delete({ where: { id: input.id } });
      return true;
    }),

  // Reorder sections
  // Uses ownedResumeProcedure: ctx.resume is verified
  reorder: ownedResumeProcedure
    .input(
      z.object({
        resumeId: z.string(),
        sectionIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update order for each section in a transaction
      await ctx.db.$transaction(
        input.sectionIds.map((sectionId, index) =>
          ctx.db.section.update({
            where: { id: sectionId },
            data: { order: index },
          })
        )
      );

      // Return updated sections
      const sections = await ctx.db.section.findMany({
        where: { resumeId: input.resumeId },
        orderBy: { order: "asc" },
      });

      return sections.map(transformSection);
    }),
});
