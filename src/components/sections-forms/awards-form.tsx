"use client";

import {
	ChevronDown,
	ChevronUp,
	GripVertical,
	Plus,
	Trash2,
	Trophy,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import { Textarea } from "@/components/ui/textarea";
import type { Award } from "@/features/resume-editor/types";
import { createDefaultAward } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface AwardsFormProps {
	data: Award[];
	onChange: (data: Award[]) => Promise<void>;
	onLocalUpdate?: (data: Award[]) => void;
	title?: string;
}

export function AwardsForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: AwardsFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addAward = useCallback(() => {
		const newAward = createDefaultAward();
		setLocalData((prev) => [...prev, newAward]);
		setExpandedItems([newAward.id]);
	}, [setLocalData]);

	const removeAward = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((a) => a.id !== id));
		},
		[setLocalData],
	);

	const updateAward = useCallback(
		(id: string, updates: Partial<Award>) => {
			setLocalData((prev) =>
				prev.map((a) => (a.id === id ? { ...a, ...updates } : a)),
			);
		},
		[setLocalData],
	);

	const moveAward = useCallback(
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
						{localData.length} award{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addAward} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Award
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Trophy className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No awards added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Showcase your recognitions and achievements.
						</p>
						<Button onClick={addAward}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Award
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
					{localData.map((award, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={award.id}
							value={award.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{award.title || "Untitled Award"}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Trophy className="h-3 w-3" />
												{award.issuer || "Issuer"}
												{award.date && <span>• {award.date}</span>}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => moveAward(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveAward(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Award",
												"Remove this award?",
											);
											if (confirmed) removeAward(award.id);
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
											<Label>Award Title *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateAward(award.id, { title: e.target.value })
												}
												placeholder="Employee of the Year"
												value={award.title}
											/>
										</div>
										<div>
											<Label>Issuing Organization *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateAward(award.id, { issuer: e.target.value })
												}
												placeholder="Company Name"
												value={award.issuer}
											/>
										</div>
									</div>

									<div>
										<Label>Date Received</Label>
										<Input
											className="mt-1 w-48"
											onChange={(e) =>
												updateAward(award.id, { date: e.target.value })
											}
											type="month"
											value={award.date}
										/>
									</div>

									<div>
										<Label>Description</Label>
										<Textarea
											className="mt-1 min-h-20"
											onChange={(e) =>
												updateAward(award.id, { description: e.target.value })
											}
											placeholder="Describe what this award was for and why it was significant..."
											value={award.description || ""}
										/>
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
