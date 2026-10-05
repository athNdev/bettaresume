"use client";

/**
 * Resume Card Component
 *
 * Displays a resume card with actions.
 */

import {
	Archive,
	ArchiveRestore,
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
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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
	const templateName =
		TEMPLATE_CONFIGS[resume.template as keyof typeof TEMPLATE_CONFIGS]?.name;

	return (
		<Card
			// min-w-0 so the card can shrink below its own max-content. A grid item defaults
			// to min-width:auto, which floors it at the widest child — and the widest child here
			// is a document preview with a pixel width.
			className={`group relative min-w-0 transition-all hover:shadow-lg ${resume.isArchived ? "opacity-60" : ""}`}
		>
			<CardHeader className="pb-2">
				<div className="flex items-start justify-between">
					<div className="min-w-0 flex-1">
						<CardTitle className="truncate text-lg">{resume.name}</CardTitle>
						<CardDescription className="mt-1 flex items-center gap-2">
							<Badge className="text-xs" variant="secondary">
								{templateName ?? resume.template}
							</Badge>
							{resume.variationType === "variation" && (
								<Tooltip>
									<TooltipTrigger>
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
						</CardDescription>
					</div>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="h-8 w-8" size="icon" variant="ghost">
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
			</CardHeader>
			<CardContent>
				<ResumeThumbnail onClick={onEdit} resume={resume} />
			</CardContent>
			<CardFooter className="flex justify-between text-muted-foreground text-xs">
				<span>Updated {new Date(resume.updatedAt).toLocaleDateString()}</span>
				{variations.length > 0 && (
					<span>
						{variations.length} variation{variations.length > 1 ? "s" : ""}
					</span>
				)}
			</CardFooter>
		</Card>
	);
}
