"use client";

import {
	ChevronDown,
	ChevronUp,
	GripVertical,
	Plus,
	Trash2,
	X,
	Zap,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type {
	Skill,
	SkillCategory,
	SkillLevel,
} from "@/features/resume-editor/types";
import {
	createDefaultSkill,
	createDefaultSkillCategory,
} from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface SkillsFormProps {
	data: SkillCategory[];
	onChange: (data: SkillCategory[]) => Promise<void>;
	onLocalUpdate?: (data: SkillCategory[]) => void;
	title?: string;
}

const SKILL_LEVELS: { value: SkillLevel; label: string; percent: number }[] = [
	{ value: "beginner", label: "Beginner", percent: 25 },
	{ value: "intermediate", label: "Intermediate", percent: 50 },
	{ value: "advanced", label: "Advanced", percent: 75 },
	{ value: "expert", label: "Expert", percent: 100 },
];

const SUGGESTED_CATEGORIES = [
	"Programming Languages",
	"Frameworks & Libraries",
	"Databases",
	"Cloud & DevOps",
	"Tools & Software",
	"Soft Skills",
	"Languages",
	"Design",
	"Management",
];

export function SkillsForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: SkillsFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);
	const [newSkill, setNewSkill] = useState<Record<string, string>>({});

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addCategory = useCallback(
		(name?: string) => {
			const newCat = {
				...createDefaultSkillCategory(),
				name: name || "",
				order: localData.length,
			};
			setLocalData((prev) => [...prev, newCat]);
			setExpandedItems([newCat.id]);
		},
		[localData.length, setLocalData],
	);

	const removeCategory = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((cat) => cat.id !== id));
		},
		[setLocalData],
	);

	const updateCategory = useCallback(
		(id: string, updates: Partial<SkillCategory>) => {
			setLocalData((prev) =>
				prev.map((cat) => (cat.id === id ? { ...cat, ...updates } : cat)),
			);
		},
		[setLocalData],
	);

	const moveCategory = useCallback(
		(index: number, direction: "up" | "down") => {
			const newIndex = direction === "up" ? index - 1 : index + 1;
			if (newIndex < 0 || newIndex >= localData.length) return;
			setLocalData((prev) => {
				const newData = [...prev];
				const temp = newData[index]!;
				newData[index] = newData[newIndex]!;
				newData[newIndex] = temp;
				return newData.map((cat, i) => ({ ...cat, order: i }));
			});
		},
		[localData.length, setLocalData],
	);

	const addSkill = useCallback(
		(catId: string) => {
			const name = newSkill[catId]?.trim();
			if (!name) return;
			const cat = localData.find((c) => c.id === catId);
			if (!cat) return;
			const skill: Skill = { ...createDefaultSkill(), name };
			updateCategory(catId, { skills: [...cat.skills, skill] });
			setNewSkill((prev) => ({ ...prev, [catId]: "" }));
		},
		[newSkill, localData, updateCategory],
	);

	const removeSkill = useCallback(
		(catId: string, skillId: string) => {
			const cat = localData.find((c) => c.id === catId);
			if (!cat) return;
			updateCategory(catId, {
				skills: cat.skills.filter((s) => s.id !== skillId),
			});
		},
		[localData, updateCategory],
	);

	const updateSkill = useCallback(
		(catId: string, skillId: string, updates: Partial<Skill>) => {
			const cat = localData.find((c) => c.id === catId);
			if (!cat) return;
			updateCategory(catId, {
				skills: cat.skills.map((s) =>
					s.id === skillId ? { ...s, ...updates } : s,
				),
			});
		},
		[localData, updateCategory],
	);

	const totalSkills = localData.reduce(
		(acc, cat) => acc + cat.skills.length,
		0,
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
						{localData.length} categor{localData.length !== 1 ? "ies" : "y"},{" "}
						{totalSkills} skill{totalSkills !== 1 ? "s" : ""}
					</p>
					<Button onClick={() => addCategory()} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Category
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Zap className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No skills added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Organize your skills into categories to showcase your expertise.
						</p>
						<div className="mb-4 flex flex-wrap justify-center gap-2">
							{SUGGESTED_CATEGORIES.slice(0, 4).map((cat) => (
								<Button
									key={cat}
									onClick={() => addCategory(cat)}
									size="sm"
									variant="outline"
								>
									{cat}
								</Button>
							))}
						</div>
						<Button onClick={() => addCategory()}>
							<Plus className="mr-2 h-4 w-4" /> Add Custom Category
						</Button>
					</CardContent>
				</Card>
			) : (
				<>
					<Accordion
						className="space-y-3"
						onValueChange={setExpandedItems}
						type="multiple"
						value={expandedItems}
					>
						{localData.map((cat, index) => (
							<AccordionItem
								className="overflow-hidden rounded-lg border"
								key={cat.id}
								value={cat.id}
							>
								<div className="flex items-center">
									<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
										<div className="flex w-full items-center gap-3">
											<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
											<div className="flex-1 text-left">
												<div className="font-medium">
													{cat.name || "Untitled Category"}
												</div>
												<div className="text-muted-foreground text-sm">
													{cat.skills.length} skill
													{cat.skills.length !== 1 ? "s" : ""}
												</div>
											</div>
										</div>
									</AccordionTrigger>
									<div className="flex items-center gap-1 px-2">
										<Button
											className="h-7 w-7"
											disabled={index === 0}
											onClick={() => moveCategory(index, "up")}
											size="icon"
											variant="ghost"
										>
											<ChevronUp className="h-4 w-4" />
										</Button>
										<Button
											className="h-7 w-7"
											disabled={index === localData.length - 1}
											onClick={() => moveCategory(index, "down")}
											size="icon"
											variant="ghost"
										>
											<ChevronDown className="h-4 w-4" />
										</Button>
										<Button
											className="h-7 w-7 text-destructive"
											onClick={async () => {
												const confirmed = await confirm(
													"Remove Category",
													"Remove this category?",
												);
												if (confirmed) removeCategory(cat.id);
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
										<div>
											<Label>Category Name</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateCategory(cat.id, { name: e.target.value })
												}
												placeholder="e.g., Programming Languages"
												value={cat.name}
											/>
										</div>

										<div>
											<Label>Skills</Label>
											<div className="mt-2 space-y-2">
												{cat.skills.map((skill) => (
													<div
														className="flex items-center gap-3 rounded border p-2"
														key={skill.id}
													>
														<Input
															className="h-8 flex-1"
															onChange={(e) =>
																updateSkill(cat.id, skill.id, {
																	name: e.target.value,
																})
															}
															placeholder="Skill name"
															value={skill.name}
														/>
														<Select
															onValueChange={(v) =>
																updateSkill(cat.id, skill.id, {
																	level: v as SkillLevel,
																})
															}
															value={skill.level}
														>
															<SelectTrigger className="h-8 w-32">
																<SelectValue />
															</SelectTrigger>
															<SelectContent>
																{SKILL_LEVELS.map((level) => (
																	<SelectItem
																		key={level.value}
																		value={level.value}
																	>
																		{level.label}
																	</SelectItem>
																))}
															</SelectContent>
														</Select>
														<Progress
															className="h-2 w-20"
															value={
																SKILL_LEVELS.find(
																	(l) => l.value === skill.level,
																)?.percent || 50
															}
														/>
														<Button
															className="h-7 w-7"
															onClick={() => removeSkill(cat.id, skill.id)}
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
															setNewSkill({
																...newSkill,
																[cat.id]: e.target.value,
															})
														}
														onKeyDown={(e) =>
															e.key === "Enter" && addSkill(cat.id)
														}
														placeholder="Add skill..."
														value={newSkill[cat.id] || ""}
													/>
													<Button
														onClick={() => addSkill(cat.id)}
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

					<div className="pt-2">
						<Label className="text-muted-foreground text-xs">
							Quick Add Categories
						</Label>
						<div className="mt-2 flex flex-wrap gap-2">
							{SUGGESTED_CATEGORIES.filter(
								(cat) =>
									!localData.some(
										(d) => d.name.toLowerCase() === cat.toLowerCase(),
									),
							).map((cat) => (
								<Badge
									className="cursor-pointer hover:bg-accent"
									key={cat}
									onClick={() => addCategory(cat)}
									variant="outline"
								>
									<Plus className="mr-1 h-3 w-3" /> {cat}
								</Badge>
							))}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
