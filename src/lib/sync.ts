/**
 * Sync Layer
 * 
 * Handles data syncing with two modes:
 * - dev: Uses localStorage only (no backend required)
 * - prod: Uses GraphQL backend for persistence
 * 
 * Run with: npm run dev (localStorage) or npm run prod (backend)
 */

import type { Resume, ResumeSection } from '@/types/resume';
import { apiRequest } from './graphql-client';
import * as queries from './graphql-queries';

// ============================================
// Configuration
// ============================================

// Use different storage keys for dev vs prod to ensure data isolation
const getStorageKey = () => {
  const mode = getStorageMode();
  return mode === 'dev' ? 'betta-resume-data-dev' : 'betta-resume-data-prod';
};

const getUserKey = () => {
  const mode = getStorageMode();
  return mode === 'dev' ? 'betta-resume-user-dev' : 'betta-resume-user-prod';
};

const BACKEND_STATUS_KEY = 'betta-backend-status';

export type StorageMode = 'dev' | 'prod';
export type BackendStatus = 'online' | 'offline' | 'unknown';

interface StoredData {
  resumes: Resume[];
  userId?: string;
  lastSyncedAt?: string;
}

// Get storage mode from environment
export function getStorageMode(): StorageMode {
  if (typeof window === 'undefined') return 'dev';
  const mode = process.env.NEXT_PUBLIC_STORAGE_MODE;
  return mode === 'prod' ? 'prod' : 'dev';
}

// ============================================
// Backend Health Check
// ============================================

let cachedBackendStatus: BackendStatus = 'unknown';
let lastHealthCheck: number = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

export async function checkBackendHealth(): Promise<BackendStatus> {
  const now = Date.now();
  
  // Use cached result if recent
  if (cachedBackendStatus !== 'unknown' && now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return cachedBackendStatus;
  }
  
  try {
    const graphqlUrl = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';
    const healthUrl = graphqlUrl.replace('/graphql', '/health');
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(3000), // 3 second timeout
    });
    
    cachedBackendStatus = response.ok ? 'online' : 'offline';
    lastHealthCheck = now;
    
    // Store status for other tabs
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(BACKEND_STATUS_KEY, JSON.stringify({
        status: cachedBackendStatus,
        timestamp: now,
      }));
    }
    
    return cachedBackendStatus;
  } catch {
    cachedBackendStatus = 'offline';
    lastHealthCheck = now;
    return 'offline';
  }
}

export function getBackendStatus(): BackendStatus {
  return cachedBackendStatus;
}

// ============================================
// Local Storage Operations
// ============================================

export function loadFromLocalStorage(): StoredData {
  if (typeof localStorage === 'undefined') {
    return { resumes: [] };
  }
  
  try {
    const storageKey = getStorageKey();
    const data = localStorage.getItem(storageKey);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        resumes: parsed.resumes || [],
        userId: parsed.userId,
        lastSyncedAt: parsed.lastSyncedAt,
      };
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }
  
  return { resumes: [] };
}

