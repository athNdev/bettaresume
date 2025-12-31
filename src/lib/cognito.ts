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
 * Generate a unique username for Cognito
 * Since the User Pool is configured with email alias, username cannot be in email format
 */
function generateUsername(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `user_${timestamp}_${random}`;
}

/**
 * Sign up with email and password
 * 
 * Note: This User Pool is configured with:
 * - Email as an alias (so Username cannot be in email format)
 * - Required attribute: preferred_username
 */
export async function signUp(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string; userConfirmed?: boolean; username?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  try {
    // Generate a unique username (cannot use email since pool has email alias enabled)
    const username = generateUsername();
    // Use name as preferred_username, or fallback to email prefix
    const preferredUsername = name || email.split('@')[0];
    
    console.log('[Cognito] SignUp with username:', username, 'email:', email);

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
          Username: username,
          Password: password,
          UserAttributes: [
            { Name: 'email', Value: email },
            { Name: 'name', Value: name },
            { Name: 'preferred_username', Value: preferredUsername },
          ],
        }),
      }
    );

    const data = await response.json();
    
    console.log('[Cognito] SignUp response:', data);

    if (data.UserSub) {
      // Return the generated username so it can be used for confirmation
      return { success: true, userConfirmed: data.UserConfirmed, username };
    }

    if (data.__type?.includes('UsernameExistsException')) {
      return { success: false, error: 'An account with this email already exists' };
    }

    if (data.__type?.includes('InvalidPasswordException')) {
      return { success: false, error: 'Password does not meet requirements' };
    }

    if (data.__type?.includes('InvalidParameterException')) {
      console.error('Cognito InvalidParameterException:', data.message);
      return { success: false, error: data.message || 'Invalid registration data' };
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
  usernameOrEmail: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  if (!isCognitoConfigured()) {
    return { success: false, error: 'Cognito is not configured' };
  }

  // Trim whitespace from code and username
  const trimmedCode = code.trim();
  // Don't lowercase the username - it could be a generated username like user_xyz123
  const trimmedUsername = usernameOrEmail.trim();

  console.log('[Cognito] Confirming sign up:', { 
    username: trimmedUsername, 
    codeLength: trimmedCode.length,
    clientId: cognitoConfig.userPoolClientId,
    region: cognitoConfig.region 
  });

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
          Username: trimmedUsername,
          ConfirmationCode: trimmedCode,
        }),
      }
    );

    const data = await response.json();
    
    console.log('[Cognito] ConfirmSignUp response:', data);

    if (!data.__type) {
      return { success: true };
    }

    if (data.__type?.includes('CodeMismatchException')) {
      return { success: false, error: 'Invalid verification code. Please check and try again.' };
    }

    if (data.__type?.includes('ExpiredCodeException')) {
      return { success: false, error: 'Verification code has expired. Please request a new code.' };
    }
    
    if (data.__type?.includes('NotAuthorizedException')) {
      return { success: false, error: 'User is already confirmed. Please proceed to login.' };
    }
    
    if (data.__type?.includes('UserNotFoundException')) {
      return { success: false, error: 'User not found. Please register first.' };
    }

    return { success: false, error: data.message || 'Verification failed' };
  } catch (error) {
    console.error('Confirm sign up error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Resend confirmation code
 */
export async function resendConfirmationCode(
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
          'X-Amz-Target': 'AWSCognitoIdentityProviderService.ResendConfirmationCode',
        },
        body: JSON.stringify({
          ClientId: cognitoConfig.userPoolClientId,
          Username: email,
        }),
      }
    );

    const data = await response.json();

    if (!data.__type) {
      return { success: true };
    }

    if (data.__type?.includes('LimitExceededException')) {
      return { success: false, error: 'Too many attempts. Please wait before trying again.' };
    }

    if (data.__type?.includes('UserNotFoundException')) {
      return { success: false, error: 'No account found with this email' };
    }

    return { success: false, error: data.message || 'Failed to resend code' };
  } catch (error) {
    console.error('Resend confirmation code error:', error);
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

// ============================================
// OAuth / Social Login Functions
// ============================================

/**
 * Check if OAuth is configured
 */
export function isOAuthConfigured(): boolean {
  return !!(cognitoConfig.oauth.domain && cognitoConfig.userPoolClientId);
}

/**
 * Build OAuth authorization URL for Google sign-in
 */
export function getGoogleSignInUrl(): string {
  if (!isOAuthConfigured()) {
    throw new Error('OAuth is not configured');
  }

  const { oauth, userPoolClientId } = cognitoConfig;
  
  const params = new URLSearchParams({
    client_id: userPoolClientId,
    response_type: oauth.responseType,
    scope: oauth.scope.join(' '),
    redirect_uri: oauth.redirectSignIn,
    identity_provider: 'Google',
  });

  return `https://${oauth.domain}/oauth2/authorize?${params.toString()}`;
}

/**
 * Initiate Google sign-in by redirecting to Cognito's hosted UI
 */
export function signInWithGoogle(): void {
  const url = getGoogleSignInUrl();
  window.location.href = url;
}

/**
 * Exchange authorization code for tokens (after OAuth callback)
 */
export async function exchangeCodeForTokens(
  code: string
): Promise<{ success: boolean; user?: User; error?: string; expiresAt?: string }> {
  if (!isOAuthConfigured()) {
    return { success: false, error: 'OAuth is not configured' };
  }

  const { oauth, userPoolClientId } = cognitoConfig;

  try {
    const response = await fetch(
      `https://${oauth.domain}/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: userPoolClientId,
          code,
          redirect_uri: oauth.redirectSignIn,
        }).toString(),
      }
    );

    const data = await response.json();

    if (data.access_token && data.id_token) {
      const tokens = {
        accessToken: data.access_token,
        idToken: data.id_token,
        refreshToken: data.refresh_token || '',
      };

      storeTokens(tokens);

      const userInfo = parseJwt(tokens.idToken);
      if (userInfo) {
        const user = cognitoUserToUser(userInfo);
        const expiresAt = new Date(
          Date.now() + (data.expires_in || 3600) * 1000
        ).toISOString();

        return { success: true, user, expiresAt };
      }
    }

    return { success: false, error: data.error_description || 'Failed to exchange code for tokens' };
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    return { success: false, error: 'Network error. Please try again.' };
  }
}

/**
 * Sign out with OAuth (clears tokens and optionally redirects to Cognito logout)
 */
export function signOutWithOAuth(redirect: boolean = false): void {
  clearTokens();
  
  if (redirect && isOAuthConfigured()) {
    const { oauth, userPoolClientId } = cognitoConfig;
    const logoutUrl = `https://${oauth.domain}/logout?client_id=${userPoolClientId}&logout_uri=${encodeURIComponent(oauth.redirectSignOut)}`;
    window.location.href = logoutUrl;
  }
}
