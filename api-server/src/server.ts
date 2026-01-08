import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { trpcRouter } from './trpc';
import { createContext } from './trpc/context';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const url = new URL(request.url);

    if (url.pathname.startsWith('/trpc')) {
      const response = await fetchRequestHandler({
        endpoint: '/trpc',
        req: request,
        router: trpcRouter,
        createContext: () => createContext({ request, env }),
        onError({ path, error }) {
          console.error(`Error in tRPC handler on path '${path}':`, error);
        },
      });

      const headers = new Headers(response.headers);
      headers.set('Access-Control-Allow-Origin', '*');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};