/**
 * Parse-fidelity audit — Feature 2 from docs/ROADMAP.md.
 *
 * Every HTML-to-PDF resume builder renders through headless Chromium, which decides its
 * own text-drawing order. None of them can know what a parser will extract, so their
 * "ATS score" is a checklist *guessing* at parser behaviour.
 *
 * Typst emits a deterministic, single-column text layer. We can guarantee the input and
 * then show the user exactly what a parser will see. This module is that guarantee.
 *
 * ## Two deliberate constraints
 *
 * 1. **Never emit a single 0-100 score.** That is the incumbents' credibility failure:
 *    users report 94/100 scores on resumes that human reviewers reject, and 82-vs-20
 *    disagreement between tools. Findings are discrete, each tied to a documented parser
 *    constraint and a concrete fix.
 * 2. **Never invent content.** This module only reads what is already there.
 *
 * ## Evidence behind the rules
 *
 * Greenhouse has been observed to empty an entire employment array when a section is
 * renamed from "Work Experience" to something else. Workday rejects `Mar. 2022` while
 * accepting `March 2022`. Parsers infer the date pattern from the FIRST date and then
 * fail when a later entry uses a different one -- so mixed formats inside one resume are
 * worse than a consistently suboptimal format. See docs/ROADMAP.md for sources.
 */

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface ParseDiagnostic {
	/** Stable identifier so the UI can key on it and tests can assert on it. */
	id: string;
	severity: DiagnosticSeverity;
	/** Short imperative headline. */
	title: string;
	/** What is wrong, specifically. */
	detail: string;
	/** What to change, when there is a concrete change. */
	fix?: string;
}

/**
 * Section labels parsers reliably recognise.
 *
 * Deliberately conservative: these are the forms seen in parser dictionaries, not every
 * heading a human would recognise. "Professional Summary" reads fine to a person and has
 * been observed to cost a parser the section, so it is flagged with the safer form
 * suggested rather than silently accepted.
 */
export const PARSER_SAFE_HEADINGS = [
	"Summary",
	"Work Experience",
	"Education",
	"Skills",
	"Certifications",
	"Awards",
	"Publications",
	"Languages",
	"Volunteer",
	"References",
	"Projects",
] as const;

/**
 * Accepted heading -> the parser-safe form to use instead.
 *
 * Keyed by lowercased heading so matching is case-insensitive. A value of `null` means
 * there is no safe equivalent and the heading should be dropped or renamed by the user.
 */
const HEADING_ALIASES: Record<string, string | null> = {
	"professional summary": "Summary",
	profile: "Summary",
	objective: "Summary",
	"about me": "Summary",
	"volunteer experience": "Volunteer",
	volunteering: "Volunteer",
	"community involvement": "Volunteer",
	"awards & honors": "Awards",
	"awards and honors": "Awards",
	honors: "Awards",
	achievements: "Awards",
	"work history": "Work Experience",
	"professional experience": "Work Experience",
	employment: "Work Experience",
	"employment history": "Work Experience",
	"career history": "Work Experience",
	"technical skills": "Skills",
	"core competencies": "Skills",
	technologies: "Skills",
	toolkit: "Skills",
	"education & training": "Education",
	"academic background": "Education",
	qualifications: "Education",
	certificates: "Certifications",
	"languages & skills": "Skills",
};

/**
 * Resolve any heading spelling to the parser-safe form, or null if there is none.
 *
 * Exported because the import sectioner must classify input by the *same* whitelist
 * the audit uses. Two different heading vocabularies would mean import accepts a
 * heading the parser then flags as unsafe, which is a confusing way to learn your
 * import was bad.
 */
export function resolveHeading(raw: string): string | null {
	const key = raw.trim().toLowerCase().replace(/\s+/g, " ");
	if (!key) return null;
	for (const canonical of PARSER_SAFE_HEADINGS) {
		if (canonical.toLowerCase() === key) return canonical;
	}
	return HEADING_ALIASES[key] ?? null;
}

