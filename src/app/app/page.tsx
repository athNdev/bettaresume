"use client";

import { useEffect, useState } from "react";
import { AppRouter } from "@/app/router";
import { HashRouterProvider } from "@/lib/hash-router";

/**
 * The application SPA, served at `/app`.
 *
 * It used to own `/`, which made two things impossible: a crawlable marketing
 * page (crawlers cannot see `#/…`), and a real distinction between "the public
 * site" and "the signed-in product". Moving it here keeps the hash router and
 * every existing `#/` route working unchanged — only the mount point moved.
 *
 * Routes (all inside the fragment):
 * - #/login          - Login page
 * - #/dashboard       - Dashboard (protected)
 * - #/resume-editor/:id - Resume editor (protected)
 * - Default: redirects based on auth status
 */
export default function App() {
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