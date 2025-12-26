'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { IS_DEV_MODE } from '@/config/auth.config';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  
  useEffect(() => {
    // In dev mode or if already authenticated, go to dashboard
    if (IS_DEV_MODE || isAuthenticated) {
      router.push('/dashboard');
    } else {
      // In production mode without auth, go to login
      router.push('/login');
    }
  }, [router, isAuthenticated]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-muted"></div>
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm text-muted-foreground">Loading Betta Resume...</p>
      </div>
    </div>
  );
}
