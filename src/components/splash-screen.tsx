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
      {/* Logo */}
      <div className="mb-8">
        <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <span className="text-primary-foreground font-bold text-4xl">B</span>
        </div>
      </div>

      {/* App Name */}
      <h1 className="text-3xl font-bold text-foreground mb-2">Betta Resume</h1>
      <p className="text-muted-foreground mb-8"></p>

      {/* Spinner */}
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
