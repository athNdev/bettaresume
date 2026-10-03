"use client";

import {
	AlertTriangle,
	History,
	Loader2,
	Minus,
	Plus,
	RotateCcw,
	Save,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import { PanelError } from "@/components/ui/panel-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Resume } from "@/features/resume-editor/types";
import {
	type ChangeKind,
	describeChange,
	diffSnapshot,
	type HistoryDiff,
} from "@/lib/analysis/history-diff";
import { api } from "@/lib/trpc/react";

/**
 * Revision history, as a tab in the review sheet.
 *
 * The workflow this supports: you broke something, or you want the version you had
 * before a rewrite, and you want to see *what* differs before you throw away the work in
 * front of you. So the diff is shown first and the restore button is behind a
 * confirmation that repeats the change count.
 *
 * Snapshots are created explicitly, not on a timer. An automatic schedule sounds
 * helpful until it quietly writes rows nobody asked for and needs a retention policy
 * to be defensible; one click is predictable, and the hash dedupe means a redundant
 * click costs nothing.
 *
 * Restore replaces the resume's sections wholesale (see the API), so the confirmation
 * says so plainly rather than calling it "undo".
 */

const KIND_STYLE: Record<
	ChangeKind,
	{ label: string; className: string; Icon: typeof Plus }
> = {
	added: {
		label: "Added",
		className: "text-emerald-600 dark:text-emerald-400",
		Icon: Plus,
	},
	removed: {
		label: "Removed",
		className: "text-destructive",
		Icon: Minus,
	},
	changed: {
		label: "Edited",
		className: "text-amber-600 dark:text-amber-400",
		Icon: AlertTriangle,
	},
	unchanged: {
		label: "Same",
		className: "text-muted-foreground",
		Icon: Minus,
	},
};

function formatWhen(value: string | Date): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "unknown time";
	return date.toLocaleString(undefined, {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

function DiffSummary({ diff }: { diff: HistoryDiff }) {
	if (diff.isIdentical) {
		return (
			<p className="text-muted-foreground text-sm">
				Your resume matches this version. Restoring it would change nothing.
			</p>
		);
	}

	return (
		<div className="space-y-3">
			{diff.fields
				.filter((f) => f.kind !== "unchanged")
				.map((f) => (
					<p className="text-sm" key={f.label}>
						<span className="font-medium capitalize">{f.label}</span>{" "}
						<span className="text-muted-foreground">
							{f.before ?? "unset"} → {f.after ?? "unset"}
						</span>
					</p>
				))}

			{diff.sections
				.filter((s) => s.kind !== "unchanged")
				.map((s) => {
					const style = KIND_STYLE[s.kind];
					return (
						<div className="rounded-md border p-3" key={s.id}>
							<div className="mb-1 flex items-center gap-2">
								<style.Icon
									aria-hidden
									className={`size-4 shrink-0 ${style.className}`}
								/>
								<span className="font-medium text-sm">{s.title}</span>
								<Badge className="ml-auto" variant="outline">
									{describeChange(s)}
								</Badge>
							</div>
							<div className="space-y-1 text-xs">
								{s.before ? (
									<p className="text-muted-foreground">
										<span className="line-through">{s.before}</span>
									</p>
								) : null}
								{s.after ? <p>{s.after}</p> : null}
							</div>
						</div>
					);
				})}
		</div>
	);
}

export function HistoryPanel({ resume }: { resume: Resume }) {
	const utils = api.useUtils();
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [label, setLabel] = useState("");

	const list = api.revision.list.useQuery(
		{ resumeId: resume.id, limit: 30 },
		{ enabled: !!resume.id },
	);
	const snapshot = api.revision.get.useQuery(
		{ revisionId: selectedId as string },
		{ enabled: !!selectedId },
	);

	const createRevision = api.revision.create.useMutation({
		onSuccess: async (result) => {
			await utils.revision.list.invalidate({ resumeId: resume.id });
			// Dedupe means a click with nothing changed returns created:false. Select
			// the stored version either way, and only clear the label when something
			// was actually written -- otherwise the typed label is silently discarded
			// for a save that never happened.
			setSelectedId(result.revision?.id ?? null);
			if (result.created) setLabel("");
		},
	});

	const restore = api.revision.restore.useMutation({
		onSuccess: async () => {
			await Promise.all([
				utils.revision.list.invalidate({ resumeId: resume.id }),
				utils.resume.getById.invalidate({ id: resume.id }),
			]);
			setSelectedId(null);
		},
	});

	const diff = useMemo(() => {
		if (!snapshot.data?.snapshot) return null;
		// The FULL field set, deliberately. This map used to pass only
		// `{id, type, visible, content}`, and `diffSnapshot` was correspondingly lenient
		// about `metadata`, `order` and `contentItemId` -- so a `metadata`-only edit
		// (where the user's name and email live) came back `isIdentical: true`, the panel
		// said "your resume matches this version", Restore was disabled, and the change
		// was unrecoverable while the server held the older version. `diffSnapshot` now
		// requires every one of these, so dropping one is a type error rather than a lie.
		return diffSnapshot(snapshot.data.snapshot, {
			name: resume.name,
			template: resume.template,
			domain: resume.domain,
			metadata: resume.metadata,
			sections: (resume.sections ?? []).map((s) => ({
				id: s.id,
				type: s.type,
				visible: s.visible,
				content: s.content,
				order: s.order,
				// `contentItemId` is optional on ResumeSection but nullable on the diff's
				// contract, and `null` is a real value here: "not linked to the library"
				// differs from a section that IS linked, and `restore` writes it back.
				contentItemId: s.contentItemId ?? null,
			})),
		});
	}, [snapshot.data, resume]);

	const revisions = list.data ?? [];
	// `changedCount` spans scalar fields AND sections, so it cannot be used as the
	// "changed sections" number the dialog quotes. It counts the resume's own fields
	// too -- including `metadata`, where the user's name and email live.
	const changedSections =
		diff?.sections.filter((s) => s.kind !== "unchanged").length ?? 0;

	return (
		<div className="flex h-full min-h-0 flex-col gap-3">
			<div className="flex flex-wrap items-end gap-2">
				<Button
					disabled={createRevision.isPending}
					onClick={() =>
						createRevision.mutate({
							resumeId: resume.id,
							...(label.trim() ? { label: label.trim() } : {}),
						})
					}
					size="sm"
					variant="outline"
				>
					{createRevision.isPending ? (
						<Loader2 aria-hidden className="animate-spin" />
					) : (
						<Save aria-hidden />
					)}
					Save a version
				</Button>
				<label className="flex-1 text-sm" htmlFor="revision-label">
					<span className="sr-only">Label for this version</span>
					<input
						className="h-8 w-full rounded-md border bg-background px-2 text-sm"
						id="revision-label"
						onChange={(e) => setLabel(e.target.value)}
						placeholder="Optional label, e.g. before the rewrite"
						value={label}
					/>
				</label>
			</div>

			{createRevision.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not save a version: {createRevision.error.message}
				</p>
			) : null}
			{restore.isError ? (
				<p className="text-destructive text-sm" role="alert">
					Could not restore: {restore.error.message}
				</p>
			) : null}

			<div className="flex min-h-0 flex-1 gap-4">
				<div className="w-56 shrink-0 overflow-y-auto">
					{/*
					 * Order matters here, and getting it wrong is a lie rather than a
					 * cosmetic bug. `list.data` is undefined both when there is genuinely
					 * nothing stored AND when the query failed, so an `isPending` →
					 * `length === 0` chain falls straight through to "No saved versions
					 * yet. Save one before a big rewrite…" on a failure. The user is
					 * told their history is empty, and invited to take the one action that
					 * makes the gap permanent. `isError` is checked before the empty
					 * branch, matching `content-library-panel.tsx`.
					 */}
					{list.isPending ? (
						<p className="text-muted-foreground text-sm">Loading history…</p>
					) : list.isError ? (
						<PanelError
							message={`Could not load your saved versions: ${list.error.message}`}
							onRetry={() => void list.refetch()}
						/>
					) : revisions.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							No saved versions yet. Save one before a big rewrite so you can
							get back to it.
						</p>
					) : (
						<ul className="space-y-1">
							{revisions.map((r) => (
								<li key={r.id}>
									<button
										aria-current={selectedId === r.id}
										className={`w-full rounded-md border px-2 py-1.5 text-left text-sm ${
											selectedId === r.id
												? "border-primary bg-accent"
												: "hover:bg-accent/50"
										}`}
										onClick={() => setSelectedId(r.id)}
										type="button"
									>
										<span className="flex items-center gap-1.5">
											<History aria-hidden className="size-3.5 shrink-0" />
											<span className="truncate font-medium">
												{r.label ?? "Autosave"}
											</span>
										</span>
										<span className="block text-muted-foreground text-xs">
											#{r.seq} · {formatWhen(r.createdAt)}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="min-w-0 flex-1">
					{!selectedId ? (
						<p className="text-muted-foreground text-sm">
							Select a version to see what changed since then.
						</p>
					) : snapshot.isPending ? (
						<p className="text-muted-foreground text-sm">Loading version…</p>
					) : snapshot.isError ? (
						/*
						 * Previously this fell through to `null`. A failed snapshot fetch
						 * left the right-hand pane silently blank — no error, no message,
						 * no way to tell it apart from "still loading" or "nothing to show".
						 */
						<PanelError
							message={`Could not load that version: ${snapshot.error.message}`}
							onRetry={() => void snapshot.refetch()}
						/>
					) : diff ? (
						<div className="space-y-3">
							<div className="flex items-center justify-between gap-2">
								<p className="text-muted-foreground text-sm">
									{diff.isIdentical
										? "No differences"
										: `${diff.changedCount} difference${diff.changedCount === 1 ? "" : "s"} since this version`}
								</p>
								<AlertDialog>
									<AlertDialogTrigger asChild>
										<Button
											disabled={restore.isPending || diff.isIdentical}
											size="sm"
											variant="destructive"
										>
											{restore.isPending ? (
												<Loader2 aria-hidden className="animate-spin" />
											) : (
												<RotateCcw aria-hidden />
											)}
											Restore this version
										</Button>
									</AlertDialogTrigger>
									<AlertDialogContent>
										<AlertDialogHeader>
											<AlertDialogTitle>
												Replace your current resume?
											</AlertDialogTitle>
											<AlertDialogDescription>
												This replaces the current name, template, contact
												details, and all {changedSections} changed section
												{changedSections === 1 ? "" : "s"} with version #
												{snapshot.data?.seq}. Anything you changed since then is
												discarded from the editor.
												{diff.changedCount > 0
													? " Your current version is written to history as “Before restore to this version” first, so restoring it again brings you back."
													: ""}
											</AlertDialogDescription>
										</AlertDialogHeader>
										<AlertDialogFooter>
											<AlertDialogCancel>Cancel</AlertDialogCancel>
											<AlertDialogAction
												onClick={() =>
													restore.mutate({ revisionId: selectedId })
												}
											>
												Restore version #{snapshot.data?.seq}
											</AlertDialogAction>
										</AlertDialogFooter>
									</AlertDialogContent>
								</AlertDialog>
							</div>
							<ScrollArea className="max-h-72 pr-3">
								<DiffSummary diff={diff} />
							</ScrollArea>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
