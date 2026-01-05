'use client';

/**
 * Protected Route
 * 
 * Wraps pages that require authentication.
 */

import { useEffect } from 'react';
import { useHashRouter } from '@/lib/hash-router';
import { useAuthStore } from '@/store';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function AuthCheckingSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { navigate } = useHashRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  // Show loading while checking auth
  if (isLoading) {
    return <AuthCheckingSkeleton />;
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
