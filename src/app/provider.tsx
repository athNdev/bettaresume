"use client";

import { ConfirmDialog } from "@/hooks/use-confirm";
import {
	ApiProvider,
	AuthProvider,
	ClerkAuthProvider,
	ThemeProvider,
	ToastProvider,
	TRPCReactProvider,
} from "../components/providers";

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
			<ClerkAuthProvider>
				<TRPCReactProvider>
					<AuthProvider>
						<ApiProvider>{children}</ApiProvider>
					</AuthProvider>
				</TRPCReactProvider>
			</ClerkAuthProvider>
			<ToastProvider />
			<ConfirmDialog />
		</ThemeProvider>
	);
}
