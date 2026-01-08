'use client';

/**
 * Auth Provider
 * 
 * Syncs Clerk authentication state to the local Zustand store.
 * This bridges Clerk's auth state with our app's auth store.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth, useUser } from '@clerk/clerk-react';
import { useAuthStore } from '@/store';
import { SplashScreen } from '@/components/splash-screen';

interface AuthContextValue {
  isInitialized: boolean;
  isClerkLoaded: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  isInitialized: false,
  isClerkLoaded: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Clerk hooks
  const { isLoaded: isClerkLoaded, isSignedIn, getToken } = useClerkAuth();
  const { user: clerkUser } = useUser();
  
  // Local store actions
  const setUser = useAuthStore((state) => state.setUser);
  const setToken = useAuthStore((state) => state.setToken);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  // Sync Clerk state to local store
  useEffect(() => {
    if (!isClerkLoaded) return;

    const syncAuth = async () => {
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
      } else {
        // User signed out - clear local state
        clearAuth();
      }
      
      setIsInitialized(true);
    };

    syncAuth();
  }, [isClerkLoaded, isSignedIn, clerkUser, getToken, setUser, setToken, clearAuth]);

  // Show splash screen while Clerk is loading
  if (!isClerkLoaded) {
    return <SplashScreen message="Initializing..." />;
  }

  return (
    <AuthContext.Provider value={{ isInitialized, isClerkLoaded }}>
      {children}
    </AuthContext.Provider>
  );
}
