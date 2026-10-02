"use client";

/**
 * Protected Route
 *
 * Wraps pages that require authentication.
 * Uses Clerk for auth state.
 */

import { RedirectToSignIn, useAuth } from "@clerk/react";
import { SplashScreen } from "@/app/splash-screen";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	// This component used to render its children unconditionally when
	// `NODE_ENV === "development"`. That only worked because the API also had a
	// dev bypass, which turned out to grant unauthenticated access in production.
	// With the API bypass gone, this shortcut produced the worse state: a
	// dashboard that rendered with no Clerk token while every request 401'd.
	//
	// Local development now authenticates the same way production does, using
	// Clerk dev keys. If you need to work without an account, seed the database
	// and sign in — do not reintroduce a render-level bypass.

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
