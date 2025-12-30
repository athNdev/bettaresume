/**
 * Resume API Service
 * 
 * Provides methods to sync resumes between local store and GraphQL API.
 * Supports offline-first with background sync when online.
 */

import { apiRequest } from './graphql-client';
import * as queries from './graphql-queries';
import type { Resume, ResumeSection, FontFamily } from '@/types/resume';
import { TEMPLATE_CONFIGS, DEFAULT_TYPOGRAPHY } from '@/types/resume';

// ============================================
// API Types
// ============================================

export interface APIUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface APIResume {
  id: string;
  userId: string;
  name: string;
  variationType: string;
  template: string;
  tags: string[];
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: APISection[];
}

export interface APISection {
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
// User Operations
// ============================================

export async function getOrCreateUser(email: string): Promise<APIUser | null> {
  try {
    // Try to find existing user
    const { userByEmail } = await apiRequest<{ userByEmail: APIUser | null }>(
      queries.GET_USER_BY_EMAIL,
      { email }
    );
    
    if (userByEmail) {
      return userByEmail;
    }
    
    // Create new user
    const { createUser } = await apiRequest<{ createUser: APIUser }>(
      queries.CREATE_USER,
      { input: { email } }
    );
    
    return createUser;
  } catch (error) {
    console.error('Failed to get or create user:', error);
    return null;
  }
}

// ============================================
// Resume Operations
// ============================================

export async function fetchAllResumes(userId: string): Promise<Resume[]> {
  try {
    const { resumes } = await apiRequest<{ resumes: APIResume[] }>(
      queries.GET_RESUMES,
      { userId }
    );
    
    // Fetch sections for each resume
    const fullResumes = await Promise.all(
      resumes.map(async (resume) => {
        const { sectionsByResume } = await apiRequest<{ sectionsByResume: APISection[] }>(
          queries.GET_SECTIONS_BY_RESUME,
          { resumeId: resume.id }
        );
        return convertAPIResumeToLocal(resume, sectionsByResume);
      })
    );
    
    return fullResumes;
  } catch (error) {
    console.error('Failed to fetch resumes:', error);
    return [];
  }
}

export async function fetchResume(id: string): Promise<Resume | null> {
  try {
    const { resume } = await apiRequest<{ resume: APIResume | null }>(
      queries.GET_RESUME_WITH_SECTIONS,
      { id }
    );
    
    if (!resume) return null;
    
    return convertAPIResumeToLocal(resume, resume.sections || []);
  } catch (error) {
    console.error('Failed to fetch resume:', error);
    return null;
  }
}

export async function saveResume(resume: Resume, userId: string): Promise<boolean> {
  try {
    // Check if resume exists
    const { resume: existing } = await apiRequest<{ resume: APIResume | null }>(
      queries.GET_RESUME,
      { id: resume.id }
    );
    
    if (existing) {
      // Update existing resume
      await apiRequest(queries.UPDATE_RESUME, {
        id: resume.id,
        input: {
          name: resume.name,
          variationType: resume.variationType,
          template: resume.template,
          tags: resume.tags || [],
          isArchived: resume.isArchived || false,
        },
      });
    } else {
      // Create new resume
      await apiRequest(queries.CREATE_RESUME, {
        input: {
          userId,
          name: resume.name,
          variationType: resume.variationType || 'base',
          template: resume.template,
          tags: resume.tags || [],
          isArchived: resume.isArchived || false,
        },
      });
      
      // We need to update the ID if the server generated a different one
      // For now, we're using client-generated IDs
    }
    
    // Sync sections
    await syncSections(resume.id, resume.sections);
    
    return true;
  } catch (error) {
    console.error('Failed to save resume:', error);
    return false;
  }
}

async function syncSections(resumeId: string, localSections: ResumeSection[]): Promise<void> {
  // Get existing sections from server
  const { sectionsByResume: serverSections } = await apiRequest<{ sectionsByResume: APISection[] }>(
    queries.GET_SECTIONS_BY_RESUME,
    { resumeId }
  );
  
  const serverSectionIds = new Set(serverSections.map((s) => s.id));
  const localSectionIds = new Set(localSections.map((s) => s.id));
  
  // Delete sections that exist on server but not locally
  for (const serverSection of serverSections) {
    if (!localSectionIds.has(serverSection.id)) {
      await apiRequest(queries.DELETE_SECTION, { id: serverSection.id });
    }
  }
  
  // Create or update local sections
  for (const section of localSections) {
    if (serverSectionIds.has(section.id)) {
      // Update existing
      await apiRequest(queries.UPDATE_SECTION, {
        id: section.id,
        input: {
          type: section.type,
          order: section.order,
          visible: section.visible,
          content: section.content,
        },
      });
    } else {
      // Create new
      await apiRequest(queries.CREATE_SECTION, {
        input: {
          resumeId,
          type: section.type,
          order: section.order,
          visible: section.visible,
          content: section.content,
        },
      });
    }
  }
}

export async function deleteResumeFromServer(id: string): Promise<boolean> {
  try {
    await apiRequest(queries.DELETE_RESUME, { id });
    return true;
  } catch (error) {
    console.error('Failed to delete resume:', error);
    return false;
  }
}

export async function duplicateResumeOnServer(id: string, newName: string): Promise<Resume | null> {
  try {
    const { duplicateResume } = await apiRequest<{ duplicateResume: APIResume }>(
      queries.DUPLICATE_RESUME,
      { id, newName }
    );
    
    return convertAPIResumeToLocal(duplicateResume, duplicateResume.sections || []);
  } catch (error) {
    console.error('Failed to duplicate resume:', error);
    return null;
  }
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
      personalInfo: extractPersonalInfo(sections),
      settings: createDefaultSettings(template),
    },
  };
}

function extractPersonalInfo(sections: ResumeSection[]): { fullName: string; email: string } {
  const personalSection = sections.find((s) => s.type === 'personal-info');
  if (personalSection && personalSection.content.data) {
    const data = personalSection.content.data as Record<string, unknown>;
    const firstName = (data.firstName as string) || '';
    const lastName = (data.lastName as string) || '';
    return {
      fullName: `${firstName} ${lastName}`.trim(),
      email: (data.email as string) || '',
    };
  }
  return { fullName: '', email: '' };
}

function createDefaultSettings(template: Resume['template']) {
  return {
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
  };
}

// ============================================
// Sync Manager
// ============================================

export class ResumeSyncManager {
  private userId: string | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private isOnline = true;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.syncNow();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }
  
  setUserId(userId: string) {
    this.userId = userId;
  }
  
  startAutoSync(intervalMs = 30000) {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.userId) {
        this.syncNow();
      }
    }, intervalMs);
  }
  
  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  async syncNow(): Promise<void> {
    if (!this.userId || !this.isOnline) return;
    
    // This would integrate with the resume store to:
    // 1. Push local changes to server
    // 2. Pull server changes to local
    // For now, this is a placeholder for the full sync logic
    console.log('Syncing resumes...');
  }
  
  isConnected(): boolean {
    return this.isOnline;
  }
}

export const syncManager = new ResumeSyncManager();
