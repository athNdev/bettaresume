"use client";

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
		<div className="flex flex-col gap-1 px-2">
			{templates.map((template) => (
				<button
					className={cn(
						"w-full cursor-pointer rounded-md border px-3 py-2 text-left text-sm transition-all hover:bg-accent/50",
						currentTemplate === template.id && "border-primary bg-accent",
					)}
					key={template.id}
					onClick={() => {
						onSelect(template.id);
						if (onColorChange) {
							onColorChange(template.defaultColors);
						}
					}}
					type="button"
				>
					{template.name}
				</button>
			))}
		</div>
	);
}
