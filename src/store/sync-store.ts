'use client';

/**
 * API Sync Store
 * 
 * This store manages synchronization between the Zustand store
 * and the GraphQL API backend. 
 * No localStorage - all data comes from the API.
 */

import { create } from 'zustand';
import { apiRequest } from '@/lib/graphql-client';
import * as queries from '@/lib/graphql-queries';
import type { Resume, ResumeSection } from '@/types/resume';
import { TEMPLATE_CONFIGS, DEFAULT_TYPOGRAPHY } from '@/types/resume';
import type { FontFamily } from '@/types/resume';

interface SyncState {
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  
  // Actions
  syncToServer: (userId: string) => Promise<void>;
  fetchFromServer: (userId: string) => Promise<Resume[]>;
}

export const useSyncStore = create<SyncState>()(
    (set, get) => ({
      lastSyncedAt: null,
      isSyncing: false,
      syncError: null,

      syncToServer: async (userId: string) => {
        set({ isSyncing: true, syncError: null });

        try {
          set({ 
            lastSyncedAt: new Date().toISOString(),
            isSyncing: false,
          });
        } catch (err) {
          set({ 
            syncError: err instanceof Error ? err.message : 'Sync failed',
            isSyncing: false,
          });
        }
      },

      fetchFromServer: async (userId: string): Promise<Resume[]> => {
        set({ isSyncing: true, syncError: null });

        try {
          // Fetch all resumes for user
          const { resumes } = await apiRequest<{ resumes: APIResume[] }>(
            queries.GET_RESUMES,
            { userId }
          );

          // Fetch sections for each resume
          const fullResumes: Resume[] = await Promise.all(
            resumes.map(async (resume) => {
              const { sectionsByResume } = await apiRequest<{ sectionsByResume: APISection[] }>(
                queries.GET_SECTIONS_BY_RESUME,
                { resumeId: resume.id }
              );

              return convertAPIResumeToLocal(resume, sectionsByResume);
            })
          );

          set({ 
            lastSyncedAt: new Date().toISOString(),
            isSyncing: false,
          });

          return fullResumes;
        } catch (err) {
          set({ 
            syncError: err instanceof Error ? err.message : 'Fetch failed',
            isSyncing: false,
          });
          return [];
        }
      },
    })
);

// ============================================
// Type Definitions for API responses
// ============================================

interface APIResume {
  id: string;
  userId: string;
  name: string;
  variationType: string;
  template: string;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

interface APISection {
  id: string;
  resumeId: string;
  type: string;
  order: number;
  visible: boolean;
  content: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Conversion Helpers
// ============================================

function convertAPIResumeToLocal(apiResume: APIResume, apiSections: APISection[]): Resume {
  const sections: ResumeSection[] = apiSections
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      type: s.type as ResumeSection['type'],
      order: s.order,
      visible: s.visible,
      content: s.content as unknown as ResumeSection['content'],
    }));

  const template = apiResume.template as Resume['template'];
  
  return {
    id: apiResume.id,
    name: apiResume.name,
    variationType: apiResume.variationType as 'base' | 'variation',
    createdAt: apiResume.createdAt,
    updatedAt: apiResume.updatedAt,
    template,
    sections,
    tags: apiResume.tags,
    isArchived: apiResume.isArchived,
    metadata: {
      personalInfo: { fullName: '', email: '' },
      settings: {
        pageSize: 'A4' as const,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        fontSize: 11,
        fontScale: 1.0,
        typography: { ...DEFAULT_TYPOGRAPHY },
        lineHeight: 1.5,
        fontFamily: 'Inter' as FontFamily,
        colors: TEMPLATE_CONFIGS[template]?.defaultColors || TEMPLATE_CONFIGS.modern.defaultColors,
        sectionSpacing: 'normal' as const,
        showIcons: true,
        dateFormat: 'MMM YYYY' as const,
        accentStyle: 'underline' as const,
      },
    },
  };
}

export function convertLocalResumeToAPI(resume: Resume, userId: string): {
  resume: Omit<APIResume, 'createdAt' | 'updatedAt'>;
  sections: Omit<APISection, 'createdAt' | 'updatedAt'>[];
} {
  return {
    resume: {
      id: resume.id,
      userId,
      name: resume.name,
      variationType: resume.variationType,
      template: resume.template,
      tags: resume.tags || [],
      isArchived: resume.isArchived || false,
    },
    sections: resume.sections.map((s) => ({
      id: s.id,
      resumeId: resume.id,
      type: s.type,
      order: s.order,
      visible: s.visible,
      content: s.content as unknown as Record<string, unknown>,
    })),
  };
}
