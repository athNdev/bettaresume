'use client';

/**
 * Clerk Provider
 * 
 * Wraps the app with ClerkProvider for authentication.
 * Uses @clerk/clerk-react instead of @clerk/nextjs to avoid Server Actions
 * which are incompatible with static export.
 */

import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Clerk Publishable Key. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file.');
}

interface ClerkAuthProviderProps {
  children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
  const { resolvedTheme } = useTheme();

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      appearance={{
        baseTheme: resolvedTheme === 'dark' ? dark : undefined,
        elements: {
          formButtonPrimary: 'bg-primary hover:bg-primary/90',
          card: 'bg-background',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          socialButtonsBlockButton: 'bg-background border border-input hover:bg-accent',
          formFieldLabel: 'text-foreground',
          formFieldInput: 'bg-background border border-input',
          footerActionLink: 'text-primary hover:text-primary/90',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
