"use client";

import { formatDistanceToNow } from "date-fns";
import {
	Check,
	ChevronDown,
	GitBranch,
	Loader2,
	Plus,
	RefreshCw,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Resume } from "@/features/resume-editor/types";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";

interface VariationManagerProps {
	baseResume: Resume;
	variations: Resume[];
	currentResumeId: string;
	/**
	 * Omitted when the host has no way to create a variation. The create control is
	 * then hidden rather than shown-and-broken: `resume-editor.tsx` shipped a complete
	 * Create Variation dialog wired to a `console.log`, so a user could fill in a name
	 * and a domain, press the button, and watch nothing happen with no error.
	 */
	onCreateVariation?: (name: string, domain?: string) => void;
	onSelectVariation: (id: string) => void;
	onDeleteVariation: (id: string) => void;
	onSyncWithBase?: (variationId: string) => void;
	/** True while a variation is being created, so the control cannot be double-fired. */
	isCreating?: boolean;
}

export function VariationManager({
	baseResume,
	variations,
	currentResumeId,
	onCreateVariation,
	onSelectVariation,
	onDeleteVariation,
	onSyncWithBase,
	isCreating = false,
}: VariationManagerProps) {
	const confirm = useConfirm();
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [newName, setNewName] = useState("");
	const [newDomain, setNewDomain] = useState("");

	const currentResume =
		currentResumeId === baseResume.id
			? baseResume
			: variations.find((v) => v.id === currentResumeId);

	const handleCreate = () => {
		if (!newName.trim() || !onCreateVariation) return;
		onCreateVariation(newName.trim(), newDomain.trim() || undefined);
		setNewName("");
		setNewDomain("");
		setIsCreateOpen(false);
	};

	return (
		<div className="flex items-center gap-2">
			{/* Current Resume Indicator */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						className="gap-1"
						variant={
							currentResume?.variationType === "base" ? "default" : "secondary"
						}
					>
						<GitBranch className="h-3 w-3" />
						{currentResume?.variationType === "base" ? "Base" : "Variation"}
					</Badge>
				</TooltipTrigger>
				<TooltipContent>
					{currentResume?.variationType === "base"
						? "This is the base resume that variations are created from"
						: `Variation of "${baseResume.name}"`}
				</TooltipContent>
			</Tooltip>

			{/* Variation Selector Dropdown */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button className="gap-2" size="sm" variant="outline">
						<span className="max-w-32 truncate">
							{currentResume?.name || "Select"}
						</span>
						<ChevronDown className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-64">
					{/* Base Resume */}
					<DropdownMenuItem
						className={cn(currentResumeId === baseResume.id && "bg-accent")}
						onClick={() => onSelectVariation(baseResume.id)}
					>
						<div className="flex flex-1 items-center gap-2">
							<GitBranch className="h-4 w-4 text-primary" />
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium text-sm">
									{baseResume.name}
								</p>
								<p className="text-muted-foreground text-xs">Base Resume</p>
							</div>
							{currentResumeId === baseResume.id && (
								<Check className="h-4 w-4 text-primary" />
							)}
						</div>
					</DropdownMenuItem>

					{variations.length > 0 && <DropdownMenuSeparator />}

					{/* Variations */}
					<ScrollArea className={variations.length > 4 ? "h-48" : ""}>
						{variations.map((variation) => (
							<DropdownMenuItem
								className={cn(
									"flex items-center justify-between",
									currentResumeId === variation.id && "bg-accent",
								)}
								key={variation.id}
								onClick={() => onSelectVariation(variation.id)}
							>
								<div className="min-w-0 flex-1">
									<p className="truncate font-medium text-sm">
										{variation.name}
									</p>
									<p className="text-muted-foreground text-xs">
										{variation.domain ||
											formatDistanceToNow(new Date(variation.createdAt), {
												addSuffix: true,
											})}
									</p>
								</div>
								{currentResumeId === variation.id && (
									<Check className="h-4 w-4 text-primary" />
								)}
							</DropdownMenuItem>
						))}
					</ScrollArea>

					{/* Create New Variation — only when there is something to call. */}
					{onCreateVariation ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onSelect={(e) => {
									e.preventDefault();
									setIsCreateOpen(true);
								}}
							>
								<Plus className="mr-2 h-4 w-4" />
								Create Variation
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>

			{/* Actions for current variation */}
			{currentResume?.variationType === "variation" && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button className="h-8 w-8" size="icon" variant="ghost">
							<ChevronDown className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{onSyncWithBase && (
							<DropdownMenuItem onClick={() => onSyncWithBase(currentResumeId)}>
								<RefreshCw className="mr-2 h-4 w-4" />
								Sync with Base
							</DropdownMenuItem>
						)}
						<DropdownMenuItem
							className="text-destructive"
							onClick={async () => {
								const confirmed = await confirm(
									"Delete Variation",
									"Delete this variation? This cannot be undone.",
								);
								if (confirmed) {
									onDeleteVariation(currentResumeId);
								}
							}}
						>
							<Trash2 className="mr-2 h-4 w-4" />
							Delete Variation
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{/* Create Variation Dialog -- only reachable when a handler exists. */}
			{onCreateVariation ? (
				<Dialog onOpenChange={setIsCreateOpen} open={isCreateOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Create Variation</DialogTitle>
							<DialogDescription>
								Start from &quot;{baseResume.name}&quot; with every section
								linked to it. Change what is different for this role — those
								sections detach and become yours — while everything else keeps
								following the base when you edit it there. Fork rather than edit
								when the next application needs a different emphasis, not a
								different history.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4 py-4">
							<div>
								<Label>Variation Name *</Label>
								<Input
									className="mt-1"
									onChange={(e) => setNewName(e.target.value)}
									placeholder="e.g., Software Engineer - Google"
									value={newName}
								/>
							</div>
							<div>
								<Label>Target Domain (optional)</Label>
								<Input
									className="mt-1"
									onChange={(e) => setNewDomain(e.target.value)}
									placeholder="e.g., Frontend, Backend, Full Stack"
									value={newDomain}
								/>
								<p className="mt-1 text-muted-foreground text-xs">
									Helps categorize and filter your variations
								</p>
							</div>
						</div>
						<DialogFooter>
							<Button
								disabled={isCreating}
								onClick={() => setIsCreateOpen(false)}
								variant="outline"
							>
								Cancel
							</Button>
							<Button
								disabled={!newName.trim() || isCreating}
								onClick={handleCreate}
							>
								{isCreating ? (
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								) : (
									<GitBranch className="mr-2 h-4 w-4" />
								)}
								Create Variation
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			) : null}
		</div>
	);
}
