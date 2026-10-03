"use client";

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	buildParseAuditInput,
	collectBulletFindings,
} from "@/features/resume-editor/lib/review-input";
import type { Resume } from "@/features/resume-editor/types";
import {
	auditParseFidelity,
	type ParseDiagnostic,
} from "@/lib/analysis/parse-fidelity";

/**
 * Surfaces both analysis engines next to the preview they describe.
 *
 * Lives in a sheet rather than a fourth editor pane for two reasons: the three-pane
 * split is already tight, and the findings only make sense while looking at the
 * rendered document.
 *
 * Two hard constraints carried through from the engines:
 *  - **No overall score.** A single headline number is the incumbents' credibility
 *    failure. Findings are discrete and each carries its own fix.
 *  - **Nothing is auto-applied.** The panel reports; the user decides. Rewriting a
 *    resume behind someone's back puts words in their mouth on a document they sign.
 */

interface ReviewPanelProps {
	resume: Resume;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

const SEVERITY_STYLE = {
	error: {
		Icon: XCircle,
		iconClass: "text-destructive",
		badge: "destructive",
		label: "Fix",
	},
	warning: {
		Icon: AlertTriangle,
		iconClass: "text-amber-600 dark:text-amber-500",
		badge: "secondary",
		label: "Check",
	},
	info: {
		Icon: Info,
		iconClass: "text-muted-foreground",
		badge: "outline",
		label: "Note",
	},
} as const;

function DiagnosticRow({ diagnostic }: { diagnostic: ParseDiagnostic }) {
	const { Icon, iconClass, badge, label } = SEVERITY_STYLE[diagnostic.severity];
	return (
		<li className="flex gap-3 rounded-md border p-3">
			<Icon
				aria-hidden="true"
				className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`}
			/>
			<div className="min-w-0 flex-1 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<p className="font-medium text-sm">{diagnostic.title}</p>
					<Badge variant={badge}>{label}</Badge>
				</div>
				<p className="text-muted-foreground text-sm">{diagnostic.detail}</p>
				{diagnostic.fix ? (
					<p className="text-muted-foreground text-sm">
						<span className="font-medium">Fix: </span>
						{diagnostic.fix}
					</p>
				) : null}
			</div>
		</li>
	);
}

function ClearState({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center">
			<CheckCircle2
				aria-hidden="true"
				className="h-6 w-6 text-emerald-600 dark:text-emerald-500"
			/>
			<p className="font-medium text-sm">{children}</p>
		</div>
	);
}

export function ReviewPanel({ resume, open, onOpenChange }: ReviewPanelProps) {
	const diagnostics = useMemo(
		() => auditParseFidelity(buildParseAuditInput(resume)),
		[resume],
	);

	const bulletReport = useMemo(() => collectBulletFindings(resume), [resume]);

	const errorCount = diagnostics.filter((d) => d.severity === "error").length;
	const warningCount = diagnostics.filter(
		(d) => d.severity === "warning",
	).length;
	const bulletCount = bulletReport.totalNeedingWork;
	const total = errorCount + warningCount + bulletCount;

	return (
		<Sheet onOpenChange={onOpenChange} open={open}>
			<SheetContent className="w-full gap-0 p-0 sm:max-w-xl">
				<SheetHeader className="border-b px-6 py-4">
					<div className="flex items-center justify-between pr-8">
						<SheetTitle className="flex items-center gap-2">
							Review
							{total > 0 ? (
								<Badge variant={errorCount > 0 ? "destructive" : "secondary"}>
									{total}
								</Badge>
							) : null}
						</SheetTitle>
					</div>
					<SheetDescription>
						Checks against documented parser behaviour. This is not a score, and
						nothing here is changed for you.
					</SheetDescription>
				</SheetHeader>

				<Tabs className="min-h-0 flex-1" defaultValue="parse">
					<TabsList className="mx-6 mt-4">
						<TabsTrigger value="parse">
							Parser fit
							{diagnostics.length > 0 ? (
								<Badge className="ml-2" variant="outline">
									{diagnostics.length}
								</Badge>
							) : null}
						</TabsTrigger>
						<TabsTrigger value="bullets">
							Bullets
							{bulletCount > 0 ? (
								<Badge className="ml-2" variant="outline">
									{bulletCount}
								</Badge>
							) : null}
						</TabsTrigger>
					</TabsList>

					<TabsContent className="min-h-0 flex-1 px-6 pb-6" value="parse">
						<ScrollArea className="h-full pr-3">
							{diagnostics.length === 0 ? (
								<ClearState>
									No parser-fit issues found in this resume.
								</ClearState>
							) : (
								<ul className="space-y-2">
									{diagnostics.map((d) => (
										<DiagnosticRow diagnostic={d} key={`${d.id}::${d.title}`} />
									))}
								</ul>
							)}
						</ScrollArea>
					</TabsContent>

					<TabsContent className="min-h-0 flex-1 px-6 pb-6" value="bullets">
						<ScrollArea className="h-full pr-3">
							{bulletReport.bullets.length === 0 ? (
								<ClearState>No bullets to review yet.</ClearState>
							) : (
								<ul className="space-y-3">
									{bulletReport.bullets.map((finding) => (
										<li
											className="space-y-2 rounded-md border p-3"
											key={finding.sectionId}
										>
											{finding.report.bullets.every(
												(b) => b.severity === "none",
											) ? (
												<p className="flex items-center gap-2 text-sm">
													<CheckCircle2
														aria-hidden="true"
														className="h-4 w-4 text-emerald-600 dark:text-emerald-500"
													/>
													{finding.report.total} bullet
													{finding.report.total === 1 ? "" : "s"} with evidence.
												</p>
											) : (
												/* `withIndex` keeps the ORIGINAL position, because
												   report.bullets is index-aligned with the source and the
												   render index shifts once items are filtered out. */
												finding.report.bullets
													.map((bullet, sourceIndex) => ({
														bullet,
														sourceIndex,
													}))
													.filter(({ bullet }) => bullet.severity !== "none")
													.map(({ bullet, sourceIndex }) => (
														<div
															className="space-y-1"
															key={`${sourceIndex}-${bullet.text.slice(0, 40)}`}
														>
															<p className="text-sm italic">
																&quot;{bullet.text}&quot;
															</p>
															<ul className="list-disc space-y-0.5 pl-5 text-muted-foreground text-sm">
																{bullet.reasons.map((reason) => (
																	<li key={reason}>{reason}</li>
																))}
															</ul>
														</div>
													))
											)}
										</li>
									))}
								</ul>
							)}
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</SheetContent>
		</Sheet>
	);
}

/**
 * Count for the header trigger badge.
 *
 * Deliberately counts *all* diagnostics, not just errors: a warning the user never
 * sees is the same as a warning that does not exist. Errors are not counted
 * separately -- they are already inside `diagnostics.length`, and adding them again
 * inflated the number.
 */
export function reviewIssueCount(resume: Resume): number {
	const diagnostics = auditParseFidelity(buildParseAuditInput(resume));
	return diagnostics.length + collectBulletFindings(resume).totalNeedingWork;
}

/**
 * Header trigger: a labelled button carrying a live issue count.
 *
 * Split from `ReviewPanel` so the editor only pays for one `Sheet` instance and the
 * count is computed once per resume change rather than on every render of the tree.
 */
export function ReviewTrigger({ resume }: { resume: Resume }) {
	const [open, setOpen] = React.useState(false);
	const count = useMemo(() => reviewIssueCount(resume), [resume]);

	return (
		<>
			<Button
				aria-label="Review resume for parser fit"
				onClick={() => setOpen(true)}
				size="sm"
				variant="outline"
			>
				Review
				{count > 0 ? (
					<Badge className="ml-2" variant={count > 0 ? "secondary" : "outline"}>
						{count}
					</Badge>
				) : null}
			</Button>
			<ReviewPanel onOpenChange={setOpen} open={open} resume={resume} />
		</>
	);
}
