"use client";

import {
	ChevronDown,
	ChevronUp,
	GraduationCap,
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import type { Education } from "@/features/resume-editor/types";
import { createDefaultEducation } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface EducationFormProps {
	data: Education[];
	onChange: (data: Education[]) => Promise<void>;
	onLocalUpdate?: (data: Education[]) => void;
	title?: string;
}

export function EducationForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: EducationFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);
	const [newAchievement, setNewAchievement] = useState<Record<string, string>>(
		{},
	);
	const [newCoursework, setNewCoursework] = useState<Record<string, string>>(
		{},
	);
	const [newHonor, setNewHonor] = useState<Record<string, string>>({});

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addEducation = useCallback(() => {
		const newEdu = createDefaultEducation();
		setLocalData((prev) => [...prev, newEdu]);
		setExpandedItems([newEdu.id]);
	}, [setLocalData]);

	const removeEducation = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((edu) => edu.id !== id));
		},
		[setLocalData],
	);

	const updateEducation = useCallback(
		(id: string, updates: Partial<Education>) => {
			setLocalData((prev) =>
				prev.map((edu) => (edu.id === id ? { ...edu, ...updates } : edu)),
			);
		},
		[setLocalData],
	);

	const moveEducation = useCallback(
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

	const addItem = useCallback(
		(
			eduId: string,
			field: "achievements" | "coursework" | "honors",
			value: string,
			setter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
		) => {
			const text = value?.trim();
			if (!text) return;
			const edu = localData.find((e) => e.id === eduId);
			if (!edu) return;
			updateEducation(eduId, { [field]: [...(edu[field] || []), text] });
			setter((prev) => ({ ...prev, [eduId]: "" }));
		},
		[localData, updateEducation],
	);

	const removeItem = useCallback(
		(
			eduId: string,
			field: "achievements" | "coursework" | "honors",
			index: number,
		) => {
			const edu = localData.find((e) => e.id === eduId);
			if (!edu) return;
			updateEducation(eduId, {
				[field]: edu[field]?.filter((_, i) => i !== index),
			});
		},
		[localData, updateEducation],
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
						{localData.length} education entr
						{localData.length !== 1 ? "ies" : "y"}
					</p>
					<Button onClick={addEducation} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Education
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<GraduationCap className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No education added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Add your academic background and qualifications.
						</p>
						<Button onClick={addEducation}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Education
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
					{localData.map((edu, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={edu.id}
							value={edu.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{edu.degree || "Degree"}{" "}
												{edu.field && `in ${edu.field}`}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<GraduationCap className="h-3 w-3" />
												{edu.institution || "Institution"}
												{edu.graduationDate && (
													<span>• {edu.graduationDate}</span>
												)}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => moveEducation(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveEducation(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Education",
												"Remove this education?",
											);
											if (confirmed) removeEducation(edu.id);
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
											<Label>Degree *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateEducation(edu.id, { degree: e.target.value })
												}
												placeholder="Bachelor of Science"
												value={edu.degree}
											/>
										</div>
										<div>
											<Label>Field of Study *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateEducation(edu.id, { field: e.target.value })
												}
												placeholder="Computer Science"
												value={edu.field}
											/>
										</div>
									</div>

									<div>
										<Label>Institution *</Label>
										<Input
											className="mt-1"
											onChange={(e) =>
												updateEducation(edu.id, { institution: e.target.value })
											}
											placeholder="Stanford University"
											value={edu.institution}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Location</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateEducation(edu.id, { location: e.target.value })
												}
												placeholder="Stanford, CA"
												value={edu.location || ""}
											/>
										</div>
										<div>
											<Label>Graduation Date</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateEducation(edu.id, {
														graduationDate: e.target.value,
													})
												}
												type="month"
												value={edu.graduationDate}
											/>
											<div className="mt-2 flex items-center gap-2">
												<Checkbox
													checked={edu.current}
													id={`current-${edu.id}`}
													onCheckedChange={(checked) =>
														updateEducation(edu.id, { current: !!checked })
													}
												/>
												<Label
													className="text-sm"
													htmlFor={`current-${edu.id}`}
												>
													Currently enrolled
												</Label>
											</div>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>GPA (optional)</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateEducation(edu.id, { gpa: e.target.value })
												}
												placeholder="3.8/4.0"
												value={edu.gpa || ""}
											/>
										</div>
										<div>
											<Label>Start Date (optional)</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateEducation(edu.id, { startDate: e.target.value })
												}
												type="month"
												value={edu.startDate || ""}
											/>
										</div>
									</div>

									<div>
										<Label>Achievements</Label>
										<div className="mt-2 space-y-2">
											{edu.achievements?.map((item, i) => (
												<div className="flex items-center gap-2" key={i}>
													<span className="flex-1 rounded bg-muted px-3 py-1.5 text-sm">
														{item}
													</span>
													<Button
														className="h-7 w-7"
														onClick={() =>
															removeItem(edu.id, "achievements", i)
														}
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
														setNewAchievement({
															...newAchievement,
															[edu.id]: e.target.value,
														})
													}
													onKeyDown={(e) =>
														e.key === "Enter" &&
														addItem(
															edu.id,
															"achievements",
															newAchievement[edu.id] || "",
															setNewAchievement,
														)
													}
													placeholder="Add achievement..."
													value={newAchievement[edu.id] || ""}
												/>
												<Button
													onClick={() =>
														addItem(
															edu.id,
															"achievements",
															newAchievement[edu.id] || "",
															setNewAchievement,
														)
													}
													size="sm"
													variant="outline"
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>

									<div>
										<Label>Relevant Coursework</Label>
										<div className="mt-2 space-y-2">
											{edu.coursework?.map((item, i) => (
												<div className="flex items-center gap-2" key={i}>
													<span className="flex-1 rounded bg-muted px-3 py-1.5 text-sm">
														{item}
													</span>
													<Button
														className="h-7 w-7"
														onClick={() => removeItem(edu.id, "coursework", i)}
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
														setNewCoursework({
															...newCoursework,
															[edu.id]: e.target.value,
														})
													}
													onKeyDown={(e) =>
														e.key === "Enter" &&
														addItem(
															edu.id,
															"coursework",
															newCoursework[edu.id] || "",
															setNewCoursework,
														)
													}
													placeholder="Add course..."
													value={newCoursework[edu.id] || ""}
												/>
												<Button
													onClick={() =>
														addItem(
															edu.id,
															"coursework",
															newCoursework[edu.id] || "",
															setNewCoursework,
														)
													}
													size="sm"
													variant="outline"
												>
													<Plus className="h-4 w-4" />
												</Button>
											</div>
										</div>
									</div>

									<div>
										<Label>Honors & Awards</Label>
										<div className="mt-2 space-y-2">
											{edu.honors?.map((item, i) => (
												<div className="flex items-center gap-2" key={i}>
													<span className="flex-1 rounded bg-muted px-3 py-1.5 text-sm">
														{item}
													</span>
													<Button
														className="h-7 w-7"
														onClick={() => removeItem(edu.id, "honors", i)}
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
														setNewHonor({
															...newHonor,
															[edu.id]: e.target.value,
														})
													}
													onKeyDown={(e) =>
														e.key === "Enter" &&
														addItem(
															edu.id,
															"honors",
															newHonor[edu.id] || "",
															setNewHonor,
														)
													}
													placeholder="Add honor..."
													value={newHonor[edu.id] || ""}
												/>
												<Button
													onClick={() =>
														addItem(
															edu.id,
															"honors",
															newHonor[edu.id] || "",
															setNewHonor,
														)
													}
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
