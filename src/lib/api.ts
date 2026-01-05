/**
 * Sync Layer
 *
 * Handles data syncing with the tRPC backend.
 * Both dev and prod modes use the backend for persistence.
 * Environment configuration is handled via .env files.
 */

import type { Resume } from '@/types/resume';

// ============================================
// Configuration
// ============================================

export type BackendStatus = 'online' | 'offline' | 'unknown';

const BACKEND_STATUS_KEY = 'betta-backend-status';

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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const healthUrl = `${apiUrl}/health`;

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
      return { resumes: this.cachedResumes, backendStatus: getBackendStatus() };
    }

    let resumes: Resume[] = [];
    const backendStatus = await checkBackendHealth();

    if (backendStatus === 'online') {
      try {
        // TODO: Load from tRPC backend
        // resumes = await trpc.resume.list.query();
        console.log('Would load resumes from backend');
        resumes = [];
      } catch (error) {
        console.error('Failed to load from backend:', error);
        resumes = [];
      }
    } else {
      console.warn('Backend offline - please start the API server');
      resumes = [];
    }

    this.cachedResumes = resumes;
    this.isInitialized = true;
    return { resumes, backendStatus };
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

    // Update local cache
    for (const resume of resumes) {
      const index = this.cachedResumes.findIndex(r => r.id === resume.id);
      if (index >= 0) {
        this.cachedResumes[index] = resume;
      } else {
        this.cachedResumes.push(resume);
      }
    }

    // Save to backend
    const status = await checkBackendHealth();
    if (status === 'online') {
      try {
        // TODO: Save to tRPC backend
        // for (const resume of resumes) {
        //   await trpc.resume.upsert.mutate(resume);
        // }
        console.log('Would save to backend:', resumes.length, 'resumes');
      } catch (error) {
        console.error('Failed to save to backend:', error);
      }
    } else {
      console.warn('Backend offline - changes not saved');
    }
  }

  // Save all resumes at once
  async saveAll(resumes: Resume[]) {
    this.cachedResumes = resumes;

    const status = await checkBackendHealth();
    if (status === 'online') {
      try {
        // TODO: Save to tRPC backend
        // await trpc.resume.saveAll.mutate(resumes);
        console.log('Would save all to backend:', resumes.length, 'resumes');
      } catch (error) {
        console.error('Failed to save all to backend:', error);
      }
    } else {
      console.warn('Backend offline - changes not saved');
    }
  }

  // Delete a resume
  async deleteResume(id: string) {
    // Remove from local cache
    this.cachedResumes = this.cachedResumes.filter(r => r.id !== id);

    // Remove from backend
    const status = await checkBackendHealth();
    if (status === 'online') {
      try {
        // TODO: Delete from tRPC backend
        // await trpc.resume.delete.mutate({ id });
        console.log('Would delete from backend:', id);
      } catch (error) {
        console.error('Failed to delete from backend:', error);
      }
    } else {
      console.warn('Backend offline - deletion not synced');
    }
  }

  // Force sync with backend
  async syncWithBackend(): Promise<Resume[]> {
    const status = await checkBackendHealth();
    if (status !== 'online') {
      console.warn('Backend offline - cannot sync');
      return this.cachedResumes;
    }

    try {
      // TODO: Implement tRPC sync
      // this.cachedResumes = await trpc.resume.list.query();
      console.log('Would sync with backend');
      return this.cachedResumes;
    } catch (error) {
      console.error('Failed to sync with backend:', error);
      return this.cachedResumes;
    }
  }
}

// Singleton instance
export const syncManager = new SyncManager();
