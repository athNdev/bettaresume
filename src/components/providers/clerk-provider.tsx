"use client";

/**
 * Clerk Provider
 *
 * Wraps the app with ClerkProvider for authentication.
 * Uses @clerk/react instead of @clerk/nextjs to avoid Server Actions
 * which are incompatible with static export.
 */

import { ClerkProvider } from "@clerk/react";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";
import { DEV_BYPASS_ACTIVE } from "@/lib/dev-bypass";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// A local development build that opted into the bypass needs no Clerk key and must not
// reach Clerk at all. The previous version threw unconditionally, which is why the bypass
// could not be used to look at the app without provisioning keys first.
if (!PUBLISHABLE_KEY && !DEV_BYPASS_ACTIVE) {
	throw new Error(
		"Missing Clerk Publishable Key. Add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file.",
	);
}

const PUBLISHABLE_KEY_STR = PUBLISHABLE_KEY as string;

interface ClerkAuthProviderProps {
	children: React.ReactNode;
}

export function ClerkAuthProvider({ children }: ClerkAuthProviderProps) {
	const { resolvedTheme } = useTheme();

	// No ClerkProvider in a bypass build. `useAuthSession` and `useSessionUser` resolve to
	// their dev implementations there, so nothing reaches for Clerk's context and no
	// network call is made. `useTheme` is still called above unconditionally, so hook
	// order does not depend on this branch.
	if (DEV_BYPASS_ACTIVE) {
		return <>{children}</>;
	}

	return (
		<ClerkProvider
			appearance={{
				theme: resolvedTheme === "dark" ? dark : undefined,
				// Clerk renamed `baseTheme` -> `theme` and `layout` -> `options`.
				options: {
					logoImageUrl: "/logo.svg",
				},
				elements: {
					formButtonPrimary: "bg-primary hover:bg-primary/90",
					card: "bg-background",
					headerTitle: "text-foreground",
					headerSubtitle: "text-muted-foreground",
					socialButtonsBlockButton:
						"bg-background border border-input hover:bg-accent",
					formFieldLabel: "text-foreground",
					formFieldInput: "bg-background border border-input",
					footerActionLink: "text-primary hover:text-primary/90",
				},
			}}
			publishableKey={PUBLISHABLE_KEY_STR}
		>
			{children}
		</ClerkProvider>
	);
}
