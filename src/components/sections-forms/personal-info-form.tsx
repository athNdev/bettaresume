"use client";

import {
	Briefcase,
	GitBranch,
	Globe,
	Link,
	Mail,
	MapPin,
	Phone,
} from "lucide-react";
import { useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonalInfo } from "@/features/resume-editor/types";
import { useAutoSave, useBeforeUnload } from "@/hooks";

interface PersonalInfoFormProps {
	data: PersonalInfo;
	onChange: (data: PersonalInfo) => Promise<void>;
	onLocalUpdate?: (data: PersonalInfo) => void;
}

export function PersonalInfoForm({
	data,
	onChange,
	onLocalUpdate,
}: PersonalInfoFormProps) {
	// Auto-save hook handles local state, debouncing, and status tracking
	const { localData, setLocalData, isDirty } = useAutoSave({
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

	/*
	 * No per-form status bar here.
	 *
	 * The other ten forms' bars earn their 40px: they carry the "Add entry" action.
	 * Personal info has nothing to add, so its bar was an empty 40px strip with a
	 * border under the panel header — the one visibly blank band in the editor. The
	 * editor's own top bar already reports save state at every width, so this form
	 * relies on that rather than repeating it in an empty box.
	 *
	 * The three groups are separated by micro overlines and 24px of space, not by
	 * `Separator` rules: "use fewer borders" — a label plus air is enough, and it
	 * stops a 150px form from carrying two full-width horizontal lines.
	 */
	return (
		<div className="space-y-6">
			<div>
				<h3 className="br-micro mb-3">Basic Information</h3>
				<div className="fields-grid">
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
							onChange={(e) => updateField("professionalTitle", e.target.value)}
							placeholder="Senior Software Engineer"
							value={localData.professionalTitle || ""}
						/>
					</div>
				</div>
			</div>

			<div>
				<h3 className="br-micro mb-3">Contact Information</h3>
				<div className="fields-grid">
					<div>
						<Label htmlFor="email">Email</Label>
						<div className="relative mt-1">
							<Mail className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-8"
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
								className="pl-8"
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
								className="pl-8"
								id="location"
								onChange={(e) => updateField("location", e.target.value)}
								placeholder="San Francisco, CA"
								value={localData.location || ""}
							/>
						</div>
					</div>
				</div>
			</div>

			<div>
				<h3 className="br-micro mb-3">Online Presence</h3>
				<div className="fields-grid">
					<div>
						<Label htmlFor="linkedin">LinkedIn</Label>
						<div className="relative mt-1">
							<Link className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-8"
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
							<GitBranch className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-8"
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
								className="pl-8"
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
								className="pl-8"
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
	);
}
