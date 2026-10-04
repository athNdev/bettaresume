"use client";

/**
 * Auth Provider
 *
 * Syncs Clerk authentication state to the local Zustand store.
 * Verifies session with backend and clears React Query cache on logout.
 */

import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { SplashScreen } from "@/app/splash-screen";
import { useAuthStore } from "@/features/auth/auth.store";
import { useActiveResumeStore } from "@/hooks";
import { useAuthSession, useSessionUser } from "@/lib/auth/use-auth-session";
import { api } from "@/lib/trpc/react";

interface AuthContextValue {
	isInitialized: boolean;
	isClerkLoaded: boolean;
	isBackendVerified: boolean;
	backendStatus: "online" | "offline" | "unknown";
}

const AuthContext = createContext<AuthContextValue>({
	isInitialized: false,
	isClerkLoaded: false,
	isBackendVerified: false,
	backendStatus: "unknown",
});

export function useAuth() {
	return useContext(AuthContext);
}

/**
 * One timestamp representation, whatever the session source gave us.
 *
 * Clerk hands back a `Date`; the dev session in `src/lib/dev-bypass.ts` is a plain string
 * so it survives `JSON.stringify` without a serialisation round-trip. Normalising at the
 * boundary means no caller has to branch on which one it received.
 */
function normaliseTimestamp(value: Date | string | null | undefined): string {
	if (value instanceof Date) return value.toISOString();
	if (typeof value === "string" && value) return value;
	return new Date().toISOString();
}

interface AuthProviderProps {
	children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
	const [isInitialized, setIsInitialized] = useState(false);
	const [isBackendVerified, setIsBackendVerified] = useState(false);
	const [backendStatus, setBackendStatus] = useState<
		"online" | "offline" | "unknown"
	>("unknown");

	// One session source for the whole app: Clerk, or the local dev session in a build
	// that opted into the bypass. See src/lib/auth/use-auth-session.ts.
	const { isLoaded: isClerkLoaded, isSignedIn, getToken } = useAuthSession();
	const clerkUser = useSessionUser();

	// React Query client for cache clearing
	const queryClient = useQueryClient();

	// Local store actions
	const setUser = useAuthStore((state) => state.setUser);
	const setToken = useAuthStore((state) => state.setToken);
	const clearAuth = useAuthStore((state) => state.clearAuth);
	const clearActiveResume = useActiveResumeStore(
		(state) => state.clearActiveResume,
	);

	// tRPC mutation for session verification
	const verifySession = api.auth.verifySession.useMutation({
		onSuccess: (data) => {
			console.log("[AuthProvider] Session verified with backend", data);
			setIsBackendVerified(true);
			setBackendStatus("online");
		},
		onError: (error) => {
			console.warn(
				"[AuthProvider] Backend verification failed, continuing offline:",
				error.message,
			);
			setBackendStatus("offline");
			// Still allow access with local data
			setIsBackendVerified(true);
		},
	});

	// Sync Clerk state to local store
	useEffect(() => {
		if (!isClerkLoaded) return;

		const syncAuth = async () => {
			// No bypass branch here. In a local build that opted in, `useSessionUser`
			// returns DEV_USER and the API grants the matching session, so this code
			// runs its ordinary path against a dev identity instead of special-casing
			// one. The earlier version of this branch fabricated a session while the API
			// had no matching bypass, which produced the worse state: a dashboard that
			// rendered while every one of its requests 401'd.
			if (isSignedIn && clerkUser) {
				// Get JWT token for API calls
				const token = await getToken();

				// Sync user to local store
				setUser({
					id: clerkUser.id,
					email: clerkUser.primaryEmailAddress?.emailAddress || "",
					name: clerkUser.fullName || clerkUser.firstName || "User",
					picture: clerkUser.imageUrl || null,
					// `createdAt` arrives as a Date from Clerk and as a string from the dev
					// session. Normalising here keeps one representation downstream instead of
					// calling `.toISOString()` on a value that may already be a string.
					createdAt: normaliseTimestamp(clerkUser.createdAt),
					emailVerified:
						clerkUser.primaryEmailAddress?.verification?.status === "verified",
					preferences: {
						theme: "dark",
						emailNotifications: true,
						autoSave: true,
						defaultTemplate: "minimal",
					},
				});

				if (token) {
					setToken(token);
				}

				// Verify session with backend (non-blocking)
				verifySession.mutate({
					email: clerkUser.primaryEmailAddress?.emailAddress,
					name: clerkUser.fullName,
					image: clerkUser.imageUrl,
				});
			} else {
				// User signed out - clear all data
				clearAuth();
				clearActiveResume();

				// Clear React Query cache to remove all resume data
				queryClient.clear();

				console.log("[AuthProvider] User signed out, cleared all cached data");
			}

			setIsInitialized(true);
		};

		syncAuth();
	}, [
		isClerkLoaded,
		isSignedIn,
		clerkUser,
		getToken,
		setUser,
		setToken,
		clearAuth,
		clearActiveResume,
		queryClient, // Verify session with backend (non-blocking)
		verifySession.mutate,
	]);

	// Show splash screen while Clerk is loading
	if (!isClerkLoaded) {
		return <SplashScreen message="Initializing..." />;
	}

	return (
		<AuthContext.Provider
			value={{ isInitialized, isClerkLoaded, isBackendVerified, backendStatus }}
		>
			{children}
		</AuthContext.Provider>
	);
}
