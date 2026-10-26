"use client";

/**
 * Dashboard Page (Hash Router Version)
 *
 * Main page showing all resumes with filtering, search, and CRUD actions.
 * Uses React Query (tRPC) for data fetching instead of localStorage.
 */

import type { Resume } from "@bettaresume/types";
import { normalizeTemplateId } from "@bettaresume/types";
import {
	BookOpen,
	FileText,
	Info,
	Loader2,
	Plus,
	Search,
	Upload,
	X,
} from "lucide-react";
import { Suspense, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ProtectedRoute } from "@/app/protected-route";
import { BrandWordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PanelError } from "@/components/ui/panel-state";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/features/auth/auth.store";
import { ResumeCard } from "@/features/dashboard/components/resume-card";
import { ThumbnailSkeleton } from "@/features/dashboard/components/resume-thumbnail";
import { ThemeToggle } from "@/features/dashboard/components/theme-toggle";
import { UserMenu } from "@/features/dashboard/components/user-menu";
import { greetingName } from "@/features/dashboard/greeting";
import { resultSummary } from "@/features/dashboard/result-summary";
import {
	TEMPLATE_CONFIGS,
	type TemplateType,
} from "@/features/resume-editor/types";
import { useActiveResumeStore, useResumeMutations, useResumes } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";
import { useHashRouter } from "@/lib/hash-router";
import { extractDocumentText } from "@/lib/import/extractors";
import { toLibraryPayload } from "@/lib/import/library-item";
import { sectionResumeText } from "@/lib/import/sectioner";
import { findShowcase, orderShowcaseFirst } from "@/lib/showcase";
import { api } from "@/lib/trpc/react";

export default function Dashboard() {
	return (
		<ProtectedRoute>
			<TooltipProvider>
				<Suspense fallback={<DashboardSkeleton />}>
					<DashboardContent />
				</Suspense>
			</TooltipProvider>
		</ProtectedRoute>
	);
}

function DashboardSkeleton() {
	return (
		<div className="min-h-dvh bg-background">
			<header className="border-b bg-background">
				<div className="mx-auto flex min-h-16 w-full max-w-[96rem] flex-wrap items-center justify-between gap-2 px-6 py-2">
					<div className="flex items-center gap-4">
						<Skeleton className="h-7 w-32" />
						<Skeleton
							className="hidden h-6 w-20 sm:block"
							data-responsive-duplicate="loading placeholder"
						/>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-2">
						<Skeleton className="h-9 w-24" />
						{/*
						 * The second placeholder is dropped below `sm`. Two of them plus the
						 * wordmark came to ~392px before padding, so the loading state overflowed
						 * a 390px viewport too -- and the loading state is exactly what a phone
						 * user sees first.
						 */}
						<Skeleton
							className="hidden h-9 w-32 sm:block"
							data-responsive-duplicate="loading placeholder"
						/>
					</div>
				</div>
			</header>
			<main className="mx-auto w-full max-w-[96rem] px-6 py-8">
				<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="flex flex-1 items-center gap-4">
						<Skeleton className="h-10 flex-1 sm:max-w-xs" />
						<Skeleton className="h-10 w-35" />
					</div>
					<Skeleton className="h-9 w-36" />
				</div>
				{/*
				 * `grid-cols-1` explicitly, and it is load-bearing.
				 *
				 * `grid gap-6 sm:grid-cols-2 …` emits no `grid-template-columns` at all below `sm`,
				 * so the single implicit column is `auto`-sized — that is, max-content. The card
				 * contains a document preview with an explicit pixel width (`preview.tsx`:
				 * `pageWidth * scale`, Letter = 816px), so that intrinsic width widened the track,
				 * which widened the container, which raised `scale` in the thumbnail's
				 * ResizeObserver. Measured in Chromium: it settled at 513px inside a 390px viewport,
				 * with the card itself as the widest overflowing node.
				 *
				 * `repeat(1, minmax(0, 1fr))` is what lets the track shrink below its content. The
				 * `minmax(0, …)` is the part that matters; a bare `1fr` still floors at min-content.
				 *
				{/*
				 * Columns match the real grid exactly (skeleton → content, audit §7): one at
				 * phone, two at `sm`, three at `xl`, four at `2xl`.
				 */}
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
					{Array.from({ length: 8 }).map((_, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: a fixed-length row of placeholders
						<ResumeCardSkeleton key={i} />
					))}
				</div>
			</main>
		</div>
	);
}

