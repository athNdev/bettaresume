import Fastify from 'fastify';
import mercurius from 'mercurius';
import cors from '@fastify/cors';
import { typeDefs } from './graphql/schema';
import { resolvers } from './graphql/resolvers';

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

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
    ],
    credentials: true,
  });

  // Register GraphQL with Mercurius
  await app.register(mercurius, {
    schema: typeDefs,
    resolvers: resolvers as never,
    graphiql: true, // Enable GraphiQL IDE at /graphiql
    ide: true,
    path: '/graphql',
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
