'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { LOCAL_MODE_USER } from '@/types/auth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that don't require authentication (even in cloud mode)
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
  '/', // Home page handles mode selection
];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
];

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { 
    isAuthenticated, 
    isLoading, 
    isLocalMode, 
    isCloudMode,
    storageMode,
    switchToLocalMode,
    user,
  } = useAuthStore();

  useEffect(() => {
    // In local mode, always allow access - auto-authenticate with local user
    if (isLocalMode()) {
      if (!isAuthenticated || user?.id !== LOCAL_MODE_USER.id) {
        switchToLocalMode();
      }
      return;
    }

    // In cloud mode, handle authentication
    if (isCloudMode()) {
      // If still loading, wait
      if (isLoading) return;

      const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));
      const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

      // If not authenticated and trying to access protected route
      if (!isAuthenticated && !isPublicRoute) {
        router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // If authenticated and trying to access auth route, redirect to dashboard
      if (isAuthenticated && isAuthRoute) {
        router.push('/dashboard');
        return;
      }
    }
  }, [isAuthenticated, isLoading, pathname, router, isLocalMode, isCloudMode, switchToLocalMode, storageMode, user]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // In local mode, always render children
  if (isLocalMode()) {
    return <>{children}</>;
  }

  // Cloud mode: Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // If not authenticated and not a public route, show loading while redirecting
  if (!isAuthenticated && !isPublicRoute) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Hook to get current user
export function useUser() {
  const { user, isAuthenticated, storageMode } = useAuthStore();
  return { user, isAuthenticated, storageMode };
}

// Hook to check storage mode
export function useStorageMode() {
  const { storageMode, isLocalMode, isCloudMode, switchToLocalMode, switchToCloudMode } = useAuthStore();
  return { storageMode, isLocalMode: isLocalMode(), isCloudMode: isCloudMode(), switchToLocalMode, switchToCloudMode };
}
