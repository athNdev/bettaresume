import type {
	ResumeSection,
	SectionContent,
	SectionType,
} from "@bettaresume/types";
import { api } from "@/lib/trpc/react";

/**
 * Hook providing all section mutation operations for a specific resume.
 * Uses optimistic updates for better UX.
 */
export function useSectionMutations(resumeId: string | null | undefined) {
	const utils = api.useUtils();

	// Only invalidate the specific resume being edited, not the list
	const invalidateResume = () => {
		if (resumeId) {
			utils.resume.getById.invalidate({ id: resumeId });
		}
	};

	const create = api.section.create.useMutation({
		onSuccess: invalidateResume,
	});

	const update = api.section.update.useMutation({
		onMutate: async ({
			id,
			data,
		}: {
			id: string;
			data: Partial<ResumeSection>;
		}) => {
			if (!resumeId) return;

			await utils.resume.getById.cancel({ id: resumeId });
			const previousResume = utils.resume.getById.getData({ id: resumeId });

			// Optimistically update section in resume
			if (previousResume) {
				utils.resume.getById.setData({ id: resumeId }, {
					...previousResume,
					sections: previousResume.sections.map((s) =>
						s.id === id ? { ...s, ...data, updatedAt: new Date() } : s,
					),
					updatedAt: new Date(),
				} as unknown as typeof previousResume);
			}

			return { previousResume };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousResume && resumeId) {
				utils.resume.getById.setData({ id: resumeId }, context.previousResume);
			}
		},
		onSettled: invalidateResume,
	});

	const upsert = api.section.upsert.useMutation({
		onSuccess: invalidateResume,
	});

	const bulkUpsert = api.section.bulkUpsert.useMutation({
		onSuccess: invalidateResume,
	});

	const reorder = api.section.reorder.useMutation({
		onMutate: async ({ sectionIds }: { sectionIds: string[] }) => {
			if (!resumeId) return;

			await utils.resume.getById.cancel({ id: resumeId });
			const previousResume = utils.resume.getById.getData({ id: resumeId });

			// Optimistically reorder sections
			if (previousResume) {
				const reorderedSections = sectionIds
					.map((id, index) => {
						const section = previousResume.sections.find((s) => s.id === id);
						return section ? { ...section, order: index } as ResumeSection : null;
					})
					.filter((s): s is ResumeSection => s !== null);

				utils.resume.getById.setData({ id: resumeId }, {
					...previousResume,
					sections: reorderedSections,
					updatedAt: new Date(),
				} as unknown as typeof previousResume);
			}

			return { previousResume };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousResume && resumeId) {
				utils.resume.getById.setData({ id: resumeId }, context.previousResume);
			}
		},
		onSettled: invalidateResume,
	});

	const remove = api.section.delete.useMutation({
		onMutate: async ({ id }: { id: string }) => {
			if (!resumeId) return;

			await utils.resume.getById.cancel({ id: resumeId });
			const previousResume = utils.resume.getById.getData({ id: resumeId });

			// Optimistically remove section
			if (previousResume) {
				utils.resume.getById.setData({ id: resumeId }, {
					...previousResume,
					sections: previousResume.sections.filter((s) => s.id !== id),
					updatedAt: new Date(),
				} as unknown as typeof previousResume);
			}

			return { previousResume };
		},
		onError: (_err, _vars, context) => {
			if (context?.previousResume && resumeId) {
				utils.resume.getById.setData({ id: resumeId }, context.previousResume);
			}
		},
		onSettled: invalidateResume,
	});

	/**
	 * Link or detach one section from the base resume it mirrors.
	 *
	 * No optimistic update: linking replaces the section's content with the base's, and
	 * this hook does not hold the base resume. Guessing would render a section that then
	 * changed under the user when the invalidation landed, which is worse than the
	 * half-second of latency.
	 */
	const setLink = api.section.setLink.useMutation({
		onSuccess: invalidateResume,
	});

	return {
		create,
		update,
		upsert,
		bulkUpsert,
		reorder,
		remove,
		setLink,
		// Convenience methods
		createSection: (input: {
			type: SectionType;
			content: SectionContent;
			order?: number;
			visible?: boolean;
		}) => {
			if (!resumeId) throw new Error("No resume selected");
			return create.mutateAsync({
				resumeId,
				type: input.type,
				content: input.content,
				order: input.order,
				visible: input.visible ?? true,
			});
		},
		updateSection: (
			id: string,
			data: {
				type?: SectionType;
				order?: number;
				visible?: boolean;
				content?: SectionContent;
			},
		) => update.mutateAsync({ id, data }),
		deleteSection: (id: string) => remove.mutateAsync({ id }),
		setSectionLink: (id: string, linked: boolean) =>
			setLink.mutateAsync({ id, linked }),
		reorderSections: (sectionIds: string[]) => {
			if (!resumeId) throw new Error("No resume selected");
			return reorder.mutateAsync({ resumeId, sectionIds });
		},
		bulkUpsertSections: (
			sections: Array<{
				id?: string;
				type: SectionType;
				order: number;
				visible: boolean;
				content: SectionContent;
			}>,
		) => {
			if (!resumeId) throw new Error("No resume selected");
			return bulkUpsert.mutateAsync({ resumeId, sections });
		},
		// Loading states
		isCreating: create.isPending,
		isUpdating: update.isPending,
		isDeleting: remove.isPending,
		isReordering: reorder.isPending,
		isBulkUpserting: bulkUpsert.isPending,
		isLinking: setLink.isPending,
		isAnyPending:
			create.isPending ||
			update.isPending ||
			remove.isPending ||
			reorder.isPending ||
			bulkUpsert.isPending ||
			setLink.isPending,
	};
}
