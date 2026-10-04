"use client";

/**
 * Protected Route
 *
 * Wraps pages that require authentication.
 * Uses Clerk for auth state.
 */

import { RedirectToSignIn } from "@clerk/react";
import { SplashScreen } from "@/app/splash-screen";
import { useAuthSession } from "@/lib/auth/use-auth-session";

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
	// There is no bypass branch here, and there must never be one again. This component
	// used to render its children unconditionally when `NODE_ENV === "development"`. That
	// only worked because the API also had a dev bypass, which turned out to grant
	// unauthenticated callers a full session in production — and once that API gate was
	// tightened, the render-level bypass produced the *worse* state: a dashboard that
	// rendered with no token while every request 401'd.
	//
	// The lesson was not "no bypass". It was that one implicit flag is not a gate. A local
	// build that opted in now gets its session from `useAuthSession`, which is the same
	// code path every consumer already uses, so `isSignedIn` is true in exactly the
	// development case and no component needs to know why.

	const { isLoaded, isSignedIn } = useAuthSession();

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
