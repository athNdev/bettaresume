"use client";

import type { SectionType } from "@bettaresume/types";
import { FileUp, Loader2, Pencil, Upload } from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { extractDocumentText, type ImportOk } from "@/lib/import/extractors";
import { libraryTitleFor, toLibraryPayload } from "@/lib/import/library-item";
import { type ImportResult, sectionResumeText } from "@/lib/import/sectioner";
import { api } from "@/lib/trpc/react";
import { buildImportPayload, ImportReviewView } from "./import-review-view";

/**
 * The container: pick a file, extract, review, save to the library.
 *
 * Nothing here can write to a resume. The single mutation is `content.create`, and the
 * payload it sends carries `importMeta.reviewed: false`.
 */
export function ImportPanel({
	onOpenChange,
	open,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const [outcome, setOutcome] = useState<Awaited<
		ReturnType<typeof extractDocumentText>
	> | null>(null);
	const [busy, setBusy] = useState(false);
	const [overrides, setOverrides] = useState<Record<string, string>>({});
	const [removed, setRemoved] = useState<Record<string, true>>({});
	const [added, setAdded] = useState<
		Record<number, "pending" | "added" | "error">
	>({});
	const [error, setError] = useState<string | undefined>();

	const utils = api.useUtils();
	const create = api.content.create.useMutation({
		onSuccess: async () => {
			await utils.content.list.invalidate();
		},
	});

	const reset = useCallback(() => {
		setOutcome(null);
		setOverrides({});
		setRemoved({});
		setAdded({});
		setError(undefined);
	}, []);

	const onFile = useCallback(async (file: File) => {
		setBusy(true);
		setError(undefined);
		setOverrides({});
		setRemoved({});
		setAdded({});
		try {
			setOutcome(await extractDocumentText(file));
		} finally {
			setBusy(false);
		}
	}, []);

	const result: ImportResult | null = useMemo(() => {
		if (!outcome?.ok) return null;
		return sectionResumeText(outcome.text);
	}, [outcome]);

	const handleAdd = useCallback(
		(sectionIndex: number) => {
			const section = result?.sections[sectionIndex];
			if (!section || !outcome?.ok) return;
			// The payload is built from what is on screen, not from the raw extraction,
			// so a correction the user made is the thing that gets saved.
			const payload = buildImportPayload({
				overrides,
				removed,
				section,
				sectionIndex,
				source: outcome.source,
			});
			setAdded((prev) => ({ ...prev, [sectionIndex]: "pending" }));
			create.mutate(
				{
					type: section.type as SectionType,
					title: libraryTitleFor(section, payload),
					payload,
				},
				{
					onSuccess: () =>
						setAdded((prev) => ({ ...prev, [sectionIndex]: "added" })),
					onError: (cause) => {
						setAdded((prev) => ({ ...prev, [sectionIndex]: "error" }));
						setError(cause.message);
					},
				},
			);
		},
		[create, outcome, overrides, removed, result],
	);

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent className="w-full gap-0 p-0 sm:max-w-2xl">
				<SheetHeader className="border-b px-6 py-4">
					<SheetTitle className="flex items-center gap-2">
						<Upload aria-hidden className="size-4" />
						Import a resume
					</SheetTitle>
					<SheetDescription>
						Read a PDF or Word document and review what was found before
						anything is saved. Import proposes; you decide.
					</SheetDescription>
				</SheetHeader>

				<div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
					<div className="mb-4 flex flex-wrap items-center gap-3">
						<label className="inline-flex cursor-pointer items-center gap-2">
							<FileUp aria-hidden className="size-4" />
							<span className="font-medium text-sm">
								Choose a PDF or .docx file
							</span>
							<input
								accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
								className="sr-only"
								data-import-file-input=""
								onChange={(event) => {
									const file = event.target.files?.[0];
									if (file) void onFile(file);
								}}
								type="file"
							/>
						</label>
						{outcome ? (
							<Button onClick={reset} size="sm" variant="ghost">
								<Pencil aria-hidden />
								Choose a different file
							</Button>
						) : null}
					</div>

					{busy ? (
						<p className="text-muted-foreground text-sm">Reading the file…</p>
					) : null}

					{outcome && !outcome.ok ? (
						/*
						  The refusal is the product working. A scan has no text layer, so
						  there is nothing to extract, and saying "imported 0 of 0
						  sections" would be a claim about the user's file that this code
						  has no basis for.
						*/
						<p
							className="rounded-md border border-amber-500/70 bg-amber-500/5 p-3 text-sm"
							data-import-refusal=""
							role="alert"
						>
							{outcome.message}
						</p>
					) : null}

					{outcome?.ok && result ? (
						result.sections.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								No section headings were recognised in this document, so nothing
								was extracted. The text is still available in the file — copy it
								into a new resume by hand rather than having this guess.
							</p>
						) : (
							<ImportReviewView
								added={added}
								onAddToLibrary={handleAdd}
								onFieldChange={(key, value) =>
									setOverrides((prev) => ({ ...prev, [key]: value }))
								}
								onFieldRemove={(key) =>
									setRemoved((prev) => ({ ...prev, [key]: true }))
								}
								overrides={overrides}
								removed={removed}
								result={result}
								source={outcome.source}
							/>
						)
					) : null}
				</div>
			</SheetContent>
		</Sheet>
	);
}

/**
 * Header trigger.
 *
 * Its own component so the editor pays for one `Sheet` and the import state is not
 * mounted until it is opened.
 */
export function ImportTrigger() {
	const [open, setOpen] = React.useState(false);
	return (
		<>
			<Button
				aria-label="Import a resume from a PDF or Word document"
				onClick={() => setOpen(true)}
				size="sm"
				variant="outline"
			>
				<Upload aria-hidden />
				Import
			</Button>
			<ImportPanel onOpenChange={setOpen} open={open} />
		</>
	);
}
