"use client";

/**
 * Splash Screen
 *
 * Shows a branded splash screen with logo and spinner.
 * Used during initial auth loading and redirects.
 */

import { Loader2 } from "lucide-react";

interface SplashScreenProps {
	message?: string;
}

export function SplashScreen({ message = "Loading..." }: SplashScreenProps) {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-background">
			{/* Logo */}
			<div className="mb-8">
				<div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary shadow-lg">
					<span className="font-bold text-4xl text-primary-foreground">B</span>
				</div>
			</div>

			{/* App Name */}
			<h1 className="mb-2 font-bold text-3xl text-foreground">Betta Resume</h1>
			<p className="mb-8 text-muted-foreground"></p>

			{/* Spinner */}
			<div className="flex flex-col items-center gap-4">
				<Loader2 className="h-8 w-8 animate-spin text-primary" />
				<p className="text-muted-foreground text-sm">{message}</p>
			</div>
		</div>
	);
}
