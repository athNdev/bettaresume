"use client";

import {
	Briefcase,
	ChevronDown,
	ChevronUp,
	GripVertical,
	Plus,
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Experience } from "@/features/resume-editor/types";
import { createDefaultExperience } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface ExperienceFormProps {
	data: Experience[];
	onChange: (data: Experience[]) => Promise<void>;
	onLocalUpdate?: (data: Experience[]) => void;
	title?: string;
}

export function ExperienceForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: ExperienceFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);
	const [newHighlight, setNewHighlight] = useState<Record<string, string>>({});
	const [newTech, setNewTech] = useState<Record<string, string>>({});

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addExperience = useCallback(() => {
		const newExp = createDefaultExperience();
		setLocalData((prev) => [...prev, newExp]);
		setExpandedItems([newExp.id]);
	}, [setLocalData]);

	const removeExperience = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((exp) => exp.id !== id));
		},
		[setLocalData],
	);

	const updateExperience = useCallback(
		(id: string, updates: Partial<Experience>) => {
			setLocalData((prev) =>
				prev.map((exp) => (exp.id === id ? { ...exp, ...updates } : exp)),
			);
		},
		[setLocalData],
	);

	const moveExperience = useCallback(
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

	const addHighlight = useCallback(
		(expId: string) => {
			const text = newHighlight[expId]?.trim();
			if (!text) return;
			const exp = localData.find((e) => e.id === expId);
			if (!exp) return;
			updateExperience(expId, {
				highlights: [...(exp.highlights || []), text],
			});
			setNewHighlight((prev) => ({ ...prev, [expId]: "" }));
		},
		[newHighlight, localData, updateExperience],
	);

	const removeHighlight = useCallback(
		(expId: string, index: number) => {
			const exp = localData.find((e) => e.id === expId);
			if (!exp) return;
			updateExperience(expId, {
				highlights: exp.highlights?.filter((_, i) => i !== index),
			});
		},
		[localData, updateExperience],
	);

	const addTechnology = useCallback(
		(expId: string) => {
			const text = newTech[expId]?.trim();
			if (!text) return;
			const exp = localData.find((e) => e.id === expId);
			if (!exp) return;
			updateExperience(expId, {
				technologies: [...(exp.technologies || []), text],
			});
			setNewTech((prev) => ({ ...prev, [expId]: "" }));
		},
		[newTech, localData, updateExperience],
	);

	const removeTechnology = useCallback(
		(expId: string, index: number) => {
			const exp = localData.find((e) => e.id === expId);
			if (!exp) return;
			updateExperience(expId, {
				technologies: exp.technologies?.filter((_, i) => i !== index),
			});
		},
		[localData, updateExperience],
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
						{localData.length} position{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addExperience} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Position
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Briefcase className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No experience added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Add your work history to showcase your professional journey.
						</p>
						<Button onClick={addExperience}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Position
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
					{localData.map((exp, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={exp.id}
							value={exp.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{exp.position || "Untitled Position"}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Briefcase className="h-3 w-3" />
												{exp.company || "Company"}
												{exp.startDate && (
													<span>
														• {exp.startDate} -{" "}
														{exp.current ? "Present" : exp.endDate || "Present"}
													</span>
												)}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => moveExperience(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveExperience(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Position",
												"Remove this position?",
											);
											if (confirmed) removeExperience(exp.id);
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
											<Label>Job Title *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateExperience(exp.id, { position: e.target.value })
												}
												placeholder="Software Engineer"
												value={exp.position}
											/>
										</div>
										<div>
											<Label>Company *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateExperience(exp.id, { company: e.target.value })
												}
												placeholder="Google"
												value={exp.company}
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Location</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateExperience(exp.id, { location: e.target.value })
												}
												placeholder="San Francisco, CA"
												value={exp.location || ""}
											/>
										</div>
										<div>
											<Label>Employment Type</Label>
											<Select
												onValueChange={(value) =>
													updateExperience(exp.id, {
														employmentType:
															value as Experience["employmentType"],
													})
												}
												value={exp.employmentType || ""}
											>
												<SelectTrigger className="mt-1">
													<SelectValue placeholder="Select type" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="full-time">Full-time</SelectItem>
													<SelectItem value="part-time">Part-time</SelectItem>
													<SelectItem value="contract">Contract</SelectItem>
													<SelectItem value="freelance">Freelance</SelectItem>
													<SelectItem value="internship">Internship</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Start Date</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateExperience(exp.id, {
														startDate: e.target.value,
													})
												}
												type="month"
												value={exp.startDate}
											/>
										</div>
										<div>
											<Label>End Date</Label>
											<Input
												className="mt-1"
												disabled={exp.current}
												onChange={(e) =>
													updateExperience(exp.id, { endDate: e.target.value })
												}
												type="month"
												value={exp.endDate || ""}
											/>
											<div className="mt-2 flex items-center gap-2">
												<Checkbox
													checked={exp.current}
													id={`current-${exp.id}`}
													onCheckedChange={(checked) =>
														updateExperience(exp.id, {
															current: !!checked,
															endDate: checked ? "" : exp.endDate,
														})
													}
												/>
												<Label
													className="text-sm"
													htmlFor={`current-${exp.id}`}
												>
													Currently working here
												</Label>
											</div>
										</div>
									</div>

									<div>
										<Label>Description</Label>
										<Textarea
											className="mt-1 min-h-20"
											onChange={(e) =>
												updateExperience(exp.id, {
													description: e.target.value,
												})
											}
											placeholder="Brief description of your role and responsibilities..."
											value={exp.description || ""}
										/>
									</div>

									<div>
										<Label>Key Achievements</Label>
										<div className="mt-2 space-y-2">
											{exp.highlights?.map((highlight, i) => (
												<div className="flex items-center gap-2" key={i}>
													<span className="flex-1 rounded bg-muted px-3 py-1.5 text-sm">
														{highlight}
													</span>
													<Button
														className="h-7 w-7"
														onClick={() => removeHighlight(exp.id, i)}
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
															[exp.id]: e.target.value,
														})
													}
													onKeyDown={(e) =>
														e.key === "Enter" && addHighlight(exp.id)
													}
													placeholder="Add an achievement..."
													value={newHighlight[exp.id] || ""}
												/>
												<Button
													onClick={() => addHighlight(exp.id)}
													size="sm"
													variant="outline"
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>

									<div>
										<Label>Technologies Used</Label>
										<div className="mt-2 flex flex-wrap gap-2">
											{exp.technologies?.map((tech, i) => (
												<Badge className="gap-1" key={i} variant="secondary">
													{tech}
													<button
														className="ml-1 hover:text-destructive"
														onClick={() => removeTechnology(exp.id, i)}
													>
														<X className="h-3 w-3" />
													</button>
												</Badge>
											))}
										</div>
										<div className="mt-2 flex gap-2">
											<Input
												onChange={(e) =>
													setNewTech({ ...newTech, [exp.id]: e.target.value })
												}
												onKeyDown={(e) =>
													e.key === "Enter" && addTechnology(exp.id)
												}
												placeholder="Add technology..."
												value={newTech[exp.id] || ""}
											/>
											<Button
												onClick={() => addTechnology(exp.id)}
												size="sm"
												variant="outline"
											>
												<Plus className="h-4 w-4" />
											</Button>
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
