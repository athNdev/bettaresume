'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useUser, APIUser } from '@/lib/api-hooks';

interface UserContextType {
  user: APIUser | null;
  isLoading: boolean;
  error: Error | null;
  isOnline: boolean;
  login: (email: string) => Promise<APIUser | null>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<APIUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const { getOrCreateUser } = useUser();

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const login = useCallback(async (email: string): Promise<APIUser | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUser = await getOrCreateUser(email);
      if (apiUser) {
        setUser(apiUser);
      }
      return apiUser;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Login failed');
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [getOrCreateUser]);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  return (
    <UserContext.Provider value={{ user, isLoading, error, isOnline, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a UserProvider');
  }
  return context;
}
