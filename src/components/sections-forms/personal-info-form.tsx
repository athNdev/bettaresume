"use client";

import {
	Briefcase,
	Github,
	Globe,
	Linkedin,
	Mail,
	MapPin,
	Phone,
	User,
} from "lucide-react";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SaveStatusIndicator } from "@/components/ui/save-status-indicator";
import { Separator } from "@/components/ui/separator";
import type { PersonalInfo } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";

interface PersonalInfoFormProps {
	data: PersonalInfo;
	onChange: (data: PersonalInfo) => Promise<void>;
	onLocalUpdate?: (data: PersonalInfo) => void;
	title?: string;
}

export function PersonalInfoForm({
	data,
	onChange,
	onLocalUpdate,
	title,
}: PersonalInfoFormProps) {
	// Auto-save hook handles local state, debouncing, and status tracking
	const { localData, setLocalData, status, error, retrySave, isDirty } =
		useAutoSave({
			data,
			onSave: onChange,
			onLocalUpdate,
		});

	// Warn user before leaving with unsaved changes
	useBeforeUnload(isDirty);

	const updateField = useCallback(
		<K extends keyof PersonalInfo>(field: K, value: PersonalInfo[K]) => {
			setLocalData((prev) => ({ ...prev, [field]: value }));
		},
		[setLocalData],
	);

	return (
		<div className="relative">
			<div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex min-h-10 items-center justify-between border-b bg-background/95 px-4 py-2 backdrop-blur">
				<div className="flex items-center gap-3">
					{title && <h3 className="font-semibold">{title}</h3>}
					<SaveStatusIndicator
						error={error}
						onRetry={retrySave}
						status={status}
					/>
				</div>
			</div>

			<div className="space-y-6">
				<div>
					<h3 className="mb-4 flex items-center gap-2 font-medium text-muted-foreground text-sm">
						<User className="h-4 w-4" /> Basic Information
					</h3>
					<div className="grid grid-cols-2 gap-4">
						<div className="col-span-2">
							<Label htmlFor="fullName">Full Name *</Label>
							<Input
								className="mt-1"
								id="fullName"
								onChange={(e) => updateField("fullName", e.target.value)}
								placeholder="John Doe"
								value={localData.fullName || ""}
							/>
						</div>
						<div className="col-span-2">
							<Label htmlFor="professionalTitle">Professional Title</Label>
							<Input
								className="mt-1"
								id="professionalTitle"
								onChange={(e) =>
									updateField("professionalTitle", e.target.value)
								}
								placeholder="Senior Software Engineer"
								value={localData.professionalTitle || ""}
							/>
						</div>
					</div>
				</div>

				<Separator />

				<div>
					<h3 className="mb-4 flex items-center gap-2 font-medium text-muted-foreground text-sm">
						<Mail className="h-4 w-4" /> Contact Information
					</h3>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="email">Email</Label>
							<div className="relative mt-1">
								<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="email"
									onChange={(e) => updateField("email", e.target.value)}
									placeholder="john@example.com"
									type="email"
									value={localData.email || ""}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="phone">Phone</Label>
							<div className="relative mt-1">
								<Phone className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="phone"
									onChange={(e) => updateField("phone", e.target.value)}
									placeholder="+1 (555) 123-4567"
									value={localData.phone || ""}
								/>
							</div>
						</div>
						<div className="col-span-2">
							<Label htmlFor="location">Location</Label>
							<div className="relative mt-1">
								<MapPin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="location"
									onChange={(e) => updateField("location", e.target.value)}
									placeholder="San Francisco, CA"
									value={localData.location || ""}
								/>
							</div>
						</div>
					</div>
				</div>

				<Separator />

				<div>
					<h3 className="mb-4 flex items-center gap-2 font-medium text-muted-foreground text-sm">
						<Globe className="h-4 w-4" /> Online Presence
					</h3>
					<div className="grid grid-cols-2 gap-4">
						<div>
							<Label htmlFor="linkedin">LinkedIn</Label>
							<div className="relative mt-1">
								<Linkedin className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="linkedin"
									onChange={(e) => updateField("linkedin", e.target.value)}
									placeholder="linkedin.com/in/johndoe"
									value={localData.linkedin || ""}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="github">GitHub</Label>
							<div className="relative mt-1">
								<Github className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="github"
									onChange={(e) => updateField("github", e.target.value)}
									placeholder="github.com/johndoe"
									value={localData.github || ""}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="website">Website</Label>
							<div className="relative mt-1">
								<Globe className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="website"
									onChange={(e) => updateField("website", e.target.value)}
									placeholder="johndoe.com"
									value={localData.website || ""}
								/>
							</div>
						</div>
						<div>
							<Label htmlFor="portfolio">Portfolio</Label>
							<div className="relative mt-1">
								<Briefcase className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
								<Input
									className="pl-9"
									id="portfolio"
									onChange={(e) => updateField("portfolio", e.target.value)}
									placeholder="portfolio.johndoe.com"
									value={localData.portfolio || ""}
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