/** Date formats, ranked by observed parser tolerance. */
export const DATE_FORMATS = {
	"MMMM YYYY": { safe: true, example: "March 2026" },
	"MMM YYYY": { safe: true, example: "Mar 2026" },
	"MM/YYYY": { safe: false, example: "03/2026" },
	YYYY: { safe: false, example: "2026" },
} as const;

export type DateFormatKey = keyof typeof DATE_FORMATS;

/** Matches a fully-qualified month, e.g. "March 2026" or "Mar 2026". */
const FULL_MONTH =
	/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}\b/i;

/** Matches a bare year, e.g. "2026". */
const BARE_YEAR = /\b(?:19|20)\d{2}\b/;

/** Matches numeric/slash formats, e.g. "03/2026" or "2020-01". */
const NUMERIC_DATE = /\b\d{1,4}\s?[/.-]\s?\d{1,2}(?:\s?[/.-]\s?\d{2,4})?\b/;

export interface SectionLike {
	/** Section type key, e.g. "personal-info". Used to skip non-load-bearing headings. */
	type: string;
	/** The heading the templates actually render for this section. */
	title: string;
	visible?: boolean;
}

export interface DateLike {
	startDate?: string | null;
	endDate?: string | null;
	current?: boolean;
	graduationDate?: string | null;
}

export interface AuditInput {
	sections: readonly SectionLike[];
	/** Every date-bearing entry across the resume. */
	dates: readonly DateLike[];
	/** The resume's date-format setting. */
	dateFormat?: string;
	/** The layout setting, for the record. Ignored by the renderer (always single-column). */
	layout?: string;
}

