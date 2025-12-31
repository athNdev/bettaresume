import 'dotenv/config'; // Load .env from server directory

import Fastify from 'fastify';
import mercurius from 'mercurius';
import cors from '@fastify/cors';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';
import { verifyToken, extractToken, isCognitoConfigured, CognitoUser } from './auth/cognito';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

// GraphQL context type
export interface GraphQLContext {
  user: CognitoUser | null;
  isAuthenticated: boolean;
}

async function main() {
  const app = Fastify({
    logger: {
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    },
  });

  // Enable CORS for frontend access
  await app.register(cors, {
    origin: [
      'http://localhost:3000', // Next.js dev
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      // Add production domains as needed
    ],
    credentials: true,
  });

  // Log auth configuration on startup
  const cognitoConfigured = isCognitoConfigured();
  console.log(`🔐 Cognito authentication: ${cognitoConfigured ? 'ENABLED' : 'DISABLED (dev mode)'}`);

  // Register GraphQL with Mercurius
  await app.register(mercurius, {
    schema: typeDefs,
    resolvers: resolvers as never,
    graphiql: true, // Enable GraphiQL IDE at /graphiql
    ide: true,
    path: '/graphql',
    
    // Build context with authenticated user info
    context: async (request): Promise<GraphQLContext> => {
      // Default: no authenticated user
      let context: GraphQLContext = {
        user: null,
        isAuthenticated: false,
      };

      // Skip auth if Cognito not configured (dev mode)
      if (!cognitoConfigured) {
        return context;
      }

      // Extract and verify token
      const authHeader = request.headers.authorization;
      const token = extractToken(authHeader);

      if (token) {
        const result = await verifyToken(token);
        
        if (result.valid && result.user) {
          context = {
            user: result.user,
            isAuthenticated: true,
          };
          
          // Log successful auth (debug level)
          request.log.debug({ userId: result.user.id }, 'Authenticated request');
        } else {
          // Log auth failure
          request.log.warn({ error: result.error }, 'Token verification failed');
        }
      }

      return context;
    },
  });

  // Health check endpoint
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Start server
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`
🚀 Server ready!
   
   GraphQL:   http://localhost:${PORT}/graphql
   GraphiQL:  http://localhost:${PORT}/graphiql
   Health:    http://localhost:${PORT}/health
    `);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
