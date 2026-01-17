"use client";

import { useAuth } from "@clerk/clerk-react";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useRef, useState } from "react";
import SuperJSON from "superjson";
// Import AppRouter directly from api (type-only, no runtime code)
import type { AppRouter } from "../../../api/src/root";
import { createQueryClient } from "./query-client";

// Re-export entity types for use in components
export type {
	CreateResumeInput,
	Resume,
	ResumeSection,
	ResumeWithSections,
	Section,
	SectionContent,
	SyncState,
	SyncStatus,
	UpdateResumeInput,
	User,
} from "@bettaresume/types";

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
	if (typeof window === "undefined") {
		return createQueryClient();
	}
	clientQueryClientSingleton ??= createQueryClient();
	return clientQueryClientSingleton;
};

/**
 * tRPC React client with full type safety.
 * AppRouter is imported from the api-server workspace package.
 */
export const api = createTRPCReact<AppRouter>();

/**
 * Inference helpers for inputs and outputs.
 * @example type ResumeList = RouterOutputs['resume']['list']
 */
export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;

/**
 * Get the API base URL
 * Priority: NEXT_PUBLIC_API_URL env var > localhost:4000 (dev default)
 */
function getBaseUrl() {
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL;
	}
	// Default to localhost:4000 for local development
	return "http://localhost:4000";
}

/**
 * tRPC React Provider with auth header injection
 * Uses Clerk's getToken() for fresh tokens on each request
 */
export function TRPCReactProvider(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient();
	const { getToken } = useAuth();

	// Store getToken in a ref so the tRPC client can access the latest version
	const getTokenRef = useRef(getToken);
	getTokenRef.current = getToken;

	const [trpcClient] = useState(() =>
		api.createClient({
			links: [
				loggerLink({
					enabled: (op) =>
						process.env.NODE_ENV === "development" ||
						(op.direction === "down" && op.result instanceof Error),
				}),
				httpBatchStreamLink({
					transformer: SuperJSON,
					url: `${getBaseUrl()}/trpc`,
					headers: async () => {
						const headers = new Headers();
						headers.set("x-trpc-source", "nextjs-react");

						// Get fresh token from Clerk for each request
						// This handles token refresh automatically
						try {
							const token = await getTokenRef.current();
							if (token) {
								headers.set("Authorization", `Bearer ${token}`);
							}
						} catch (error) {
							console.warn("[tRPC] Failed to get auth token:", error);
						}

						return headers;
					},
				}),
			],
		}),
	);

	return (
		<QueryClientProvider client={queryClient}>
			<api.Provider client={trpcClient} queryClient={queryClient}>
				{props.children}
			</api.Provider>
		</QueryClientProvider>
	);
}