export function saveToLocalStorage(data: StoredData): void {
  if (typeof localStorage === 'undefined') return;
  
  try {
    const storageKey = getStorageKey();
    localStorage.setItem(storageKey, JSON.stringify({
      ...data,
      savedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

export function getLocalUserId(): string {
  if (typeof localStorage === 'undefined') return 'local-user';
  
  const userKey = getUserKey();
  let userId = localStorage.getItem(userKey);
  if (!userId) {
    // In dev mode, use a consistent demo user ID
    const mode = getStorageMode();
    if (mode === 'dev') {
      userId = 'demo-user-001';
    } else {
      userId = `user-${crypto.randomUUID()}`;
    }
    localStorage.setItem(userKey, userId);
  }
  return userId;
}

// ============================================
// GraphQL API Operations
// ============================================

interface APIResume {
  id: string;
  userId: string;
  name: string;
  variationType: string;
  baseResumeId?: string;
  domain?: string;
  template: string;
  tags: string[];
  isArchived: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  sections?: APISection[];
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

/**
 * Get or create a user by email using the atomic getOrCreateUser mutation.
 */
async function getOrCreateUser(email: string): Promise<string> {
  const result = await apiRequest<{ getOrCreateUser: { id: string } }>(
    queries.GET_OR_CREATE_USER,
    { email }
  );
  return result.getOrCreateUser.id;
}

export async function loadFromBackend(userId: string): Promise<Resume[]> {
  try {
    // Get or create user
    const actualUserId = await getOrCreateUser(userId);
    
    // Fetch all resumes for user
    const { resumes } = await apiRequest<{ resumes: APIResume[] }>(
      queries.GET_RESUMES,
      { userId: actualUserId }
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
    console.error('Failed to load from backend:', error);
    throw error;
  }
}

export async function saveResumeToBackend(resume: Resume, userId: string): Promise<boolean> {
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
          baseResumeId: resume.baseResumeId || null,
          domain: resume.domain || null,
          template: resume.template,
          tags: resume.tags || [],
          isArchived: resume.isArchived || false,
          metadata: resume.metadata || null,
        },
      });
    } else {
      // Get or create user
      const actualUserId = await getOrCreateUser(userId);
      
      // Create new resume with client-generated ID
      await apiRequest(queries.CREATE_RESUME, {
        input: {
          id: resume.id, // Use client-generated ID
          userId: actualUserId,
          name: resume.name,
          variationType: resume.variationType || 'base',
          baseResumeId: resume.baseResumeId || null,
          domain: resume.domain || null,
          template: resume.template,
          tags: resume.tags || [],
          isArchived: resume.isArchived || false,
          metadata: resume.metadata || null,
        },
      });
    }
    
    // Sync sections
    await syncSectionsToBackend(resume.id, resume.sections);
    
    return true;
  } catch (error) {
    console.error('Failed to save resume to backend:', error);
    return false;
  }
}

async function syncSectionsToBackend(resumeId: string, localSections: ResumeSection[]): Promise<void> {
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
    const content = {
      ...section.content,
      linkedToBase: section.linkedToBase,
      pageId: section.pageId,
    };
    
    if (serverSectionIds.has(section.id)) {
      // Update existing
      await apiRequest(queries.UPDATE_SECTION, {
        id: section.id,
        input: {
          type: section.type,
          order: section.order,
          visible: section.visible,
          content,
        },
      });
    } else {
      // Create new - use the client-generated ID
      await apiRequest(queries.CREATE_SECTION, {
        input: {
          id: section.id, // Use client-generated ID
          resumeId,
          type: section.type,
          order: section.order,
          visible: section.visible,
          content,
        },
      });
    }
  }
}

export async function deleteResumeFromBackend(id: string): Promise<boolean> {
  try {
    await apiRequest(queries.DELETE_RESUME, { id });
    return true;
  } catch (error) {
    console.error('Failed to delete resume from backend:', error);
    return false;
  }
}

// ============================================
// Conversion Helpers
// ============================================

import { TEMPLATE_CONFIGS, DEFAULT_TYPOGRAPHY, type FontFamily, type ResumeSettings } from '@/types/resume';

function convertAPIResumeToLocal(apiResume: APIResume, apiSections: APISection[]): Resume {
  const sections: ResumeSection[] = apiSections
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const content = s.content as Record<string, unknown>;
      return {
        id: s.id,
        type: s.type as ResumeSection['type'],
        order: s.order,
        visible: s.visible,
        content: {
          title: (content.title as string) || '',
          data: (content.data as Record<string, unknown> | unknown[]) || {},
          html: content.html as string | undefined,
        },
        linkedToBase: content.linkedToBase as boolean | undefined,
        pageId: content.pageId as string | undefined,
      };
    });

  const template = apiResume.template as Resume['template'];
  
  // Extract personal info from sections (as fallback)
  const personalSection = sections.find((s) => s.type === 'personal-info');
  let personalInfo = { fullName: '', email: '' };
  if (personalSection && personalSection.content.data) {
    const data = personalSection.content.data as Record<string, unknown>;
    const firstName = (data.firstName as string) || '';
    const lastName = (data.lastName as string) || '';
    personalInfo = {
      fullName: `${firstName} ${lastName}`.trim(),
      email: (data.email as string) || '',
    };
  }
  
  // Restore metadata from backend if available, otherwise use defaults
  const storedMetadata = apiResume.metadata as { personalInfo?: typeof personalInfo; settings?: Partial<ResumeSettings>; pages?: unknown[] } | undefined;
  
  const defaultSettings: ResumeSettings = {
    pageSize: 'A4',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    fontSize: 11,
    fontScale: 1.0,
    typography: { ...DEFAULT_TYPOGRAPHY },
    lineHeight: 1.5,
    fontFamily: 'Inter' as FontFamily,
    colors: TEMPLATE_CONFIGS[template]?.defaultColors || TEMPLATE_CONFIGS.modern.defaultColors,
    sectionSpacing: 'normal',
    showIcons: true,
    dateFormat: 'MMM YYYY',
    accentStyle: 'underline',
  };
  
  return {
    id: apiResume.id,
    name: apiResume.name,
    variationType: apiResume.variationType as 'base' | 'variation',
    baseResumeId: apiResume.baseResumeId,
    domain: apiResume.domain,
    createdAt: apiResume.createdAt,
    updatedAt: apiResume.updatedAt,
    template,
    sections,
    tags: apiResume.tags,
    isArchived: apiResume.isArchived,
    metadata: {
      personalInfo: storedMetadata?.personalInfo || personalInfo,
      settings: storedMetadata?.settings 
        ? { ...defaultSettings, ...storedMetadata.settings } as ResumeSettings
        : defaultSettings,
      pages: storedMetadata?.pages,
    },
  };
}

