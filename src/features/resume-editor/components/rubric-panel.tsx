"use client";

import { Check, Copy, Minus, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePreviewPages } from "@/features/resume-editor/lib/preview-pages";
import type { Resume } from "@/features/resume-editor/types";
import {
	plainTextVerdict,
	runPlainTextTest,
} from "@/lib/analysis/plain-text-test";
import {
	buildRubric,
	GROUP_LABELS,
	type RubricCheck,
	type RubricGroup,
	type RubricReport,
} from "@/lib/analysis/rubric";
import { buildPlainText } from "@/lib/export/text";

/**
 * The checklist and the Plain Text Test.
 *
 * These are the "grading" surface, and the whole point of how they are built is
 * what they do **not** show: no number, no percentage, no colour-coded
 * A-to-F. The same research that gives us the four dimensions documents the
 * composite score as this category's trust failure — users report 94/100 on
 * resumes humans reject — and `docs/ROADMAP.md` rules it out.
 *
 * So the output is a named check, a verdict and a fix, ranked by how much work
 * the fix is. That is the information that directs effort; a percentage is the
 * information that starts an argument.
 */

const STATUS_ICON = {
	pass: <Check aria-hidden className="h-4 w-4" />,
	fail: <X aria-hidden className="h-4 w-4" />,
	advice: <Minus aria-hidden className="h-4 w-4" />,
} as const;

const STATUS_STYLE = {
	pass: "text-success",
	fail: "text-destructive",
	advice: "text-muted-foreground",
} as const;

const STATUS_LABEL = {
	pass: "Holding",
	fail: "Fix",
	advice: "Worth considering",
} as const;

function CheckRow({ check }: { check: RubricCheck }) {
	return (
		<li className="flex gap-3 rounded-md border p-3">
			<span
				aria-hidden
				className={`mt-0.5 shrink-0 ${STATUS_STYLE[check.status]}`}
			>
				{STATUS_ICON[check.status]}
			</span>
			<div className="min-w-0">
				<div className="flex flex-wrap items-center gap-2">
					<p className="font-medium text-sm">{check.title}</p>
					{/* The category chip is gone: every row sits under its own group
					 * heading, so the chip repeated that heading on every line. */}
					<Badge variant="outline">{STATUS_LABEL[check.status]}</Badge>
				</div>
				<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
					{check.detail}
				</p>
			</div>
		</li>
	);
}

export function RubricChecklist({ resume }: { resume: Resume }) {
	const pageCount = usePreviewPages((s) => s.pageCount);
	const fit = usePreviewPages((s) => s.fit);
	const report: RubricReport = useMemo(
		() => buildRubric(resume, { pageCount, fit }),
		[resume, pageCount, fit],
	);

	const groups = useMemo(() => {
		const byGroup = new Map<RubricGroup, RubricCheck[]>();
		for (const c of report.checks) {
			const list = byGroup.get(c.group) ?? [];
			list.push(c);
			byGroup.set(c.group, list);
		}
		return byGroup;
	}, [report]);

	return (
		<div className="space-y-4">
			<div>
				{/* The summary line is the most useful sentence in the panel, so it is
				 * not the smallest text in it (the audit measured it at 12px muted). */}
				<p className="font-medium text-sm">
					{report.counts.fail} to fix · {report.counts.advice} worth considering
					· {report.counts.pass} holding. There is no score here: each line is a
					named check with a verdict and a fix.
				</p>
			</div>

			{(["parse-fit", "impact", "brevity", "style"] as RubricGroup[]).map(
				(group) => {
					const checks = groups.get(group) ?? [];
					if (checks.length === 0) return null;
					return (
						<section key={group}>
							<h4 className="mb-2 font-semibold text-muted-foreground text-xs uppercase tracking-wide">
								{GROUP_LABELS[group]}
							</h4>
							<ul className="space-y-2">
								{checks.map((c) => (
									<CheckRow check={c} key={c.id} />
								))}
							</ul>
						</section>
					);
				},
			)}
		</div>
	);
}

/**
 * The Plain Text Test: five checks against the exact string the plain-text export
 * downloads, plus the string itself so it can be copied and read.
 */
export function PlainTextTest({ resume }: { resume: Resume }) {
	const text = useMemo(() => buildPlainText(resume), [resume]);
	const checks = useMemo(() => runPlainTextTest(text, resume), [text, resume]);
	const verdict = useMemo(() => plainTextVerdict(checks), [checks]);
	const [copied, setCopied] = useState(false);

	if (!text) {
		return (
			<p className="text-muted-foreground text-sm">
				Add your contact details first — with nothing in the document there is
				no text layer to test.
			</p>
		);
	}

	return (
		<div className="space-y-4">
			<div>
				<p className="font-medium text-sm">
					{verdict.passed} of {verdict.total} checks pass. This is the text a
					parser reads out of your PDF — copy it into a plain editor and read it
					top to bottom.
				</p>
			</div>

			<ul className="space-y-2">
				{checks.map((c) => (
					<li className="flex gap-3 rounded-md border p-3" key={c.id}>
						<span
							aria-hidden
							className={`mt-0.5 shrink-0 ${c.pass ? STATUS_STYLE.pass : STATUS_STYLE.fail}`}
						>
							{c.pass ? STATUS_ICON.pass : STATUS_ICON.fail}
						</span>
						<div className="min-w-0">
							<p className="font-medium text-sm">{c.title}</p>
							<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
								{c.detail}
							</p>
						</div>
					</li>
				))}
			</ul>

			<div>
				<div className="mb-2 flex items-center justify-between gap-2">
					<h4 className="font-semibold text-muted-foreground text-xs uppercase tracking-wide">
						Text layer
					</h4>
					<Button
						onClick={() => {
							void navigator.clipboard?.writeText(text).then(() => {
								setCopied(true);
								setTimeout(() => setCopied(false), 2000);
							});
						}}
						size="sm"
						static
						variant="outline"
					>
						<Copy className="mr-2 h-3.5 w-3.5" />
						{copied ? "Copied" : "Copy"}
					</Button>
				</div>
				<pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
					{text}
				</pre>
			</div>
		</div>
	);
}
