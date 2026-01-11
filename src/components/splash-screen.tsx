'use client';

/**
 * Splash Screen
 * 
 * Shows a branded splash screen with logo and spinner.
 * Used during initial auth loading and redirects.
 */

import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  message?: string;
}

export function SplashScreen({ message = 'Loading...' }: SplashScreenProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">

      {/* Spinner */}
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
