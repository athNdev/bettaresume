"use client";

import {
	ArrowDownToLine,
	Download,
	Library,
	Loader2,
	RefreshCw,
	Undo2,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Resume } from "@/features/resume-editor/types";
import { api } from "@/lib/trpc/react";

/**
 * Content library: the master copy of your work, and which resume is using it.
 *
 * The point of the screen is to make tailoring a toggle. Rezi's users rewrite whole
 * resumes because placing content is slow; here, an achievement is written once and a
 * resume decides whether to include it.
 *
 * Two behaviours are deliberate and look like omissions:
 *
 *  - **Adding starts hidden.** The item lands in the resume as an off section you can
 *    switch on. "Available" and "included" are different decisions.
 *  - **Nothing is synced for you.** A placement that has drifted from the master shows
 *    "Update available" and offers a button for that one placement. There is no
 *    "sync all", because a bulk overwrite is how a tailoring tool quietly deletes work
 *    someone had not looked at yet.
 *
 * Editing the master does NOT push to placements: it makes them look drifted, and the
 * user decides per placement. That is the non-destructive mechanism, and it is the
 * opposite of what a "save to all" button does.
 */

/** Best-effort human label for a library row, whatever section shape it holds. */
function labelFor(item: { title: string; type: string }): string {
	return item.title || item.type;
}

function ItemRow({
	title,
	subtitle,
	badge,
	actions,
}: {
	title: string;
	subtitle?: string;
	badge?: React.ReactNode;
	actions?: React.ReactNode;
}) {
	return (
		<li className="flex items-start gap-2 rounded-md border px-3 py-2">
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium text-sm">{title}</p>
				{subtitle ? (
					<p className="truncate text-muted-foreground text-xs">{subtitle}</p>
				) : null}
			</div>
			{badge}
			{actions ? <div className="flex shrink-0 gap-1">{actions}</div> : null}
		</li>
	);
}

