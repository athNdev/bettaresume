"use client";

import { RedirectToSignIn, useAuth as useClerkAuth } from "@clerk/react";
// Lazy load views for code splitting
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SplashScreen } from "@/app/splash-screen";
import { useAuthStore } from "@/features/auth/auth.store";
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
	// NOTE: `isDevBypass` used to short-circuit every auth check below. It only
	// appeared to work because the API had a matching dev bypass — which turned
	// out to hand unauthenticated callers a full session in production. With the
	// API bypass gone, this produced a dashboard that rendered while all of its
	// requests 401'd. Development now authenticates like production, using Clerk
	// dev keys. See docs/AGENT-CONTEXT.md.
	const { path, navigate, replace } = useHashRouter();
	const { isAuthenticated } = useAuthStore();
	const { isLoaded: isClerkLoaded, isSignedIn } = useClerkAuth();
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
