/**
 * AWS Cognito Integration
 * 
 * This module provides functions for interacting with AWS Cognito.
 * It will only be loaded in production mode when Cognito is configured.
 */

import { cognitoConfig, isCognitoConfigured } from '@/config/auth.config';
import type { User } from '@/types/auth';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Cognito token storage keys
const TOKEN_KEYS = {
  accessToken: 'betta_access_token',
  idToken: 'betta_id_token',
  refreshToken: 'betta_refresh_token',
};

// Helper to get stored tokens
const getStoredTokens = () => {
  if (!isBrowser) return null;
  return {
    accessToken: localStorage.getItem(TOKEN_KEYS.accessToken),
    idToken: localStorage.getItem(TOKEN_KEYS.idToken),
    refreshToken: localStorage.getItem(TOKEN_KEYS.refreshToken),
  };
};

// Helper to store tokens
const storeTokens = (tokens: { accessToken: string; idToken: string; refreshToken: string }) => {
  if (!isBrowser) return;
  localStorage.setItem(TOKEN_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(TOKEN_KEYS.idToken, tokens.idToken);
  localStorage.setItem(TOKEN_KEYS.refreshToken, tokens.refreshToken);
};

// Helper to clear tokens
const clearTokens = () => {
  if (!isBrowser) return;
  localStorage.removeItem(TOKEN_KEYS.accessToken);
  localStorage.removeItem(TOKEN_KEYS.idToken);
  localStorage.removeItem(TOKEN_KEYS.refreshToken);
};

// Parse JWT token to get user info
const parseJwt = (token: string): Record<string, unknown> | null => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Convert Cognito user to our User type
const cognitoUserToUser = (cognitoUser: Record<string, unknown>): User => {
  return {
    id: cognitoUser.sub as string || '',
    email: cognitoUser.email as string || '',
    name: cognitoUser.name as string || cognitoUser.email as string || '',
    picture: cognitoUser.picture as string || null,
    createdAt: new Date().toISOString(),
    emailVerified: cognitoUser.email_verified as boolean || false,
    subscription: {
      plan: 'free',
      status: 'active',
      expiresAt: null,
    },
    preferences: {
      theme: 'dark',
      emailNotifications: true,
      autoSave: true,
      defaultTemplate: 'modern',
    },
  };
};

/**
 * Sign in with email and password
 */
export async function signIn(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string; expiresAt?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'USER_PASSWORD_AUTH',
          ClientId: cognitoConfig.userPoolClientId,
          AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.AuthenticationResult) {
      const tokens = {
        accessToken: data.AuthenticationResult.AccessToken,
        idToken: data.AuthenticationResult.IdToken,
        refreshToken: data.AuthenticationResult.RefreshToken,
      };

      storeTokens(tokens);

      const userInfo = parseJwt(tokens.idToken);
      if (userInfo) {
        const user = cognitoUserToUser(userInfo);
        const expiresAt = new Date(
          Date.now() + data.AuthenticationResult.ExpiresIn * 1000
        ).toISOString();

        return { success: true, user, expiresAt };
      }
    }

    if (data.__type?.includes('NotAuthorizedException')) {
      return { success: false, error: 'Invalid email or password' };
    }

    if (data.__type?.includes('UserNotFoundException')) {
      return { success: false, error: 'No account found with this email' };
    }

    if (data.__type?.includes('UserNotConfirmedException')) {
      return { success: false, error: 'Please verify your email address' };
    }

    return { success: false, error: data.message || 'Authentication failed' };
  } catch (error) {
    console.error('Sign in error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; userConfirmed?: boolean }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.SignUp',
        },
        body: JSON.stringify({
          ClientId: cognitoConfig.userPoolClientId,
          Username: email,
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
          ],
        }),
      }
    );

    const data = await response.json();

    if (data.UserSub) {
      return { success: true, userConfirmed: data.UserConfirmed };
    }

    if (data.__type?.includes('UsernameExistsException')) {
      return { success: false, error: 'An account with this email already exists' };
    }

    if (data.__type?.includes('InvalidPasswordException')) {
      return { success: false, error: 'Password does not meet requirements' };
    }

    return { success: false, error: data.message || 'Registration failed' };
  } catch (error) {
    console.error('Sign up error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Confirm sign up with verification code
 */
export async function confirmSignUp(
  email: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmSignUp',
        },
        body: JSON.stringify({
          ClientId: cognitoConfig.userPoolClientId,
          Username: email,
          ConfirmationCode: code,
        }),
      }
    );

    const data = await response.json();

    if (!data.__type) {
      return { success: true };
    }

    if (data.__type?.includes('CodeMismatchException')) {
      return { success: false, error: 'Invalid verification code' };
    }

    if (data.__type?.includes('ExpiredCodeException')) {
      return { success: false, error: 'Verification code has expired' };
    }

    return { success: false, error: data.message || 'Verification failed' };
  } catch (error) {
    console.error('Confirm sign up error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
  clearTokens();
}

/**
 * Refresh tokens
 */
export async function refreshTokens(): Promise<{
  success: boolean;
  expiresAt?: string;
  error?: string;
}> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  const tokens = getStoredTokens();
  if (!tokens?.refreshToken) {
    return { success: false, error: 'No refresh token available' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth',
        },
        body: JSON.stringify({
          AuthFlow: 'REFRESH_TOKEN_AUTH',
          ClientId: cognitoConfig.userPoolClientId,
          AuthParameters: {
            REFRESH_TOKEN: tokens.refreshToken,
          },
        }),
      }
    );

    const data = await response.json();

    if (data.AuthenticationResult) {
      storeTokens({
        accessToken: data.AuthenticationResult.AccessToken,
        idToken: data.AuthenticationResult.IdToken,
        refreshToken: tokens.refreshToken, // Keep existing refresh token
      });

      const expiresAt = new Date(
        Date.now() + data.AuthenticationResult.ExpiresIn * 1000
      ).toISOString();

      return { success: true, expiresAt };
    }

    return { success: false, error: 'Failed to refresh session' };
  } catch (error) {
    console.error('Refresh tokens error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Change password
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  const tokens = getStoredTokens();
  if (!tokens?.accessToken) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ChangePassword',
        },
        body: JSON.stringify({
          AccessToken: tokens.accessToken,
          PreviousPassword: currentPassword,
          ProposedPassword: newPassword,
        }),
      }
    );

    const data = await response.json();

    if (!data.__type) {
      return { success: true };
    }

    if (data.__type?.includes('NotAuthorizedException')) {
      return { success: false, error: 'Current password is incorrect' };
    }

    if (data.__type?.includes('InvalidPasswordException')) {
      return { success: false, error: 'New password does not meet requirements' };
    }

    return { success: false, error: data.message || 'Failed to change password' };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Delete user account
 */
