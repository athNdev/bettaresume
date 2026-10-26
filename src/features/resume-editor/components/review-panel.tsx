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
import { HistoryPanel } from "@/features/resume-editor/components/history-panel";
import {
	JobMatchPanel,
	type JobTargetDraft,
} from "@/features/resume-editor/components/job-match-panel";
import {
	buildParseAuditInput,
	collectBulletFindings,
} from "@/features/resume-editor/lib/review-input";
import type { Resume } from "@/features/resume-editor/types";
import {
	auditParseFidelity,
	type ParseDiagnostic,
} from "@/lib/analysis/parse-fidelity";
import { PlainTextTest, RubricChecklist } from "./rubric-panel";

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
	/** Persisted job target, and a writer for it. */
	jobTarget: JobTargetDraft | undefined;
	onJobTargetChange: (next: JobTargetDraft) => void;
}

const SEVERITY_STYLE = {
	error: {
		Icon: XCircle,
		iconClass: "text-destructive",
		tone: "danger",
		rule: "bg-destructive",
		label: "Fix",
	},
	warning: {
		Icon: AlertTriangle,
		iconClass: "text-warning",
		tone: "warning",
		rule: "bg-warning",
		label: "Check",
	},
	info: {
		Icon: Info,
		iconClass: "text-fg-muted",
		tone: "info",
		rule: "bg-info",
		label: "Note",
	},
} as const;

/**
 * One finding, verdict first.
 *
 * The verdict used to trail the finding as a badge on the right, so the eye read the
 * check icon, then a sentence, then had to travel to the edge to learn whether the
 * sentence was a problem. Findings are now composed as a verdict chip + title, with a
 * 2px status rule on the leading edge — the same "what is this row" language the
 * section rail uses for selection.
 */
function DiagnosticRow({ diagnostic }: { diagnostic: ParseDiagnostic }) {
	const { Icon, iconClass, tone, rule, label } =
		SEVERITY_STYLE[diagnostic.severity];
	return (
		<li className="relative overflow-hidden rounded-md border bg-surface p-3 pl-4">
			<span
				aria-hidden="true"
				className={`absolute inset-y-0 left-0 w-0.5 ${rule}`}
			/>
			<div className="mb-1 flex flex-wrap items-center gap-2">
				<span className="br-chip" data-tone={tone}>
					<Icon aria-hidden="true" className={`h-3 w-3 ${iconClass}`} />
					{label}
				</span>
				<p className="min-w-0 flex-1 font-medium text-sm">{diagnostic.title}</p>
			</div>
			<p className="text-fg-muted text-sm">{diagnostic.detail}</p>
			{diagnostic.fix ? (
				<p className="mt-1 text-fg-muted text-sm">
					<span className="font-medium">Fix: </span>
					{diagnostic.fix}
				</p>
			) : null}
		</li>
	);
}

/**
 * The class every tab panel shares.
 *
 * `forceMount` keeps a panel's subtree alive across tab switches, which is the whole
 * reason the History panel can remember a selected revision and a half-typed label.
 * But Radix treats a force-mounted panel as always `present`, so it stops setting the
 * `hidden` attribute on the inactive ones — every panel then renders, stacked, and the
 * sheet grows to three thousand pixels. Selecting "History" appeared to do nothing
 * because its content was 2,400px below the tab strip; the reader saw the checklist.
 *
 * `data-[state=inactive]:hidden` restores the hiding Radix would have applied, without
 * giving up the mounting. Both halves are load-bearing: drop `forceMount` and panel
 * state dies on every switch, drop the class and every panel is visible at once.
 */
const TAB_PANEL =
	"min-h-0 flex-1 px-4 pb-4 data-[state=inactive]:hidden sm:px-6 sm:pb-6";

function ClearState({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-8 text-center">
			<CheckCircle2 aria-hidden="true" className="h-6 w-6 text-success" />
			<p className="font-medium text-sm">{children}</p>
		</div>
	);
}

