"use client";

/**
 * Auth Provider
 *
 * Syncs Clerk authentication state to the local Zustand store.
 * Verifies session with backend and clears React Query cache on logout.
 */

import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { SplashScreen } from "@/app/splash-screen";
import { useAuthStore } from "@/features/auth/auth.store";
import { useActiveResumeStore } from "@/hooks";
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

interface AuthProviderProps {
	children: React.ReactNode;
}

// In local development we allow bypassing Clerk so seeded demo data is visible.
// This intentionally avoids relying solely on NEXT_PUBLIC env injection (Turbopack can be finicky).
const isDevBypass = process.env.NODE_ENV === "development";

export function AuthProvider({ children }: AuthProviderProps) {
	const [isInitialized, setIsInitialized] = useState(false);
	const [isBackendVerified, setIsBackendVerified] = useState(false);
	const [backendStatus, setBackendStatus] = useState<
		"online" | "offline" | "unknown"
	>("unknown");

	// Clerk hooks
	const { isLoaded: isClerkLoaded, isSignedIn, getToken } = useClerkAuth();
	const { user: clerkUser } = useUser();

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
		// In dev bypass mode we don't need to wait for Clerk.
		if (!isDevBypass && !isClerkLoaded) return;

		const syncAuth = async () => {
			// Dev bypass mode - use mock user
			if (isDevBypass) {
				console.log("[AuthProvider] Dev bypass mode enabled");
				// Ensure we don't show cached data from a previous Clerk session.
				queryClient.clear();
				setUser({
					id: "user-1",
					email: "demo@bettaresume.com",
					name: "Demo User",
					picture: null,
					createdAt: new Date().toISOString(),
					emailVerified: true,
					preferences: {
						theme: "dark",
						emailNotifications: false,
						autoSave: true,
						defaultTemplate: "minimal",
					},
				});
				setToken("dev-token");
				setIsInitialized(true);
				setIsBackendVerified(true);
				setBackendStatus("online");
				return;
			}

			if (isSignedIn && clerkUser) {
				// Get JWT token for API calls
				const token = await getToken();

				// Sync user to local store
				setUser({
					id: clerkUser.id,
					email: clerkUser.primaryEmailAddress?.emailAddress || "",
					name: clerkUser.fullName || clerkUser.firstName || "User",
					picture: clerkUser.imageUrl || null,
					createdAt:
						clerkUser.createdAt?.toISOString() || new Date().toISOString(),
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
		isDevBypass,
	]);

	// Show splash screen while Clerk is loading
	if (!isClerkLoaded && !isDevBypass) {
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
