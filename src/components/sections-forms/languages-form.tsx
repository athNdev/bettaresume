"use client";

import { Globe2, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { Language } from "@/features/resume-editor/types";
import { createDefaultLanguage } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";

interface LanguagesFormProps {
	data: Language[];
	onChange: (data: Language[]) => Promise<void>;
	onLocalUpdate?: (data: Language[]) => void;
	title?: string;
}

const PROFICIENCY_LEVELS = [
	{ value: "native", label: "Native / Bilingual" },
	{ value: "fluent", label: "Fluent" },
	{ value: "advanced", label: "Advanced" },
	{ value: "intermediate", label: "Intermediate" },
	{ value: "basic", label: "Basic" },
];

const COMMON_LANGUAGES = [
	"English",
	"Spanish",
	"French",
	"German",
	"Mandarin",
	"Japanese",
	"Portuguese",
	"Arabic",
	"Hindi",
	"Korean",
];

export function LanguagesForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: LanguagesFormProps) {
	const confirm = useConfirm();

	// Auto-save hook
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const addLanguage = useCallback(
		(name?: string) => {
			const newLang = { ...createDefaultLanguage(), name: name || "" };
			setLocalData((prev) => [...prev, newLang]);
		},
		[setLocalData],
	);

	const removeLanguage = useCallback(
		(id: string) => {
			setLocalData((prev) => prev.filter((l) => l.id !== id));
		},
		[setLocalData],
	);

	const updateLanguage = useCallback(
		(id: string, updates: Partial<Language>) => {
			setLocalData((prev) =>
				prev.map((l) => (l.id === id ? { ...l, ...updates } : l)),
			);
		},
		[setLocalData],
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
						{localData.length} language{localData.length !== 1 ? "s" : ""}
					</p>
					<Button onClick={() => addLanguage()} size="sm">
						<Plus className="mr-2 h-4 w-4" /> Add Language
					</Button>
				</div>
			</div>

			{localData.length === 0 ? (
				<Card className="border-dashed">
					<CardContent className="flex flex-col items-center justify-center py-8">
						<Globe2 className="mb-4 h-12 w-12 text-muted-foreground/50" />
						<h3 className="mb-2 font-medium">No languages added</h3>
						<p className="mb-4 text-muted-foreground text-sm">
							List the languages you speak and your proficiency level.
						</p>
						<div className="mb-4 flex flex-wrap justify-center gap-2">
							{COMMON_LANGUAGES.slice(0, 4).map((lang) => (
								<Button
									key={lang}
									onClick={() => addLanguage(lang)}
									size="sm"
									variant="outline"
								>
									{lang}
								</Button>
							))}
						</div>
						<Button onClick={() => addLanguage()}>
							<Plus className="mr-2 h-4 w-4" /> Add Language
						</Button>
					</CardContent>
				</Card>
			) : (
				<div className="space-y-3">
					{localData.map((lang) => (
						<div
							className="flex items-center gap-3 rounded-lg border p-3"
							key={lang.id}
						>
							<div className="grid flex-1 grid-cols-3 gap-3">
								<div>
									<Label className="text-muted-foreground text-xs">
										Language
									</Label>
									<Input
										className="mt-1 h-9"
										onChange={(e) =>
											updateLanguage(lang.id, { name: e.target.value })
										}
										placeholder="Language name"
										value={lang.name}
									/>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">
										Proficiency
									</Label>
									<Select
										onValueChange={(v) =>
											updateLanguage(lang.id, {
												proficiency: v as Language["proficiency"],
											})
										}
										value={lang.proficiency}
									>
										<SelectTrigger className="mt-1 h-9">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{PROFICIENCY_LEVELS.map((level) => (
												<SelectItem key={level.value} value={level.value}>
													{level.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label className="text-muted-foreground text-xs">
										Certification (optional)
									</Label>
									<Input
										className="mt-1 h-9"
										onChange={(e) =>
											updateLanguage(lang.id, { certification: e.target.value })
										}
										placeholder="e.g., TOEFL 110"
										value={lang.certification || ""}
									/>
								</div>
							</div>
							<Button
								className="h-9 w-9 shrink-0 text-destructive"
								onClick={async () => {
									const confirmed = await confirm(
										"Remove Language",
										"Remove this language?",
									);
									if (confirmed) removeLanguage(lang.id);
								}}
								size="icon"
								variant="ghost"
							>
								<Trash2 className="h-4 w-4" />
							</Button>
						</div>
					))}

					<div className="pt-2">
						<Label className="text-muted-foreground text-xs">Quick Add</Label>
						<div className="mt-2 flex flex-wrap gap-2">
							{COMMON_LANGUAGES.filter(
								(lang) =>
									!localData.some(
										(d) => d.name.toLowerCase() === lang.toLowerCase(),
									),
							)
								.slice(0, 6)
								.map((lang) => (
									<Button
										key={lang}
										onClick={() => addLanguage(lang)}
										size="sm"
										variant="outline"
									>
										<Plus className="mr-1 h-3 w-3" /> {lang}
									</Button>
								))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
