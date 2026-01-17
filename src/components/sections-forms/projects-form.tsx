"use client";

import {
	ChevronDown,
	ChevronUp,
	ExternalLink,
	GripVertical,
	Plus,
	Rocket,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import { Textarea } from "@/components/ui/textarea";
import type { Project } from "@/features/resume-editor/types";
import { createDefaultProject } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface ProjectsFormProps {
	data: Project[];
	onChange: (data: Project[]) => Promise<void>;
	onLocalUpdate?: (data: Project[]) => void;
	title?: string;
}

export function ProjectsForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: ProjectsFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);
	const [newTech, setNewTech] = useState<Record<string, string>>({});
	const [newHighlight, setNewHighlight] = useState<Record<string, string>>({});

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addProject = useCallback(() => {
		const newProj = createDefaultProject();
		setLocalData((prev) => [...prev, newProj]);
		setExpandedItems([newProj.id]);
	}, [setLocalData]);

	const removeProject = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((p) => p.id !== id));
		},
		[setLocalData],
	);

	const updateProject = useCallback(
		(id: string, updates: Partial<Project>) => {
			setLocalData((prev) =>
				prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
			);
		},
		[setLocalData],
	);

	const moveProject = useCallback(
		(index: number, direction: "up" | "down") => {
			const newIndex = direction === "up" ? index - 1 : index + 1;
			if (newIndex < 0 || newIndex >= localData.length) return;
			setLocalData((prev) => {
				const newData = [...prev];
				const temp = newData[index]!;
				newData[index] = newData[newIndex]!;
				newData[newIndex] = temp;
				return newData;
			});
		},
		[localData.length, setLocalData],
	);

	const addTechnology = useCallback(
		(projId: string) => {
			const text = newTech[projId]?.trim();
			if (!text) return;
			const proj = localData.find((p) => p.id === projId);
			if (!proj) return;
			updateProject(projId, {
				technologies: [...(proj.technologies || []), text],
			});
			setNewTech((prev) => ({ ...prev, [projId]: "" }));
		},
		[newTech, localData, updateProject],
	);

	const removeTechnology = useCallback(
		(projId: string, index: number) => {
			const proj = localData.find((p) => p.id === projId);
			if (!proj) return;
			updateProject(projId, {
				technologies: proj.technologies?.filter((_, i) => i !== index),
			});
		},
		[localData, updateProject],
	);

	const addHighlight = useCallback(
		(projId: string) => {
			const text = newHighlight[projId]?.trim();
			if (!text) return;
			const proj = localData.find((p) => p.id === projId);
			if (!proj) return;
			updateProject(projId, { highlights: [...(proj.highlights || []), text] });
			setNewHighlight((prev) => ({ ...prev, [projId]: "" }));
		},
		[newHighlight, localData, updateProject],
	);

	const removeHighlight = useCallback(
		(projId: string, index: number) => {
			const proj = localData.find((p) => p.id === projId);
			if (!proj) return;
			updateProject(projId, {
				highlights: proj.highlights?.filter((_, i) => i !== index),
			});
		},
		[localData, updateProject],
	);

	return (
		<div className="space-y-4">
			<div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex min-h-10 items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur">
				<div className="flex items-center gap-3">
					{title && <h3 className="font-semibold">{title}</h3>}
					<SaveStatusIndicator
						error={error}
						onRetry={retrySave}
						status={status}
					/>
				</div>
				<div className="flex items-center gap-4">
					<p className="text-muted-foreground text-sm">
						{localData.length} project{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addProject} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Project
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Rocket className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No projects added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Showcase your personal and professional projects.
						</p>
						<Button onClick={addProject}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Project
						</Button>
					</CardContent>
				</Card>
			) : (
				<Accordion
					className="space-y-3"
					onValueChange={setExpandedItems}
					type="multiple"
					value={expandedItems}
				>
					{localData.map((proj, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={proj.id}
							value={proj.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{proj.name || "Untitled Project"}
											</div>
											<div className="text-muted-foreground text-sm">
												{proj.technologies?.slice(0, 3).join(", ")}
												{proj.technologies &&
													proj.technologies.length > 3 &&
													` +${proj.technologies.length - 3}`}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => moveProject(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveProject(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Project",
												"Remove this project?",
											);
											if (confirmed) removeProject(proj.id);
										}}
										size="icon"
										variant="ghost"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<AccordionContent className="px-4 pt-2 pb-4">
								<div className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Project Name *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateProject(proj.id, { name: e.target.value })
												}
												placeholder="My Awesome Project"
												value={proj.name}
											/>
										</div>
										<div>
											<Label>Role</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateProject(proj.id, { role: e.target.value })
												}
												placeholder="Lead Developer"
												value={proj.role || ""}
											/>
										</div>
									</div>

									<div>
										<Label>Description</Label>
										<Textarea
											className="mt-1 min-h-20"
											onChange={(e) =>
												updateProject(proj.id, { description: e.target.value })
											}
											placeholder="Describe the project, its purpose, and your contributions..."
											value={proj.description}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Start Date</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateProject(proj.id, { startDate: e.target.value })
												}
												type="month"
												value={proj.startDate || ""}
											/>
										</div>
										<div>
											<Label>End Date</Label>
											<Input
												className="mt-1"
												disabled={proj.current}
												onChange={(e) =>
													updateProject(proj.id, { endDate: e.target.value })
												}
												type="month"
												value={proj.endDate || ""}
											/>
											<div className="mt-2 flex items-center gap-2">
												<Checkbox
													checked={proj.current}
													id={`current-${proj.id}`}
													onCheckedChange={(checked) =>
														updateProject(proj.id, { current: !!checked })
													}
												/>
												<Label
													className="text-sm"
													htmlFor={`current-${proj.id}`}
												>
													Ongoing project
												</Label>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Live URL</Label>
											<div className="relative mt-1">
												<ExternalLink className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													className="pl-9"
													onChange={(e) =>
														updateProject(proj.id, { url: e.target.value })
													}
													placeholder="https://project.com"
													value={proj.url || ""}
												/>
											</div>
										</div>
										<div>
											<Label>Repository URL</Label>
											<div className="relative mt-1">
												<ExternalLink className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													className="pl-9"
													onChange={(e) =>
														updateProject(proj.id, { github: e.target.value })
													}
													placeholder="https://github.com/..."
													value={proj.github || ""}
												/>
											</div>
										</div>
									</div>

									<div>
										<Label>Technologies</Label>
										<div className="mt-2 flex flex-wrap gap-2">
											{proj.technologies?.map((tech, i) => (
												<Badge className="gap-1" key={i} variant="secondary">
													{tech}
													<button
														className="ml-1 hover:text-destructive"
														onClick={() => removeTechnology(proj.id, i)}
													>
														<X className="h-3 w-3" />
													</button>
												</Badge>
											))}
										</div>
										<div className="mt-2 flex gap-2">
											<Input
												onChange={(e) =>
													setNewTech({ ...newTech, [proj.id]: e.target.value })
												}
												onKeyDown={(e) =>
													e.key === "Enter" && addTechnology(proj.id)
												}
												placeholder="Add technology..."
												value={newTech[proj.id] || ""}
											/>
											<Button
												onClick={() => addTechnology(proj.id)}
												size="sm"
												variant="outline"
											>
												<Plus className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div>
										<Label>Key Features / Highlights</Label>
										<div className="mt-2 space-y-2">
											{proj.highlights?.map((highlight, i) => (
												<div className="flex items-center gap-2" key={i}>
													<span className="flex-1 rounded bg-muted px-3 py-1.5 text-sm">
														{highlight}
													</span>
													<Button
														className="h-7 w-7"
														onClick={() => removeHighlight(proj.id, i)}
														size="icon"
														variant="ghost"
													>
														<X className="h-3 w-3" />
													</Button>
												</div>
											))}
											<div className="flex gap-2">
												<Input
													onChange={(e) =>
														setNewHighlight({
															...newHighlight,
															[proj.id]: e.target.value,
														})
													}
													onKeyDown={(e) =>
														e.key === "Enter" && addHighlight(proj.id)
													}
													placeholder="Add highlight..."
													value={newHighlight[proj.id] || ""}
												/>
												<Button
													onClick={() => addHighlight(proj.id)}
													size="sm"
													variant="outline"
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>
								</div>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			)}
		</div>
	);
}
