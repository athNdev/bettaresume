'use client';

import { AppRouter } from '@/components/app-router';

/**
 * Main entry point for the static SPA
 * Uses hash-based routing for GitHub Pages compatibility
 * All routes are handled client-side via the hash fragment
 * 
 * Routes:
 * - #/login - Login page
 * - #/dashboard - Dashboard (protected)
 * - #/resume-editor/:id - Resume editor (protected)
 * - Default: redirects based on auth status
 */
export default function Home() {
  return <AppRouter />;
}
