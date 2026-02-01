"use client";

import {
	BookOpen,
	ChevronDown,
	ChevronUp,
	ExternalLink,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import { Textarea } from "@/components/ui/textarea";
import type { Publication } from "@/features/resume-editor/types";
import { createDefaultPublication } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface PublicationsFormProps {
	data: Publication[];
	onChange: (data: Publication[]) => Promise<void>;
	onLocalUpdate?: (data: Publication[]) => void;
	title?: string;
}

export function PublicationsForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: PublicationsFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);
	const [newAuthor, setNewAuthor] = useState<Record<string, string>>({});

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addPublication = useCallback(() => {
		const newPub = createDefaultPublication();
		setLocalData((prev) => [...prev, newPub]);
		setExpandedItems([newPub.id]);
	}, [setLocalData]);

	const removePublication = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((p) => p.id !== id));
		},
		[setLocalData],
	);

	const updatePublication = useCallback(
		(id: string, updates: Partial<Publication>) => {
			setLocalData((prev) =>
				prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
			);
		},
		[setLocalData],
	);

	const movePublication = useCallback(
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

	const addAuthor = useCallback(
		(pubId: string) => {
			const text = newAuthor[pubId]?.trim();
			if (!text) return;
			const pub = localData.find((p) => p.id === pubId);
			if (!pub) return;
			updatePublication(pubId, { authors: [...(pub.authors || []), text] });
			setNewAuthor((prev) => ({ ...prev, [pubId]: "" }));
		},
		[newAuthor, localData, updatePublication],
	);

	const removeAuthor = useCallback(
		(pubId: string, index: number) => {
			const pub = localData.find((p) => p.id === pubId);
			if (!pub) return;
			updatePublication(pubId, {
				authors: pub.authors?.filter((_, i) => i !== index),
			});
		},
		[localData, updatePublication],
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
						{localData.length} publication{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addPublication} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Publication
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<BookOpen className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No publications added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Add your research papers, articles, and other publications.
						</p>
						<Button onClick={addPublication}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Publication
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
					{localData.map((pub, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={pub.id}
							value={pub.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{pub.title || "Untitled Publication"}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<BookOpen className="h-3 w-3" />
												{pub.publisher || "Publisher"}
												{pub.date && <span>• {pub.date}</span>}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => movePublication(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => movePublication(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Publication",
												"Remove this publication?",
											);
											if (confirmed) removePublication(pub.id);
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
										<Label>Title *</Label>
										<Input
											className="mt-1"
											onChange={(e) =>
												updatePublication(pub.id, { title: e.target.value })
											}
											placeholder="Machine Learning in Healthcare"
											value={pub.title}
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Publisher / Journal *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updatePublication(pub.id, {
														publisher: e.target.value,
													})
												}
												placeholder="IEEE"
												value={pub.publisher}
											/>
										</div>
										<div>
											<Label>Publication Date</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updatePublication(pub.id, { date: e.target.value })
												}
												type="month"
												value={pub.date}
											/>
										</div>
									</div>

									<div>
										<Label>Authors</Label>
										<div className="mt-2 flex flex-wrap gap-2">
											{pub.authors?.map((author, i) => (
												<Badge className="gap-1" key={i} variant="secondary">
													{author}
													<button
														className="ml-1 hover:text-destructive"
														onClick={() => removeAuthor(pub.id, i)}
													>
														<X className="h-3 w-3" />
													</button>
												</Badge>
											))}
										</div>
										<div className="mt-2 flex gap-2">
											<Input
												onChange={(e) =>
													setNewAuthor({
														...newAuthor,
														[pub.id]: e.target.value,
													})
												}
												onKeyDown={(e) =>
													e.key === "Enter" && addAuthor(pub.id)
												}
												placeholder="Add author..."
												value={newAuthor[pub.id] || ""}
											/>
											<Button
												onClick={() => addAuthor(pub.id)}
												size="sm"
												variant="outline"
											>
												<Plus className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div>
										<Label>URL / DOI</Label>
										<div className="relative mt-1">
											<ExternalLink className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												className="pl-9"
												onChange={(e) =>
													updatePublication(pub.id, { url: e.target.value })
												}
												placeholder="https://doi.org/..."
												value={pub.url || ""}
											/>
										</div>
									</div>

									<div>
										<Label>Summary</Label>
										<Textarea
											className="mt-1 min-h-20"
											onChange={(e) =>
												updatePublication(pub.id, { summary: e.target.value })
											}
											placeholder="Brief summary of the publication..."
											value={pub.summary || ""}
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
