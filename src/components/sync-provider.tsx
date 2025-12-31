'use client';

import { useEffect } from 'react';
import { useResumeStore } from '@/store/resume-store';

/**
 * SyncProvider Component
 * 
 * This component handles initializing the sync layer and loading data.
 * It should be placed at the root of the app to ensure data is loaded before
 * any components that depend on resume data.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const initializeSync = useResumeStore(state => state.initializeSync);
  const _hasHydrated = useResumeStore(state => state._hasHydrated);

  useEffect(() => {
    // Initialize sync on mount
    initializeSync();
  }, [initializeSync]);

  // Show loading state until data is synced
  if (!_hasHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Loading your resumes...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to check sync status
 */
export function useSyncStatus() {
  const _storageMode = useResumeStore(state => state._storageMode);
  const _backendStatus = useResumeStore(state => state._backendStatus);
  const _isInitialized = useResumeStore(state => state._isInitialized);
  
  return {
    storageMode: _storageMode,
    backendStatus: _backendStatus,
    isInitialized: _isInitialized,
    isOnline: _backendStatus === 'online',
    isOffline: _backendStatus === 'offline',
    isDevMode: _storageMode === 'dev',
    isProdMode: _storageMode === 'prod',
  };
}