function normaliseHeading(value: string): string {
	return value.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Classify one heading. Returns a diagnostic when it is not parser-safe. */
export function checkHeading(heading: string): ParseDiagnostic | null {
	const normalised = normaliseHeading(heading);
	if (!normalised) return null;

	const safe = PARSER_SAFE_HEADINGS.find((h) => h.toLowerCase() === normalised);
	if (safe) return null;

	const alias = Object.hasOwn(HEADING_ALIASES, normalised)
		? HEADING_ALIASES[normalised]
		: undefined;

	// A `custom` section is user-authored by definition, so no safe form can be
	// suggested -- only the risk named.
	if (alias === null || alias === undefined) {
		const isCustom = /custom/.test(normalised);
		return {
			id: isCustom ? "heading-custom" : "heading-unknown",
			severity: isCustom ? "info" : "warning",
			title: isCustom
				? `Custom heading "${heading}" may not be recognised`
				: `"${heading}" is not a section label parsers look for`,
			detail: isCustom
				? "Parsers match on a fixed set of section labels. A heading they do not recognise can be dropped from the candidate record entirely."
				: `Parsers match a fixed set of section labels. "${heading}" is not one of them, so this section may be filed as unstructured text or skipped.`,
			fix: isCustom
				? `Rename it to one of: ${PARSER_SAFE_HEADINGS.join(", ")}.`
				: `Rename it to "${PARSER_SAFE_HEADINGS.join('", "')}".`,
		};
	}

	return {
		id: "heading-alias",
		severity: "warning",
		title: `"${heading}" should be "${alias}"`,
		detail: `"${heading}" reads correctly to a person but is not in parser dictionaries. It has been observed to cost a parser the whole section.`,
		fix: `Rename the section to "${alias}".`,
	};
}

/** Classify a date-format setting. */
export function checkDateFormat(
	format: string | undefined,
): ParseDiagnostic | null {
	if (!format) return null;
	if (format === "MMMM YYYY") return null;

	const known = DATE_FORMATS[format as DateFormatKey];
	if (known?.safe) return null;

	return {
		id: "date-format-unsafe",
		severity: "warning",
		title: `Date format "${format}" is harder to parse`,
		detail:
			'Numeric and bare-year formats are read less reliably than a written month. One parser has been observed to accept "March 2022" while rejecting "Mar. 2022".',
		fix: 'Use "MMMM YYYY" (March 2026). It is the most consistently tolerated form.',
	};
}

/**
 * Parsers infer the date pattern from the first date they see and then fail when a later
 * entry differs. So one stray "2024" or "03/2026" among "March 2026" entries is worse
 * than using a suboptimal format consistently.
 */
export function checkDateConsistency(
	dates: readonly DateLike[],
): ParseDiagnostic | null {
	const shapes = new Map<string, number>();

	for (const entry of dates) {
		for (const raw of [entry.startDate, entry.endDate, entry.graduationDate]) {
			const value = (raw ?? "").trim();
			if (!value || entry.current) continue;

			let shape: string | null = null;
			if (FULL_MONTH.test(value)) shape = "month-year";
			else if (BARE_YEAR.test(value) && !NUMERIC_DATE.test(value))
				shape = "year";
			else if (NUMERIC_DATE.test(value)) shape = "numeric";
			else shape = "unrecognised";

			shapes.set(shape, (shapes.get(shape) ?? 0) + 1);
		}
	}

	if (shapes.size <= 1) {
		// A single unrecognised shape is still worth naming.
		if (shapes.has("unrecognised")) {
			return {
				id: "date-unrecognised",
				severity: "warning",
				title: "A date is not in a parseable format",
				detail:
					'At least one date could not be recognised as a month-year, year or numeric date. Free-text dates ("last summer", "Q sometime in 2026") are usually discarded.',
				fix: 'Use "March 2026", "2026", or the resume date-format setting.',
			};
		}
		return null;
	}

	const summary = [...shapes.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([shape, n]) => `${shape} (${n})`)
		.join(", ");

	return {
		id: "date-mixed-formats",
		severity: "error",
		title: "Dates use more than one format",
		detail: `Found ${summary}. Parsers infer the pattern from the first date they read and then fail on entries that differ, so one stray format can corrupt the whole timeline.`,
		fix: 'Set every date to the same format, ideally "MMMM YYYY".',
	};
}

/** The renderer is unconditionally single-column; this asserts that invariant. */
export function checkLayout(
	layout: string | undefined,
): ParseDiagnostic | null {
	if (!layout || layout === "single-column") return null;
	return {
		id: "layout-not-single-column",
		severity: "error",
		title: `Layout "${layout}" is not rendered`,
		detail:
			'No Typst template reads the layout setting, so the export is single-column regardless. A stored value of "' +
			layout +
			'" is inert and misleading.',
		fix: 'Set the layout to "Single column".',
	};
}

/**
 * Run every check. Findings are sorted most-severe first so a UI can render them in
 * priority order without re-sorting.
 */
export function auditParseFidelity(input: AuditInput): ParseDiagnostic[] {
	const diagnostics: ParseDiagnostic[] = [];
	const seen = new Set<string>();

	const push = (d: ParseDiagnostic | null) => {
		// Dedupe on id AND heading. Keying on id alone collapsed three distinct fixes
		// ("Professional Summary", "Volunteer Experience", "Awards & Honors") into one
		// message, so a user with all three saw only the first -- while `id` stayed
		// usable as a React key and for grouping.
		if (!d) return;
		const key = `${d.id}::${d.title}`;
		if (seen.has(key)) return;
		seen.add(key);
		diagnostics.push(d);
	};

	for (const section of input.sections) {
		if (section.visible === false) continue;
		// Contact details are found by regex on email/phone/URL, so this heading
		// carries no parse risk. Flagging it would train users to ignore the panel.
		if (section.type === "personal-info") continue;
		push(checkHeading(section.title));
	}

	push(checkDateFormat(input.dateFormat));
	push(checkDateConsistency(input.dates));
	push(checkLayout(input.layout));

	const rank: Record<DiagnosticSeverity, number> = {
		error: 0,
		warning: 1,
		info: 2,
	};
	return diagnostics.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
