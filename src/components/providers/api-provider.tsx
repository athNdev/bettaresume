'use client';

/**
 * API Provider
 * 
 * Provides API context for backend connection status.
 * With React Query, this is simplified - no more SyncManager initialization.
 */

import React, { createContext, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type BackendStatus = 'online' | 'offline' | 'unknown';

interface ApiContextValue {
  isInitialized: boolean;
  backendStatus: BackendStatus;
  clearCache: () => void;
}

const ApiContext = createContext<ApiContextValue>({
  isInitialized: true,
  backendStatus: 'unknown',
  clearCache: () => {},
});

export function useApi() {
  return useContext(ApiContext);
}

interface ApiProviderProps {
  children: React.ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const queryClient = useQueryClient();

  // Clear all cached data (used on logout)
  const clearCache = () => {
    queryClient.clear();
  };

  // With React Query, initialization is handled by the query hooks themselves
  // Backend status can be derived from query states if needed
  const value: ApiContextValue = {
    isInitialized: true,
    backendStatus: 'online', // React Query handles this per-query
    clearCache,
  };

  return (
    <ApiContext.Provider value={value}>
      {children}
    </ApiContext.Provider>
  );
}
