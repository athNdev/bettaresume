"use client";

import { RedirectToSignIn } from "@clerk/react";
// Lazy load views for code splitting
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SplashScreen } from "@/app/splash-screen";
import { useAuthStore } from "@/features/auth/auth.store";
import { useAuthSession } from "@/lib/auth/use-auth-session";
import { matchRoute, useHashRouter } from "@/lib/hash-router";

const DashboardPage = dynamic(() => import("@/features/dashboard/dashboard"), {
	loading: () => <SplashScreen message="Loading dashboard..." />,
});

const ResumeEditorPage = dynamic(
	() => import("@/features/resume-editor/resume-editor"),
	{
		loading: () => <SplashScreen message="Loading editor..." />,
	},
);

export function AppRouter() {
	// NOTE: `isDevBypass` used to short-circuit every auth check below, keyed on a
	// single flag. It only appeared to work because the API had a matching dev
	// bypass — which turned out to hand unauthenticated callers a full session in
	// production. The lesson was not "no bypass": it was that one implicit gate
	// is not a gate.
	//
	// There is no bypass check here at all now. `useAuthSession` resolves to the dev
	// session in a local build that opted in, and to Clerk everywhere else, so
	// `isSignedIn` is true in exactly the development case and only that case.
	// That moves the decision to one build-time constant instead of scattering it
	// across every route guard. See src/lib/dev-bypass.ts.
	const { path, navigate, replace } = useHashRouter();
	const { isAuthenticated } = useAuthStore();
	const { isLoaded: isClerkLoaded, isSignedIn } = useAuthSession();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Handle routing after auth is ready
	useEffect(() => {
		if (!mounted) return;
		if (!isClerkLoaded) return;

		// Root path - redirect to dashboard if authenticated
		if (path === "/" && isSignedIn && isAuthenticated) {
			replace("/dashboard");
		}
	}, [path, isSignedIn, isAuthenticated, isClerkLoaded, mounted, replace]);

	// Don't render until mounted and Clerk is loaded (unless dev bypass)
	if (!mounted || !isClerkLoaded) {
		return <SplashScreen message="Loading Betta Resume..." />;
	}

	// Root path "/" - Show splash screen
	// If not signed in, redirect to Clerk login
	// If signed in, redirect to dashboard (handled by useEffect above)
	if (path === "/" || path === "/login") {
		if (!isSignedIn) {
			// Redirect to Clerk's hosted sign-in page
			return <RedirectToSignIn />;
		}
		// Show splash while redirecting to dashboard
		return <SplashScreen message="Signing you in..." />;
	}

	// Protected routes - require authentication
	if (!isSignedIn) {
		return <RedirectToSignIn />;
	}

	// Route matching for authenticated users
	if (path === "/dashboard") {
		return <DashboardPage />;
	}

	// Dynamic route: /resume-editor/:id
	const resumeEditorParams = matchRoute(path, "/resume-editor/:id");
	if (resumeEditorParams?.id) {
		return <ResumeEditorPage id={resumeEditorParams.id} />;
	}

	// 404 - Not found
	return (
		<div className="flex min-h-screen items-center justify-center bg-background">
			<div className="space-y-4 text-center">
				<h1 className="font-bold text-4xl">404</h1>
				<p className="text-muted-foreground">Page not found</p>
				<button
					className="text-primary hover:underline"
					onClick={() => navigate("/dashboard")}
					type="button"
				>
					Go to Dashboard
				</button>
			</div>
		</div>
	);
}
