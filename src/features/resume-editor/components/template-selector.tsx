"use client";

import type {
	ResumeColors,
	TemplateConfig,
	TemplateType,
} from "@/features/resume-editor/types";
import { TEMPLATE_CONFIGS } from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";

interface TemplateSelectorProps {
	currentTemplate: TemplateType;
	onSelect: (template: TemplateType) => void;
	onColorChange?: (colors: ResumeColors) => void;
}

/**
 * A miniature of the template's actual identity, not a name in a list.
 *
 * Every template shares one content model and one font (the font is the user's
 * choice), so what actually distinguishes them is the header treatment and the
 * leading. Those are the only things this specimen shows, and each one is drawn
 * from the same `TEMPLATE_CONFIGS` colours the export reads — a selector that
 * painted its own idea of a template would drift from the PDF the moment either
 * changed.
 *
 * It is `aria-hidden` on purpose: it repeats the name and description beside it,
 * so a screen reader announcing "Ada Lovelace, Mathematician" would be noise.
 */
function TemplateSpecimen({ template }: { template: TemplateConfig }) {
	const colors = template.defaultColors;
	const isPostgrad = template.id === "postgrad";
	const isUndergrad = template.id === "undergrad";

	/*
	 * The specimen is a miniature of a document, drawn in its own coordinate
	 * system: its paper colour and its 11px/6.5px labels are part of the picture
	 * (Surface B data, like the colours), not app-chrome type — an `aria-hidden`
	 * decoration at 62px wide cannot wear the UI scale. Everything that IS chrome
	 * (border, radius, padding) comes from the token scales.
	 */
	return (
		<div
			aria-hidden="true"
			className="pointer-events-none select-none overflow-hidden rounded-xs border px-2 py-1"
			style={{ background: colors.background }}
		>
			<div
				className={cn(
					"flex flex-col",
					isPostgrad && "items-center text-center",
				)}
				style={
					isUndergrad
						? {
								background: `${colors.accent}14`,
								padding: "4px 6px",
								borderRadius: 3,
							}
						: undefined
				}
			>
				<span
					className="font-semibold leading-[1.15] tracking-tight"
					style={{ color: colors.heading, fontSize: 11 }}
				>
					Ada Lovelace
				</span>
				<span
					className={cn("leading-[1.3]", isPostgrad && "italic")}
					style={{ color: colors.secondary, fontSize: 6.5 }}
				>
					Mathematician
				</span>
			</div>

			{/* Minimal rules the header; the other two separate it by space. */}
			{template.id === "minimal" && (
				<div
					className="mt-1 mb-1 h-px w-full"
					style={{ background: colors.accent }}
				/>
			)}

			<div className={cn("mt-1", isPostgrad && "text-center")}>
				<span
					className="font-semibold uppercase tracking-[0.08em]"
					style={{ color: colors.heading, fontSize: 6.5 }}
				>
					Experience
				</span>
			</div>
			<div
				className={cn(
					"mt-0.5 flex flex-col gap-0.5",
					isPostgrad && "items-center",
				)}
			>
				{[100, 92, 74].map((width) => (
					<span
						className="block h-[2px] rounded-full"
						key={width}
						style={{
							background: colors.text,
							opacity: 0.22,
							width: `${width}%`,
						}}
					/>
				))}
			</div>
		</div>
	);
}

export function TemplateSelector({
	currentTemplate,
	onSelect,
	onColorChange,
}: TemplateSelectorProps) {
	const templates = Object.values(TEMPLATE_CONFIGS);

	return (
		<div className="flex flex-col gap-1 px-2">
			{templates.map((template) => {
				const isCurrent = currentTemplate === template.id;
				return (
					<button
						aria-pressed={isCurrent}
						className={cn(
							"flex w-full cursor-pointer gap-3 rounded-md border px-2 py-2 text-left transition-[background-color,border-color] ease-enter hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
							isCurrent && "border-primary bg-accent",
						)}
						key={template.id}
						onClick={() => {
							onSelect(template.id);
							onColorChange?.(template.defaultColors);
						}}
						type="button"
					>
						<div className="w-[68px] shrink-0">
							<TemplateSpecimen template={template} />
						</div>
						<div className="min-w-0 flex-1 py-0.5">
							<span className="block font-medium text-sm leading-tight">
								{template.name}
							</span>
							<span className="mt-0.5 block text-muted-foreground text-xs leading-snug">
								{template.description}
							</span>
						</div>
					</button>
				);
			})}
		</div>
	);
}
