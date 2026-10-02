"use client";

/**
 * Auth Provider
 *
 * Syncs Clerk authentication state to the local Zustand store.
 * Verifies session with backend and clears React Query cache on logout.
 */

import { useAuth as useClerkAuth, useUser } from "@clerk/react";
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
		if (!isClerkLoaded) return;

		const syncAuth = async () => {
			// NOTE: a dev bypass used to fabricate a `user-1` session here and
			// short-circuit the Clerk wait. It existed to pair with the API's
			// `x-dev-mode` header — and once that header was closed off as a
			// production auth bypass, this branch left the app believing it was
			// signed in while every request 401'd. Development now signs in for
			// real, with Clerk dev keys. See docs/AGENT-CONTEXT.md.
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
