"use client";

import { normalizeTemplateId } from "@bettaresume/types";
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
 * What actually distinguishes an archetype at 68px wide.
 *
 * The six documents differ by header alignment, heading rule, name size and density —
 * never by colour, so there is nothing here for a palette to do that `defaultColors` does
 * not already provide. Keeping the description in data rather than in JSX means a new
 * archetype is a compile error (the map is `Record<TemplateType, Specimen>`) instead of a
 * selector that silently draws the standard specimen for it.
 */
interface Specimen {
	align: "left" | "center";
	rule: "accent" | "hairline" | "none";
	nameSize: number;
	/** Vertical gap between the header and the section label, in px. */
	gap: number;
	/** Body rules drawn under the label; density read at a glance. */
	lines: number;
	italicTitle: boolean;
	upperHeading: boolean;
}

const SPECIMENS: Record<TemplateType, Specimen> = {
	standard: {
		align: "left",
		rule: "accent",
		nameSize: 11,
		gap: 4,
		lines: 3,
		italicTitle: false,
		upperHeading: true,
	},
	compact: {
		align: "left",
		rule: "none",
		nameSize: 10.5,
		gap: 2,
		lines: 3,
		italicTitle: false,
		upperHeading: true,
	},
	technical: {
		align: "left",
		rule: "accent",
		nameSize: 10.5,
		gap: 3,
		lines: 3,
		italicTitle: false,
		upperHeading: true,
	},
	graduate: {
		align: "left",
		rule: "none",
		nameSize: 11,
		gap: 3,
		lines: 2,
		italicTitle: false,
		upperHeading: false,
	},
	academic: {
		align: "center",
		rule: "hairline",
		nameSize: 11,
		gap: 5,
		lines: 2,
		italicTitle: true,
		upperHeading: false,
	},
	executive: {
		align: "left",
		rule: "hairline",
		nameSize: 12.5,
		gap: 6,
		lines: 2,
		italicTitle: false,
		upperHeading: false,
	},
};

/**
 * A miniature of the template's actual identity, not a name in a list.
 *
 * Every archetype shares one content model and one font (the font is the user's choice),
 * so what distinguishes them is structure and density: where the header sits, whether a
 * rule follows it, how big the name is and how much air the body gets. Those are the only
 * things this specimen shows, and its colours come from the same `TEMPLATE_CONFIGS` the
 * export reads.
 *
 * It is `aria-hidden` on purpose: it repeats the name and description beside it, so a
 * screen reader announcing "Ada Lovelace, Mathematician" would be noise.
 */
function TemplateSpecimen({ template }: { template: TemplateConfig }) {
	const colors = template.defaultColors;
	const spec = SPECIMENS[template.id];
	const ruleColor = spec.rule === "accent" ? colors.accent : colors.text;

	/*
	 * The specimen is a miniature of a document, drawn in its own coordinate system: its
	 * paper colour and its 6.5–12.5px labels are part of the picture (Surface B data, like
	 * the colours), not app-chrome type — an `aria-hidden` decoration at 62px wide cannot
	 * wear the UI scale. Everything that IS chrome (border, radius, padding) comes from the
	 * token scales.
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
					spec.align === "center" && "items-center text-center",
				)}
			>
				<span
					className="font-semibold leading-[1.15] tracking-tight"
					style={{ color: colors.heading, fontSize: spec.nameSize }}
				>
					Ada Lovelace
				</span>
				<span
					className={cn("leading-[1.3]", spec.italicTitle && "italic")}
					style={{ color: colors.secondary, fontSize: 6.5 }}
				>
					Mathematician
				</span>
			</div>

			{spec.rule !== "none" && (
				<div
					className="mt-1 h-px w-full"
					style={{
						background: ruleColor,
						opacity: spec.rule === "accent" ? 1 : 0.5,
					}}
				/>
			)}

			<div style={{ marginTop: spec.gap }}>
				<span
					className={cn(
						"font-semibold tracking-[0.08em]",
						spec.upperHeading && "uppercase",
					)}
					style={{ color: colors.heading, fontSize: 6.5 }}
				>
					Experience
				</span>
			</div>
			<div className="mt-0.5 flex flex-col gap-0.5">
				{[100, 92, 74].slice(0, spec.lines).map((width) => (
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
	// A resume created before the archetypes stores `minimal`/`postgrad`/`undergrad`; the
	// selector must still show its successor as the selected row.
	const current = normalizeTemplateId(currentTemplate);

	return (
		<div className="flex flex-col gap-1 px-2">
			{templates.map((template) => {
				const isCurrent = current === template.id;
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
