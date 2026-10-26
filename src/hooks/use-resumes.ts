import { api } from "@/lib/trpc/react";

/**
 * Hook to fetch all resumes for the current user.
 * Uses React Query for caching and automatic refetching.
 *
 * `enabled` exists so a surface can say when it actually needs the library. The editor
 * calls this for its variation list and its document switcher — neither of which can be
 * used before the document being edited has loaded — so firing it on mount made the
 * editor wait for every resume in the account before it could draw its header, and
 * shared a batch with the one document it did need.
 */
export function useResumes(options?: {
	includeArchived?: boolean;
	enabled?: boolean;
}) {
	return api.resume.list.useQuery(
		{ includeArchived: options?.includeArchived ?? false },
		{
			// Only fetch when user is authenticated (token exists) and the caller needs it.
			enabled: options?.enabled ?? true,
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
