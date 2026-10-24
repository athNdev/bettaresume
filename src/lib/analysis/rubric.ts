import { buildParseAuditInput } from "@/features/resume-editor/lib/review-input";
import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import { findDutyPhrase, hasQuantification } from "@/lib/analysis/metrics";
import { auditParseFidelity } from "@/lib/analysis/parse-fidelity";
import { buildPlainText, visibleSections } from "@/lib/export/text";

/**
 * The grading rubric: four dimensions, named checks, pass/fail — never a number.
 *
 * ## Why these four
 *
 * Every 2026 resume-review product converges on the same dimensions: **Impact**
 * (does a bullet claim something with evidence), **Brevity** (is it the length a
 * recruiter reads), **Style** (is it written and formatted consistently), and
 * **Parse-fit** (will a parser recover the fields). We already computed raw signals
 * for all four in `metrics.ts`, `parse-fidelity.ts` and `ats-match.ts`, scattered
 * across three panels with no shared rubric.
 *
 * ## Why there is no score
 *
 * The same research that describes the dimensions documents the composite score as
 * the category's trust failure: users report 94/100 on resumes humans reject, and
 * two tools disagree by 70 points on the same document. A score is a prediction
 * about software neither party ran. `docs/ROADMAP.md` rejects one outright.
 *
 * So every result here is a named check with a verdict and a fix, ranked by how
 * much work the fix is — which is the information that actually directs effort.
 *
 * ## Why the rubric is derived, not stored
 *
 * It is a projection of the current document. Nothing is written, nothing is
 * cached, and there is no `atsScore` column to drift out of date.
 */

export type RubricGroup = "parse-fit" | "impact" | "brevity" | "style";
export type RubricStatus = "pass" | "fail" | "advice";
export type RubricEffort = "quick" | "medium" | "deep";

export interface RubricCheck {
	id: string;
	group: RubricGroup;
	title: string;
	status: RubricStatus;
	/** What is wrong and what to do. For a pass, what is holding. */
	detail: string;
	/** How much work the fix is. Ranking key. */
	effort: RubricEffort;
	/** Where the problem is, when it can be located. */
	anchor?: string;
}

export interface RubricReport {
	checks: RubricCheck[];
	/**
	 * Failures first, then advice, then passes — and inside each band, the quick
	 * fixes before the deep ones. Effort outranks dimension on purpose: the list is
	 * a to-do order, and "two minutes to fix" beats "this one matters more" when
	 * the user is looking at what to do next.
	 */
	ranked: RubricCheck[];
	counts: { pass: number; fail: number; advice: number };
}

export const GROUP_LABELS: Record<RubricGroup, string> = {
	"parse-fit": "Parse fit",
	impact: "Impact",
	brevity: "Brevity",
	style: "Style",
};

/**
 * Length rules. 400–1600 words and 3–6 bullets per role are the ranges the
 * review products measure against; 220 characters is roughly two lines at the
 * default body size, beyond which a bullet stops being a bullet.
 */
export const LENGTH_RULES = {
	minWords: 400,
	maxWords: 1600,
	minBulletsPerRole: 3,
	maxBulletsPerRole: 6,
	maxBulletChars: 220,
	minPages: 1,
	maxPages: 2,
} as const;

/**
 * Type sizes a parser-friendly document uses, in points. Below 10pt OCR and
 * text extraction degrade; above 16pt (except the name) a resume reads as a
 * poster. From the 2026 formatting rules, corroborated across sources.
 */
export const TYPE_RULES = {
	bodyMin: 10,
	bodyMax: 12,
	nameMin: 14,
	nameMax: 16,
	headingMin: 11,
	headingMax: 13,
} as const;

const GROUP_RANK: Record<RubricGroup, number> = {
	"parse-fit": 0,
	impact: 1,
	brevity: 2,
	style: 3,
};

const STATUS_RANK: Record<RubricStatus, number> = {
	fail: 0,
	advice: 1,
	pass: 2,
};
const EFFORT_RANK: Record<RubricEffort, number> = {
	quick: 0,
	medium: 1,
	deep: 2,
};

function check(
	partial: Omit<RubricCheck, "status"> & { ok: boolean; soft?: boolean },
): RubricCheck {
	const { ok, soft, ...rest } = partial;
	return {
		...rest,
		status: ok ? "pass" : soft ? "advice" : "fail",
	};
}

