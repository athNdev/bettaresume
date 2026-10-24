import { buildParseAuditInput } from "@/features/resume-editor/lib/review-input";
import type { Resume, ResumeSection } from "@/features/resume-editor/types";
import { findDutyPhrase, hasQuantification } from "@/lib/analysis/metrics";
import { auditParseFidelity } from "@/lib/analysis/parse-fidelity";
import { AA_BODY, contrastRatio, parseColor } from "@/lib/color/contrast";
import { buildPlainText, visibleSections } from "@/lib/export/text";
import { type FitReport, formatMm, ptToMm } from "@/lib/layout/page-fit";
import { resolveTypstFont } from "@/lib/typst/fonts";

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
 * text extraction degrade; above 20pt a resume reads as a poster. From the
 * 2026 formatting rules, corroborated across sources. The name band is the
 * scale's 16–20pt (docs/research/template-research.md §3); `size()` folds in
 * `fontScale`, so this reads the rendered size, not the stored knob.
 */
export const TYPE_RULES = {
	bodyMin: 10,
	bodyMax: 12,
	nameMin: 16,
	nameMax: 20,
	headingMin: 11,
	headingMax: 13,
} as const;

/**
 * Readability bands — advice, except the print floor.
 *
 * All bands are **rendered** values. The line-spacing band is Butterick's 120–145%
 * print band, widened to 1.2–1.6 so the knob's own range is inside it; line length is
 * the resume-pragmatic 70–110 characters (prose guidance is 45–90, but every
 * conventional resume layout runs longer and gets away with it because most lines are
 * short bullets — the failure mode we care about is the return sweep past ~110); the
 * margin floor is the 0.5in (36pt = 12.7mm) clamp the presets sit on.
 *
 * The research sketched the margin floor at 32px (24pt). That predates the point-unit
 * migration: 24pt is under the clamp, so nothing could render there. The check reads the
 * real floor instead, which is reachable only by stored values that bypass the
 * serialiser's normalisation (legacy rows, imports, direct API writes).
 */
