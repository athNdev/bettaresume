import { createTRPCRouter, createCallerFactory } from "./trpc";
import { userRouter, resumeRouter, sectionRouter } from "./routers";

/**
 * Primary router for the API
 */
export const apiRouter = createTRPCRouter({
  user: userRouter,
  resume: resumeRouter,
  section: sectionRouter,
});

// Export type definition for client
export type ApiRouter = typeof apiRouter;

// Server-side caller factory
export const createCaller = createCallerFactory(apiRouter);
