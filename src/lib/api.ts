/**
 * Sync Layer
 *
 * Handles data syncing with localStorage.
 * For now, we use localStorage only (no backend sync).
 */

import type { Resume } from '@/types/resume';

// ============================================
// Configuration
// ============================================

export type BackendStatus = 'online' | 'offline' | 'unknown';

const STORAGE_KEY = 'bettaresume-resumes';

// ============================================
// Backend Health Check (placeholder for future use)
// ============================================

export async function checkBackendHealth(): Promise<BackendStatus> {
  // Always return offline for now - we're in local-only mode
  return 'offline';
}

export function getBackendStatus(): BackendStatus {
  return 'offline';
}

// ============================================
// Local Storage Helpers
// ============================================

function loadFromLocalStorage(): Resume[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load from localStorage:', error);
  }
  return [];
}

function saveToLocalStorage(resumes: Resume[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(resumes));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
}

// ============================================
// Unified Sync Manager
// ============================================

export class SyncManager {
  private userId: string | null = null;
  private saveQueue: Map<string, Resume> = new Map();
  private saveTimeout: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private cachedResumes: Resume[] = [];

  async initialize(): Promise<{ resumes: Resume[]; backendStatus: BackendStatus }> {
    if (this.isInitialized) {
      return { resumes: this.cachedResumes, backendStatus: 'offline' };
    }

    // Load from localStorage
    this.cachedResumes = loadFromLocalStorage();
    this.isInitialized = true;
    
    console.log('[SyncManager] Loaded', this.cachedResumes.length, 'resumes from localStorage');
    return { resumes: this.cachedResumes, backendStatus: 'offline' };
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  getUserId(): string | null {
    return this.userId;
  }

  // Queue a resume save (debounced)
  queueSave(resume: Resume) {
    this.saveQueue.set(resume.id, resume);

    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    // Debounce saves by 500ms
    this.saveTimeout = setTimeout(() => {
      this.flushSaveQueue();
    }, 500);
  }

  // Immediately save all queued resumes
  async flushSaveQueue() {
    const resumes = Array.from(this.saveQueue.values());
    this.saveQueue.clear();

    if (resumes.length === 0) return;

    // Update local cache
    for (const resume of resumes) {
      const index = this.cachedResumes.findIndex(r => r.id === resume.id);
      if (index >= 0) {
        this.cachedResumes[index] = resume;
      } else {
        this.cachedResumes.push(resume);
      }
    }

    // Save to localStorage
    saveToLocalStorage(this.cachedResumes);
    console.log('[SyncManager] Saved', resumes.length, 'resume(s) to localStorage');
  }

  // Save all resumes at once
  async saveAll(resumes: Resume[]) {
    this.cachedResumes = resumes;
    saveToLocalStorage(this.cachedResumes);
    console.log('[SyncManager] Saved all', resumes.length, 'resumes to localStorage');
  }

  // Delete a resume
  async deleteResume(id: string) {
    // Remove from local cache
    this.cachedResumes = this.cachedResumes.filter(r => r.id !== id);
    saveToLocalStorage(this.cachedResumes);
    console.log('[SyncManager] Deleted resume:', id);
  }

  // Force sync (just returns cached resumes in local mode)
  async syncWithBackend(): Promise<Resume[]> {
    return this.cachedResumes;
  }
}

// Singleton instance
export const syncManager = new SyncManager();
