'use client';

import { useEffect, useState } from 'react';
import { useHashRouter, matchRoute } from '@/lib/hash-router';
import { useAuthStore } from '@/store/auth.store';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { SplashScreen } from '@/components/splash-screen';
import { RedirectToSignIn } from '@clerk/clerk-react';

// Lazy load views for code splitting
import dynamic from 'next/dynamic';

const DashboardPage = dynamic(() => import('@/views/dashboard'), { 
  loading: () => <SplashScreen message="Loading dashboard..." />
});

const ResumeEditorPage = dynamic(() => import('@/views/resume-editor'), { 
  loading: () => <SplashScreen message="Loading editor..." />
});

export function AppRouter() {
  const { path, navigate, replace } = useHashRouter();
  const { isAuthenticated } = useAuthStore();
  const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle routing after auth is ready
  useEffect(() => {
    if (!mounted || !isClerkLoaded) return;

    // Root path - redirect to dashboard if authenticated
    if (path === '/' && isSignedIn && isAuthenticated) {
      replace('/dashboard');
    }
  }, [path, isSignedIn, isAuthenticated, isClerkLoaded, mounted, replace]);

  // Don't render until mounted and Clerk is loaded
  if (!mounted || !isClerkLoaded) {
    return <SplashScreen message="Loading Betta Resume..." />;
  }

  // Root path "/" - Show splash screen
  // If not signed in, redirect to Clerk login
  // If signed in, redirect to dashboard (handled by useEffect above)
  if (path === '/' || path === '/login') {
    if (!isSignedIn) {
      // Redirect to Clerk's hosted sign-in page
      return <RedirectToSignIn />;
    }
    // Show splash while redirecting to dashboard
    return <SplashScreen message="Signing you in..." />;
  }

  // Protected routes - require authentication
  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  // Route matching for authenticated users
  if (
    path === '/dashboard' || 
    path.startsWith('/dashboard/') || 
    path === '/tasks' || 
    path === '/apps' || 
    path === '/chats' || 
    path === '/users' || 
    path === '/settings' || 
    path.startsWith('/settings/')
  ) {
    return <DashboardPage />;
  }

  // Dynamic route: /resume-editor/:id
  const resumeEditorParams = matchRoute(path, '/resume-editor/:id');
  if (resumeEditorParams && resumeEditorParams.id) {
    return <ResumeEditorPage id={resumeEditorParams.id} />;
  }

  // 404 - Not found
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-muted-foreground">Page not found</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="text-primary hover:underline"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
