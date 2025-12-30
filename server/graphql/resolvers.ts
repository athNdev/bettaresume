import { db, users, resumes, sections } from '../db';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Types for inputs
interface CreateUserInput {
  email: string;
}

interface UpdateUserInput {
  email?: string;
}

interface CreateResumeInput {
  userId: string;
  name: string;
  variationType?: string;
  template?: string;
  tags?: string[];
  isArchived?: boolean;
}

interface UpdateResumeInput {
  name?: string;
  variationType?: string;
  template?: string;
  tags?: string[];
  isArchived?: boolean;
}

interface CreateSectionInput {
  resumeId: string;
  type: string;
  order?: number;
  visible?: boolean;
  content: Record<string, unknown>;
}

interface UpdateSectionInput {
  type?: string;
  order?: number;
  visible?: boolean;
  content?: Record<string, unknown>;
}

export const resolvers = {
  // Custom scalars
  DateTime: {
    serialize: (value: Date) => value.toISOString(),
    parseValue: (value: string) => new Date(value),
  },
  JSON: {
    serialize: (value: unknown) => value,
    parseValue: (value: unknown) => value,
  },

  // Type resolvers
  User: {
    resumes: async (parent: { id: string }) => {
      return db.select().from(resumes).where(eq(resumes.userId, parent.id));
    },
  },

  Resume: {
    user: async (parent: { userId: string }) => {
      const result = await db.select().from(users).where(eq(users.id, parent.userId));
      return result[0] || null;
    },
    sections: async (parent: { id: string }) => {
      return db.select().from(sections).where(eq(sections.resumeId, parent.id));
    },
    tags: (parent: { tags: string[] | null }) => parent.tags || [],
  },

  Section: {
    resume: async (parent: { resumeId: string }) => {
      const result = await db.select().from(resumes).where(eq(resumes.id, parent.resumeId));
      return result[0] || null;
    },
  },

  // Query resolvers
  Query: {
    // Users
    user: async (_: unknown, { id }: { id: string }) => {
      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0] || null;
    },

    userByEmail: async (_: unknown, { email }: { email: string }) => {
      const result = await db.select().from(users).where(eq(users.email, email));
      return result[0] || null;
    },

    users: async () => {
      return db.select().from(users);
    },

    // Resumes
    resume: async (_: unknown, { id }: { id: string }) => {
      const result = await db.select().from(resumes).where(eq(resumes.id, id));
      return result[0] || null;
    },

    resumes: async (_: unknown, { userId, isArchived }: { userId?: string; isArchived?: boolean }) => {
      let query = db.select().from(resumes);
      
      if (userId && isArchived !== undefined) {
        return db.select().from(resumes).where(
          and(eq(resumes.userId, userId), eq(resumes.isArchived, isArchived))
        );
      } else if (userId) {
        return db.select().from(resumes).where(eq(resumes.userId, userId));
      } else if (isArchived !== undefined) {
        return db.select().from(resumes).where(eq(resumes.isArchived, isArchived));
      }
      
      return query;
    },

    resumesByUser: async (_: unknown, { userId }: { userId: string }) => {
      return db.select().from(resumes).where(eq(resumes.userId, userId));
    },

    // Sections
    section: async (_: unknown, { id }: { id: string }) => {
      const result = await db.select().from(sections).where(eq(sections.id, id));
      return result[0] || null;
    },

    sectionsByResume: async (_: unknown, { resumeId }: { resumeId: string }) => {
      return db.select().from(sections).where(eq(sections.resumeId, resumeId));
    },
  },

  // Mutation resolvers
  Mutation: {
    // User mutations
    createUser: async (_: unknown, { input }: { input: CreateUserInput }) => {
      const id = uuidv4();
      const now = new Date();
      
      await db.insert(users).values({
        id,
        email: input.email,
        createdAt: now,
        updatedAt: now,
      });

      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    },

    updateUser: async (_: unknown, { id, input }: { id: string; input: UpdateUserInput }) => {
      await db.update(users)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(users.id, id));

      const result = await db.select().from(users).where(eq(users.id, id));
      return result[0];
    },

    deleteUser: async (_: unknown, { id }: { id: string }) => {
      await db.delete(users).where(eq(users.id, id));
      return true;
    },

    // Resume mutations
    createResume: async (_: unknown, { input }: { input: CreateResumeInput }) => {
      const id = `resume-${uuidv4()}`;
      const now = new Date();

      await db.insert(resumes).values({
        id,
        userId: input.userId,
        name: input.name,
        variationType: input.variationType || 'base',
        template: input.template || 'modern',
        tags: input.tags || [],
        isArchived: input.isArchived || false,
        createdAt: now,
        updatedAt: now,
      });

      const result = await db.select().from(resumes).where(eq(resumes.id, id));
      return result[0];
    },

    updateResume: async (_: unknown, { id, input }: { id: string; input: UpdateResumeInput }) => {
      await db.update(resumes)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(resumes.id, id));

      const result = await db.select().from(resumes).where(eq(resumes.id, id));
      return result[0];
    },

    deleteResume: async (_: unknown, { id }: { id: string }) => {
      await db.delete(resumes).where(eq(resumes.id, id));
      return true;
    },

    archiveResume: async (_: unknown, { id }: { id: string }) => {
      await db.update(resumes)
        .set({ isArchived: true, updatedAt: new Date() })
        .where(eq(resumes.id, id));

      const result = await db.select().from(resumes).where(eq(resumes.id, id));
      return result[0];
    },

    unarchiveResume: async (_: unknown, { id }: { id: string }) => {
      await db.update(resumes)
        .set({ isArchived: false, updatedAt: new Date() })
        .where(eq(resumes.id, id));

      const result = await db.select().from(resumes).where(eq(resumes.id, id));
      return result[0];
    },

    duplicateResume: async (_: unknown, { id, newName }: { id: string; newName: string }) => {
      // Get original resume
      const originalResult = await db.select().from(resumes).where(eq(resumes.id, id));
      const original = originalResult[0];
      
      if (!original) throw new Error('Resume not found');

      // Create new resume
      const newId = `resume-${uuidv4()}`;
      const now = new Date();

      await db.insert(resumes).values({
        id: newId,
        userId: original.userId,
        name: newName,
        variationType: original.variationType,
        template: original.template,
        tags: original.tags,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      });

      // Copy sections
      const originalSections = await db.select().from(sections).where(eq(sections.resumeId, id));
      
      for (const section of originalSections) {
        await db.insert(sections).values({
          id: `sec-${uuidv4()}`,
          resumeId: newId,
          type: section.type,
          order: section.order,
          visible: section.visible,
          content: section.content,
          createdAt: now,
          updatedAt: now,
        });
      }

      const result = await db.select().from(resumes).where(eq(resumes.id, newId));
      return result[0];
    },

    // Section mutations
    createSection: async (_: unknown, { input }: { input: CreateSectionInput }) => {
      const id = `sec-${uuidv4()}`;
      const now = new Date();

      await db.insert(sections).values({
        id,
        resumeId: input.resumeId,
        type: input.type,
        order: input.order ?? 0,
        visible: input.visible ?? true,
        content: input.content,
        createdAt: now,
        updatedAt: now,
      });

      const result = await db.select().from(sections).where(eq(sections.id, id));
      return result[0];
    },

    updateSection: async (_: unknown, { id, input }: { id: string; input: UpdateSectionInput }) => {
      await db.update(sections)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(sections.id, id));

      const result = await db.select().from(sections).where(eq(sections.id, id));
      return result[0];
    },

    deleteSection: async (_: unknown, { id }: { id: string }) => {
      await db.delete(sections).where(eq(sections.id, id));
      return true;
    },

    reorderSections: async (_: unknown, { resumeId, sectionIds }: { resumeId: string; sectionIds: string[] }) => {
      const now = new Date();
      
      // Update order for each section
      for (let i = 0; i < sectionIds.length; i++) {
        await db.update(sections)
          .set({ order: i, updatedAt: now })
          .where(eq(sections.id, sectionIds[i]));
      }

      return db.select().from(sections).where(eq(sections.resumeId, resumeId));
    },
  },
};
