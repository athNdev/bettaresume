'use client';

/**
 * Auth Provider
 * 
 * Syncs Clerk authentication state to the local Zustand store.
 * Verifies session with backend and clears React Query cache on logout.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store';
import { useActiveResumeStore } from '@/hooks';
import { SplashScreen } from '@/components/splash-screen';
import { api } from '@/trpc/react';

interface AuthContextValue {
  isInitialized: boolean;
  isClerkLoaded: boolean;
  isBackendVerified: boolean;
  backendStatus: 'online' | 'offline' | 'unknown';
}

const AuthContext = createContext<AuthContextValue>({
  isInitialized: false,
  isClerkLoaded: false,
  isBackendVerified: false,
  backendStatus: 'unknown',
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

// Check if dev mode bypass is enabled
const isDevBypass = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === 'true';

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBackendVerified, setIsBackendVerified] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'online' | 'offline' | 'unknown'>('unknown');
  
  // Clerk hooks
  const { isLoaded: isClerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  
  // React Query client for cache clearing
  const queryClient = useQueryClient();
  
  // Local store actions
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const clearActiveResume = useActiveResumeStore((state) => state.clearActiveResume);

  // tRPC mutation for session verification
  const verifySession = api.auth.verifySession.useMutation({
    onSuccess: (data) => {
      console.log('[AuthProvider] Session verified with backend', data);
      setIsBackendVerified(true);
      setBackendStatus('online');
    },
    onError: (error) => {
      console.warn('[AuthProvider] Backend verification failed, continuing offline:', error.message);
      setBackendStatus('offline');
      // Still allow access with local data
      setIsBackendVerified(true);
    },
  });

  // Sync Clerk state to local store
  useEffect(() => {
    if (!isClerkLoaded) return;

    const syncAuth = async () => {
      // Dev bypass mode - use mock user
      if (isDevBypass) {
        console.log('[AuthProvider] Dev bypass mode enabled');
        setUser({
          id: 'dev-user-123',
          email: 'dev@localhost.test',
          name: 'Dev User',
          picture: null,
          createdAt: new Date().toISOString(),
          emailVerified: true,
          preferences: {
            theme: 'dark',
            emailNotifications: false,
            autoSave: true,
            defaultTemplate: 'modern',
          },
        });
        setToken('dev-token');
        setIsInitialized(true);
        setIsBackendVerified(true);
        setBackendStatus('online');
        return;
      }

      if (isSignedIn && clerkUser) {
        // Get JWT token for API calls
        const token = await getToken();
        
        // Sync user to local store
        setUser({
          id: clerkUser.id,
          email: clerkUser.primaryEmailAddress?.emailAddress || '',
          name: clerkUser.fullName || clerkUser.firstName || 'User',
          picture: clerkUser.imageUrl || null,
          createdAt: clerkUser.createdAt?.toISOString() || new Date().toISOString(),
          emailVerified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
          preferences: {
            theme: 'dark',
            emailNotifications: true,
            autoSave: true,
            defaultTemplate: 'modern',
          },
        });
        
        if (token) {
          setToken(token);
        }

        // Verify session with backend (non-blocking)
        verifySession.mutate({
          email: clerkUser.primaryEmailAddress?.emailAddress,
          name: clerkUser.fullName,
          image: clerkUser.imageUrl,
        });
      } else {
        // User signed out - clear all data
        clearAuth();
        clearActiveResume();
        
        // Clear React Query cache to remove all resume data
        queryClient.clear();
        
        console.log('[AuthProvider] User signed out, cleared all cached data');
      }
      
      setIsInitialized(true);
    };

    syncAuth();
  }, [isClerkLoaded, isSignedIn, clerkUser, getToken, setUser, setToken, clearAuth, clearActiveResume, queryClient]);

  // Show splash screen while Clerk is loading
  if (!isClerkLoaded && !isDevBypass) {
    return <SplashScreen message="Initializing..." />;
  }

  return (
    <AuthContext.Provider value={{ isInitialized, isClerkLoaded, isBackendVerified, backendStatus }}>
      {children}
    </AuthContext.Provider>
  );
}
