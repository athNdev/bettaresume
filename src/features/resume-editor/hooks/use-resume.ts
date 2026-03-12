import { api } from "@/lib/trpc/react";

/**
 * Hook to fetch a single resume by ID.
 * Only fetches when id is provided (not null/undefined).
 */
export function useResume(id: string | null | undefined) {
	return api.resume.getById.useQuery(
		{ id: id as string },
		{
			enabled: !!id,
		},
	);
}
