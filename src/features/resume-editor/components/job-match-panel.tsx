"use client";

import { CheckCircle2, CircleAlert, Loader2, Target } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { Resume } from "@/features/resume-editor/types";
import { analyzeJobMatch } from "@/lib/analysis/ats-match";
import { expandSkillVariants } from "@/lib/analysis/skills";

/**
 * Paste a job description, see what the resume already evidences.
 *
 * ## Required and preferred are never merged
 *
 * The most defensible thing in the reference implementation is that required
 * qualifications outrank preferred ones. Averaging them into a single number hides
 * exactly the thing a job seeker most needs to see, so the two lists stay separate all
 * the way to the UI and each renders as its own count.
 *
 * ## No overall score
 *
 * Deliberately. See `atsScoreSchema`, where `overall` was retired for the same reason.
 *
 * ## Analysis runs on the draft
 *
 * Called with whatever resume the caller passes, so findings track unsaved edits rather
 * than lagging a save behind.
 */

export interface JobTargetDraft {
	title?: string;
	company?: string;
	description?: string;
}

interface JobMatchPanelProps {
	resume: Resume;
	jobTarget: JobTargetDraft | undefined;
	onJobTargetChange: (next: JobTargetDraft) => void;
}

function CoverageList({
	title,
	items,
}: {
	title: string;
	items: {
		keyword: string;
		canonical?: string;
		covered: boolean;
		surface?: string;
	}[];
}) {
	if (items.length === 0) return null;
	const covered = items.filter((i) => i.covered).length;

	return (
		<section className="space-y-2">
			<div className="flex items-center justify-between">
				<h3 className="font-medium text-sm">{title}</h3>
				<Badge variant={covered === items.length ? "outline" : "secondary"}>
					{covered} of {items.length}
				</Badge>
			</div>
			<ul className="space-y-1.5">
				{items.map((item) => {
					// Expand the RESOLVED canonical, not the raw keyword.
					// `expandSkillVariants` looks up by canonical name, so passing
					// "AWS experience" or "5+ years TypeScript" returns nothing and the
					// both-forms hint would silently never appear.
					const both = item.canonical
						? expandSkillVariants(item.canonical)
						: [];
					return (
						<li className="flex gap-2 text-sm" key={`${title}-${item.keyword}`}>
							{item.covered ? (
								<CheckCircle2
									aria-hidden="true"
									className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-500"
								/>
							) : (
								<CircleAlert
									aria-hidden="true"
									className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-500"
								/>
							)}
							<span className="min-w-0">
								<span className={item.covered ? "line-through opacity-70" : ""}>
									{item.keyword}
								</span>
								{item.covered && item.surface ? (
									<span className="text-muted-foreground">
										{" "}
										— matched &ldquo;{item.surface}&rdquo;
									</span>
								) : null}
								{!item.covered && both && both.length > 1 ? (
									<span className="block text-muted-foreground text-xs">
										If you have it, write both &ldquo;{both[0]}&rdquo; and
										&nbsp;&ldquo;{both[1]}&rdquo;.
									</span>
								) : null}
							</span>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

export function JobMatchPanel({
	resume,
	jobTarget,
	onJobTargetChange,
}: JobMatchPanelProps) {
	const [draft, setDraft] = useState(jobTarget?.description ?? "");
	const [saving, setSaving] = useState(false);
	const [dirty, setDirty] = useState(false);

	const report = useMemo(() => {
		const description = dirty ? draft : (jobTarget?.description ?? "");
		if (!description.trim()) return null;
		return analyzeJobMatch({
			resume,
			jobTarget: { ...jobTarget, description },
		});
	}, [resume, jobTarget, draft, dirty]);

	async function save() {
		setSaving(true);
		try {
			await onJobTargetChange({ ...jobTarget, description: draft });
			setDirty(false);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-4">
			<div className="space-y-2">
				<Label htmlFor="job-target-description">Job description</Label>
				<Textarea
					id="job-target-description"
					onChange={(e) => {
						setDraft(e.target.value);
						setDirty(true);
					}}
					placeholder="Paste the job description. Lines marked Required or Preferred are weighted differently, and both forms of an acronym are accepted."
					rows={8}
					value={draft}
				/>
				<div className="flex items-center gap-2">
					<Button disabled={!dirty || saving} onClick={save} size="sm">
						{saving ? (
							<Loader2
								aria-hidden="true"
								className="mr-2 h-4 w-4 animate-spin"
							/>
						) : null}
						Save job target
					</Button>
					{dirty ? (
						<p className="text-muted-foreground text-xs">
							Analysing as you type; save to keep it on this resume.
						</p>
					) : null}
				</div>
			</div>

			<ScrollArea className="min-h-0 flex-1 pr-3">
				{!report ? (
					<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center">
						<Target
							aria-hidden="true"
							className="h-6 w-6 text-muted-foreground"
						/>
						<p className="font-medium text-sm">
							Paste a job description to see what this resume already evidences.
						</p>
					</div>
				) : (
					<div className="space-y-4">
						<CoverageList
							items={report.keywords.filter(
								(k) => k.requirement === "required",
							)}
							title="Required"
						/>
						<CoverageList
							items={report.keywords.filter(
								(k) => k.requirement === "preferred",
							)}
							title="Preferred"
						/>

						<section className="space-y-1 border-t pt-3">
							<h3 className="font-medium text-sm">Evidence</h3>
							<p className="text-muted-foreground text-sm">
								{report.impact.quantified} of {report.impact.total} bullets
								carry a number.
							</p>
							<p className="text-muted-foreground text-sm">
								{report.brevity.totalWords} words ·{" "}
								{report.brevity.bulletsPerEntry.length} entries ·{" "}
								{report.style.violations} parser-fit issue
								{report.style.violations === 1 ? "" : "s"}
							</p>
						</section>

						{report.suggestions.length > 0 ? (
							<section className="space-y-1.5 border-t pt-3">
								<h3 className="font-medium text-sm">Next steps</h3>
								<ul className="list-disc space-y-1 pl-5 text-muted-foreground text-sm">
									{report.suggestions.map((s) => (
										<li key={s}>{s}</li>
									))}
								</ul>
							</section>
						) : null}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
