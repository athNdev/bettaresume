/**
 * Root tRPC Router
 * Combines all procedure routers and exports the AppRouter type
 */

import { router } from './trpc';
import { userRouter } from './trpc/procedures/user';
import { resumeRouter } from './trpc/procedures/resume';
import { sectionRouter } from './trpc/procedures/section';
import { authRouter } from './trpc/procedures/auth';

export const appRouter = router({
  user: userRouter,
  resume: resumeRouter,
  section: sectionRouter,
  auth: authRouter,
});

// Export type for frontend
export type AppRouter = typeof appRouter;