// ============================================
// Unified Sync Manager
// ============================================

export class SyncManager {
  private mode: StorageMode;
  private userId: string;
  private saveQueue: Map<string, Resume> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  constructor() {
    this.mode = getStorageMode();
    this.userId = getLocalUserId();
  }
  
  async initialize(): Promise<{ resumes: Resume[]; mode: StorageMode; backendStatus: BackendStatus }> {
    if (this.isInitialized) {
      const stored = loadFromLocalStorage();
      return { resumes: stored.resumes, mode: this.mode, backendStatus: getBackendStatus() };
    }
    
    let resumes: Resume[] = [];
    let backendStatus: BackendStatus = 'unknown';
    
    if (this.mode === 'prod') {
      // Production mode: use backend
      backendStatus = await checkBackendHealth();
      
      if (backendStatus === 'online') {
        try {
          resumes = await loadFromBackend(this.userId);
          // Also save to localStorage as cache
          saveToLocalStorage({ resumes, userId: this.userId, lastSyncedAt: new Date().toISOString() });
        } catch (error) {
          console.error('Failed to load from backend:', error);
          // Fall back to localStorage cache
          const stored = loadFromLocalStorage();
          resumes = stored.resumes;
        }
      } else {
        console.warn('Backend offline, using localStorage cache');
        const stored = loadFromLocalStorage();
        resumes = stored.resumes;
      }
    } else {
      // Dev mode: localStorage only
      const stored = loadFromLocalStorage();
      resumes = stored.resumes;
    }
    
    this.isInitialized = true;
    return { resumes, mode: this.mode, backendStatus };
  }
  
  setUserId(userId: string) {
    this.userId = userId;
  }
  
  getMode(): StorageMode {
    return this.mode;
  }
  
  // Queue a resume save (debounced)
  queueSave(resume: Resume) {
    this.saveQueue.set(resume.id, resume);
    
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Debounce saves by 1 second
    this.saveTimeout = setTimeout(() => {
      this.flushSaveQueue();
    }, 1000);
  }
  
  // Immediately save all queued resumes
  async flushSaveQueue() {
    const resumes = Array.from(this.saveQueue.values());
    this.saveQueue.clear();
    
    if (resumes.length === 0) return;
    
    // Always save to localStorage first (instant)
    const stored = loadFromLocalStorage();
    const updatedResumes = stored.resumes.map(r => {
      const updated = resumes.find(u => u.id === r.id);
      return updated || r;
    });
    
    // Add any new resumes
    for (const resume of resumes) {
      if (!updatedResumes.find(r => r.id === resume.id)) {
        updatedResumes.push(resume);
      }
    }
    
    saveToLocalStorage({ resumes: updatedResumes, userId: this.userId });
    
    // Also save to backend if in prod mode and online
    if (this.mode === 'prod') {
      const status = await checkBackendHealth();
      if (status === 'online') {
        for (const resume of resumes) {
          try {
            await saveResumeToBackend(resume, this.userId);
          } catch (error) {
            console.error(`Failed to save resume ${resume.id} to backend:`, error);
          }
        }
      }
    }
  }
  
  // Save all resumes at once
  async saveAll(resumes: Resume[]) {
    // Save to localStorage
    saveToLocalStorage({ resumes, userId: this.userId });
    
    // Save to backend if in prod mode
    if (this.mode === 'prod') {
      const status = await checkBackendHealth();
      if (status === 'online') {
        for (const resume of resumes) {
          try {
            await saveResumeToBackend(resume, this.userId);
          } catch (error) {
            console.error(`Failed to save resume ${resume.id} to backend:`, error);
          }
        }
      }
    }
  }
  
  // Delete a resume
  async deleteResume(id: string) {
    // Remove from localStorage
    const stored = loadFromLocalStorage();
    const filtered = stored.resumes.filter(r => r.id !== id);
    saveToLocalStorage({ resumes: filtered, userId: this.userId });
    
    // Remove from backend if in prod mode
    if (this.mode === 'prod') {
      const status = await checkBackendHealth();
      if (status === 'online') {
        await deleteResumeFromBackend(id);
      }
    }
  }
  
  // Force sync with backend
  async syncWithBackend(): Promise<Resume[]> {
    if (this.mode !== 'prod') {
      return loadFromLocalStorage().resumes;
    }
    
    const status = await checkBackendHealth();
    if (status !== 'online') {
      return loadFromLocalStorage().resumes;
    }
    
    try {
      const resumes = await loadFromBackend(this.userId);
      saveToLocalStorage({ resumes, userId: this.userId, lastSyncedAt: new Date().toISOString() });
      return resumes;
    } catch {
      return loadFromLocalStorage().resumes;
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();
