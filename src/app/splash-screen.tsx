"use client";

/**
 * Splash Screen
 *
 * The first thing the app paints: on a cold load, while auth resolves, and while a
 * route's chunk downloads. It used to be a 96px logo, a 32px copy of the same product
 * name, an empty paragraph and a generic spinner — three objects saying "Betta Resume"
 * and nothing saying what was happening.
 *
 * It is now the wordmark lockup at header size, one indeterminate hairline, and the
 * message. Quiet is the right register for a wait: the resume is the loud thing once
 * the editor opens.
 */

import { BrandLockup } from "@/components/brand";

interface SplashScreenProps {
	message?: string;
}

export function SplashScreen({ message = "Loading…" }: SplashScreenProps) {
	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background">
			<BrandLockup size="lg" />

			<div className="flex flex-col items-center gap-3">
				{/*
				 * A 2px indeterminate track rather than a spinner. It is the same
				 * "something is happening" signal without a rotating chrome element, and
				 * `animate-pulse` is covered by the global reduced-motion override.
				 */}
				<div
					aria-hidden="true"
					className="h-0.5 w-40 overflow-hidden rounded-full bg-sunken"
				>
					<div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
				</div>
				<p className="text-fg-muted text-xs" role="status">
					{message}
				</p>
			</div>
		</div>
	);
}
