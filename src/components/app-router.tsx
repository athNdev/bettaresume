'use client';

import { useEffect, useState } from 'react';
import { useHashRouter, matchRoute } from '@/lib/hash-router';
import { useAuthStore } from '@/store/auth.store';
import { useResumeStore } from '@/store/resume.store';

// Lazy load views for code splitting
import dynamic from 'next/dynamic';

const LoginPage = dynamic(() => import('@/views/login'), { 
  loading: () => <PageLoader message="Loading login..." />
});

const DashboardPage = dynamic(() => import('@/views/dashboard'), { 
  loading: () => <PageLoader message="Loading dashboard..." />
});

const ResumeEditorPage = dynamic(() => import('@/views/resume-editor'), { 
  loading: () => <PageLoader message="Loading editor..." />
});

function PageLoader({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

export function AppRouter() {
  const { path, navigate, replace } = useHashRouter();
  const { isAuthenticated } = useAuthStore();
  const { _hasHydrated } = useResumeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle initial routing
  useEffect(() => {
    if (!mounted || !_hasHydrated) return;

    // Root path - redirect based on auth status
    if (path === '/') {
      if (isAuthenticated) {
        replace('/dashboard');
      } else {
        replace('/login');
      }
    }
  }, [path, isAuthenticated, _hasHydrated, mounted, replace]);

  // Don't render until hydrated
  if (!mounted || !_hasHydrated) {
    return <PageLoader message="Loading Betta Resume..." />;
  }

  // Route matching
  if (path === '/login') {
    return <LoginPage />;
  }

  if (path === '/dashboard') {
    return <DashboardPage />;
  }

  // Dynamic route: /resume-editor/:id
  const resumeEditorParams = matchRoute(path, '/resume-editor/:id');
  if (resumeEditorParams && resumeEditorParams.id) {
    return <ResumeEditorPage id={resumeEditorParams.id} />;
  }

  // Root path shows loader while redirecting
  if (path === '/') {
    return <PageLoader message="Loading Betta Resume..." />;
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
