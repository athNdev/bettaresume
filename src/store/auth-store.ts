/**
 * Authentication Store
 * 
 * Manages authentication state using Zustand.
 * Supports Dev Mode (demo account) and Prod Mode (real accounts with backend).
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  User, 
  AuthState, 
  LoginCredentials, 
  RegisterCredentials,
  ChangePasswordCredentials,
  UserPreferences,
} from '@/types/auth';
import { LOCAL_MODE_USER } from '@/types/auth';
import type { StorageMode } from '@/config/storage.config';
import { getStorageMode, isDevMode as checkIsDevMode } from '@/config/storage.config';
import { 
  IS_DEV_MODE, 
  devAccount, 
  isCognitoConfigured,
  authErrors,
} from '@/config/auth.config';

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  updateUser: (updates: Partial<User>) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  changePassword: (credentials: ChangePasswordCredentials) => Promise<{ success: boolean; error?: string }>;
  deleteAccount: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
  initializeAuth: () => Promise<void>;
  
  // OAuth / Social Login
  signInWithGoogle: () => void;
  handleOAuthCallback: (code: string) => Promise<{ success: boolean; error?: string }>;
  
  // Storage mode helpers (read-only, mode is set by npm scripts)
  getStorageMode: () => StorageMode;
  isDevMode: () => boolean;
  isProdMode: () => boolean;
  
  // Dev mode helpers
  loginAsDemo: () => void;
}

// Simulated delay for dev mode to mimic real auth
const simulateDelay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      sessionExpiresAt: null,
      storageMode: getStorageMode(),

      // Login action
      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs
          if (!isValidEmail(credentials.email)) {
            set({ isLoading: false, error: authErrors.invalidEmail });
            return { success: false, error: authErrors.invalidEmail };
          }

          if (!credentials.password) {
            set({ isLoading: false, error: authErrors.invalidCredentials });
            return { success: false, error: authErrors.invalidCredentials };
          }

          // Dev mode: accept any valid credentials or use demo account
          if (IS_DEV_MODE || !isCognitoConfigured()) {
            await simulateDelay();
            
            // In dev mode, accept demo credentials or auto-login
            if (credentials.email === devAccount.email || credentials.email === 'demo@bettaresume.dev') {
              set({
                user: devAccount,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                sessionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
              });
              return { success: true };
            }
            
            // Accept any email/password in dev mode
            const devUser: User = {
              id: `dev-${Date.now()}`,
              email: credentials.email,
              name: credentials.email.split('@')[0],
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
              user: devUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
            return { success: true };
          }

          // Production mode: Use AWS Cognito
          // This will be implemented when Cognito is configured
          const { signIn } = await import('@/lib/cognito');
          const result = await signIn(credentials.email, credentials.password);
          
          if (result.success && result.user) {
            set({
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionExpiresAt: result.expiresAt || null,
            });
            return { success: true };
          } else {
            set({ isLoading: false, error: result.error || authErrors.invalidCredentials });
            return { success: false, error: result.error };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : authErrors.unknown;
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Register action
      register: async (credentials: RegisterCredentials) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs
          if (!isValidEmail(credentials.email)) {
            set({ isLoading: false, error: authErrors.invalidEmail });
            return { success: false, error: authErrors.invalidEmail };
          }

          if (!isValidPassword(credentials.password)) {
            set({ isLoading: false, error: authErrors.weakPassword });
            return { success: false, error: authErrors.weakPassword };
          }

          if (!credentials.acceptTerms) {
            set({ isLoading: false, error: 'You must accept the terms and conditions' });
            return { success: false, error: 'You must accept the terms and conditions' };
          }

          // Dev mode: Create user immediately
          if (IS_DEV_MODE || !isCognitoConfigured()) {
            await simulateDelay();
            
            const newUser: User = {
              id: `user-${Date.now()}`,
              email: credentials.email,
              name: credentials.name,
              picture: null,
              createdAt: new Date().toISOString(),
              emailVerified: true, // Auto-verify in dev mode
              preferences: {
                theme: 'dark',
                emailNotifications: true,
                autoSave: true,
                defaultTemplate: 'modern',
              },
            };

            set({
              user: newUser,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
            return { success: true };
          }

          // Production mode: Use AWS Cognito
          const { signUp } = await import('@/lib/cognito');
          const result = await signUp(credentials.email, credentials.password, credentials.name);
          
          if (result.success) {
            // User needs to verify email in production
            // Return the username so it can be used for confirmation
            set({ isLoading: false });
            return { success: true, username: result.username };
          } else {
            set({ isLoading: false, error: result.error || authErrors.unknown });
            return { success: false, error: result.error };
          }
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
          if (!IS_DEV_MODE && isCognitoConfigured()) {
            const { signOut } = await import('@/lib/cognito');
            await signOut();
          }
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            sessionExpiresAt: null,
          });
        }
      },

      // Refresh session
      refreshSession: async () => {
        const state = get();
        
        if (!state.isAuthenticated || !state.sessionExpiresAt) {
          return false;
        }

        // Check if session is expired
        if (new Date(state.sessionExpiresAt) < new Date()) {
          set({
            user: null,
            isAuthenticated: false,
            sessionExpiresAt: null,
          });
          return false;
        }

        // In dev mode, just extend the session
        if (IS_DEV_MODE || !isCognitoConfigured()) {
          set({
            sessionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          });
          return true;
        }

        // Production: refresh Cognito tokens
        try {
          const { refreshTokens } = await import('@/lib/cognito');
          const result = await refreshTokens();
          if (result.success) {
            set({ sessionExpiresAt: result.expiresAt || null });
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Update user data
      updateUser: (updates: Partial<User>) => {
        const state = get();
        if (state.user) {
          set({
            user: { ...state.user, ...updates },
          });
        }
      },

      // Update user preferences
      updatePreferences: (preferences: Partial<UserPreferences>) => {
        const state = get();
        if (state.user) {
          set({
            user: {
              ...state.user,
              preferences: { ...state.user.preferences, ...preferences },
            },
          });
        }
      },

      // Change password
      changePassword: async (credentials: ChangePasswordCredentials) => {
        set({ isLoading: true, error: null });

        try {
          if (!isValidPassword(credentials.newPassword)) {
            set({ isLoading: false, error: authErrors.weakPassword });
            return { success: false, error: authErrors.weakPassword };
          }

          if (IS_DEV_MODE || !isCognitoConfigured()) {
            await simulateDelay();
            set({ isLoading: false });
            return { success: true };
          }

          const { changePassword } = await import('@/lib/cognito');
          const result = await changePassword(credentials.currentPassword, credentials.newPassword);
          
          set({ isLoading: false, error: result.error || null });
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : authErrors.unknown;
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Delete account
      deleteAccount: async () => {
        set({ isLoading: true, error: null });

        try {
          if (IS_DEV_MODE || !isCognitoConfigured()) {
            await simulateDelay();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              sessionExpiresAt: null,
            });
            return { success: true };
          }

          const { deleteUser } = await import('@/lib/cognito');
          const result = await deleteUser();
          
          if (result.success) {
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
              error: null,
              sessionExpiresAt: null,
            });
          } else {
            set({ isLoading: false, error: result.error || null });
          }
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : authErrors.unknown;
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Clear error
      clearError: () => {
        set({ error: null });
      },

      // Initialize auth from persisted state
      initializeAuth: async () => {
        const state = get();
        
        // Get storage mode from environment (set by npm scripts)
        const mode = getStorageMode();
        set({ storageMode: mode });
        
        // If in dev mode, auto-login with demo account
        if (mode === 'dev') {
          set({
            user: LOCAL_MODE_USER,
            isAuthenticated: true,
          });
          return;
        }
        
        // In prod mode without Cognito configured, don't auto-login
        if (!isCognitoConfigured()) {
          return;
        }

        // In production with Cognito, check if session is still valid
        if (state.isAuthenticated && state.sessionExpiresAt) {
          const expiresAt = new Date(state.sessionExpiresAt);
          if (expiresAt > new Date()) {
            await get().refreshSession();
          } else {
            set({
              user: null,
              isAuthenticated: false,
              sessionExpiresAt: null,
            });
          }
        }
      },

      // OAuth / Social Login
      signInWithGoogle: () => {
        // Check if we're in dev storage mode (set by npm scripts)
        if (checkIsDevMode()) {
          console.warn('Google sign-in not available in dev storage mode. Use `npm run prod`.');
          return;
        }
        
        if (!isCognitoConfigured()) {
          console.warn('Google sign-in not available: Cognito not configured');
          return;
        }
        
        // Dynamic import to avoid loading OAuth code in dev mode
        import('@/lib/cognito').then(({ signInWithGoogle, isOAuthConfigured }) => {
          if (!isOAuthConfigured()) {
            console.warn('Google sign-in not available: OAuth domain not configured. Set NEXT_PUBLIC_COGNITO_DOMAIN in .env');
            return;
          }
          signInWithGoogle();
        });
      },

      handleOAuthCallback: async (code: string) => {
        set({ isLoading: true, error: null });

        try {
          const { exchangeCodeForTokens } = await import('@/lib/cognito');
          const result = await exchangeCodeForTokens(code);

          if (result.success && result.user) {
            set({
              user: result.user,
              isAuthenticated: true,
              isLoading: false,
              error: null,
              sessionExpiresAt: result.expiresAt || null,
            });
            return { success: true };
          } else {
            set({ isLoading: false, error: result.error || 'OAuth authentication failed' });
            return { success: false, error: result.error };
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'OAuth authentication failed';
          set({ isLoading: false, error: errorMessage });
          return { success: false, error: errorMessage };
        }
      },

      // Storage mode helpers (read-only)
      getStorageMode: () => getStorageMode(),
      isDevMode: () => checkIsDevMode(),
      isProdMode: () => !checkIsDevMode(),

      // Demo mode login helper
      loginAsDemo: () => {
        set({
          user: devAccount,
          isAuthenticated: true,
          isLoading: false,
          error: null,
          sessionExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      },
    }),
    {
      name: 'betta-resume-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        sessionExpiresAt: state.sessionExpiresAt,
        storageMode: state.storageMode,
      }),
    }
  )
);
