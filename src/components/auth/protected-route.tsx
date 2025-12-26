'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Routes that don't require authentication
const publicRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/auth/callback',
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
  const { isAuthenticated, isLoading, isDevMode, loginAsDev } = useAuthStore();

  useEffect(() => {
    // Skip protection in dev mode - auto-login with dev account
    if (isDevMode()) {
      if (!isAuthenticated) {
        loginAsDev();
      }
      return;
    }

    // If still loading, wait
    if (isLoading) return;

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
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
  }, [isAuthenticated, isLoading, pathname, router, isDevMode, loginAsDev]);

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

  // In dev mode, always render children
  if (isDevMode()) {
    return <>{children}</>;
  }

  // Check if current route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));

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

// Hook to check if user has required subscription level
export function useRequireSubscription(requiredPlan: 'free' | 'pro' | 'enterprise' = 'free') {
  const { user } = useAuthStore();
  
  const planHierarchy = { free: 0, pro: 1, enterprise: 2 };
  const userPlanLevel = planHierarchy[user?.subscription?.plan || 'free'];
  const requiredPlanLevel = planHierarchy[requiredPlan];
  
  return {
    hasAccess: userPlanLevel >= requiredPlanLevel,
    currentPlan: user?.subscription?.plan || 'free',
    requiredPlan,
  };
}

// Hook to get current user
export function useUser() {
  const { user, isAuthenticated } = useAuthStore();
  return { user, isAuthenticated };
}