/** Body text and bullets as plain words, for the length and repetition checks. */
function wordCount(text: string): number {
	return text.split(/\s+/).filter((w) => w.length > 0).length;
}

interface BulletRef {
	sectionId: string;
	text: string;
}

function bulletsOf(sections: readonly ResumeSection[]): BulletRef[] {
	const out: BulletRef[] = [];
	for (const section of sections) {
		if (section.type !== "experience" && section.type !== "projects") continue;
		if (!Array.isArray(section.content.data)) continue;
		for (const item of section.content.data as Array<Record<string, unknown>>) {
			const highlights = item.highlights;
			if (!Array.isArray(highlights)) continue;
			for (const raw of highlights) {
				if (typeof raw === "string" && raw.trim()) {
					out.push({ sectionId: section.id, text: raw.trim() });
				}
			}
		}
	}
	return out;
}

/** Experience entries, for the bullets-per-role rule. */
function rolesOf(sections: readonly ResumeSection[]): Array<{
	sectionId: string;
	label: string;
	bulletCount: number;
}> {
	const out: Array<{ sectionId: string; label: string; bulletCount: number }> =
		[];
	for (const section of sections) {
		if (section.type !== "experience") continue;
		if (!Array.isArray(section.content.data)) continue;
		for (const item of section.content.data as Array<Record<string, unknown>>) {
			const label = [item.position, item.company].filter(Boolean).join(" at ");
			const highlights = Array.isArray(item.highlights)
				? item.highlights.length
				: 0;
			out.push({
				sectionId: section.id,
				label: label || "Untitled role",
				bulletCount: highlights,
			});
		}
	}
	return out;
}

/**
 * Build the rubric for a resume.
 *
 * `pageCount` is optional because it can only come from a compiled preview; when
 * it is absent the page-count check is reported as advice rather than guessing.
 */
