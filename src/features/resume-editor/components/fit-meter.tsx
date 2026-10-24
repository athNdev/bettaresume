"use client";

import { Check, Loader2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { usePreviewPages } from "@/features/resume-editor/lib/preview-pages";
import type {
	PartialResumeSettings,
	Resume,
	ResumeSettings,
} from "@/features/resume-editor/types";
import { getTemplateSource } from "@/features/resume-editor/typst_templates";
import { useConfirm } from "@/hooks/use-confirm";
import {
	buildReliefLadder,
	type ReliefRow,
} from "@/lib/analysis/relief-ladder";
import {
	deriveFit,
	type FitReport,
	formatFitChip,
	formatMm,
	type PageTarget,
	resolvePageTarget,
} from "@/lib/layout/page-fit";
import { compileFitProbe } from "@/lib/typst/compiler";
import { resumeToTypstJson } from "@/lib/typst/serialize";
import { cn } from "@/lib/utils";

/**
 * The fit meter: the anchor of the page-fit suite.
 *
 * A chip in the editor toolbar reading `1.2 pages · 22 mm over target`, and a popover
 * that names *where* the spill starts and *prices* each lever that would absorb it.
 * Millimetres first, because a lever's gain is also in millimetres and "0.2 pages" does
 * not tell anybody whether a margin tweak fixes it.
 *
 * The loop closes on the layout rows, which apply a settings patch behind a diff-confirm
 * and can be undone with one click. Content rows never have an Apply button — we never
 * hide a section or cut a bullet on the user's behalf.
 */

interface FitMeterProps {
	resume: Resume;
	settings: ResumeSettings;
	onSettingsChange: (settings: PartialResumeSettings) => void;
	onSelectSection?: (sectionId: string) => void;
}

const TARGET_OPTIONS: Array<{
	value: string;
	label: string;
	target: PageTarget;
}> = [
	{ value: "1", label: "1 page", target: 1 },
	{ value: "2", label: "2 pages", target: 2 },
	{ value: "none", label: "No target", target: null },
];

/**
 * Price the layout levers with what-if compiles.
 *
 * The estimates are measured, not extrapolated: each candidate patch is serialised,
 * compiled through the probe and diffed against the current overflow. Reflow is
 * non-linear in `fontScale` (lines re-wrap), which is exactly why we measure. Runs only
 * while the popover is open, and never while typing.
 */
function useReliefEstimates(
	resume: Resume,
	fit: FitReport | null,
	rows: ReliefRow[],
	enabled: boolean,
): Record<string, number> {
	const [estimates, setEstimates] = useState<Record<string, number>>({});
	const baseSettings = resume.metadata?.settings;

	useEffect(() => {
		if (!enabled || !fit || fit.overMm < 0.5 || !baseSettings) return;
		const candidates = rows.filter((r) => r.kind === "layout" && r.patch);
		if (candidates.length === 0) return;

		let cancelled = false;
		setEstimates({});

		void (async () => {
			for (const row of candidates) {
				const merged: ResumeSettings = {
					...baseSettings,
					...row.patch,
					margins: { ...baseSettings.margins, ...(row.patch?.margins ?? {}) },
					typography: {
						...baseSettings.typography,
						...(row.patch?.typography ?? {}),
					},
					colors: { ...baseSettings.colors, ...(row.patch?.colors ?? {}) },
				};
				const modified = {
					...resume,
					metadata: { ...(resume.metadata ?? {}), settings: merged },
				} as Resume;
				try {
					const probe = await compileFitProbe(
						getTemplateSource(modified.template ?? "minimal"),
						resumeToTypstJson(modified),
						merged.fontFamily,
					);
					if (cancelled) return;
					if (!probe) continue;
					const after = deriveFit(probe, merged, fit.target);
					const gain = Math.round((fit.overMm - after.overMm) * 10) / 10;
					if (!cancelled) {
						setEstimates((prev) => ({ ...prev, [row.lever]: gain }));
					}
				} catch {
					// A failed what-if leaves the row unpriced; it never breaks the meter.
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [enabled, fit, resume, baseSettings, rows]);

	return estimates;
}

export function FitMeter({
	resume,
	settings,
	onSettingsChange,
	onSelectSection,
}: FitMeterProps) {
	const fit = usePreviewPages((s) => s.fit);
	const measuring = usePreviewPages((s) => s.measuring);
	const [open, setOpen] = useState(false);
	const confirm = useConfirm();
	const [undo, setUndo] = useState<PartialResumeSettings | null>(null);

	const target = fit?.target ?? resolvePageTarget(settings, resume.template);
	const over = (fit?.overMm ?? 0) >= 0.5;

	const rows = useMemo(
		() => buildReliefLadder({ resume, settings, fit }),
		[resume, settings, fit],
	);
	const estimates = useReliefEstimates(resume, fit, rows, open);

	const chip = formatFitChip(fit);

	const applyRow = async (row: ReliefRow) => {
		if (row.kind !== "layout" || !row.patch) return;
		const confirmed = await confirm(
			row.title,
			`${row.diff ?? ""}\n\nThis is a layout change, nothing is hidden or shortened. Undo is on this panel.`,
		);
		if (!confirmed) return;
		const patch = row.patch;
		const previous: PartialResumeSettings = {};
		if (patch.sectionSpacing !== undefined)
			previous.sectionSpacing = settings.sectionSpacing;
		if (patch.lineHeight !== undefined)
			previous.lineHeight = settings.lineHeight;
		if (patch.fontScale !== undefined) previous.fontScale = settings.fontScale;
		if (patch.dateFormat !== undefined)
			previous.dateFormat = settings.dateFormat;
		if (patch.margins !== undefined) previous.margins = { ...settings.margins };
		setUndo(previous);
		onSettingsChange(patch);
	};

	const setTarget = (next: PageTarget) => {
		onSettingsChange({ pageTarget: next });
	};

	return (
		<Popover onOpenChange={setOpen} open={open}>
			<PopoverTrigger asChild>
				<button
					aria-label={`Page fit: ${chip}`}
					className={cn(
						"flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors hover:bg-accent",
						over
							? "border-warning bg-warning-soft text-warning"
							: "text-muted-foreground",
					)}
					type="button"
				>
					{measuring ? (
						<Loader2 aria-hidden className="h-3 w-3 animate-spin" />
					) : null}
					<span className="font-medium tabular-nums">{chip}</span>
				</button>
			</PopoverTrigger>

			<PopoverContent align="end" className="w-[26rem] p-0">
				<div className="space-y-3 border-b px-4 py-3">
					<div className="flex items-baseline justify-between gap-2">
						<p className="font-semibold text-sm">
							{fit
								? over && fit.target !== null
									? `Fit — ${formatMm(fit.overMm)} over your ${fit.target}-page target`
									: fit.target === null
										? `Fit — ${fit.pages} page${fit.pages === 1 ? "" : "s"}, no target set`
										: `Fit — on target at ${fit.pages} page${fit.pages === 1 ? "" : "s"}`
								: "Fit — waiting for the preview"}
						</p>
					</div>

					<div className="flex items-center gap-1">
						<span className="mr-1 text-muted-foreground text-xs">Target</span>
						{TARGET_OPTIONS.map((option) => (
							<Button
								className="h-7 px-2 text-xs"
								key={option.value}
								onClick={() => setTarget(option.target)}
								size="sm"
								static
								variant={target === option.target ? "default" : "outline"}
							>
								{option.label}
							</Button>
						))}
					</div>

					{fit?.overflow ? (
						<div className="text-xs">
							<p className="text-muted-foreground">The overflow starts at:</p>
							<button
								className="text-left font-medium underline-offset-2 hover:underline"
								onClick={() => {
									if (fit.overflow?.section) {
										onSelectSection?.(fit.overflow.section);
										setOpen(false);
									}
								}}
								type="button"
							>
								{fit.overflow.label || "the next section"}
							</button>
						</div>
					) : null}
				</div>

				<div className="max-h-80 space-y-4 overflow-auto px-4 py-3">
					{rows.some((r) => r.kind === "layout") ? (
						<section>
							<h4 className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								Absorb it with layout
							</h4>
							<p className="mb-2 text-muted-foreground text-xs">
								Applied changes are one restore away, and Undo is below.
							</p>
							<ul className="space-y-2">
								{rows
									.filter((r) => r.kind === "layout")
									.map((row) => (
										<li
											className="flex items-start justify-between gap-2 rounded-md border p-2"
											key={row.id}
										>
											<div className="min-w-0">
												<p className="font-medium text-xs">{row.title}</p>
												<p className="text-muted-foreground text-xs">
													{row.detail}
												</p>
											</div>
											<div className="flex shrink-0 flex-col items-end gap-1">
												<span className="text-xs tabular-nums">
													{((): string => {
														const gain = estimates[row.lever];
														if (gain === undefined) return "measuring…";
														return gain > 0.5
															? `≈ ${formatMm(gain)}`
															: "no gain";
													})()}
												</span>
												<Button
													className="h-7 px-2 text-xs"
													onClick={() => void applyRow(row)}
													size="sm"
													static
													variant="outline"
												>
													Apply
												</Button>
											</div>
										</li>
									))}
							</ul>
							{undo ? (
								<Button
									className="mt-2 h-7 px-2 text-xs"
									onClick={() => {
										onSettingsChange(undo);
										setUndo(null);
									}}
									size="sm"
									static
									variant="ghost"
								>
									<Undo2 aria-hidden className="mr-1 h-3.5 w-3.5" />
									Undo the last layout change
								</Button>
							) : null}
						</section>
					) : null}

					{rows.some((r) => r.kind === "content") ? (
						<section>
							<h4 className="mb-1 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								Or make room in the content
							</h4>
							<p className="mb-2 text-muted-foreground text-xs">
								This is yours to decide. We never hide, cut or rewrite content
								for you.
							</p>
							<ul className="space-y-2">
								{rows
									.filter((r) => r.kind === "content")
									.map((row) => (
										<li className="rounded-md border p-2" key={row.id}>
											<button
												className="text-left"
												onClick={() => {
													if (row.anchor) {
														onSelectSection?.(row.anchor);
														setOpen(false);
													}
												}}
												type="button"
											>
												<p className="font-medium text-xs">{row.title}</p>
												<p className="text-muted-foreground text-xs">
													{row.detail}
												</p>
											</button>
										</li>
									))}
							</ul>
						</section>
					) : null}

					{fit?.atFloor && over ? (
						<p className="rounded-md border border-warning bg-warning-soft p-2 text-warning text-xs">
							Layout is at its floor — body 10 pt, margins 36 pt. The remaining{" "}
							{formatMm(fit.overMm)} have to come from the content: hide
							something, or move it to your base resume.
						</p>
					) : null}

					{!fit ? (
						<p className="text-muted-foreground text-xs">
							The preview has not compiled yet. This resolves on its own.
						</p>
					) : null}
				</div>

				<div className="flex items-center justify-between gap-2 border-t px-4 py-2 text-muted-foreground text-xs">
					<span>
						{fit
							? `${fit.pages} page${fit.pages === 1 ? "" : "s"} · last page ${Math.round(
									fit.lastPageFill * 100,
								)}% full`
							: "Pages —"}
					</span>
					<span className="flex items-center gap-1">
						<Check aria-hidden className="h-3 w-3" />
						Measured, not scored
					</span>
				</div>
			</PopoverContent>
		</Popover>
	);
}
