"use client";

import {
	ChevronDown,
	ChevronUp,
	GripVertical,
	Heart,
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
import { Textarea } from "@/components/ui/textarea";
import type { Volunteer } from "@/features/resume-editor/types";
import { createDefaultVolunteer } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";
import { moveItem } from "@/lib/collections";

interface VolunteerFormProps {
	data: Volunteer[];
	onChange: (data: Volunteer[]) => Promise<void>;
	onLocalUpdate?: (data: Volunteer[]) => void;
}

export function VolunteerForm({
	data,
	onChange,
	onLocalUpdate,
}: VolunteerFormProps) {
	const confirm = useConfirm();
	const [expandedItems, setExpandedItems] = useState<string[]>(
		data.length > 0 && data[0]?.id ? [data[0].id] : [],
	);
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

	const addVolunteer = useCallback(() => {
		const newVol = createDefaultVolunteer();
		setLocalData((prev) => [...prev, newVol]);
		setExpandedItems([newVol.id]);
	}, [setLocalData]);

	const removeVolunteer = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((v) => v.id !== id));
		},
		[setLocalData],
	);

	const updateVolunteer = useCallback(
		(id: string, updates: Partial<Volunteer>) => {
			setLocalData((prev) =>
				prev.map((v) => (v.id === id ? { ...v, ...updates } : v)),
			);
		},
		[setLocalData],
	);

	const moveVolunteer = useCallback(
		(index: number, direction: "up" | "down") => {
			const newIndex = direction === "up" ? index - 1 : index + 1;
			if (newIndex < 0 || newIndex >= localData.length) return;
			setLocalData((prev) => moveItem(prev, index, newIndex));
		},
		[localData.length, setLocalData],
	);

	const addHighlight = useCallback(
		(volId: string) => {
			const text = newHighlight[volId]?.trim();
			if (!text) return;
			const vol = localData.find((v) => v.id === volId);
			if (!vol) return;
			updateVolunteer(volId, { highlights: [...(vol.highlights || []), text] });
			setNewHighlight((prev) => ({ ...prev, [volId]: "" }));
		},
		[newHighlight, localData, updateVolunteer],
	);

	const removeHighlight = useCallback(
		(volId: string, index: number) => {
			const vol = localData.find((v) => v.id === volId);
			if (!vol) return;
			updateVolunteer(volId, {
				highlights: vol.highlights?.filter((_, i) => i !== index),
			});
		},
		[localData, updateVolunteer],
	);

	return (
		<div className="space-y-4">
			<div className="sticky top-0 z-(--br-z-sticky) -mx-4 -mt-6 mb-6 flex h-10 items-center justify-between gap-3 border-b bg-surface px-4">
				<div className="flex items-center gap-3">
					<SaveStatusIndicator
						error={error}
						onRetry={retrySave}
						status={status}
					/>
				</div>
				<div className="flex items-center gap-4">
					<p className="text-muted-foreground text-sm">
						{localData.length} volunteer experience
						{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addVolunteer} size="sm" variant="outline">
						<Plus className="mr-2 h-4 w-4" /> Add Volunteer
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-0 bg-sunken shadow-none">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<span className="br-tile mb-3">
							<Heart className="h-5 w-5" />
						</span>
						<h3 className="mb-1 font-semibold text-base tracking-title">
							No volunteer experience added
						</h3>
						<p className="mb-4 max-w-xs text-center text-fg-muted text-sm">
							Share your community involvement and volunteer work.
						</p>
						<Button onClick={addVolunteer}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Volunteer
							Experience
						</Button>
					</CardContent>
				</Card>
			) : (
				<Accordion
					className="space-y-4"
					onValueChange={setExpandedItems}
					type="multiple"
					value={expandedItems}
				>
					{localData.map((vol, index) => (
						<AccordionItem
							className="overflow-hidden rounded-md border bg-surface"
							key={vol.id}
							value={vol.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-3 py-2 hover:bg-accent/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{vol.role || "Untitled Role"}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Heart className="h-3 w-3" />
												{vol.organization || "Organization"}
												{vol.startDate && (
													<span>
														• {vol.startDate} -{" "}
														{vol.current ? "Present" : vol.endDate || "Present"}
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
										onClick={() => moveVolunteer(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveVolunteer(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Volunteer Experience",
												"Remove this volunteer experience?",
											);
											if (confirmed) removeVolunteer(vol.id);
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
									<div className="fields-grid">
										<div>
											<Label>Role *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateVolunteer(vol.id, { role: e.target.value })
												}
												placeholder="Volunteer Coordinator"
												value={vol.role}
											/>
										</div>
										<div>
											<Label>Organization *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateVolunteer(vol.id, {
														organization: e.target.value,
													})
												}
												placeholder="Red Cross"
												value={vol.organization}
											/>
										</div>
									</div>

									<div className="fields-grid">
										<div>
											<Label>Location</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateVolunteer(vol.id, { location: e.target.value })
												}
												placeholder="City, State"
												value={vol.location || ""}
											/>
										</div>
										<div>
											<Label>Cause</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateVolunteer(vol.id, { cause: e.target.value })
												}
												placeholder="Disaster Relief"
												value={vol.cause || ""}
											/>
										</div>
									</div>

									<div className="fields-grid">
										<div>
											<Label>Start Date</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateVolunteer(vol.id, { startDate: e.target.value })
												}
												type="month"
												value={vol.startDate || ""}
											/>
										</div>
										<div>
											<Label>End Date</Label>
											<Input
												className="mt-1"
												disabled={vol.current}
												onChange={(e) =>
													updateVolunteer(vol.id, { endDate: e.target.value })
												}
												type="month"
												value={vol.endDate || ""}
											/>
											<div className="mt-2 flex items-center gap-2">
												<Checkbox
													checked={vol.current}
													id={`current-${vol.id}`}
													onCheckedChange={(checked) =>
														updateVolunteer(vol.id, { current: !!checked })
													}
												/>
												<Label
													className="text-sm"
													htmlFor={`current-${vol.id}`}
												>
													Currently volunteering
												</Label>
											</div>
										</div>
									</div>

									<div>
										<Label>Description</Label>
										<Textarea
											className="mt-1 min-h-20"
											onChange={(e) =>
												updateVolunteer(vol.id, { description: e.target.value })
											}
											placeholder="Describe your volunteer work..."
											value={vol.description || ""}
										/>
									</div>

									<div>
										<Label>Key Achievements</Label>
										<div className="mt-2 space-y-2">
											{vol.highlights?.map((highlight, i) => (
												// biome-ignore lint/suspicious/noArrayIndexKey: a plain string in a display-only list, and remove(i) addresses it by index
												<div className="flex items-center gap-2" key={i}>
													<span className="flex-1 rounded bg-muted px-3 py-1 text-sm">
														{highlight}
													</span>
													<Button
														className="h-7 w-7"
														onClick={() => removeHighlight(vol.id, i)}
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
															[vol.id]: e.target.value,
														})
													}
													onKeyDown={(e) =>
														e.key === "Enter" && addHighlight(vol.id)
													}
													placeholder="Add achievement..."
													value={newHighlight[vol.id] || ""}
												/>
												<Button
													onClick={() => addHighlight(vol.id)}
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