export function buildRubric(
	resume: Resume,
	options: { pageCount?: number | null } = {},
): RubricReport {
	const sections = visibleSections(resume.sections ?? []);
	const checks: RubricCheck[] = [];

	/* ── Parse fit ─────────────────────────────────────────────────────── */

	const parseDiagnostics = auditParseFidelity(buildParseAuditInput(resume));
	const headingProblems = parseDiagnostics.filter((d) =>
		d.id.startsWith("heading"),
	);
	const dateProblems = parseDiagnostics.filter((d) => d.id.startsWith("date"));

	checks.push(
		check({
			id: "headings-recognised",
			group: "parse-fit",
			title: "Section headings are in a parser's dictionary",
			ok: headingProblems.length === 0,
			effort: "quick",
			detail:
				headingProblems.length === 0
					? "Every heading matches a label parsers look for."
					: `${headingProblems.length} heading${headingProblems.length === 1 ? "" : "s"} a parser may not recognise: ${headingProblems
							.map((d) => d.title)
							.join("; ")}. ${headingProblems[0]?.fix ?? ""}`,
			anchor: headingProblems[0]?.title,
		}),
		check({
			id: "dates-parseable",
			group: "parse-fit",
			title: "Dates are consistent and in a parseable form",
			ok: dateProblems.length === 0,
			effort: "quick",
			detail:
				dateProblems.length === 0
					? "Every date uses the same written-month form."
					: dateProblems.map((d) => d.detail).join(" "),
			anchor: dateProblems[0]?.title,
		}),
	);

	/* Typography: the sizes a parser-friendly document uses. */
	const settings = resume.metadata?.settings;
	const scale = settings?.fontScale ?? 1;
	if (settings?.typography) {
		const t = settings.typography;
		const size = (v: number) => v * scale;
		checks.push(
			check({
				id: "typography-body",
				group: "parse-fit",
				title: `Body text is ${TYPE_RULES.bodyMin}–${TYPE_RULES.bodyMax}pt`,
				ok:
					size(t.body) >= TYPE_RULES.bodyMin &&
					size(t.body) <= TYPE_RULES.bodyMax,
				effort: "quick",
				detail: `Body is ${size(t.body).toFixed(1)}pt. Below ${TYPE_RULES.bodyMin}pt text extraction degrades; above ${TYPE_RULES.bodyMax}pt a one-page resume stops fitting on one page.`,
			}),
			check({
				id: "typography-name",
				group: "parse-fit",
				title: `Name is ${TYPE_RULES.nameMin}–${TYPE_RULES.nameMax}pt`,
				ok:
					size(t.name) >= TYPE_RULES.nameMin &&
					size(t.name) <= TYPE_RULES.nameMax,
				effort: "quick",
				detail: `Name is ${size(t.name).toFixed(1)}pt. Parsers find the name by position, so an extreme size either way works against them.`,
			}),
			check({
				id: "typography-heading",
				group: "parse-fit",
				title: `Section headings are ${TYPE_RULES.headingMin}–${TYPE_RULES.headingMax}pt`,
				ok:
					size(t.sectionHeading) >= TYPE_RULES.headingMin &&
					size(t.sectionHeading) <= TYPE_RULES.headingMax,
				effort: "quick",
				detail: `Headings are ${size(t.sectionHeading).toFixed(1)}pt.`,
			}),
		);
	}

	/* ── Impact ────────────────────────────────────────────────────────── */

	const bullets = bulletsOf(sections);
	const quantified = bullets.filter((b) => hasQuantification(b.text));
	const dutyLanguage = bullets.filter((b) => findDutyPhrase(b.text));

	checks.push(
		check({
			id: "quantified-bullets",
			group: "impact",
			title: "Bullets carry evidence, not just duties",
			ok: bullets.length === 0 || quantified.length / bullets.length >= 0.5,
			soft: true,
			effort: "deep",
			detail:
				bullets.length === 0
					? "There are no bullets to check yet."
					: `${quantified.length} of ${bullets.length} bullets name a number, a scale or a timeframe. Half or more is the usual bar; the rest read as responsibilities rather than results.`,
		}),
		check({
			id: "duty-language",
			group: "impact",
			title: "Bullets are written as achievements, not duties",
			ok: dutyLanguage.length === 0,
			soft: true,
			effort: "medium",
			detail:
				dutyLanguage.length === 0
					? "No duty phrasing found."
					: `${dutyLanguage.length} bullet${dutyLanguage.length === 1 ? "" : "s"} open with duty language (${dutyLanguage[0]?.text.slice(0, 40)}…). Start from what changed, not what you were responsible for.`,
			anchor: dutyLanguage[0]?.sectionId,
		}),
	);

	/* ── Brevity ───────────────────────────────────────────────────────── */

	const text = buildPlainText(resume);
	const words = wordCount(text);
	const roles = rolesOf(sections);
	const overlong = bullets.filter(
		(b) => b.text.length > LENGTH_RULES.maxBulletChars,
	);
	const thinRoles = roles.filter(
		(r) => r.bulletCount < LENGTH_RULES.minBulletsPerRole,
	);
	const fatRoles = roles.filter(
		(r) => r.bulletCount > LENGTH_RULES.maxBulletsPerRole,
	);

	checks.push(
		check({
			id: "word-count",
			group: "brevity",
			title: `Document is ${LENGTH_RULES.minWords}–${LENGTH_RULES.maxWords} words`,
			ok: words >= LENGTH_RULES.minWords && words <= LENGTH_RULES.maxWords,
			soft: words < LENGTH_RULES.minWords,
			effort: words > LENGTH_RULES.maxWords ? "deep" : "medium",
			detail: `${words} words. The range is what a recruiter reads in one pass: shorter reads as thin, longer is rarely read to the end.`,
		}),
		check({
			id: "bullets-per-role",
			group: "brevity",
			title: `Each role lists ${LENGTH_RULES.minBulletsPerRole}–${LENGTH_RULES.maxBulletsPerRole} bullets`,
			ok: thinRoles.length === 0 && fatRoles.length === 0,
			effort: "medium",
			detail:
				thinRoles.length === 0 && fatRoles.length === 0
					? "Every role is in range."
					: [
							thinRoles.length
								? `${thinRoles.length} role${thinRoles.length === 1 ? "" : "s"} under ${LENGTH_RULES.minBulletsPerRole} bullets (${thinRoles.map((r) => r.label).join(", ")}).`
								: "",
							fatRoles.length
								? `${fatRoles.length} role${fatRoles.length === 1 ? "" : "s"} over ${LENGTH_RULES.maxBulletsPerRole} bullets (${fatRoles.map((r) => r.label).join(", ")}).`
								: "",
						]
							.filter(Boolean)
							.join(" "),
			anchor: (thinRoles[0] ?? fatRoles[0])?.label,
		}),
		check({
			id: "bullet-length",
			group: "brevity",
			title: `No bullet runs past ${LENGTH_RULES.maxBulletChars} characters`,
			ok: overlong.length === 0,
			effort: "quick",
			detail:
				overlong.length === 0
					? "Every bullet is short enough to read in one line or two."
					: `${overlong.length} bullet${overlong.length === 1 ? "" : "s"} run past ${LENGTH_RULES.maxBulletChars} characters and wrap to three lines or more.`,
			anchor: overlong[0]?.sectionId,
		}),
	);

	const pageCount = options.pageCount ?? null;
	checks.push(
		check({
			id: "page-count",
			group: "brevity",
			title: `${LENGTH_RULES.minPages}–${LENGTH_RULES.maxPages} pages`,
			ok:
				pageCount !== null &&
				pageCount >= 1 &&
				pageCount <= LENGTH_RULES.maxPages,
			soft: pageCount === null,
			effort: "deep",
			detail:
				pageCount === null
					? "The page count is not known until the preview has compiled. Open the preview and this resolves."
					: `${pageCount} page${pageCount === 1 ? "" : "s"}. Most applications are read as one page early in a career and two later; a third is rarely read.`,
		}),
	);

	/* ── Style ─────────────────────────────────────────────────────────── */

	const info = resume.metadata?.personalInfo;
	const missingContact = [
		["email", info?.email],
		["phone", info?.phone],
		["location", info?.location],
	]
		.filter(([, value]) => !value || String(value).trim() === "")
		.map(([key]) => key);

	checks.push(
		check({
			id: "contact-complete",
			group: "style",
			title: "Contact details are complete",
			ok: missingContact.length === 0,
			effort: "quick",
			detail:
				missingContact.length === 0
					? "Email, phone and location are all present."
					: `Missing ${missingContact.join(", ")}. A parser fills a candidate record from these three fields; a blank one costs a callback.`,
		}),
		check({
			id: "repetition",
			group: "style",
			title: "The same phrase is not repeated",
			ok: repeatedPhrase(text) === null,
			soft: true,
			effort: "medium",
			detail:
				repeatedPhrase(text) === null
					? "No phrase is repeated enough to read as padding."
					: `"${repeatedPhrase(text)}" appears more than three times. Repetition reads as filler and counts against keyword density.`,
		}),
		check({
			id: "every-entry-dated",
			group: "style",
			title: "Every dated entry has a date",
			ok: undatedEntries(sections).length === 0,
			effort: "quick",
			detail:
				undatedEntries(sections).length === 0
					? "Every experience and education entry carries a date."
					: `${undatedEntries(sections).length} entr${undatedEntries(sections).length === 1 ? "y" : "ies"} with no start date. An undated entry is filed as current work by some parsers and dropped by others.`,
		}),
	);

	const ranked = [...checks].sort(
		(a, b) =>
			STATUS_RANK[a.status] - STATUS_RANK[b.status] ||
			EFFORT_RANK[a.effort] - EFFORT_RANK[b.effort] ||
			GROUP_RANK[a.group] - GROUP_RANK[b.group],
	);

	return {
		checks,
		ranked,
		counts: {
			pass: checks.filter((c) => c.status === "pass").length,
			fail: checks.filter((c) => c.status === "fail").length,
			advice: checks.filter((c) => c.status === "advice").length,
		},
	};
}

/** A phrase (3+ words) that appears more than three times, or null. */
export function repeatedPhrase(text: string): string | null {
	const words = text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? [];
	const counts = new Map<string, number>();
	for (let i = 0; i + 2 < words.length; i++) {
		const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
		counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
	}
	for (const [phrase, count] of counts) {
		if (count > 3) return phrase;
	}
	return null;
}

/** Entries in experience/education that carry no start date at all. */
function undatedEntries(sections: readonly ResumeSection[]): string[] {
	const out: string[] = [];
	for (const section of sections) {
		if (section.type !== "experience" && section.type !== "education") continue;
		if (!Array.isArray(section.content.data)) continue;
		for (const item of section.content.data as Array<Record<string, unknown>>) {
			const start = item.startDate ?? item.graduationDate ?? item.year;
			if (!start || String(start).trim() === "") {
				out.push(section.id);
			}
		}
	}
	return out;
}
