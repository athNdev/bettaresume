/**
 * Authentication Store
 *
 * Manages authentication state using Zustand.
 * Synced from Clerk - this store acts as a local cache for auth state
 * and stores the JWT token for API calls.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface AuthStore extends AuthState {
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,

      // Set user from Clerk
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
        });
      },

      // Set JWT token for API calls
      setToken: (token: string) => {
        set({ token });
      },

      // Clear auth state (on sign out)
      clearAuth: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: 'bettaresume-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Don't persist token - get fresh from Clerk each session
      }),
    }
  )
);