export const READABILITY_RULES = {
	lineHeight: { min: 1.2, max: 1.6 },
	lineChars: { min: 70, max: 110 },
	marginMinPt: 36,
	lastPageFillMin: 0.2,
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
 *
 * `fit` is the measured page-fit report from the Typst probe. Every check that needs a
 * *rendered* value (line length, last-page fill, spill millimetres) reads it here, and
 * reports "not measured yet" rather than estimating.
 */
export function buildRubric(
	resume: Resume,
	options: { pageCount?: number | null; fit?: FitReport | null } = {},
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

	/*
	 * Legibility.
	 *
	 * A resume is a document someone reads, possibly after printing it in black and white,
	 * and the colour picker in the formatting toolbar lets the user set `text` to anything.
	 * Nothing checked that the result was visible — the contrast maths in
	 * `src/lib/color/contrast.ts` existed and was called by nothing.
	 *
	 * WCAG AA body text is the bar: 4.5:1. The detail names both ratios and the pair that
	 * produced them, because "increase contrast" is not actionable and "your body text on
	 * your background is 2.1:1" is.
	 */
	if (settings?.colors) {
		const background = parseColor(settings.colors.background).rgb;
		const bodyRatio = contrastRatio(
			parseColor(settings.colors.text).rgb,
			background,
		);
		const mutedRatio = contrastRatio(
			parseColor(settings.colors.secondary).rgb,
			background,
		);
		const round = (n: number) => Math.round(n * 10) / 10;

		checks.push(
			check({
				id: "contrast-body",
				group: "parse-fit",
				title: "Body text is readable against the page",
				ok: bodyRatio >= AA_BODY,
				effort: "quick",
				detail:
					bodyRatio >= AA_BODY
						? `Body text is ${round(bodyRatio)}:1 against the page, above the ${AA_BODY}:1 a reader needs.`
						: `Body text is ${round(bodyRatio)}:1 against the page. WCAG AA asks for ${AA_BODY}:1; below that the document is hard to read on screen and usually unreadable printed greyscale. Darken the text colour or lighten the page.`,
			}),
			check({
				id: "contrast-muted",
				group: "parse-fit",
				title: "Secondary text is readable against the page",
				ok: mutedRatio >= AA_BODY,
				soft: true,
				effort: "quick",
				detail:
					mutedRatio >= AA_BODY
						? `Dates and locations are ${round(mutedRatio)}:1 against the page.`
						: `Dates and locations are ${round(mutedRatio)}:1 against the page, below the ${AA_BODY}:1 a reader needs. They are still content, not decoration.`,
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

	const fit = options.fit ?? null;
	const pageCount = options.pageCount ?? fit?.pages ?? null;
	const spill =
		fit && fit.target !== null && fit.overMm >= 0.5
			? ` ${formatMm(fit.overMm)} of that is spill onto page ${fit.target + 1}${
					fit.overflow ? `, starting at “${fit.overflow.label}”` : ""
				}.`
			: "";
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
					: `${pageCount} page${pageCount === 1 ? "" : "s"}.${spill} Most applications are read as one page early in a career and two later; a third is rarely read.`,
			anchor: fit?.overflow?.section || fit?.overflow?.label,
		}),
	);

	/*
	 * Readability: advice for taste, a failure only where the document would not print.
	 *
	 * These are named rows in the existing four dimensions — no new group, no score. The
	 * rubric is a projection of the document, and so is this: everything below reads the
	 * settings or the probe, never a stored verdict.
	 */
	const lineHeight = settings?.lineHeight ?? 1.35;
	const lineBand = READABILITY_RULES.lineHeight;
	// A step of 0.1 means most values are `1.3`/`1.5`, but the default is 1.35 and a
	// whole number should still read as `1.0`, not `1`.
	const showRatio = (value: number) =>
		Number.isInteger(value) ? value.toFixed(1) : String(value);
	checks.push(
		check({
			id: "line-spacing",
			group: "style",
			title: "Line spacing is in the readable range",
			ok: lineHeight >= lineBand.min && lineHeight <= lineBand.max,
			soft: true,
			effort: "quick",
			detail:
				lineHeight >= lineBand.min && lineHeight <= lineBand.max
					? `Line spacing is ${showRatio(lineHeight)}, in the ${lineBand.min}–${lineBand.max} range print text is read comfortably in.`
					: lineHeight < lineBand.min
						? `Line spacing is ${showRatio(lineHeight)}. Below ${lineBand.min} printed lines start to tangle when the page is photocopied or faxed. The setting is in the formatting toolbar.`
						: `Line spacing is ${showRatio(lineHeight)}. Loose spacing reads as coursework; you are paying for it in page height.`,
		}),
	);

	const lineChars = fit?.lineChars ?? null;
	const charBand = READABILITY_RULES.lineChars;
	checks.push(
		check({
			id: "line-length",
			group: "style",
			title: "Lines are a readable length",
			ok:
				lineChars !== null &&
				lineChars >= charBand.min &&
				lineChars <= charBand.max,
			soft: true,
			effort: "medium",
			detail:
				lineChars === null
					? "The line length is measured by the page-fit probe when the preview compiles."
					: lineChars > charBand.max
						? `About ${Math.round(lineChars)} characters fit on a full line. Above ~${charBand.max} the eye loses the line on the return sweep. Widen the margins or raise the body size slightly — or split the widest section into shorter bullets.`
						: lineChars < charBand.min
							? `About ${Math.round(lineChars)} characters fit on a full line. Below ${charBand.min} a bullet wraps sooner than it needs to; narrower margins give it room.`
							: `About ${Math.round(lineChars)} characters fit on a full line. Fine for bullet-led text; prose usually reads better at 45–90.`,
		}),
	);

	const margins = {
		top: 43,
		right: 50,
		bottom: 43,
		left: 50,
		...settings?.margins,
	};
	const smallest = [
		["top", margins.top],
		["right", margins.right],
		["bottom", margins.bottom],
		["left", margins.left],
	] as const;
	const tightest = smallest.reduce((a, b) => (b[1] < a[1] ? b : a));
	checks.push(
		check({
			id: "margins-printable",
			group: "style",
			title: "Margins keep text printable",
			ok: tightest[1] >= READABILITY_RULES.marginMinPt,
			effort: "quick",
			detail:
				tightest[1] >= READABILITY_RULES.marginMinPt
					? `Margins are ${ptToMm(tightest[1]).toFixed(1)} mm or wider everywhere.`
					: `Smallest margin is ${ptToMm(tightest[1]).toFixed(1)} mm (${tightest[0]}). Printers cannot print within about 5 mm of the paper edge, so this may lose text on paper; ${ptToMm(READABILITY_RULES.marginMinPt).toFixed(1)} mm (0.5 in) is the floor this app uses.`,
		}),
	);

	/*
	 * Font substitution, stated as a fact about rendering rather than taste. There is no
	 * "ATS-safe font" verdict: the parsing risk is embedding and glyph coverage (both
	 * already checked), not the family's fashion.
	 */
	const font = resolveTypstFont(settings?.fontFamily ?? "Inter");
	checks.push(
		check({
			id: "font-embedded",
			group: "parse-fit",
			title: "The export uses the font you picked",
			ok: !font.substituted,
			soft: true,
			effort: "quick",
			detail: font.substituted
				? `“${font.requested}” is not embedded in the export engine. The PDF renders as “${font.typstFamily}” — the same letter widths, so line and page breaks are unchanged.`
				: `${font.requested} is embedded in the PDF exactly as picked.`,
		}),
	);

	const lastPageFill = fit?.lastPageFill ?? null;
	checks.push(
		check({
			id: "last-page-fill",
			group: "brevity",
			title: "The last page is substantial",
			ok:
				lastPageFill === null ||
				lastPageFill >= READABILITY_RULES.lastPageFillMin,
			soft: true,
			effort: "medium",
			detail:
				lastPageFill === null
					? "How full the last page is comes from the page-fit probe when the preview compiles."
					: fit && fit.pages <= 1
						? "The document fits on one page."
						: lastPageFill < READABILITY_RULES.lastPageFillMin
							? `Page ${fit?.pages} holds about ${Math.round(lastPageFill * 100)}% of a page. A page with a few lines reads as an accident; either pull the content back to one page (the meter has suggestions) or let the layout breathe to two.`
							: `Page ${fit?.pages} holds about ${Math.round(lastPageFill * 100)}% of a page, which reads as deliberate.`,
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