export async function deleteUser(): Promise<{ success: boolean; error?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  const tokens = getStoredTokens();
  if (!tokens?.accessToken) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.DeleteUser',
        },
        body: JSON.stringify({
          AccessToken: tokens.accessToken,
        }),
      }
    );

    const data = await response.json();

    if (!data.__type) {
      clearTokens();
      return { success: true };
    }

    return { success: false, error: data.message || 'Failed to delete account' };
  } catch (error) {
    console.error('Delete user error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Forgot password - initiate reset
 */
export async function forgotPassword(
  email: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ForgotPassword',
        },
        body: JSON.stringify({
          ClientId: cognitoConfig.userPoolClientId,
          Username: email,
        }),
      }
    );

    const data = await response.json();

    if (data.CodeDeliveryDetails) {
      return { success: true };
    }

    if (data.__type?.includes('UserNotFoundException')) {
      return { success: false, error: 'No account found with this email' };
    }

    return { success: false, error: data.message || 'Failed to send reset code' };
  } catch (error) {
    console.error('Forgot password error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Confirm forgot password with code and new password
 */
export async function confirmForgotPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  try {
    const response = await fetch(
      `https://cognito-idp.${cognitoConfig.region}.amazonaws.com/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-amz-json-1.1',
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ConfirmForgotPassword',
        },
        body: JSON.stringify({
          ClientId: cognitoConfig.userPoolClientId,
          Username: email,
          ConfirmationCode: code,
          Password: newPassword,
        }),
      }
    );

    const data = await response.json();

    if (!data.__type) {
      return { success: true };
    }

    if (data.__type?.includes('CodeMismatchException')) {
      return { success: false, error: 'Invalid reset code' };
    }

    if (data.__type?.includes('ExpiredCodeException')) {
      return { success: false, error: 'Reset code has expired' };
    }

    if (data.__type?.includes('InvalidPasswordException')) {
      return { success: false, error: 'New password does not meet requirements' };
    }

    return { success: false, error: data.message || 'Failed to reset password' };
  } catch (error) {
    console.error('Confirm forgot password error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Get current user from stored tokens
 */
export function getCurrentUser(): User | null {
  const tokens = getStoredTokens();
  if (!tokens?.idToken) return null;

  const userInfo = parseJwt(tokens.idToken);
  if (!userInfo) return null;

  return cognitoUserToUser(userInfo);
}
