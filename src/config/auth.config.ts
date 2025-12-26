/**
 * Authentication Configuration
 * 
 * This file contains all authentication-related configuration.
 * In production, these values come from environment variables.
 * In development mode, a dummy account is used for testing.
 */

// Environment mode
export const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || 'development';
export const IS_DEV_MODE = AUTH_MODE === 'development';
export const IS_PROD_MODE = AUTH_MODE === 'production';

// AWS Cognito Configuration
export const cognitoConfig = {
  // User Pool Configuration
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  
  // Region
  region: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
  
  // OAuth Configuration (for social login, if needed)
  oauth: {
    domain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',
    scope: ['email', 'openid', 'profile'],
    redirectSignIn: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN || 'http://localhost:3000/auth/callback',
    redirectSignOut: process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT || 'http://localhost:3000',
    responseType: 'code' as const,
  },
  
  // Identity Pool (for AWS service access, optional)
  identityPoolId: process.env.NEXT_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
};

// Development/Demo Account (used when AUTH_MODE is 'development')
export const devAccount = {
  id: 'dev-user-001',
  email: 'demo@bettaresume.dev',
  name: 'Demo User',
  picture: null,
  createdAt: new Date().toISOString(),
  emailVerified: true,
  subscription: {
    plan: 'pro' as const,
    status: 'active' as const,
    expiresAt: null,
  },
  preferences: {
    theme: 'dark' as const,
    emailNotifications: true,
    autoSave: true,
    defaultTemplate: 'modern' as const,
  },
};

// Auth feature flags
export const authFeatures = {
  enableSocialLogin: process.env.NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === 'true',
  enableMFA: process.env.NEXT_PUBLIC_ENABLE_MFA === 'true',
  enablePasswordReset: true,
  enableEmailVerification: IS_PROD_MODE,
  requireEmailVerification: IS_PROD_MODE,
  enableAccountDeletion: true,
  sessionTimeout: 60 * 60 * 24 * 7, // 7 days in seconds
};

// Validation rules
export const authValidation = {
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
  },
  username: {
    minLength: 3,
    maxLength: 50,
  },
};

// Error messages
export const authErrors = {
  invalidCredentials: 'Invalid email or password',
  userNotFound: 'No account found with this email',
  userExists: 'An account with this email already exists',
  weakPassword: 'Password does not meet requirements',
  invalidEmail: 'Please enter a valid email address',
  networkError: 'Network error. Please check your connection',
  sessionExpired: 'Your session has expired. Please sign in again',
  accountLocked: 'Account temporarily locked. Please try again later',
  verificationRequired: 'Please verify your email address',
  mfaRequired: 'Multi-factor authentication required',
  unknown: 'An unexpected error occurred. Please try again',
};

// Check if Cognito is properly configured
export const isCognitoConfigured = () => {
  return !!(cognitoConfig.userPoolId && cognitoConfig.userPoolClientId);
};

// Get the appropriate auth mode message
export const getAuthModeMessage = () => {
  if (IS_DEV_MODE) {
    return 'Running in development mode with demo account';
  }
  if (!isCognitoConfigured()) {
    return 'AWS Cognito not configured. Using development mode.';
  }
  return 'Production authentication enabled';
};