export function ContentLibraryPanel({ resume }: { resume: Resume }) {
	const utils = api.useUtils();
	const requested = useRef(false);

	const library = api.content.list.useQuery();
	const additions = api.content.additions.useQuery({ resumeId: resume.id });
	const divergence = api.content.divergence.useQuery({ resumeId: resume.id });

	const backfill = api.content.backfill.useMutation({
		onSuccess: async () => {
			await utils.content.list.invalidate();
		},
	});

	const attach = api.content.attach.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.content.additions.invalidate({ resumeId: resume.id }),
				utils.resume.getById.invalidate({ id: resume.id }),
			]);
		},
	});

	const propagate = api.content.propagate.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.content.divergence.invalidate({ resumeId: resume.id }),
				utils.resume.getById.invalidate({ id: resume.id }),
			]);
		},
	});

	const updateSection = api.section.update.useMutation({
		onSuccess: async () => {
			await utils.resume.getById.invalidate({ id: resume.id });
		},
	});

	const saveToLibrary = api.content.create.useMutation({
		onSuccess: async () => {
			await utils.content.list.invalidate();
		},
	});

	/**
	 * Adopt pre-library sections on first open.
	 *
	 * Runs once per mount and is idempotent server-side. Without it the library looks
	 * empty to exactly the users with the most existing content, which is backwards.
	 */
	useEffect(() => {
		if (requested.current || library.isPending) return;
		// Set before the guard below, not only after: the write is async, so without a
		// ref a re-render before it lands fires a second backfill. The server is
		// idempotent anyway, which is why this is cheap insurance rather than a fix.
		requested.current = true;
		if ((library.data ?? []).length > 0) return;
		backfill.mutate();
	}, [library.isPending, library.data, backfill]);

	const drifted = new Set((divergence.data ?? []).map((d) => d.sectionId));
	const placed = (resume.sections ?? []).filter((s) => s.contentItemId);
	const unlinked = (resume.sections ?? []).filter((s) => !s.contentItemId);
	const items = library.data ?? [];
	const pending = backfill.isPending || attach.isPending || propagate.isPending;

	return (
		<div className="space-y-4">
			{(attach.isError || propagate.isError || backfill.isError) && (
				<p className="text-destructive text-sm" role="alert">
					{(attach.error ?? propagate.error ?? backfill.error)?.message}
				</p>
			)}

			<section>
				<h3 className="mb-2 font-medium text-sm">
					In this resume
					<span className="ml-2 font-normal text-muted-foreground">
						{placed.length} linked
					</span>
				</h3>
				{placed.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						No sections are linked to the library yet. Add something from below,
						or use “Save to library” on an existing section.
					</p>
				) : (
					<ul className="space-y-2">
						{placed.map((s) => {
							const isDrifted = drifted.has(s.id);
							return (
								<ItemRow
									actions={
										<>
											{isDrifted ? (
												<Button
													disabled={pending}
													onClick={() => propagate.mutate({ sectionId: s.id })}
													size="sm"
													variant="outline"
												>
													<RefreshCw aria-hidden />
													Use latest
												</Button>
											) : null}
											<Button
												aria-pressed={s.visible}
												disabled={pending}
												onClick={() =>
													updateSection.mutate({
														id: s.id,
														data: { visible: !s.visible },
													})
												}
												size="sm"
												variant={s.visible ? "secondary" : "outline"}
											>
												{s.visible ? "Shown" : "Hidden"}
											</Button>
										</>
									}
									badge={
										isDrifted ? (
											<Badge variant="outline">Update available</Badge>
										) : null
									}
									key={s.id}
									subtitle={s.content?.title ?? s.type}
									title={s.content?.title ?? s.type}
								/>
							);
						})}
					</ul>
				)}
			</section>

			{unlinked.length > 0 ? (
				<section>
					<h3 className="mb-2 font-medium text-sm">Not yet in the library</h3>
					<p className="mb-2 text-muted-foreground text-xs">
						These predate the library. Saving one keeps this exact wording as
						the master copy so it can be reused in other resumes.
					</p>
					<ul className="space-y-2">
						{unlinked.map((s) => (
							<ItemRow
								actions={
									<Button
										disabled={pending || saveToLibrary.isPending}
										onClick={() =>
											saveToLibrary.mutate({
												type: s.type,
												title: s.content?.title ?? s.type,
												payload: s.content,
											})
										}
										size="sm"
										variant="outline"
									>
										<Download aria-hidden />
										Save to library
									</Button>
								}
								key={s.id}
								subtitle={s.type}
								title={s.content?.title ?? s.type}
							/>
						))}
					</ul>
				</section>
			) : null}

			<section>
				<h3 className="mb-2 flex items-center gap-1.5 font-medium text-sm">
					<Library aria-hidden className="size-4" />
					Library
				</h3>
				{items.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Your library is empty. Save an existing section above to reuse it
						across resumes.
					</p>
				) : (
					<ScrollArea className="max-h-72 pr-3">
						<ul className="space-y-2">
							{items.map((item) => (
								<ItemRow
									actions={
										<Button
											disabled={pending}
											onClick={() =>
												attach.mutate({
													contentItemId: item.id,
													resumeId: resume.id,
												})
											}
											size="sm"
											variant="outline"
										>
											{attach.isPending ? (
												<Loader2 aria-hidden className="animate-spin" />
											) : (
												<ArrowDownToLine aria-hidden />
											)}
											Add hidden
										</Button>
									}
									key={item.id}
									subtitle={item.type}
									title={labelFor(item)}
								/>
							))}
						</ul>
					</ScrollArea>
				)}
			</section>

			<section>
				<h3 className="mb-2 flex items-center gap-1.5 font-medium text-sm">
					<Undo2 aria-hidden className="size-4" />
					Available to add
				</h3>
				<p className="mb-2 text-muted-foreground text-xs">
					Library content this resume does not use yet. Nothing is inserted
					until you add it.
				</p>
				{(additions.data ?? []).length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Everything in your library is already used here.
					</p>
				) : (
					<ul className="space-y-2">
						{(additions.data ?? []).map((item) => (
							<ItemRow
								actions={
									<Button
										disabled={pending}
										onClick={() =>
											attach.mutate({
												contentItemId: item.id,
												resumeId: resume.id,
											})
										}
										size="sm"
										variant="outline"
									>
										Add hidden
									</Button>
								}
								key={item.id}
								subtitle={item.type}
								title={labelFor(item)}
							/>
						))}
					</ul>
				)}
			</section>
		</div>
	);
}
