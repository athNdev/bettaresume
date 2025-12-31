/**
 * Cognito JWT Verification
 * 
 * This module verifies JWT tokens issued by AWS Cognito.
 * It fetches the JWKS (JSON Web Key Set) from Cognito and validates tokens.
 */

import { createRemoteJWKSet, jwtVerify } from 'jose';

// Lazy-load config to ensure dotenv has run first
function getConfig() {
  return {
    region: process.env.COGNITO_REGION || 'us-east-1',
    userPoolId: process.env.COGNITO_USER_POOL_ID || '',
    clientId: process.env.COGNITO_CLIENT_ID || '',
  };
}

// Cognito JWKS URL
const getJwksUrl = () => {
  const config = getConfig();
  if (!config.userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID not configured');
  }
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}/.well-known/jwks.json`;
};

// Expected issuer
const getIssuer = () => {
  const config = getConfig();
  if (!config.userPoolId) {
    throw new Error('COGNITO_USER_POOL_ID not configured');
  }
  return `https://cognito-idp.${config.region}.amazonaws.com/${config.userPoolId}`;
};

// Cache the JWKS
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks() {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(getJwksUrl()));
  }
  return jwks;
}

// User info extracted from token
export interface CognitoUser {
  id: string;          // Cognito 'sub' claim
  email: string;
  name?: string;
  emailVerified: boolean;
}

// Verification result
export interface VerifyResult {
  valid: boolean;
  user?: CognitoUser;
  error?: string;
}

/**
 * Check if Cognito is configured
 */
export function isCognitoConfigured(): boolean {
  const config = getConfig();
  return !!(config.userPoolId && config.clientId);
}

/**
 * Verify a Cognito JWT token
 * 
 * @param token - The JWT token (ID token or Access token)
 * @returns VerifyResult with user info if valid
 */
export async function verifyToken(token: string): Promise<VerifyResult> {
  const config = getConfig();
  
  if (!isCognitoConfigured()) {
    return { valid: false, error: 'Cognito not configured' };
  }

  try {
    // Verify the token
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: getIssuer(),
      // For ID tokens, verify the audience matches the client ID
      // Access tokens don't have 'aud' but have 'client_id' 
    });

    // Validate token use (we expect ID tokens for GraphQL)
    const tokenUse = payload.token_use as string;
    if (tokenUse !== 'id' && tokenUse !== 'access') {
      return { valid: false, error: 'Invalid token type' };
    }

    // For ID tokens, check audience
    if (tokenUse === 'id') {
      const aud = payload.aud;
      if (aud !== config.clientId) {
        return { valid: false, error: 'Invalid token audience' };
      }
    }

    // For access tokens, check client_id
    if (tokenUse === 'access') {
      const clientId = payload.client_id as string;
      if (clientId !== config.clientId) {
        return { valid: false, error: 'Invalid client ID' };
      }
    }

    // Extract user info
    const user: CognitoUser = {
      id: payload.sub as string,
      email: (payload.email as string) || '',
      name: payload.name as string | undefined,
      emailVerified: (payload.email_verified as boolean) || false,
    };

    return { valid: true, user };
  } catch (error) {
    console.error('Token verification failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        return { valid: false, error: 'Token expired' };
      }
      if (error.message.includes('signature')) {
        return { valid: false, error: 'Invalid token signature' };
      }
    }
    
    return { valid: false, error: 'Token verification failed' };
  }
}

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  
  // Expect: "Bearer <token>"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
}
