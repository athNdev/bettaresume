import { useAuth } from "@clerk/clerk-react";
import { api } from "@/lib/trpc/react";

/**
 * Hook to fetch all resumes for the current user.
 * Uses React Query for caching and automatic refetching.
 */
export function useResumes(options?: { includeArchived?: boolean }) {
	const { isLoaded, userId } = useAuth();
	return api.resume.list.useQuery(
		{ includeArchived: options?.includeArchived ?? false },
		{
			// Only fetch once Clerk has resolved and the user is signed in.
			// Without this guard, queries fire before a token exists, causing
			// auth failures that React Query then retries 3× each.
			enabled: isLoaded && !!userId,
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
