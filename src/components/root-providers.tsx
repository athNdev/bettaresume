'use client';

import {
  ThemeProvider,
  ToastProvider,
  TRPCReactProvider,
  ClerkAuthProvider,
  AuthProvider,
  ApiProvider,
} from './providers';
import { ConfirmDialog } from '@/hooks/use-confirm';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * App Providers
 * 
 * Composes all providers in the correct order.
 * ClerkAuthProvider must be after ThemeProvider (for dark mode theming)
 * AuthProvider syncs Clerk state to local store
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <TRPCReactProvider>
      <ThemeProvider>
        <ClerkAuthProvider>
          <AuthProvider>
            <ApiProvider>
              {children}
            </ApiProvider>
          </AuthProvider>
        </ClerkAuthProvider>
        <ToastProvider />
        <ConfirmDialog />
      </ThemeProvider>
    </TRPCReactProvider>
  );
}

