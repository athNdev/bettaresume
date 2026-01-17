"use client";

import {
	ChevronDown,
	ChevronUp,
	GripVertical,
	Mail,
	Phone,
	Plus,
	Trash2,
	Users,
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
import type { Reference } from "@/features/resume-editor/types";
import { createDefaultReference } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface ReferencesFormProps {
	data: Reference[];
	onChange: (data: Reference[]) => Promise<void>;
	onLocalUpdate?: (data: Reference[]) => void;
	title?: string;
}

export function ReferencesForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: ReferencesFormProps) {
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

	const addReference = useCallback(() => {
		const newRef = createDefaultReference();
		setLocalData((prev) => [...prev, newRef]);
		setExpandedItems([newRef.id]);
	}, [setLocalData]);

	const removeReference = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((r) => r.id !== id));
		},
		[setLocalData],
	);

	const updateReference = useCallback(
		(id: string, updates: Partial<Reference>) => {
			setLocalData((prev) =>
				prev.map((r) => (r.id === id ? { ...r, ...updates } : r)),
			);
		},
		[setLocalData],
	);

	const moveReference = useCallback(
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
						{localData.length} reference{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addReference} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Reference
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Users className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No references added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Add professional references who can vouch for your qualifications.
						</p>
						<Button onClick={addReference}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Reference
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
					{localData.map((ref, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={ref.id}
							value={ref.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{ref.name || "Untitled Reference"}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Users className="h-3 w-3" />
												{ref.position || "Position"}{" "}
												{ref.company && `at ${ref.company}`}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => moveReference(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveReference(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Reference",
												"Remove this reference?",
											);
											if (confirmed) removeReference(ref.id);
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
											<Label>Full Name *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateReference(ref.id, { name: e.target.value })
												}
												placeholder="John Smith"
												value={ref.name}
											/>
										</div>
										<div>
											<Label>Position / Title *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateReference(ref.id, { position: e.target.value })
												}
												placeholder="Senior Manager"
												value={ref.position}
											/>
										</div>
									</div>

									<div>
										<Label>Company / Organization</Label>
										<Input
											className="mt-1"
											onChange={(e) =>
												updateReference(ref.id, { company: e.target.value })
											}
											placeholder="Acme Corp"
											value={ref.company || ""}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Email</Label>
											<div className="relative mt-1">
												<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													className="pl-9"
													onChange={(e) =>
														updateReference(ref.id, { email: e.target.value })
													}
													placeholder="john@company.com"
													value={ref.email || ""}
												/>
											</div>
										</div>
										<div>
											<Label>Phone</Label>
											<div className="relative mt-1">
												<Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
												<Input
													className="pl-9"
													onChange={(e) =>
														updateReference(ref.id, { phone: e.target.value })
													}
													placeholder="+1 (555) 123-4567"
													value={ref.phone || ""}
												/>
											</div>
										</div>
									</div>

									<div>
										<Label>Relationship</Label>
										<Input
											className="mt-1"
											onChange={(e) =>
												updateReference(ref.id, {
													relationship: e.target.value,
												})
											}
											placeholder="Former supervisor for 3 years"
											value={ref.relationship || ""}
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
