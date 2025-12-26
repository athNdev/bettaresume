'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { IS_DEV_MODE } from '@/config/auth.config';

interface AuthContextType {
  isInitialized: boolean;
  isDevMode: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isInitialized: false,
  isDevMode: false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const { initializeAuth } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      // Initialize auth state from persisted storage
      await initializeAuth();
      setIsInitialized(true);
    };

    init();
  }, [initializeAuth]);

  // Show nothing while initializing to prevent flash of content
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
          </div>
          <p className="text-sm text-muted-foreground">Loading Betta Resume...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isInitialized, isDevMode: IS_DEV_MODE }}>
      {children}
    </AuthContext.Provider>
  );
}
