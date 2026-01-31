"use client";

import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	getTemplatesByCategory,
	type UniversityTemplate,
} from "@/features/resume-editor/utils/university-templates";
import { cn } from "@/lib/utils";

interface UniversityTemplateSelectorProps {
	currentTemplate?: string;
	onSelectTemplate: (template: UniversityTemplate) => void;
}

const CATEGORY_LABELS = {
	"ivy-league": "Ivy League",
	"top-private": "Top Private Universities",
	"top-public": "Top Public Universities",
	international: "International Universities",
};

export function UniversityTemplateSelector({
	currentTemplate,
	onSelectTemplate,
}: UniversityTemplateSelectorProps) {
	const [selectedId, setSelectedId] = useState(currentTemplate);
	const templatesByCategory = getTemplatesByCategory();

	useEffect(() => {
		setSelectedId(currentTemplate);
	}, [currentTemplate]);

	const handleSelect = (template: UniversityTemplate) => {
		setSelectedId(template.id);
		onSelectTemplate(template);
	};

	return (
		<div className="space-y-4">
			<div className="px-2">
				<p className="mb-2 text-muted-foreground text-xs">
					Choose a university-specific resume template
				</p>
			</div>

			<ScrollArea className="h-100">
				<div className="space-y-6 px-2">
					{/* Ivy League Section */}
					{templatesByCategory["ivy-league"].length > 0 && (
						<div>
							<h4 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								{CATEGORY_LABELS["ivy-league"]}
							</h4>
							<div className="space-y-2">
								{templatesByCategory["ivy-league"].map((template) => (
									<TemplateCard
										isSelected={selectedId === template.id}
										key={template.id}
										onSelect={() => handleSelect(template)}
										template={template}
									/>
								))}
							</div>
						</div>
					)}

					{/* Top Private Section */}
					{templatesByCategory["top-private"].length > 0 && (
						<div>
							<h4 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								{CATEGORY_LABELS["top-private"]}
							</h4>
							<div className="space-y-2">
								{templatesByCategory["top-private"].map((template) => (
									<TemplateCard
										isSelected={selectedId === template.id}
										key={template.id}
										onSelect={() => handleSelect(template)}
										template={template}
									/>
								))}
							</div>
						</div>
					)}

					{/* Top Public Section */}
					{templatesByCategory["top-public"].length > 0 && (
						<div>
							<h4 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								{CATEGORY_LABELS["top-public"]}
							</h4>
							<div className="space-y-2">
								{templatesByCategory["top-public"].map((template) => (
									<TemplateCard
										isSelected={selectedId === template.id}
										key={template.id}
										onSelect={() => handleSelect(template)}
										template={template}
									/>
								))}
							</div>
						</div>
					)}

					{/* International Section */}
					{templatesByCategory.international.length > 0 && (
						<div>
							<h4 className="mb-3 font-semibold text-muted-foreground text-xs uppercase tracking-wider">
								{CATEGORY_LABELS.international}
							</h4>
							<div className="space-y-2">
								{templatesByCategory.international.map((template) => (
									<TemplateCard
										isSelected={selectedId === template.id}
										key={template.id}
										onSelect={() => handleSelect(template)}
										template={template}
									/>
								))}
							</div>
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

interface TemplateCardProps {
	template: UniversityTemplate;
	isSelected: boolean;
	onSelect: () => void;
}

function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
	return (
		<button
			className={cn(
				"w-full rounded-lg border p-3 text-left transition-all",
				"hover:border-primary/50 hover:bg-accent/50",
				isSelected
					? "border-primary bg-accent shadow-sm"
					: "border-border bg-background",
			)}
			onClick={onSelect}
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<div className="mb-1 flex items-center gap-2">
						<h5 className="truncate font-semibold text-sm">{template.name}</h5>
						{isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
					</div>
					<p className="mb-2 text-muted-foreground text-xs">
						{template.university}
					</p>
					<p className="line-clamp-2 text-muted-foreground/80 text-xs">
						{template.description}
					</p>

					{/* Show key style indicators */}
					{template.settings.fontFamily && (
						<div className="mt-2 flex flex-wrap gap-1">
							<Badge className="px-1.5 py-0 text-[10px]" variant="secondary">
								{template.settings.fontFamily}
							</Badge>
							{template.settings.sectionSpacing && (
								<Badge className="px-1.5 py-0 text-[10px]" variant="outline">
									{template.settings.sectionSpacing}
								</Badge>
							)}
						</div>
					)}
				</div>
			</div>
		</button>
	);
}
