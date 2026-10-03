"use client";

import {
	ArrowDownToLine,
	CheckCheck,
	Download,
	Library,
	Loader2,
	RefreshCw,
	Undo2,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
 *
 * The per-placement "Use latest" IS destructive -- it overwrites that section's content
 * with the master -- so it is behind a confirmation that names the section, the same way
 * `HistoryPanel` gates its restore. Offering it in one click was a data-loss path, not a
 * convenience.
 *
 * A failed read is never reported as an empty list. "Your library is empty" is a claim
 * about the user's data, and on a transport error the panel did not have it.
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
			// Backfill sets `contentItemId` on every unlinked section, so the resume is
			// what changed -- not just the library list. Invalidating only `content.list`
			// left `resume.sections` stale: the freshly linked sections kept rendering
			// under "Not yet in the library" with a live "Save to library" button, and
			// `content.create` has no duplicate guard, so one click there inserted a SECOND
			// master item with an identical payload. Two masters for one achievement, free
			// to drift. Invalidate the resume too, so the unlinked list actually empties.
			await Promise.all([
				utils.content.list.invalidate(),
				utils.resume.getById.invalidate({ id: resume.id }),
				utils.content.additions.invalidate({ resumeId: resume.id }),
				utils.content.divergence.invalidate({ resumeId: resume.id }),
			]);
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

	/**
	 * Mark an imported item as reviewed.
	 *
	 * Imported items land here unreviewed, because the sectioner read them off a page
	 * and guessed some of them. Until someone says otherwise, the row says so -- an
	 * unreviewed item is a proposal, and a proposal that looks identical to a finished
	 * one is how a wrong value reaches a CV unnoticed.
	 *
	 * Only the library write is invalidated. The resume is untouched on purpose: nothing
	 * was ever put in it.
	 */
	const markReviewed = api.content.markReviewed.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.content.list.invalidate(),
				utils.content.additions.invalidate({ resumeId: resume.id }),
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
			// The resume must be refreshed too: the adopted section is now linked, so
			// leaving the stale `resume.sections` in place keeps the "Save to library"
			// button on screen and invites a duplicate master row for one achievement.
			await Promise.all([
				utils.content.list.invalidate(),
				utils.content.additions.invalidate({ resumeId: resume.id }),
				utils.content.divergence.invalidate({ resumeId: resume.id }),
				utils.resume.getById.invalidate({ id: resume.id }),
			]);
		},
	});

	/**
	 * Adopt pre-library sections on first open.
	 *
	 * Runs once per mount and is idempotent server-side. Without it the library looks
	 * empty to exactly the users with the most existing content, which is backwards.
	 *
	 * Deps are the STABLE `backfill.mutate`, not the `backfill` result object. A
	 * react-query result object is a new identity on every render, so listing it here
	 * re-ran this effect on every render; the ref is what makes that harmless, and the
	 * ref is what would quietly stop working if the guard above were ever removed.
	 *
	 * `library.isError` is a load-bearing guard, not defensive noise. On a failed
	 * `content.list`, `isPending` is false and `data` is undefined -- exactly the shape
	 * of "the library is empty" -- so a transient read error fired the backfill WRITE
	 * the user never asked for. Leaving `requested` unset on error also means a
	 * successful refetch can still adopt the sections.
	 */
	const backfillMutate = backfill.mutate;

	useEffect(() => {
		if (requested.current) return;
		if (library.isPending) return;
		if (library.isError) return;
		// Set before the guard below, not only after: the write is async, so without a
		// ref a re-render before it lands fires a second backfill. The server is
		// idempotent anyway, which is why this is cheap insurance rather than a fix.
		requested.current = true;
		if ((library.data ?? []).length > 0) return;
		backfillMutate();
	}, [library.isPending, library.isError, library.data, backfillMutate]);

	const drifted = new Set((divergence.data ?? []).map((d) => d.sectionId));
	const placed = (resume.sections ?? []).filter((s) => s.contentItemId);
	const unlinked = (resume.sections ?? []).filter((s) => !s.contentItemId);
	const items = library.data ?? [];
	const pending =
		backfill.isPending ||
		attach.isPending ||
		propagate.isPending ||
		markReviewed.isPending;

	return (
		<div className="space-y-4">
			{/*
			  Three reads and no error surface meant the worst combination on this panel:
			  on a `content.list` failure the panel claimed "Your library is empty" -- a
			  statement it could not know -- while firing the backfill write. Each query
			  now reports its own failure, and none of them report absence of data as
			  emptiness.
			*/}
			{library.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not load your library: {library.error.message}
				</p>
			) : null}
			{additions.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not load the library content available to add:{" "}
					{additions.error.message}
				</p>
			) : null}
			{divergence.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not check which sections have drifted from the library:{" "}
					{divergence.error.message}
				</p>
			) : null}

			{(attach.isError ||
				propagate.isError ||
				backfill.isError ||
				markReviewed.isError) && (
				<p className="text-destructive text-sm" role="alert">
					{(attach.error ??
						propagate.error ??
						backfill.error ??
						markReviewed.error)?.message}
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
							const title = s.content?.title ?? s.type;
							return (
								<ItemRow
									actions={
										<>
											{isDrifted ? (
												/*
												  `propagate` overwrites the section's content with the
												  master unconditionally, so a single click used to discard
												  whatever the user had written there with no warning -- and the
												  panel's own contract says nothing is applied without the user
												  deciding. `HistoryPanel` gates its equally destructive restore
												  behind an AlertDialog; this one now matches, and names the
												  section that will be lost.
												*/
												<AlertDialog>
													<AlertDialogTrigger asChild>
														<Button
															disabled={pending}
															size="sm"
															variant="outline"
														>
															<RefreshCw aria-hidden />
															Use latest
														</Button>
													</AlertDialogTrigger>
													<AlertDialogContent>
														<AlertDialogHeader>
															<AlertDialogTitle>
																Overwrite this section with the library version?
															</AlertDialogTitle>
															<AlertDialogDescription>
																“{title}” in this resume is replaced with the
																master copy from your library, including every
																field in it. Anything you have edited in this
																resume for that section is discarded and is not
																recoverable from this panel. The library copy
																itself is unchanged.
															</AlertDialogDescription>
														</AlertDialogHeader>
														<AlertDialogFooter>
															<AlertDialogCancel>Cancel</AlertDialogCancel>
															<AlertDialogAction
																onClick={() =>
																	propagate.mutate({ sectionId: s.id })
																}
															>
																Use the library version
															</AlertDialogAction>
														</AlertDialogFooter>
													</AlertDialogContent>
												</AlertDialog>
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
									subtitle={title}
									title={title}
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
				{library.isPending ? (
					<p className="text-muted-foreground text-sm">Loading your library…</p>
				) : library.isError ? (
					/*
					  Deliberately NOT "your library is empty". An error means we do not
					  know what is in there, and telling the user it is empty invites them to
					  re-add content that is already there.
					*/
					<p className="text-muted-foreground text-sm">
						Your library could not be loaded, so this list is unavailable.
						Nothing has been changed.
					</p>
				) : items.length === 0 ? (
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
										<>
											{/*
											  "Add hidden" is offered on an unreviewed item too, and
											  the placement still starts hidden. That is the point of
											  hidden: adding to a library is a decision about
											  availability, and visibility is the next, separate one.
											*/}
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
											{item.unreviewed ? (
												<Button
													disabled={pending}
													onClick={() =>
														markReviewed.mutate({
															contentItemId: item.id,
														})
													}
													size="sm"
													variant="outline"
												>
													<CheckCheck aria-hidden />
													Mark reviewed
												</Button>
											) : null}
										</>
									}
									badge={
										item.unreviewed ? (
											<Badge data-library-unreviewed="" variant="secondary">
												Unreviewed
											</Badge>
										) : null
									}
									key={item.id}
									subtitle={
										item.unreviewed
											? `imported from ${item.importSource ?? "a file"} — not checked yet`
											: item.type
									}
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
				{additions.isPending ? (
					<p className="text-muted-foreground text-sm">
						Loading available content…
					</p>
				) : additions.isError ? (
					<p className="text-muted-foreground text-sm">
						This list could not be loaded. Nothing has been changed.
					</p>
				) : (additions.data ?? []).length === 0 ? (
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
