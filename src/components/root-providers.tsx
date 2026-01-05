'use client';

import {
  ThemeProvider,
  ToastProvider,
  TRPCReactProvider,
  AuthProvider,
  ApiProvider,
} from './providers';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * App Providers
 * 
 * Composes all providers in the correct order.
 * Individual providers are defined in ./providers/
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <TRPCReactProvider>
      <ThemeProvider>
        <AuthProvider>
          <ApiProvider>
            {children}
          </ApiProvider>
        </AuthProvider>
        <ToastProvider />
      </ThemeProvider>
    </TRPCReactProvider>
  );
}

