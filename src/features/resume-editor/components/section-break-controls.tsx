"use client";

import type { KeepTogether, SectionLayout } from "@bettaresume/types";
import { ChevronsUp, MoveVertical, Split } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { ResumeSection } from "@/features/resume-editor/types";

/**
 * Semantic page-break controls for one section.
 *
 * The vocabulary is Word's, because that is what people already know: "keep lines
 * together", "keep with next", "page break before". The implementation is Typst's, which
 * is better behaved — `pagebreak(weak: true)` does nothing when the section is already at
 * the top of a page, so asking for a break cannot leave a blank page behind.
 *
 * Nothing here changes content. These are layout flags stored on `section.layout`, so a
 * variant copy keeps them and no migration is needed.
 */

const KEEP_LABELS: Record<KeepTogether, string> = {
	auto: "Auto — keep small entries together",
	always: "Always — never split an entry",
	never: "Never — allow entries to split",
};

const BREAK_EMPTY = "__default__";

interface EntryRef {
	id: string;
	label: string;
}

/** The entries a section actually renders, for the per-entry override list. */
function entriesOf(section: ResumeSection): EntryRef[] {
	if (section.type === "personal-info" || section.type === "summary") return [];
	const data = section.content?.data;
	if (!Array.isArray(data)) return [];
	return data
		.map((item, index) => {
			if (!item || typeof item !== "object") return null;
			const rec = item as Record<string, unknown>;
			const id = typeof rec.id === "string" ? rec.id : "";
			const label =
				[
					rec.position,
					rec.company,
					rec.role,
					rec.organization,
					rec.name,
					rec.title,
					rec.degree,
					rec.institution,
				]
					.filter((v): v is string => typeof v === "string" && v.trim() !== "")
					.join(" · ") || `Entry ${index + 1}`;
			return { id, label };
		})
		.filter((e): e is EntryRef => e !== null);
}

export function SectionBreakControls({
	section,
	onChange,
}: {
	section: ResumeSection;
	onChange: (layout: SectionLayout) => void;
}) {
	const layout: SectionLayout = section.layout ?? {};
	const keep = layout.keepTogether ?? "auto";
	const entries = entriesOf(section);

	const update = (patch: Partial<SectionLayout>) =>
		onChange({ ...layout, ...patch });

	return (
		<details
			className="group mb-6 rounded-md border bg-muted/20"
			data-section-breaks=""
		>
			<summary className="flex cursor-pointer list-none items-center gap-2 rounded-t-md px-3 py-2 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
				<MoveVertical
					aria-hidden
					className="h-3.5 w-3.5 text-muted-foreground"
				/>
				<span className="font-medium">Page breaks</span>
				<span className="truncate text-muted-foreground">
					{keep === "auto"
						? "Auto"
						: keep === "always"
							? "Entries kept whole"
							: "Entries may split"}
					{layout.pageBreakBefore ? " · starts a page" : ""}
					{layout.keepSectionTogether ? " · section kept whole" : ""}
				</span>
			</summary>

			<div className="space-y-3 border-t px-3 py-3">
				{/*
				 * Per-section spacing override (§6). It moves this section's gap above the
				 * heading only; the document's rhythm still comes from the density preset.
				 * Absent = follow the document.
				 */}
				<div className="flex items-center justify-between gap-3">
					<div className="min-w-0">
						<Label
							className="text-xs"
							htmlFor={`section-spacing-${section.id}`}
						>
							Spacing above this section
						</Label>
						<p className="text-muted-foreground text-xs">
							Follows the document's density unless you override it here.
						</p>
					</div>
					<Select
						onValueChange={(value) => {
							const next = { ...layout };
							if (value === "inherit") delete next.spacing;
							else next.spacing = value as SectionLayout["spacing"];
							onChange(next);
						}}
						value={layout.spacing ?? "inherit"}
					>
						<SelectTrigger
							className="h-8 w-40 shrink-0 text-xs"
							id={`section-spacing-${section.id}`}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="inherit">Follow density</SelectItem>
							<SelectItem value="compact">Compact</SelectItem>
							<SelectItem value="normal">Normal</SelectItem>
							<SelectItem value="spacious">Relaxed</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<Label className="text-xs" htmlFor={`keep-entries-${section.id}`}>
							Keep entries together
						</Label>
						<p className="text-muted-foreground text-xs">
							Auto keeps an entry on one page only when it is small enough to
							move as a unit — a three-bullet role moves, an eight-bullet one is
							allowed to split.
						</p>
					</div>
					<Select
						onValueChange={(value) =>
							update({ keepTogether: value as KeepTogether })
						}
						value={keep}
					>
						<SelectTrigger
							className="h-8 w-44 shrink-0 text-xs"
							id={`keep-entries-${section.id}`}
						>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{(Object.keys(KEEP_LABELS) as KeepTogether[]).map((mode) => (
								<SelectItem key={mode} value={mode}>
									{KEEP_LABELS[mode]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2">
						<ChevronsUp
							aria-hidden
							className="h-3.5 w-3.5 text-muted-foreground"
						/>
						<div>
							<Label className="text-xs" htmlFor={`keep-section-${section.id}`}>
								Keep the whole section on one page
							</Label>
							<p className="text-muted-foreground text-xs">
								For a short section you do not want split.
							</p>
						</div>
					</div>
					<Switch
						checked={layout.keepSectionTogether === true}
						id={`keep-section-${section.id}`}
						onCheckedChange={(checked) =>
							update({ keepSectionTogether: checked })
						}
					/>
				</div>

				<div className="flex items-center justify-between gap-3">
					<div className="flex min-w-0 items-center gap-2">
						<Split aria-hidden className="h-3.5 w-3.5 text-muted-foreground" />
						<div>
							<Label className="text-xs" htmlFor={`break-before-${section.id}`}>
								Start this section on a new page
							</Label>
							<p className="text-muted-foreground text-xs">
								Does nothing when the section is already at the top of a page,
								so it cannot leave a blank page.
							</p>
						</div>
					</div>
					<Switch
						checked={layout.pageBreakBefore === true}
						id={`break-before-${section.id}`}
						onCheckedChange={(checked) => update({ pageBreakBefore: checked })}
					/>
				</div>

				{entries.length > 0 ? (
					<fieldset className="space-y-2 border-t pt-3">
						<legend className="mb-1 text-muted-foreground text-xs">
							Per entry
						</legend>
						{entries.slice(0, 12).map((entry) => (
							<div
								className="flex items-center justify-between gap-2"
								key={entry.id || entry.label}
							>
								<span className="min-w-0 truncate text-xs">{entry.label}</span>
								<Select
									onValueChange={(value) => {
										const next = { ...(layout.entries ?? {}) };
										if (value === BREAK_EMPTY) delete next[entry.id];
										else next[entry.id] = value as KeepTogether;
										update({ entries: next });
									}}
									value={layout.entries?.[entry.id] ?? BREAK_EMPTY}
								>
									{/*
									 * The row's entry name is the control's accessible name.
									 * It used to be adjacent text only, so every one of these
									 * selects announced as "Section default, combobox" and a
									 * screen-reader user could not tell which entry they were on.
									 */}
									<SelectTrigger
										aria-label={`Page breaks for ${entry.label}`}
										className="h-7 w-36 shrink-0 text-xs"
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={BREAK_EMPTY}>Section default</SelectItem>
										<SelectItem value="always">Keep whole</SelectItem>
										<SelectItem value="never">May split</SelectItem>
									</SelectContent>
								</Select>
							</div>
						))}
					</fieldset>
				) : null}
			</div>
		</details>
	);
}
