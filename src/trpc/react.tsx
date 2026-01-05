"use client";

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchStreamLink, loggerLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { useState } from "react";
import SuperJSON from "superjson";

import { createQueryClient } from "./query-client";

// Import ApiRouter directly from api-server (type-only, no runtime code)
import type { ApiRouter } from "../../api-server/src/root";

// Re-export entity types for use in components
export type {
	User,
	Resume,
	Section,
	ResumeWithSections,
	SectionContent,
	CreateResumeInput,
	UpdateResumeInput,
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
 * ApiRouter is imported from the api-server workspace package.
 */
export const api = createTRPCReact<ApiRouter>();

/**
 * Inference helpers for inputs and outputs.
 * @example type ResumeList = RouterOutputs['resume']['list']
 */
export type RouterInputs = inferRouterInputs<ApiRouter>;
export type RouterOutputs = inferRouterOutputs<ApiRouter>;

// tRPC provider - not actively used yet, but kept for future API integration
export function TRPCReactProvider(props: { children: React.ReactNode }) {
	const queryClient = getQueryClient();

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
					url: `${getBaseUrl()}/api/trpc`,
					headers: () => {
						const headers = new Headers();
						headers.set("x-trpc-source", "nextjs-react");
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

function getBaseUrl() {
	if (process.env.NEXT_PUBLIC_API_URL) {
		return process.env.NEXT_PUBLIC_API_URL;
	}
	// Default to same origin in browser, localhost:3001 for SSR
	if (typeof window !== "undefined") return window.location.origin;
	return `http://localhost:${process.env.PORT ?? 3001}`;
}