function ResumeCardSkeleton() {
	return (
		<div className="rounded-md border bg-card">
			{/* The real card's anatomy, in order: the sheet, the title row with the
			    menu pinned, one meta line. A skeleton in a different order jumps twice. */}
			<div className="px-3 pt-3">
				<div className="relative flex aspect-[8.5/11] w-full items-start justify-center overflow-hidden rounded-sm border bg-sunken p-2">
					<ThumbnailSkeleton height={296} width={228} />
				</div>
			</div>
			<div className="mt-3 px-4">
				<div className="flex items-start justify-between gap-2">
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-7 w-7 shrink-0 rounded-md" />
				</div>
				<div className="mt-2 flex flex-wrap gap-2 pb-4">
					<Skeleton className="h-3 w-16" />
					<Skeleton className="h-3 w-12" />
					<Skeleton className="h-3 w-24" />
				</div>
			</div>
		</div>
	);
}

function DashboardContent() {
	const { navigate } = useHashRouter();
	const { user } = useAuthStore();
	const setActiveResumeId = useActiveResumeStore((s) => s.setActiveResumeId);

	// State
	const [searchQuery, setSearchQuery] = useState("");
	/*
	 * Which resume is mid-duplicate. `isDuplicating` from the hook is dashboard-wide, so on
	 * its own it would spin the duplicate control on every card at once -- telling the user
	 * about a row they did not touch. This names the one row that is actually working.
	 */
	const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
	/*
	 * Which resume is mid-archive. Archive and restore share one mutation, so one id covers
	 * both -- `isArchiving` alone is dashboard-wide, exactly as `isDuplicating` was.
	 */
	const [archivingId, setArchivingId] = useState<string | null>(null);
	const [showArchived, setShowArchived] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState<
		TemplateType | "all"
	>("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
	const [newResumeName, setNewResumeName] = useState("");
	const [newResumeTemplate, setNewResumeTemplate] =
		useState<TemplateType>("standard");
	const [showWelcomeGuide, setShowWelcomeGuide] = useState(true);
	const [page, setPage] = useState(1);
	const pageSize = 10;

	// Data fetching via tRPC
	const {
		data: resumes = [],
		isLoading,
		isError,
		error,
		refetch,
	} = useResumes({ includeArchived: true });
	const {
		createResume,
		deleteResume,
		duplicateResume,
		archiveResume,
		isCreating,
		isDeleting,
		isDuplicating,
		isArchiving,
	} = useResumeMutations();
	const utils = api.useUtils();
	const bulkUpsertSections = api.section.bulkUpsert.useMutation();
	const confirm = useConfirm();

	const firstName = greetingName(user);
	// Filtered resumes, in reading order
	const filteredResumes = useMemo(() => {
		const matched = resumes.filter((resume: Resume) => {
			if (!showArchived && resume.isArchived) return false;
			if (showArchived && !resume.isArchived) return false;
			if (searchQuery) {
				const query = searchQuery.toLowerCase();
				const nameMatch = resume.name.toLowerCase().includes(query);
				const domainMatch = resume.domain?.toLowerCase().includes(query);
				const tagsMatch = resume.tags?.some((tag: string) =>
					tag.toLowerCase().includes(query),
				);
				if (!nameMatch && !domainMatch && !tagsMatch) return false;
			}
			if (selectedTemplate !== "all" && resume.template !== selectedTemplate)
				return false;
			return true;
		});
		/*
		 * The example leads, then its variations, then the rest of the library in the
		 * query's order. Sorting after filtering rather than in the query keeps the API
		 * free of presentation rules, and keeps the order stable while a filter narrows
		 * the list.
		 */
		return orderShowcaseFirst(matched);
	}, [resumes, searchQuery, showArchived, selectedTemplate]);

	const totalPages = useMemo(
		() => Math.max(1, Math.ceil(filteredResumes.length / pageSize)),
		[filteredResumes.length],
	);

	/*
	 * The dependencies are the trigger, not inputs: this is "when the filters change, go back
	 * to page one". The effect body does not read them, so the rule is right that they are
	 * unused — and removing them would delete the behaviour, because the list would then
	 * stay on a page that the new filter may not have.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: filters are the trigger
	useEffect(() => {
		setPage(1);
	}, [searchQuery, showArchived, selectedTemplate]);

	useEffect(() => {
		setPage((prev) => Math.min(Math.max(1, prev), totalPages));
	}, [totalPages]);

	const pagedResumes = useMemo(() => {
		const start = (page - 1) * pageSize;
		return filteredResumes.slice(start, start + pageSize);
	}, [filteredResumes, page]);

	// Get variations for a resume (resumes with baseResumeId matching this resume)
	const getVariations = (resumeId: string) => {
		return resumes.filter((r: Resume) => r.baseResumeId === resumeId);
	};

	// Stats
	const totalResumes = useMemo(
		() => resumes.filter((r: Resume) => !r.isArchived).length,
		[resumes],
	);

	/*
	 * The seeded example, found by tag rather than id so a re-seed cannot break the
	 * entry point. Archived examples are ignored: "View the example" should open a
	 * document that is actually in the library.
	 */
	const showcase = useMemo(
		() => findShowcase(resumes.filter((r: Resume) => !r.isArchived)),
		[resumes],
	);

	/*
	 * Counts for the rail, derived from the same list the grid renders so they cannot
	 * disagree with it. `variationCount` is also the first place in the product that
	 * answers "how many of these are variants of something else" — which is the
	 * question a user is really asking when they look at a wall of near-identical cards.
	 */
	const variationCount = useMemo(
		() => resumes.filter((r: Resume) => r.variationType === "variation").length,
		[resumes],
	);
	const archivedCount = useMemo(
		() => resumes.filter((r: Resume) => r.isArchived).length,
		[resumes],
	);

	/*
	 * The welcome guide *is* the empty state while it is up. It and the generic
	 * EmptyState below both offered "Create Your First Resume" — two primary
	 * buttons for one action in one region (R11) — and said the same thing twice.
	 * Filters are excluded because a search or the archived view is asking a
	 * question the welcome copy does not answer.
	 */
	const welcomeVisible =
		showWelcomeGuide && totalResumes === 0 && !searchQuery && !showArchived;

	// Show skeleton while loading
	if (isLoading) {
		return <DashboardSkeleton />;
	}

	/*
	 * A failed load, rendered with the same primitive the editor uses.
	 *
	 * This was hand-rolled and had drifted from `PanelError` in two ways that mattered:
	 *
	 * - No `role="alert"`, so the failure only changed pixels. A screen-reader user was
	 *   left on a page that had silently become empty -- indistinguishable from an account
	 *   with no resumes, which is the exact confusion `panel-state.tsx` exists to prevent.
	 * - Retry called `window.location.reload()`, throwing away the whole app to re-run one
	 *   query. It also lost anything the user had typed, and looked like a crash-and-recover
	 *   rather than a refetch.
	 *
	 * `refetch` is what the query was already doing behind a cache; a failed request is
	 * exactly what it is for.
	 */
	if (isError) {
		return (
			<div className="flex min-h-dvh items-center justify-center bg-background p-4">
				<PanelError
					className="max-w-md border-solid"
					message={
						error?.message || "Failed to load your resumes. Please try again."
					}
					onRetry={() => void refetch()}
					retryLabel="Retry"
				/>
			</div>
		);
	}

	// Handlers
	const handleCreateResume = async () => {
		if (!newResumeName.trim()) return;
		try {
			const newResume = await createResume({
				name: newResumeName.trim(),
				template: newResumeTemplate,
			});
			setIsCreateDialogOpen(false);
			setNewResumeName("");
			if (newResume?.id) {
				setActiveResumeId(newResume.id);
				navigate(`/resume-editor/${newResume.id}`);
			}
		} catch (err) {
			/*
			 * `console.error` alone is the same as saying nothing: the user clicked, the
			 * control settled back, and the thing they asked for did not happen. Reported
			 * through the toast the rest of the app already uses; `console.error` is kept as
			 * the developer breadcrumb, not as the user-facing half.
			 */
			console.error("Failed to create resume:", err);
			toast.error("Could not create the resume.");
		}
	};

	/**
	 * The showcase entry point. The example is found by tag, not by id, so re-seeding
	 * with fresh ids keeps working; nothing renders the button when no example exists.
	 */
	const handleViewShowcase = () => {
		if (!showcase) return;
		setActiveResumeId(showcase.id);
		navigate(`/resume-editor/${showcase.id}`);
	};

	const handleDeleteResume = async () => {
		if (resumeToDelete) {
			try {
				await deleteResume(resumeToDelete);
				setResumeToDelete(null);
				setIsDeleteDialogOpen(false);
			} catch (err) {
				/*
				 * The dialog deliberately stays open on failure, so the user can try again
				 * without reopening it -- which is only true if the failure is visible.
				 */
				console.error("Failed to delete resume:", err);
				toast.error("Could not delete the resume.");
			}
		}
	};

	const handleDuplicateResume = async (id: string, name: string) => {
		/*
		 * The menu closes on click, so a second duplicate needs a second deliberate open.
		 * Guarding anyway: `duplicateResume` is not idempotent, and a retry that fires while
		 * the first copy is still being written produces two copies and no way to tell
		 * which was intended.
		 */
		if (isDuplicating) return;

		setDuplicatingId(id);
		try {
			const newResume = await duplicateResume(id, `${name} (copy)`);
			if (newResume?.id) {
				setActiveResumeId(newResume.id);
				navigate(`/resume-editor/${newResume.id}`);
			} else {
				toast.error(`"${name}" could not be duplicated.`);
			}
		} catch (err) {
			/*
			 * Previously a bare `console.error`, which is the same as saying nothing: the
			 * user clicked Duplicate, the menu closed, no copy appeared, and the control
			 * showed no sign of having run at all.
			 */
			console.error("Failed to duplicate resume:", err);
			toast.error(`"${name}" could not be duplicated.`);
		} finally {
			setDuplicatingId(null);
		}
	};

	/*
	 * Archive and restore share one handler because they are one mutation with a different
	 * argument, and they share the same in-flight concern: both flip a row's archived state,
	 * so a double invocation is either a duplicated write or a second write that undoes the
	 * first. `isArchiving` is the re-entry guard and `archivingId` says which row.
	 */
	const handleArchiveResume = async (
		id: string,
		archived: boolean,
		name: string,
	) => {
		if (isArchiving) return;

		setArchivingId(id);
		try {
			await archiveResume(id, archived);
		} catch (err) {
			console.error(
				`Failed to ${archived ? "archive" : "restore"} resume:`,
				err,
			);
			toast.error(
				archived
					? `"${name}" could not be archived.`
					: `"${name}" could not be restored.`,
			);
		} finally {
			setArchivingId(null);
		}
	};

	/**
	 * Export the WHOLE document, not the list projection.
	 *
	 * The previous implementation serialised the row it already had from `resume.list`,
	 * which is a list query. Whether sections survived depended on a query this button
	 * did not control, and an exported file that silently omits the resume's contents is
	 * the worst possible failure for a backup.
	 */
	const handleExportResume = async (id: string, name: string) => {
		try {
			const resume = await utils.resume.getById.fetch({ id });
			if (!resume) {
				toast.error(`Could not load "${name}" to export it.`);
				return;
			}
			const json = JSON.stringify(resume, null, 2);
			const blob = new Blob([json], { type: "application/json" });
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `${name.toLowerCase().replace(/\s+/g, "-")}.json`;
			a.click();
			URL.revokeObjectURL(url);
		} catch (err) {
			console.error("Failed to export resume:", err);
			toast.error(`Could not export "${name}".`);
		}
	};

	/**
	 * Import a document into a new resume.
	 *
	 * Accepts the format this app exports (JSON, sections included) and the formats
	 * people actually arrive with (PDF, DOCX, Markdown, plain text). The previous
	 * control claimed a full import and read only the JSON envelope, so importing an
	 * exported resume produced an empty document -- a silent data loss on the restore
	 * path, which is the one path a user cannot afford to have lie.
	 *
	 * Nothing is created until parsing succeeds. A failed parse names the file and the
	 * reason and leaves the library untouched.
	 */
	const handleImportResume = () => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,.pdf,.docx,.md,.markdown,.txt";
		input.onchange = async (e) => {
			const file = (e.target as HTMLInputElement).files?.[0];
			if (!file) return;

			const baseName = file.name.replace(/\.[^.]+$/, "") || "Imported resume";

			try {
				if (/\.json$/i.test(file.name)) {
					const data = JSON.parse(await file.text()) as {
						name?: string;
						template?: string;
						domain?: string;
						tags?: string[];
						metadata?: unknown;
						sections?: Array<{
							type: string;
							order?: number;
							visible?: boolean;
							content?: unknown;
						}>;
					};

					const created = await createResume({
						name: data.name || baseName,
						template: normalizeTemplateId(
							typeof data.template === "string" ? data.template : undefined,
						),
						domain: data.domain,
						tags: data.tags,
						metadata: data.metadata as never,
					});

					if (
						created?.id &&
						Array.isArray(data.sections) &&
						data.sections.length
					) {
						await bulkUpsertSections.mutateAsync({
							resumeId: created.id,
							sections: data.sections.map((section, index) => ({
								type: section.type as never,
								order: section.order ?? index,
								visible: section.visible ?? true,
								content: (section.content ?? {}) as never,
							})),
						});
					}

					if (created?.id) {
						setActiveResumeId(created.id);
						navigate(`/resume-editor/${created.id}`);
					}
					return;
				}

				const text = /\.(md|markdown|txt)$/i.test(file.name)
					? await file.text()
					: await (async () => {
							const outcome = await extractDocumentText(file);
							if (!outcome.ok) throw new Error(outcome.message);
							return outcome.text;
						})();

				const result = sectionResumeText(text);
				if (result.sections.length === 0) {
					throw new Error(
						"No sections were recognised. The file may be a scan, or its headings may not match a resume format.",
					);
				}

				/*
				 * A review gate. Nothing is written until the user has seen what was
				 * extracted — which is the same promise the editor's import sheet makes,
				 * and the reason an import can never quietly replace a document.
				 */
				const names = result.sections
					.slice(0, 4)
					.map((s) => s.title)
					.join(", ");
				const more =
					result.sections.length > 4
						? ` and ${result.sections.length - 4} more`
						: "";
				const confirmed = await confirm(
					`Import ${result.sections.length} sections from "${file.name}"?`,
					`Found: ${names}${more}. This creates a new resume — nothing in an existing one is changed.`,
				);
				if (!confirmed) return;

				const now = new Date().toISOString();
				const created = await createResume({
					name: result.contact.fullName?.value || baseName,
					template: "standard",
				});
				if (!created?.id) throw new Error("The resume could not be created.");

				await bulkUpsertSections.mutateAsync({
					resumeId: created.id,
					sections: result.sections.map((section, index) => ({
						type: section.type,
						order: index,
						visible: true,
						content: toLibraryPayload(section, {
							source: /\.pdf$/i.test(file.name) ? "pdf" : "docx",
							sourceName: file.name,
							importedAt: now,
							headingConfidence: section.confidence,
						}),
					})),
				});

				setActiveResumeId(created.id);
				navigate(`/resume-editor/${created.id}`);
			} catch (err) {
				console.error("Failed to import resume:", err);
				const detail = err instanceof Error ? err.message : String(err);
				toast.error(`Could not import "${file.name}": ${detail}`);
			}
		};
		input.click();
	};

	return (
		<div className="min-h-dvh bg-background">
			{/*
			 * The nameplate. 56px, a hairline under it, and no fill: a page tone header
			 * on a card tone body made the chrome read as a strip bolted on top. Only one
			 * solid control is in this row (New resume) — Import is a ghost, and the two
			 * utilities (theme, account) sit quiet at the end of the row.
			 */}
			<header className="border-b bg-background">
				<div className="mx-auto flex min-h-16 w-full max-w-[96rem] flex-wrap items-center justify-between gap-2 px-6 py-2">
					<button
						className="rounded-sm text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						onClick={() => navigate("/")}
						type="button"
					>
						<BrandWordmark />
					</button>
					<div className="flex items-center gap-1">
						<Button
							aria-label="Import resume"
							className="text-fg-muted"
							onClick={handleImportResume}
							size="sm"
							title="Import resume"
							variant="ghost"
						>
							<Upload className="h-4 w-4 sm:mr-2" />
							<span className="hidden sm:inline" data-collapse-label="">
								Import
							</span>
						</Button>
						<ThemeToggle />
						<UserMenu />
						<span aria-hidden="true" className="mx-1 h-4 w-px bg-border" />
						<Button
							aria-label="New resume"
							disabled={isCreating}
							onClick={() => setIsCreateDialogOpen(true)}
							title="New resume"
						>
							{isCreating ? (
								<Loader2 className="h-4 w-4 animate-spin sm:mr-2" />
							) : (
								<Plus className="h-4 w-4 sm:mr-2" />
							)}
							<span className="hidden sm:inline" data-collapse-label="">
								New Resume
							</span>
						</Button>
					</div>
				</div>
			</header>

			{/* Main content */}
			<main className="mx-auto w-full max-w-[96rem] px-6 py-8">
				{/*
				 * Two columns at lg: the documents get the room, the controls that act on
				 * them are a quiet rail beside it.
				 *
				 * The rail is *not* a card any more. Two stacked cards ("Filters", "Your
				 * library") put two more floating surfaces beside eight document cards, so
				 * the page had eleven objects of nearly equal weight. A rail separated by
				 * space and one hairline is the system's answer for chrome (D8: regions are
				 * seams, cards float), and it leaves the cards as the only things that lift.
				 *
				 * The rail is FIRST in the DOM and ordered second at lg, so a narrow screen
				 * shows filters before the list they filter.
				 */}
				{/*
				 * The heading names the person, and yields to the welcome guide for a new
				 * account: two headings competing above one empty grid is one too many.
				 *
				 * The result count is **not** here. Set against the right edge of the page it
				 * floated above the rail, unconnected to anything it counted; it now sits
				 * immediately over the card grid, which is the thing it describes.
				 */}
				{user && totalResumes > 0 ? (
					<h1 className="mb-6 font-semibold text-xl tracking-title">
						{firstName ? `Welcome back, ${firstName}` : "Welcome back"}
					</h1>
				) : null}

				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
					<aside className="lg:order-2">
						<div className="space-y-6 lg:sticky lg:top-8">
							<div className="space-y-3">
								<h2 className="br-micro">Filters</h2>
								<div className="relative">
									<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
									<Input
										aria-label="Search resumes"
										className="pl-8"
										onChange={(e) => {
											setSearchQuery(e.target.value);
											setPage(1);
										}}
										placeholder="Search resumes..."
										value={searchQuery}
									/>
								</div>

								<div>
									<Label className="br-label" htmlFor="template-filter">
										Template
									</Label>
									<Select
										onValueChange={(value) => {
											setSelectedTemplate(value as TemplateType | "all");
											setPage(1);
										}}
										value={selectedTemplate}
									>
										<SelectTrigger className="mt-1 w-full" id="template-filter">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">All templates</SelectItem>
											{(Object.keys(TEMPLATE_CONFIGS) as TemplateType[]).map(
												(template) => (
													<SelectItem key={template} value={template}>
														{TEMPLATE_CONFIGS[template].name}
													</SelectItem>
												),
											)}
										</SelectContent>
									</Select>
								</div>

								{/*
								 * Archived is a *state of the list*, so it is a switch, not a button.
								 * As a full-width button it was the third solid/outlined slab in the
								 * rail and it announced itself as an action ("Show archived") that
								 * then had to become a different action ("Showing archived").
								 */}
								<label
									className="flex min-h-10 cursor-pointer items-center justify-between gap-3"
									htmlFor="show-archived"
								>
									<span className="text-fg-muted text-sm">Show archived</span>
									<Switch
										aria-label="Show archived resumes"
										checked={showArchived}
										id="show-archived"
										onCheckedChange={(next) => {
											setShowArchived(next);
											setPage(1);
										}}
									/>
								</label>
							</div>

							{totalResumes > 0 ? (
								/*
								 * The counts this rail is *for*. "Resumes" is not here on purpose: the
								 * meta line under the page title already says "N resumes" (and "N of M"
								 * under a filter), live and announced. Below `lg` the rail sits
								 * above the grid, so it stays one compact block rather than disappearing.
								 */
								<dl className="space-y-2 border-t pt-4 text-sm">
									<div className="flex items-baseline justify-between gap-2">
										<dt className="text-fg-muted">Variants</dt>
										<dd className="font-medium tabular-nums">
											{variationCount}
										</dd>
									</div>
									<div className="flex items-baseline justify-between gap-2">
										<dt className="text-fg-muted">Archived</dt>
										<dd className="font-medium tabular-nums">
											{archivedCount}
										</dd>
									</div>
								</dl>
							) : null}
						</div>
					</aside>

					<div className="min-w-0 lg:order-1">
						{/*
						 * The showcase entry point. A labelled region, not an unlabelled
						 * sunken row: the maintainer's report was "I don't see the example
						 * resume anywhere". The control now says *example resume* — the
						 * phrase someone actually looks for — and the action is an outlined
						 * button rather than a text link at the far edge of the row.
						 *
						 * The action sits beside the copy, not pinned to the far edge. As a
						 * full-width row with the button on the right, a 52ch paragraph left
						 * ~400px of nothing between the sentence and the thing it invited
						 * you to do. The region is now as wide as its content at `sm`, so
						 * there is no gap to strand the button in at any width.
						 */}
						{showcase ? (
							<section
								aria-labelledby="example-resume-heading"
								className="mb-6 flex flex-col gap-3 rounded-md border bg-sunken-static px-4 py-3 sm:w-fit sm:flex-row sm:items-center sm:gap-4"
							>
								<div className="flex min-w-0 items-start gap-3 sm:items-center">
									<BookOpen
										aria-hidden
										className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle sm:mt-0"
									/>
									<div className="min-w-0">
										<h2
											className="font-medium text-sm"
											id="example-resume-heading"
										>
											Example resume
										</h2>
										<p className="max-w-[52ch] text-fg-muted text-sm">
											A finished one-pager that uses every feature — variants,
											the content library, revision history and the fit meter.
											Open it to see what done looks like.
										</p>
									</div>
								</div>
								<Button
									className="shrink-0 self-start sm:self-auto"
									onClick={handleViewShowcase}
									size="sm"
									variant="outline"
								>
									Open the example resume
								</Button>
							</section>
						) : null}

						{/* Welcome Guide. Greyscale like everything else (R: colour is for
						    state and action, not for making a callout look important), and
						    it *is* the empty state while it is up — the generic EmptyState
						    below waits its turn, so the region never offers the same primary
						    action twice (R11). */}
						{welcomeVisible && (
							<Card className="mb-8">
								<CardHeader className="relative">
									<Button
										className="absolute top-4 right-4"
										onClick={() => setShowWelcomeGuide(false)}
										size="icon"
										variant="ghost"
									>
										<X className="h-4 w-4" />
									</Button>
									<CardTitle className="flex items-center gap-2">
										<Info className="h-5 w-5 text-primary" />
										Welcome to Betta Resume!
									</CardTitle>
									<CardDescription>
										Get started by creating your first resume
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="grid gap-4 sm:grid-cols-3">
										<div>
											<h4 className="mb-2 font-medium">1. Create a Resume</h4>
											<p className="text-muted-foreground text-sm">
												Click &quot;New Resume&quot; to start building your
												professional resume.
											</p>
										</div>
										<div>
											<h4 className="mb-2 font-medium">
												2. Customize Sections
											</h4>
											<p className="text-muted-foreground text-sm">
												Add your experience, education, skills, and more.
											</p>
										</div>
										<div>
											<h4 className="mb-2 font-medium">3. Export & Share</h4>
											<p className="text-muted-foreground text-sm">
												Download your resume as PDF or share it online.
											</p>
										</div>
									</div>
								</CardContent>
								<CardFooter>
									<Button
										disabled={isCreating}
										onClick={() => setIsCreateDialogOpen(true)}
									>
										{isCreating ? (
											<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Plus className="mr-2 h-4 w-4" />
										)}
										Create Your First Resume
									</Button>
								</CardFooter>
							</Card>
						)}

						{/* Resume Grid */}
						{filteredResumes.length > 0 ? (
							<>
								{/*
								 * The grid's count, directly above the grid and left-aligned with it.
								 * Live and announced: the search filters on every keystroke without
								 * moving focus, so the change has to be spoken somewhere.
								 */}
								<p
									aria-live="polite"
									className="mb-3 text-fg-muted text-xs"
									data-grid-count=""
									role="status"
								>
									{resultSummary({
										matched: filteredResumes.length,
										query: searchQuery,
										total: totalResumes,
									})}
								</p>
								<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
									{pagedResumes.map((resume: Resume) => (
										<ResumeCard
											isArchiving={archivingId === resume.id}
											isDuplicating={duplicatingId === resume.id}
											key={resume.id}
											onArchive={() =>
												handleArchiveResume(resume.id, true, resume.name)
											}
											onDelete={() => {
												setResumeToDelete(resume.id);
												setIsDeleteDialogOpen(true);
											}}
											onDuplicate={() =>
												handleDuplicateResume(resume.id, resume.name)
											}
											onEdit={() => {
												setActiveResumeId(resume.id);
												navigate(`/resume-editor/${resume.id}`);
											}}
											onExport={() =>
												handleExportResume(resume.id, resume.name)
											}
											onRestore={() =>
												handleArchiveResume(resume.id, false, resume.name)
											}
											resume={resume}
											variations={getVariations(resume.id)}
										/>
									))}
								</div>
								{filteredResumes.length > pageSize && (
									<div className="mt-8 flex items-center justify-center gap-3">
										<Button
											disabled={page <= 1}
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											size="sm"
											variant="ghost"
										>
											Previous
										</Button>
										<span className="text-fg-muted text-xs tabular-nums">
											Page {page} of {totalPages}
										</span>
										<Button
											disabled={page >= totalPages}
											onClick={() =>
												setPage((p) => Math.min(totalPages, p + 1))
											}
											size="sm"
											variant="ghost"
										>
											Next
										</Button>
									</div>
								)}
							</>
						) : welcomeVisible ? null : (
							<EmptyState
								onCreateNew={() => setIsCreateDialogOpen(true)}
								onViewExample={showcase ? handleViewShowcase : undefined}
								searchQuery={searchQuery}
								showArchived={showArchived}
							/>
						)}
					</div>
				</div>
			</main>

			{/* Create Dialog */}
			<Dialog onOpenChange={setIsCreateDialogOpen} open={isCreateDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Create New Resume</DialogTitle>
						<DialogDescription>
							Give your resume a name and choose a template to get started.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Resume Name</Label>
							<Input
								id="name"
								onChange={(e) => setNewResumeName(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										handleCreateResume();
									}
								}}
								placeholder="e.g., Software Engineer Resume"
								value={newResumeName}
							/>
						</div>
						<div className="grid gap-2">
							<Label htmlFor="template">Template</Label>
							<Select
								onValueChange={(value) =>
									setNewResumeTemplate(value as TemplateType)
								}
								value={newResumeTemplate}
							>
								<SelectTrigger>
									<SelectValue placeholder="Choose a template" />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => (
										<SelectItem key={key} value={key}>
											{config.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{TEMPLATE_CONFIGS[newResumeTemplate] && (
								<p className="text-muted-foreground text-xs">
									{TEMPLATE_CONFIGS[newResumeTemplate].description}
								</p>
							)}
						</div>
					</div>
					<DialogFooter>
						<Button
							onClick={() => setIsCreateDialogOpen(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={!newResumeName.trim() || isCreating}
							disabledReason={
								!newResumeName.trim()
									? "Name your resume to continue"
									: undefined
							}
							onClick={handleCreateResume}
						>
							{isCreating ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Create Resume
							{!isCreating && newResumeName.trim() ? (
								<span aria-hidden="true" className="br-kbd ml-2">
									⏎
								</span>
							) : null}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<Dialog onOpenChange={setIsDeleteDialogOpen} open={isDeleteDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="pr-8">
							{/*
							 * The confirmation names its target. The card menu says "Delete" on one of
							 * six rows; "Delete Resume" made the user re-read the card behind the
							 * scrim to be sure which document they were about to lose.
							 */}
							{resumes?.find((r: Resume) => r.id === resumeToDelete)?.name
								? `Delete “${resumes.find((r: Resume) => r.id === resumeToDelete)?.name}”?`
								: "Delete this resume?"}
						</DialogTitle>
						<DialogDescription>This action cannot be undone.</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<Button
							onClick={() => setIsDeleteDialogOpen(false)}
							variant="outline"
						>
							Cancel
						</Button>
						<Button
							disabled={isDeleting}
							onClick={handleDeleteResume}
							variant="destructive"
						>
							{isDeleting ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

// Empty State Component. Icon + headline + body + the one action that fixes the
// emptiness (component inventory #27: 32px icon, 20/600 headline, 14px muted
// body, `py-12 px-6`) — the audit found a 64px icon floating in `py-16` of void.
interface EmptyStateProps {
	showArchived: boolean;
	searchQuery: string;
	onCreateNew: () => void;
	/** Opens the seeded example. Absent when no example is in the library. */
	onViewExample?: () => void;
}

function EmptyState({
	showArchived,
	searchQuery,
	onCreateNew,
	onViewExample,
}: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center px-6 py-12 text-center">
			{/*
			 * The system's empty-state anatomy: a 40px tinted tile, a panel-title headline,
			 * one muted line, and the action(s) that fix it. It was a bare 32px glyph with an
			 * 18px heading, which read as "nothing here" rather than as guidance.
			 */}
			<span className="br-tile mb-3">
				<FileText aria-hidden="true" className="h-5 w-5" />
			</span>
			<h3 className="mb-1 font-semibold text-base tracking-title">
				{searchQuery
					? "No resumes found"
					: showArchived
						? "No archived resumes"
						: "No resumes yet"}
			</h3>
			<p className="mb-6 max-w-sm text-fg-muted text-sm">
				{searchQuery
					? `No resumes match "${searchQuery}". Try a different search term.`
					: showArchived
						? "You haven't archived any resumes yet."
						: "Create your first resume to get started building your professional profile."}
			</p>
			<div className="flex flex-wrap items-center justify-center gap-2">
				{!showArchived && !searchQuery && (
					<Button onClick={onCreateNew}>
						<Plus className="mr-2 h-4 w-4" />
						Create Your First Resume
					</Button>
				)}
				{/*
				 * Also reachable from the empty state, not only the populated dashboard. It
				 * renders only when the seeded example is in the library: a button that
				 * navigates nowhere is worse than no button.
				 */}
				{onViewExample ? (
					<Button onClick={onViewExample} variant="outline">
						<BookOpen className="mr-2 h-4 w-4" />
						Open the example resume
					</Button>
				) : null}
			</div>
		</div>
	);
}
