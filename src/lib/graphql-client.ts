import { GraphQLClient } from 'graphql-request';
import { getStorageMode } from './sync';

const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

// Token storage keys (must match cognito.ts)
const TOKEN_KEYS = {
  accessToken: 'betta_access_token',
  idToken: 'betta_id_token',
};

// Get auth token for requests
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  
  // Only use tokens in prod mode
  if (getStorageMode() !== 'prod') return null;
  
  // Use ID token for GraphQL requests (contains user info)
  return localStorage.getItem(TOKEN_KEYS.idToken);
}

// Create GraphQL client with dynamic headers
function createClient(): GraphQLClient {
  return new GraphQLClient(API_URL, {
    credentials: 'include',
  });
}

export const graphqlClient = createClient();

// Helper for error handling
export class APIError extends Error {
  constructor(
    message: string,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Wrapper for API calls with auth headers and error handling
export async function apiRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    // Add auth token in prod mode
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return await graphqlClient.request<T>(query, variables, headers);
  } catch (error) {
    console.error('GraphQL request failed:', error);
    
    // Check for auth errors
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new APIError('Session expired. Please sign in again.', 'UNAUTHORIZED', error);
      }
      if (error.message.includes('403') || error.message.includes('Forbidden')) {
        throw new APIError('You do not have permission to perform this action.', 'FORBIDDEN', error);
      }
    }
    
    throw new APIError(
      error instanceof Error ? error.message : 'API request failed',
      'GRAPHQL_ERROR',
      error
    );
  }
}

// Check if user is authenticated (has valid token)
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  
  try {
    // Check if token is expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    return Date.now() < exp;
  } catch {
    return false;
  }
}

// Get current user ID from token
export function getCurrentUserId(): string | null {
  const token = getAuthToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || null;
  } catch {
    return null;
  }
}
