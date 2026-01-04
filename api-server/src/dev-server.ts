import { createServer } from "http";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { apiRouter } from "./root";
import { createContext } from "./trpc";

const PORT = process.env.PORT || 3001;

const corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:3000",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trpc-source",
};

const server = createServer(async (req, res) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Set CORS headers
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }

  // Only handle /api/trpc routes
  if (!req.url?.startsWith("/api/trpc")) {
    res.writeHead(404);
    res.end("Not Found");
    return;
  }

  // Collect body for POST requests
  let body = "";
  if (req.method === "POST") {
    for await (const chunk of req) {
      body += chunk;
    }
  }

  // Convert to Fetch API Request
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value[0]! : value);
  }

  const fetchRequest = new Request(url, {
    method: req.method,
    headers,
    body: body || undefined,
  });

  // Handle tRPC request
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: fetchRequest,
    router: apiRouter,
    createContext: ({ req }) => createContext({ headers: req.headers }),
    onError({ error, path }) {
      console.error(`[tRPC] Error in ${path}:`, error);
    },
  });

  // Send response
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(await response.text());
});

server.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`   tRPC endpoint: http://localhost:${PORT}/api/trpc`);
});
