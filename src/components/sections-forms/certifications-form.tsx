"use client";

import {
	Award,
	ChevronDown,
	ChevronUp,
	ExternalLink,
	GripVertical,
	Plus,
	Trash2,
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
import type { Certification } from "@/features/resume-editor/types";
import { createDefaultCertification } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface CertificationsFormProps {
	data: Certification[];
	onChange: (data: Certification[]) => Promise<void>;
	onLocalUpdate?: (data: Certification[]) => void;
	title?: string;
}

export function CertificationsForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: CertificationsFormProps) {
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

	const addCertification = useCallback(() => {
		const newCert = createDefaultCertification();
		setLocalData((prev) => [...prev, newCert]);
		setExpandedItems([newCert.id]);
	}, [setLocalData]);

	const removeCertification = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((cert) => cert.id !== id));
		},
		[setLocalData],
	);

	const updateCertification = useCallback(
		(id: string, updates: Partial<Certification>) => {
			setLocalData((prev) =>
				prev.map((cert) => (cert.id === id ? { ...cert, ...updates } : cert)),
			);
		},
		[setLocalData],
	);

	const moveCertification = useCallback(
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
						{localData.length} certification{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={addCertification} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Certification
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Award className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No certifications added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							Add your professional certifications and credentials.
						</p>
						<Button onClick={addCertification}>
							<Plus className="mr-2 h-4 w-4" /> Add Your First Certification
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
					{localData.map((cert, index) => (
						<AccordionItem
							className="overflow-hidden rounded-lg border"
							key={cert.id}
							value={cert.id}
						>
							<div className="flex items-center">
								<AccordionTrigger className="flex-1 px-4 py-3 hover:bg-muted/50 hover:no-underline">
									<div className="flex w-full items-center gap-3">
										<GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
										<div className="flex-1 text-left">
											<div className="font-medium">
												{cert.name || "Untitled Certification"}
											</div>
											<div className="flex items-center gap-2 text-muted-foreground text-sm">
												<Award className="h-3 w-3" />
												{cert.issuer || "Issuer"}
												{cert.date && <span>• {cert.date}</span>}
											</div>
										</div>
									</div>
								</AccordionTrigger>
								<div className="flex items-center gap-1 px-2">
									<Button
										className="h-7 w-7"
										disabled={index === 0}
										onClick={() => moveCertification(index, "up")}
										size="icon"
										variant="ghost"
									>
										<ChevronUp className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7"
										disabled={index === localData.length - 1}
										onClick={() => moveCertification(index, "down")}
										size="icon"
										variant="ghost"
									>
										<ChevronDown className="h-4 w-4" />
									</Button>
									<Button
										className="h-7 w-7 text-destructive"
										onClick={async () => {
											const confirmed = await confirm(
												"Remove Certification",
												"Remove this certification?",
											);
											if (confirmed) removeCertification(cert.id);
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
											<Label>Certification Name *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateCertification(cert.id, { name: e.target.value })
												}
												placeholder="AWS Solutions Architect"
												value={cert.name}
											/>
										</div>
										<div>
											<Label>Issuing Organization *</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateCertification(cert.id, {
														issuer: e.target.value,
													})
												}
												placeholder="Amazon Web Services"
												value={cert.issuer}
											/>
										</div>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div>
											<Label>Issue Date</Label>
											<Input
												className="mt-1"
												onChange={(e) =>
													updateCertification(cert.id, { date: e.target.value })
												}
												type="month"
												value={cert.date}
											/>
										</div>
										<div>
											<Label>Expiration Date</Label>
											<Input
												className="mt-1"
												disabled={cert.noExpiration}
												onChange={(e) =>
													updateCertification(cert.id, {
														expirationDate: e.target.value,
													})
												}
												type="month"
												value={cert.expirationDate || ""}
											/>
											<div className="mt-2 flex items-center gap-2">
												<Checkbox
													checked={cert.noExpiration}
													id={`no-exp-${cert.id}`}
													onCheckedChange={(checked) =>
														updateCertification(cert.id, {
															noExpiration: !!checked,
															expirationDate: checked
																? ""
																: cert.expirationDate,
														})
													}
												/>
												<Label
													className="text-sm"
													htmlFor={`no-exp-${cert.id}`}
												>
													Does not expire
												</Label>
											</div>
										</div>
									</div>

									<div>
										<Label>Credential ID</Label>
										<Input
											className="mt-1"
											onChange={(e) =>
												updateCertification(cert.id, {
													credentialId: e.target.value,
												})
											}
											placeholder="ABC-123-XYZ"
											value={cert.credentialId || ""}
										/>
									</div>

									<div>
										<Label>Credential URL</Label>
										<div className="relative mt-1">
											<ExternalLink className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
											<Input
												className="pl-9"
												onChange={(e) =>
													updateCertification(cert.id, { url: e.target.value })
												}
												placeholder="https://credential.net/..."
												value={cert.url || ""}
											/>
										</div>
									</div>

									<div>
										<Label>Description (optional)</Label>
										<Textarea
											className="mt-1 min-h-15"
											onChange={(e) =>
												updateCertification(cert.id, {
													description: e.target.value,
												})
											}
											placeholder="Additional details about this certification..."
											value={cert.description || ""}
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
