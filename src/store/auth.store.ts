/**
 * Authentication Store
 *
 * Manages authentication state using Zustand.
 * All authentication is handled via the backend API.
 * Demo accounts are created via database seed scripts.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, LoginCredentials } from '@/types/auth';

// Error messages (inline until proper auth is implemented)
const authErrors = {
  invalidCredentials: 'Invalid email or password',
  invalidEmail: 'Please enter a valid email address',
  unknown: 'An unexpected error occurred. Please try again',
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthStore extends AuthState {
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
}

// Simulated delay for demo purposes (remove when backend is fully integrated)
const simulateDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          if (!isValidEmail(credentials.email)) {
            set({ isLoading: false, error: authErrors.invalidEmail });
            return { success: false, error: authErrors.invalidEmail };
          }

          if (!credentials.password) {
            set({ isLoading: false, error: authErrors.invalidCredentials });
            return { success: false, error: authErrors.invalidCredentials };
          }

          // TODO: Replace with actual tRPC call
          await simulateDelay();
          
          // Temporary: create user from credentials (remove when backend is integrated)
          const user: User = {
            id: `user-${Date.now()}`,
            email: credentials.email,
            name: credentials.email.split('@')[0] || 'User',
            picture: null,
            createdAt: new Date().toISOString(),
            emailVerified: true,
            preferences: {
              theme: 'dark',
              emailNotifications: true,
              autoSave: true,
              defaultTemplate: 'modern',
            },
          };

          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
          return { success: true };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : authErrors.unknown;
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Logout action
      logout: async () => {
        set({ isLoading: true });

        try {
          await simulateDelay(200);
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Initialize auth from persisted state
      initializeAuth: async () => {
        // Auth state is automatically restored by persist middleware
        // This is a placeholder for any additional initialization logic
      },
    }),
    {
      name: 'betta-resume-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
