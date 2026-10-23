import type {
	CreateResumeInput,
	Resume,
	UpdateResumeInput,
} from "@bettaresume/types";
import { api } from "@/lib/trpc/react";

/**
 * Hook providing all resume mutation operations with automatic cache invalidation.
 * Uses optimistic updates for better UX.
 */
export function useResumeMutations() {
	const utils = api.useUtils();

	const create = api.resume.create.useMutation({
		onSuccess: () => {
			// Invalidate resume list to refetch
			utils.resume.list.invalidate();
		},
	});

	const update = api.resume.update.useMutation({
		onMutate: async ({ id, data }: { id: string; data: UpdateResumeInput }) => {
			// Cancel any outgoing refetches
			await utils.resume.getById.cancel({ id });

			// Snapshot previous values
			const previousResume = utils.resume.getById.getData({ id });

			// Optimistically update single resume
			if (previousResume) {
				utils.resume.getById.setData({ id }, {
					...previousResume,
					...data,
					updatedAt: new Date(),
				} as any);
			}

			return { previousResume };
		},
		onError: (_err, { id }, context) => {
			// Rollback on error
			if (context?.previousResume) {
				utils.resume.getById.setData({ id }, context.previousResume);
			}
		},
		onSettled: (_data, _error, { id }) => {
			// Only refetch the specific resume, not the list
			utils.resume.getById.invalidate({ id });
		},
	});

	const remove = api.resume.delete.useMutation({
		onMutate: async ({ id }: { id: string }) => {
			await utils.resume.list.cancel();
			const previousList = utils.resume.list.getData();

			// Optimistically remove from list
			if (previousList) {
				utils.resume.list.setData(
					undefined,
					previousList.filter((r) => r.id !== id),
				);
			}

			return { previousList };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousList) {
				utils.resume.list.setData(undefined, context.previousList);
			}
		},
		onSettled: () => {
			utils.resume.list.invalidate();
		},
	});

	const duplicate = api.resume.duplicate.useMutation({
		onSuccess: () => {
			utils.resume.list.invalidate();
		},
	});

	const archive = api.resume.archive.useMutation({
		onMutate: async ({ id, archived }: { id: string; archived: boolean }) => {
			await utils.resume.list.cancel();
			const previousList = utils.resume.list.getData();

			// Optimistically update archive status
			if (previousList) {
				utils.resume.list.setData(
					undefined,
					previousList.map((r) =>
						r.id === id
							? ({
									...r,
									isArchived: archived,
									updatedAt: new Date(),
								} as Resume)
							: r,
					) as any,
				);
			}

			return { previousList };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousList) {
				utils.resume.list.setData(undefined, context.previousList);
			}
		},
		onSettled: () => {
			utils.resume.list.invalidate();
		},
	});

	/**
	 * Create a variant of a resume.
	 *
	 * Invalidates the list (the new document has to appear in it) and the base resume
	 * (its variant count is derived from the list, but the editor also holds a
	 * `getById` entry for the base).
	 */
	const createVariation = api.resume.createVariation.useMutation({
		onSuccess: (_result, { baseResumeId }) => {
			utils.resume.list.invalidate();
			utils.resume.getById.invalidate({ id: baseResumeId });
		},
	});

	/**
	 * Re-pull every linked section of a variant from its base.
	 *
	 * Fetches the full document afterwards because `pullFromBase` can rewrite most of the
	 * section bodies at once; patching them optimistically would mean duplicating the
	 * server's resolution rules in the browser.
	 */
	const pullFromBase = api.resume.pullFromBase.useMutation({
		onSuccess: (_result, { resumeId }) => {
			utils.resume.getById.invalidate({ id: resumeId });
		},
	});

	return {
		create,
		update,
		remove,
		duplicate,
		archive,
		createVariation,
		pullFromBase,
		// Convenience methods
		createResume: (input: CreateResumeInput) => create.mutateAsync(input),
		updateResume: (id: string, data: UpdateResumeInput) =>
			update.mutateAsync({ id, data }),
		deleteResume: (id: string) => remove.mutateAsync({ id }),
		duplicateResume: (id: string, newName?: string) =>
			duplicate.mutateAsync({ id, newName }),
		archiveResume: (id: string, archived: boolean) =>
			archive.mutateAsync({ id, archived }),
		/**
		 * Create a variant. `baseResumeId` is the resume being copied; the server resolves
		 * the root base if it is itself a variant, so the caller does not have to know.
		 */
		createResumeVariation: (input: {
			baseResumeId: string;
			name: string;
			domain?: string;
		}) => createVariation.mutateAsync(input),
		syncVariationWithBase: (resumeId: string) =>
			pullFromBase.mutateAsync({ resumeId }),
		// Loading states
		isCreating: create.isPending,
		isUpdating: update.isPending,
		isDeleting: remove.isPending,
		isDuplicating: duplicate.isPending,
		isArchiving: archive.isPending,
		isCreatingVariation: createVariation.isPending,
		isSyncing: pullFromBase.isPending,
		isAnyPending:
			create.isPending ||
			update.isPending ||
			remove.isPending ||
			duplicate.isPending ||
			archive.isPending ||
			createVariation.isPending ||
			pullFromBase.isPending,
	};
}
