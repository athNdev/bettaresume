"use client";

/**
 * Resume Card Component
 *
 * A tile in the library. It is composed as a *document*, top to bottom: the sheet
 * first (the thing you recognise), then its name, then one meta line. The order is
 * deliberate — a shelf of pages reads as a library, a shelf of headings reads as a
 * settings list.
 *
 * Anatomy:
 *   - thumbnail: a page-shaped frame in a sunken well, so the white paper reads as
 *     paper *on* a surface rather than as a hole in the card;
 *   - title row: the name owns the row and truncates against a reserved gutter; the
 *     28px overflow menu is the only thing beside it;
 *   - meta row: one 12px muted line — archetype · page size · density · recency —
 *     with state badges (Showcase / Variation / Archived) at its end. The archetype
 *     used to be a badge of its own above the thumbnail, which gave every card two
 *     rows of chips before the document appeared.
 *
 * The card is interactive: hover lifts it 2px at 180ms (`br-lift`), and the whole
 * card is not a button — the title and the thumbnail are, so the menu inside it
 * stays valid HTML.
 */

import { normalizeTemplateId } from "@bettaresume/types";
import { formatDistanceToNow } from "date-fns";
import {
	Archive,
	ArchiveRestore,
	BookOpen,
	Copy,
	Download,
	GitBranch,
	Loader2,
	MoreHorizontal,
	Pencil,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ResumeThumbnail } from "@/features/dashboard/components/resume-thumbnail";
import type { Resume } from "@/features/resume-editor/types";
import { TEMPLATE_CONFIGS } from "@/features/resume-editor/types";
import { isShowcase } from "@/lib/showcase";

interface ResumeCardProps {
	resume: Resume;
	variations: Resume[];
	onEdit: () => void;
	onDuplicate: () => void;
	/** This card's own duplicate is in flight; only that card should say so. */
	isDuplicating?: boolean;
	onExport: () => void;
	onArchive: () => void;
	/** This card's own archive/restore is in flight. */
	isArchiving?: boolean;
	onRestore: () => void;
	onDelete: () => void;
}

/** A quiet separator inside the meta line. Decorative, so it is hidden from AT. */
const DENSITY_LABEL: Record<string, string> = {
	compact: "Compact",
	normal: "Balanced",
	spacious: "Spacious",
};

export function ResumeCard({
	resume,
	variations,
	onEdit,
	onDuplicate,
	isDuplicating = false,
	onExport,
	onArchive,
	isArchiving = false,
	onRestore,
	onDelete,
}: ResumeCardProps) {
	const settings = resume.metadata?.settings;
	const templateName =
		TEMPLATE_CONFIGS[normalizeTemplateId(resume.template)]?.name ??
		resume.template;
	const pageSize = settings?.pageSize ?? "Letter";
	const density = DENSITY_LABEL[settings?.sectionSpacing ?? "normal"] ?? null;
	/*
	 * The archetype and the density band can be the same word — the Compact template
	 * *is* the tight density profile — and printing "Compact · A4 · Compact" described
	 * one document twice.
	 */
	const showDensity = density !== null && density !== templateName;
	const updated = formatDistanceToNow(new Date(resume.updatedAt), {
		addSuffix: true,
	});

	return (
		<Card
			// min-w-0 so the card can shrink below its own max-content. A grid item
			// defaults to min-width:auto, which floors it at the widest child — and the
			// widest child here is a document preview with a pixel width.
			//
			// The hover is the system's 2px lift at 180ms (`--br-duration-base`),
			// written out rather than composed from `.br-lift` because the class
			// sorter would otherwise split `group relative min-w-0`, which
			// `test/responsive-overflow.test.ts` pins as the shrink contract.
			className={`group relative min-w-0 overflow-hidden p-0 transition-[box-shadow,border-color,transform] duration-(--br-duration-base) ease-enter hover:-translate-y-0.5 hover:border-transparent hover:shadow-elev-2 ${
				resume.isArchived ? "opacity-60" : ""
			}`}
		>
			{/* The sheet. */}
			<div className="px-3 pt-3">
				<ResumeThumbnail onClick={onEdit} resume={resume} />
			</div>

			{/* Title row. The menu is pinned and the title reserves its gutter. */}
			<div className="mt-3 flex items-start justify-between gap-2 px-4">
				{/*
				 * The card's real control. Its own text is the accessible name, so a
				 * screen reader says "Harvard Application, button" — once — and the
				 * redundant preview target beside it stays out of the tab order.
				 */}
				<button
					className="min-w-0 flex-1 truncate rounded-sm text-left font-semibold text-base tracking-title hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
					onClick={onEdit}
					type="button"
				>
					{resume.name}
				</button>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label={`Actions for ${resume.name}`}
							className="-mt-1 shrink-0 text-fg-subtle"
							size="icon-sm"
							static
							variant="ghost"
						>
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onEdit}>
							<Pencil className="mr-2 h-4 w-4" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem disabled={isDuplicating} onClick={onDuplicate}>
							{isDuplicating ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : (
								<Copy className="mr-2 h-4 w-4" />
							)}
							{isDuplicating ? "Duplicating…" : "Duplicate"}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={onExport}>
							<Download className="mr-2 h-4 w-4" />
							Export JSON
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						{resume.isArchived ? (
							<DropdownMenuItem disabled={isArchiving} onClick={onRestore}>
								{isArchiving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<ArchiveRestore className="mr-2 h-4 w-4" />
								)}
								{isArchiving ? "Restoring…" : "Restore"}
							</DropdownMenuItem>
						) : (
							<DropdownMenuItem disabled={isArchiving} onClick={onArchive}>
								{isArchiving ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<Archive className="mr-2 h-4 w-4" />
								)}
								{isArchiving ? "Archiving…" : "Archive"}
							</DropdownMenuItem>
						)}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-destructive" onClick={onDelete}>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/*
			 * One meta line, wrapping by *fact*: each fact carries its own leading dot and
			 * `whitespace-nowrap`, so a narrow card wraps between facts and never leaves a
			 * dot stranded at the end of a line. The facts are archetype · page size ·
			 * density · recency, then state badges. It used to be two rows — a chip row
			 * under the title and a footer whose date floated against a phantom second
			 * column whenever the card had no variations.
			 */}
			<div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pb-4 text-fg-muted text-xs">
				<span>{templateName}</span>
				<span className="whitespace-nowrap">· {pageSize}</span>
				{density && showDensity ? (
					<span className="whitespace-nowrap">· {density}</span>
				) : null}
				<span className="whitespace-nowrap">· Updated {updated}</span>
				{variations.length > 0 ? (
					<span className="whitespace-nowrap">
						· {variations.length} variation{variations.length > 1 ? "s" : ""}
					</span>
				) : null}
				{isShowcase(resume) && (
					<Tooltip>
						<TooltipTrigger asChild>
							{/* The `showcase` tag is the UI contract; see `showcase.ts`. */}
							<Badge className="text-xs" variant="outline">
								<BookOpen className="mr-1 h-3 w-3" />
								Showcase
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							A complete example resume that exercises every feature
						</TooltipContent>
					</Tooltip>
				)}
				{resume.variationType === "variation" && (
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge className="text-xs" variant="outline">
								<GitBranch className="mr-1 h-3 w-3" />
								Variation
							</Badge>
						</TooltipTrigger>
						<TooltipContent>
							This is a tailored copy of another resume
						</TooltipContent>
					</Tooltip>
				)}
				{resume.isArchived && (
					<Badge className="text-xs" variant="outline">
						<Archive className="mr-1 h-3 w-3" />
						Archived
					</Badge>
				)}
			</div>
		</Card>
	);
}
