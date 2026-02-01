"use client";

/**
 * Protected Route
 *
 * Wraps pages that require authentication.
 * Uses Clerk for auth state.
 */

import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import { SplashScreen } from "@/app/splash-screen";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	const isDevBypass = process.env.NODE_ENV === "development";
	if (isDevBypass) {
		return <>{children}</>;
	}

	const { isLoaded, isSignedIn } = useAuth();

	// Show splash screen while checking auth
	if (!isLoaded) {
		return <SplashScreen message="Checking authentication..." />;
	}

	// Redirect to Clerk sign-in if not authenticated
	if (!isSignedIn) {
		return <RedirectToSignIn />;
	}

	return <>{children}</>;
}
