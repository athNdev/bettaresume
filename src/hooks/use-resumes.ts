import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/trpc/react";

/**
 * Hook to fetch all resumes for the current user.
 * Uses React Query for caching and automatic refetching.
 */
export function useResumes(options?: { includeArchived?: boolean }) {
	const { isInitialized } = useAuth();
	return api.resume.list.useQuery(
		{ includeArchived: options?.includeArchived ?? false },
		{
			// Only fetch once auth is initialized to avoid unauthenticated requests
			enabled: isInitialized,
		},
	);
}

/**
 * Hook to fetch only active (non-archived) resumes
 */
export function useActiveResumes() {
	return useResumes({ includeArchived: false });
}

/**
 * Hook to fetch all resumes including archived
 */
export function useAllResumes() {
	return useResumes({ includeArchived: true });
}
