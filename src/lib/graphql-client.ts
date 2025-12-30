import { GraphQLClient } from 'graphql-request';

const API_URL = process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql';

export const graphqlClient = new GraphQLClient(API_URL, {
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
  },
});

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

// Wrapper for API calls with error handling
export async function apiRequest<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  try {
    return await graphqlClient.request<T>(query, variables);
  } catch (error) {
    console.error('GraphQL request failed:', error);
    throw new APIError(
      error instanceof Error ? error.message : 'API request failed',
      'GRAPHQL_ERROR',
      error
    );
  }
}
