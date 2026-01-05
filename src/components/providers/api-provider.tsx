'use client';

/**
 * API Provider
 * 
 * Initializes the API client and provides API context.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useResumeStore } from '@/store';
import type { BackendStatus } from '@/lib/api';

interface ApiContextValue {
  isInitialized: boolean;
  backendStatus: BackendStatus;
}

const ApiContext = createContext<ApiContextValue>({
  isInitialized: false,
  backendStatus: 'unknown',
});

export function useApi() {
  return useContext(ApiContext);
}

interface ApiProviderProps {
  children: React.ReactNode;
}

export function ApiProvider({ children }: ApiProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const initializeSync = useResumeStore((state) => state.initializeSync);
  const backendStatus = useResumeStore((state) => state._backendStatus);
  const hasHydrated = useResumeStore((state) => state._hasHydrated);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializeSync();
      } catch (error) {
        console.error('API initialization error:', error);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [initializeSync]);

  // Wait for both API initialization and hydration
  const ready = isInitialized && hasHydrated;

  return (
    <ApiContext.Provider value={{ isInitialized: ready, backendStatus }}>
      {children}
    </ApiContext.Provider>
  );
}
