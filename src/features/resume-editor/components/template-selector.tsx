"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
	ResumeColors,
	TemplateType,
} from "@/features/resume-editor/types";
import { TEMPLATE_CONFIGS } from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
	currentTemplate: TemplateType;
	onSelect: (template: TemplateType) => void;
	onColorChange?: (colors: ResumeColors) => void;
}

export function TemplateSelector({
	currentTemplate,
	onSelect,
	onColorChange,
}: TemplateSelectorProps) {
	const templates = Object.values(TEMPLATE_CONFIGS);

	return (
		<div className="space-y-3 px-2">
			<div className="grid grid-cols-2 gap-2">
				{templates.map((template) => (
					<button
						className={cn(
							"rounded-md border p-2 text-left transition-all hover:bg-accent/50",
							currentTemplate === template.id && "border-primary bg-accent",
						)}
						key={template.id}
						onClick={() => {
							onSelect(template.id);
							if (onColorChange) {
								onColorChange(template.defaultColors);
							}
						}}
					>
						{/* Color bar preview */}
						<div
							className="mb-2 h-1 rounded-full"
							style={{ backgroundColor: template.defaultColors.accent }}
						/>
						<span className="text-sm">{template.name}</span>
					</button>
				))}
			</div>
			<Button className="w-full gap-2" size="sm" variant="outline">
				<Sparkles className="h-4 w-4" />
				View All Templates
			</Button>
		</div>
	);
}
