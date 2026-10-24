import { buildParseAuditInput } from "@/features/resume-editor/lib/review-input";
import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import { headingOf, visibleSections } from "@/lib/export/text";

/**
 * The Plain Text Test — the check a candidate can do themselves.
 *
 * Every 2026 source on ATS parsing ends with the same advice: copy the document into
 * Notepad and read it. If the name is first, the headings are visible, the order is
 * right, the dates sit with their titles and the bullets are intact, the resume will
 * parse. It is the only test that needs no parser, no vendor and no score.
 *
 * The landing page promises it. This module is the promise, run against the same
 * string `exportText` downloads — which is why both read `src/lib/export/text.ts`.
 */

export interface PlainTextCheck {
	id: string;
	title: string;
	pass: boolean;
	/** What the test looked at, and what to change when it failed. */
	detail: string;
}

/**
 * Run the five checks against a text layer.
 *
 * `text` is passed in rather than built here so a caller can test a text layer it
 * built earlier, or a hypothetical one, without rebuilding the resume.
 */
export function runPlainTextTest(
	text: string,
	resume: Resume,
): PlainTextCheck[] {
	const sections = visibleSections(resume.sections ?? []);
	const name = resume.metadata?.personalInfo?.fullName?.trim() ?? "";

	return [
		nameFirst(text, name),
		headingsVisible(text, sections),
		orderPreserved(text, sections),
		datesAttached(text, resume),
		bulletsIntact(text, sections),
	];
}

function nameFirst(text: string, name: string): PlainTextCheck {
	const firstLine =
		text
			.split("\n")
			.find((line) => line.trim() !== "")
			?.trim() ?? "";
	const pass = name !== "" && firstLine.startsWith(name);
	return {
		id: "plain-text-name-first",
		title: "Your name is the first thing in the document",
		pass,
		detail: pass
			? `The text layer opens with "${name}".`
			: name === ""
				? "There is no name in your personal details, so a parser has nothing to anchor the candidate record to."
				: `The first line is "${firstLine}". If your name is not first, it is probably in a place a parser does not read as the document header.`,
	};
}

function headingsVisible(
	text: string,
	sections: ResumeSection[],
): PlainTextCheck {
	const missing = sections
		.map(headingOf)
		.filter((heading) => !text.includes(heading));
	const pass = sections.length === 0 || missing.length === 0;
	return {
		id: "plain-text-headers-visible",
		title: "Every section heading survives the export",
		pass,
		detail: pass
			? `${sections.length} heading${sections.length === 1 ? "" : "s"} present in the text layer.`
			: `Missing from the text layer: ${missing.map((h) => `"${h}"`).join(", ")}. A heading a parser cannot read means the section's content has nowhere to be filed.`,
	};
}

function orderPreserved(
	text: string,
	sections: ResumeSection[],
): PlainTextCheck {
	let cursor = -1;
	let firstBreak: { heading: string; expected: number; found: number } | null =
		null;

	sections.forEach((section, index) => {
		const at = text.indexOf(headingOf(section));
		if (at === -1) return;
		if (at < cursor && !firstBreak) {
			firstBreak = {
				heading: headingOf(section),
				expected: index + 1,
				found: 0,
			};
		}
		cursor = Math.max(cursor, at);
	});

	const pass = firstBreak === null;
	return {
		id: "plain-text-order",
		title: "Sections come out in the order you put them",
		pass,
		detail: pass
			? "Reading order matches the document order."
			: `"${(firstBreak as { heading: string } | null)?.heading ?? ""}" appears out of order. A parser that reads across a layout can interleave columns; single-column output cannot, so an out-of-order heading means the export is not what you think it is.`,
	};
}

function datesAttached(text: string, resume: Resume): PlainTextCheck {
	const dates = buildParseAuditInput(resume).dates;
	// Only the dates that exist: a blank `endDate` on a current role is not a date
	// that failed to survive, and counting it made a correct document fail the test.
	const values = dates
		.flatMap((d) => [d.startDate, d.endDate, d.graduationDate])
		.filter((v): v is string => typeof v === "string" && v.trim() !== "");
	const present = values.filter((v) => v && text.includes(v));
	const pass = values.length === 0 || present.length === values.length;
	return {
		id: "plain-text-dates-attached",
		title: "Dates are still attached to their entries",
		pass,
		detail: pass
			? values.length === 0
				? "No dates in the document yet."
				: `${present.length} of ${values.length} dates present in the text layer.`
			: `${values.length - present.length} of ${values.length} dates missing from the text layer. A parser links a date range to the entry sitting above it, so a date that has moved is a date that has lost its job.`,
	};
}

function bulletsIntact(
	text: string,
	sections: ResumeSection[],
): PlainTextCheck {
	let expected = 0;
	let found = 0;

	for (const section of sections) {
		const data = section.content.data;
		if (!Array.isArray(data)) continue;
		for (const item of data as Array<Record<string, unknown>>) {
			const highlights = item.highlights;
			if (!Array.isArray(highlights)) continue;
			for (const raw of highlights) {
				if (typeof raw !== "string" || !raw.trim()) continue;
				expected++;
				if (text.includes(raw.trim())) found++;
			}
		}
	}

	const pass = expected === 0 || found === expected;
	return {
		id: "plain-text-bullets-intact",
		title: "Every bullet is present in the text layer",
		pass,
		detail: pass
			? expected === 0
				? "No bullets in the document yet."
				: `${found} of ${expected} bullets present.`
			: `${expected - found} of ${expected} bullets did not survive the export. A bullet that is not in the text layer is a bullet no parser will read.`,
	};
}

/**
 * The whole test as one verdict, for the UI's summary line.
 *
 * Deliberately not a score: it is "all five passed" or "these did not".
 */
export function plainTextVerdict(checks: PlainTextCheck[]): {
	passed: number;
	total: number;
	failed: string[];
} {
	return {
		passed: checks.filter((c) => c.pass).length,
		total: checks.length,
		failed: checks.filter((c) => !c.pass).map((c) => c.title),
	};
}