/**
 * Everything the panel needs to know about one resume, computed in one place.
 *
 * The header badge and the editor's trigger badge used to count independently and
 * disagree: the header added only errors + warnings, the trigger added every
 * diagnostic. A resume whose only finding was `info` therefore showed "1" on the
 * trigger and no badge at all in the header. One breakdown, one `total`, used by both.
 */
export function reviewFindings(resume: Resume): ReviewFindings {
	const diagnostics = auditParseFidelity(buildParseAuditInput(resume));
	const bullets = collectBulletFindings(resume);
	return {
		diagnostics,
		errorCount: diagnostics.filter((d) => d.severity === "error").length,
		bulletReport: bullets,
		bulletCount: bullets.totalNeedingWork,
		// Every diagnostic regardless of severity -- a warning the user never sees is
		// the same as a warning that does not exist. Errors are already inside
		// `diagnostics.length`, so they are not added a second time.
		total: diagnostics.length + bullets.totalNeedingWork,
	};
}

export interface ReviewFindings {
	diagnostics: ParseDiagnostic[];
	bulletReport: ReturnType<typeof collectBulletFindings>;
	bulletCount: number;
	errorCount: number;
	total: number;
}

export function ReviewPanel({
	resume,
	open,
	onOpenChange,
	jobTarget,
	onJobTargetChange,
}: ReviewPanelProps) {
	const { diagnostics, bulletReport, bulletCount, errorCount, total } = useMemo(
		() => reviewFindings(resume),
		[resume],
	);

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

				<Tabs className="min-h-0 flex-1" defaultValue="checklist">
					{/*
					 * The strip wraps (it was 579px of pills in a 342px column at 390px,
					 * with History and Bullets past the viewport and unclickable) and the
					 * count badges are gone from the labels: each badge widened its tab and
					 * clipped "Bullets 10" at the sheet edge even at 1440px. The counts now
					 * lead their own panels instead.
					 */}
					<TabsList className="mx-4 mt-4 h-auto flex-wrap justify-start sm:mx-6">
						{/*
						 * The checklist is first and default: it is the one surface that
						 * answers "what should I do next", which is the question a user opens
						 * review with. The other tabs are the evidence behind its verdicts.
						 */}
						<TabsTrigger value="checklist">Checklist</TabsTrigger>
						<TabsTrigger value="plaintext">Plain text</TabsTrigger>
						<TabsTrigger value="parse">Parser fit</TabsTrigger>
						<TabsTrigger value="job">Job target</TabsTrigger>
						<TabsTrigger value="history">History</TabsTrigger>
						{/*
					  PR #166 shipped the `library` TabsContent without its trigger, so the
					  content library, `content.attach`/`propagate`/`backfill`/`create`, and the
					  additions + divergence queries were unreachable from the product. A panel
					  with no trigger is invisible however good it is. `test/review-panel.test.ts`
					  now asserts every TabsContent has a matching TabsTrigger, so the next one
					  cannot ship dead either.
					*/}
						{/*
					  The Library tab is gone: it moved to the editor rail, beside the
					  Sections list it feeds. See `resume-editor.tsx`.
					*/}
						<TabsTrigger value="bullets">Bullets</TabsTrigger>
					</TabsList>

					<TabsContent className={TAB_PANEL} forceMount value="checklist">
						<ScrollArea className="h-full pr-3">
							<RubricChecklist resume={resume} />
						</ScrollArea>
					</TabsContent>

					<TabsContent className={TAB_PANEL} forceMount value="plaintext">
						<ScrollArea className="h-full pr-3">
							<PlainTextTest resume={resume} />
						</ScrollArea>
					</TabsContent>

					<TabsContent className={TAB_PANEL} forceMount value="parse">
						<ScrollArea className="h-full pr-3">
							{diagnostics.length === 0 ? (
								<ClearState>
									No parser-fit issues found in this resume.
								</ClearState>
							) : (
								<>
									{/* The count lives here, not in the tab label: a badge inside
									 * the trigger widened the strip and clipped at 1440px. */}
									<p className="mb-3 font-medium text-sm">
										{diagnostics.length}{" "}
										{diagnostics.length === 1 ? "finding" : "findings"}
									</p>
									<ul className="space-y-2">
										{diagnostics.map((d) => (
											<DiagnosticRow
												diagnostic={d}
												key={`${d.id}::${d.title}`}
											/>
										))}
									</ul>
								</>
							)}
						</ScrollArea>
					</TabsContent>

					<TabsContent className={TAB_PANEL} forceMount value="history">
						<HistoryPanel resume={resume} />
					</TabsContent>

					<TabsContent className={TAB_PANEL} forceMount value="bullets">
						<ScrollArea className="h-full pr-3">
							{bulletReport.bullets.length === 0 ? (
								<ClearState>No bullets to review yet.</ClearState>
							) : (
								<>
									{/* The count moved out of the tab label; see the strip. */}
									<p className="mb-3 font-medium text-sm">
										{bulletCount}{" "}
										{bulletCount === 1 ? "bullet needs" : "bullets need"} work
									</p>
									<ul className="space-y-3">
										{bulletReport.bullets.map((finding) => (
											<li
												className="space-y-2 rounded-md border p-3"
												key={`${finding.sectionId}:${finding.index}`}
											>
												{/*
												 * Which entry these bullets belong to. Without it a resume with two
												 * jobs showed two unlabelled blocks and no way to tell them apart —
												 * and the two used the same React key, because the finding's index
												 * was hardcoded to 0 for every entry in the section.
												 */}
												{finding.label ? (
													<p className="font-medium text-sm">{finding.label}</p>
												) : null}
												{finding.report.bullets.every(
													(b) => b.severity === "none",
												) ? (
													<p className="flex items-center gap-2 text-sm">
														<CheckCircle2
															aria-hidden="true"
															className="h-4 w-4 text-success"
														/>
														{finding.report.total} bullet
														{finding.report.total === 1 ? "" : "s"} with
														evidence.
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
																<ul className="list-disc space-y-0.5 pl-4 text-muted-foreground text-sm">
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
								</>
							)}
						</ScrollArea>
					</TabsContent>
					<TabsContent
						className={`${TAB_PANEL} overflow-hidden`}
						forceMount
						value="job"
					>
						<JobMatchPanel
							jobTarget={jobTarget}
							onJobTargetChange={onJobTargetChange}
							resume={resume}
						/>
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
 *
 * Delegates to `reviewFindings` rather than recounting, so the trigger badge and the
 * sheet header badge are the same number by construction and cannot drift apart again.
 */
export function reviewIssueCount(resume: Resume): number {
	return reviewFindings(resume).total;
}

/**
 * Header trigger: a labelled button carrying a live issue count.
 *
 * Split from `ReviewPanel` so the editor only pays for one `Sheet` instance and the
 * count is computed once per resume change rather than on every render of the tree.
 */
export function ReviewTrigger({
	jobTarget,
	onJobTargetChange,
	resume,
}: {
	resume: Resume;
	jobTarget: JobTargetDraft | undefined;
	onJobTargetChange: (next: JobTargetDraft) => void;
}) {
	const [open, setOpen] = React.useState(false);
	/*
	 * `reviewIssueCount` rather than a second `reviewFindings` call: the trigger and the
	 * sheet must never disagree, and one entry point is how that is guaranteed.
	 */
	const count = useMemo(() => reviewIssueCount(resume), [resume]);

	return (
		<>
			<Button
				aria-label="Review resume for parser fit"
				className="text-fg-muted"
				onClick={() => setOpen(true)}
				size="sm"
				/*
				 * Ghost. Review is a diagnostic you open beside the document, not a peer of
				 * Export; the bordered treatment made three outlined buttons and one solid
				 * fight for the same corner.
				 */
				variant="ghost"
			>
				<span className="hidden sm:inline" data-collapse-label="">
					Review
				</span>
				{count > 0 ? (
					<Badge className="ml-2" variant="secondary">
						{count}
					</Badge>
				) : null}
			</Button>
			<ReviewPanel
				jobTarget={jobTarget}
				onJobTargetChange={onJobTargetChange}
				onOpenChange={setOpen}
				open={open}
				resume={resume}
			/>
		</>
	);
}
