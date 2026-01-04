import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { apiRouter } from "../../src/root";
import { createContext } from "../../src/trpc";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, x-trpc-source",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(200, corsHeaders);
    res.end();
    return;
  }

  // Set CORS headers for all responses
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }

  // Convert Vercel request to Fetch API Request
  const url = new URL(req.url!, `https://${req.headers.host}`);
  
  const fetchRequest = new Request(url, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method !== "GET" && req.method !== "HEAD" 
      ? JSON.stringify(req.body) 
      : undefined,
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

  // Convert Fetch API Response to Vercel response
  res.status(response.status);
  
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const body = await response.text();
  res.send(body);
}
