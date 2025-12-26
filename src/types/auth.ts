/**
 * Authentication Types
 */

// User Account Types
export interface User {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  createdAt: string;
  emailVerified: boolean;
  subscription: UserSubscription;
  preferences: UserPreferences;
}

export interface UserSubscription {
  plan: 'free' | 'pro' | 'enterprise';
  status: 'active' | 'cancelled' | 'expired' | 'trialing';
  expiresAt: string | null;
  features?: SubscriptionFeatures;
}

export interface SubscriptionFeatures {
  maxResumes: number;
  maxVersionsPerResume: number;
  maxVariationsPerResume: number;
  aiAssistant: boolean;
  customTemplates: boolean;
  exportFormats: string[];
  cloudSync: boolean;
  prioritySupport: boolean;
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
}

// Auth Action Types
export type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: User }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'AUTH_LOGOUT' }
  | { type: 'AUTH_UPDATE_USER'; payload: Partial<User> }
  | { type: 'AUTH_CLEAR_ERROR' }
  | { type: 'AUTH_SET_LOADING'; payload: boolean };

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
  type: 'login' | 'logout' | 'password_change' | 'profile_update' | 'subscription_change';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  location?: string;
}

// Subscription Plan Details
export const SUBSCRIPTION_PLANS: Record<string, SubscriptionFeatures> = {
  free: {
    maxResumes: 3,
    maxVersionsPerResume: 5,
    maxVariationsPerResume: 2,
    aiAssistant: false,
    customTemplates: false,
    exportFormats: ['pdf'],
    cloudSync: false,
    prioritySupport: false,
  },
  pro: {
    maxResumes: 20,
    maxVersionsPerResume: 50,
    maxVariationsPerResume: 10,
    aiAssistant: true,
    customTemplates: true,
    exportFormats: ['pdf', 'docx', 'json'],
    cloudSync: true,
    prioritySupport: false,
  },
  enterprise: {
    maxResumes: -1, // unlimited
    maxVersionsPerResume: -1,
    maxVariationsPerResume: -1,
    aiAssistant: true,
    customTemplates: true,
    exportFormats: ['pdf', 'docx', 'json', 'html'],
    cloudSync: true,
    prioritySupport: true,
  },
};
