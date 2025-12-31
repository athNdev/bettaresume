/**
 * Authentication Types
 * 
 * Betta Resume supports two storage modes:
 * - Dev Mode: Demo account, localStorage only (npm run dev)
 * - Prod Mode: Real accounts with backend sync (npm run prod)
 */

import type { StorageMode } from '@/config/storage.config';

// User Account Types
export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  createdAt: string;
  emailVerified: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  emailNotifications: boolean;
  autoSave: boolean;
  defaultTemplate: string;
  language?: string;
  timezone?: string;
}

// Auth State Types
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  sessionExpiresAt: string | null;
  storageMode: StorageMode;
}

// Auth Action Types
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_UPDATE_USER'; payload: Partial<User> }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_SET_LOADING'; payload: boolean }
  | { type: 'AUTH_SET_STORAGE_MODE'; payload: StorageMode };

// Auth Credentials
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  name: string;
  acceptTerms: boolean;
}

export interface ResetPasswordCredentials {
  email: string;
}

export interface ConfirmResetPasswordCredentials {
  email: string;
  code: string;
  newPassword: string;
}

export interface ChangePasswordCredentials {
  currentPassword: string;
  newPassword: string;
}

export interface VerifyEmailCredentials {
  email: string;
  code: string;
}

// Auth Response Types
export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  requiresVerification?: boolean;
  requiresMFA?: boolean;
}

export interface TokenResponse {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

// Session Types
export interface Session {
  user: User;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: string;
}

// MFA Types
export interface MFASetupResponse {
  secretCode: string;
  qrCodeUrl: string;
}

export interface MFAVerifyCredentials {
  code: string;
  rememberDevice?: boolean;
}

// Social Login Types
export type SocialProvider = 'google' | 'github' | 'linkedin';

export interface SocialLoginCredentials {
  provider: SocialProvider;
  accessToken: string;
}

// Account Activity Types
export interface AccountActivity {
  id: string;
  type: 'login' | 'logout' | 'password_change' | 'profile_update' | 'mode_change';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

// Demo User (for dev mode)
export const LOCAL_MODE_USER: User = {
  id: 'demo-user',
  email: 'demo@bettaresume.dev',
  name: 'Demo User',
  picture: null,
  createdAt: new Date().toISOString(),
  emailVerified: true,
  preferences: {
    theme: 'system',
    emailNotifications: false,
    autoSave: true,
    defaultTemplate: 'modern',
  },
};
