'use client';

/**
 * Auth Provider
 * 
 * Handles authentication initialization and provides auth context.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/store';
import { Skeleton } from '@/components/ui/skeleton';

interface AuthContextValue {
  isInitialized: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isInitialized: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

function AuthLoadingSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    init();

    // Failsafe: Set initialized after 5 seconds even if init fails
    const timeout = setTimeout(() => {
      if (mounted && !isInitialized) {
        console.warn('Auth initialization timeout, forcing initialized state');
        setIsInitialized(true);
      }
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [initializeAuth, isInitialized]);

  // Show loading state while initializing
  if (!isInitialized) {
    return <AuthLoadingSkeleton />;
  }

  return (
    <AuthContext.Provider value={{ isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}
