"use client";

import { useEffect, useState } from "react";
import { AppRouter } from "@/app/router";
import { HashRouterProvider } from "@/lib/hash-router";

/**
 * Main entry point for the static SPA
 * Uses hash-based routing for GitHub Pages compatibility
 * All routes are handled client-side via the hash fragment
 *
 * Routes:
 * - #/login - Login page
 * - #/dashboard - Dashboard (protected)
 * - #/resume-editor/:id - Resume editor (protected)
 * - Default: redirects based on auth status
 */
export default function Home() {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Render a stable shell for SSR/first paint. This prevents hydration errors
	// caused by browser extensions (e.g. Dark Reader) mutating SVG attributes
	// before React hydrates.
	if (!mounted) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<p className="text-muted-foreground text-sm">Loading…</p>
			</div>
		);
	}

	return (
		<HashRouterProvider>
			<AppRouter />
		</HashRouterProvider>
	);
}
