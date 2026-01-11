'use client';

import { ThemeProvider } from './theme-provider';
import { ToastProvider } from './toast-provider';
import { TRPCReactProvider } from './trpc-provider';
import { ClerkAuthProvider } from './clerk-provider';
import { AuthProvider } from './auth-provider';
import { ApiProvider } from './api-provider';
import { DirectionProvider } from './direction-provider';
import { LayoutProvider } from '@/components/providers/layout-provider';
import { SearchProvider } from '@/components/providers/search-provider';
import { FontProvider } from '@/components/providers/font-provider';
import { HashRouterProvider } from '@/lib/hash-router';
import { TooltipProvider } from '@/components/ui/tooltip';

import { ConfirmDialog } from '@/hooks/use-confirm';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * App Providers
 * 
 * Composes all providers in the correct order.
 * ClerkAuthProvider must wrap TRPCReactProvider so useAuth is available for token injection
 * AuthProvider syncs Clerk state to local store
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <TooltipProvider>
        <HashRouterProvider>
          <FontProvider>
            <DirectionProvider>
              <LayoutProvider>
                <ClerkAuthProvider>
                  <TRPCReactProvider>
                    <AuthProvider>
                      <ApiProvider>
                        <SearchProvider>
                          {children}
                        </SearchProvider>
                      </ApiProvider>
                    </AuthProvider>
                  </TRPCReactProvider>
                </ClerkAuthProvider>
                <ToastProvider />
                <ConfirmDialog />
              </LayoutProvider>
            </DirectionProvider>
          </FontProvider>
        </HashRouterProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

