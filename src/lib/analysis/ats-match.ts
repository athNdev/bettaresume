import { buildParseAuditInput } from "@/features/resume-editor/lib/review-input";
import type { Resume } from "@/features/resume-editor/types";
import { analyzeHighlights } from "@/lib/analysis/metrics";
import {
	auditParseFidelity,
	type ParseDiagnostic,
} from "@/lib/analysis/parse-fidelity";
import {
	canonicalizeSkill,
	expandSkillVariants,
	findConfidentSkills,
	isConfidentMention,
	type SkillMatch,
} from "@/lib/analysis/skills";

/**
 * Job-target match analysis — Feature 5 from docs/ROADMAP.md.
 *
 * ## Deliberately no overall score
 *
 * The reference category leader publishes a 1-100 number and users report 94/100 on
 * resumes that human reviewers reject, with 82-vs-20 disagreement between two tools on
 * the same file. A single number cannot be argued with, so it cannot be trusted. This
 * returns discrete measurements instead: how many required keywords are covered, which
 * ones are missing, and three separately-explained dimensions.
 *
 * ## Required beats preferred
 *
 * The most defensible weighting found in the research: "required qualifications affect
 * your score more than preferred skills". This module does not collapse that into a
 * number — it keeps the two lists separate so the weighting stays visible.
 *
 * ## Acronyms both ways
 *
 * Workday matches `AWS` but not `Amazon Web Services`. When a keyword canonicalises,
 * every surface form is searched, so writing either form counts. When it is missing, the
 * module suggests writing both.
 */

/**
 * The requirement markers, in ONE place.
 *
 * `extractKeywords` and the keyword-normalising strip in `analyzeJobMatch` each used
 * to carry their own copy of this list, and they drifted: "must have" was in the first
 * and not the second, so "Must have: Docker" came out as the keyword
 * "must have: Docker" and matched nothing. One list, one regex, both call sites.
 */
const MARKER_LABELS = [
	"required",
	"must have",
	"must-have",
	"must",
	"essential",
	"minimum",
	"preferred",
	"nice to have",
	"nice-to-have",
	"desired",
	"bonus",
];

const MARKER_LABEL_RE = new RegExp(
	`^(${MARKER_LABELS.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\s*[:\\-–]\\s*`,
	"i",
);

/**
 * Phrases that mark a requirement as mandatory.
 *
 * The two open-ended phrases (`we are looking for`, `you have`) require a delimiter
 * immediately after them. They used to be bare word matches, which classified the
 * prose line "We are looking for someone who can ship." as a *requirement* and told the
 * user it was missing — advice generated from a sentence, not from a skill.
 */
const REQUIRED_MARKERS = [
	/\brequired\b/i,
	/\bmust\b/i,
	/\bmust-have\b/i,
	/\bessential\b/i,
	/\bminimum\b/i,
	/\bwe are looking for\b\s*[:\-–]/i,
	/\byou have\b\s*[:\-–]/i,
];

/** Phrases that mark a requirement as optional. */
const PREFERRED_MARKERS = [
	/\bpreferred\b/i,
	/\bnice to have\b/i,
	/\bnice-to-have\b/i,
	/\bdesired\b/i,
	/\bbonus\b/i,
	/\bplus\b/i,
	/\ba plus\b/i,
	/\badvantageous\b/i,
];

/** Weight used only for ordering the report, never collapsed into a total. */
export const REQUIRED_WEIGHT = 3;
export const PREFERRED_WEIGHT = 1;

export type KeywordRequirement = "required" | "preferred";

export interface KeywordCoverage {
	keyword: string;
	canonical?: string;
	covered: boolean;
	/**
	 * The resume contains this keyword, but only as an ambiguous alias with no
	 * supporting context — `AWS` in a welding qualification, `Azure` as a colour,
	 * `Node` in a graph. Deliberately NOT counted as covered: a false "covered" sends
	 * someone to an interview without the skill, which is the direction this whole
	 * module is built to avoid.
	 */
	uncertain?: boolean;
	surface?: string;
	requirement: KeywordRequirement;
}

export interface AtsMatchReport {
	keywords: KeywordCoverage[];
	/** Required keywords covered, out of required keywords seen. */
	requiredCovered: number;
	requiredTotal: number;
	preferredCovered: number;
	preferredTotal: number;
	impact: { quantified: number; total: number };
	brevity: { totalWords: number; bulletsPerEntry: number[] };
	style: { violations: number; errors: number; diagnostics: ParseDiagnostic[] };
	/** Ordered so the most valuable gaps come first. Never summed into a score. */
	suggestions: string[];
}

interface JobTargetLike {
	title?: string;
	company?: string;
	description?: string;
	keywords?: string[];
}

function classifyRequirement(text: string): KeywordRequirement {
	// Preferred wins ties: a job listing "3+ years Python, Python testing preferred"
	// marks the skill itself as required and only the testing as preferred, and when a
	// keyword carries both markers the softer reading is the safer claim.
	if (PREFERRED_MARKERS.some((re) => re.test(text))) return "preferred";
	if (REQUIRED_MARKERS.some((re) => re.test(text))) return "required";
	return "preferred";
}

/**
 * Is this line a sentence rather than a skill or a requirement?
 *
 * Only consulted for lines carrying NO requirement marker. "Nice to have: some
 * Kubernetes exposure." is a requirement that happens to end in a full stop, so marker
 * lines are exempt; an unmarked line of that shape is prose the writer is saying out
 * loud, and turning it into a keyword produced advice like *Required but not
 * evidenced: "We are looking for someone who can ship."*
 */
function looksLikeProse(text: string): boolean {
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length < 6) return false;
	return /[.!?;]$/.test(text) || words.length >= 12;
}

/** Split a job description into candidate keyword phrases. */
export function extractKeywords(description: string): string[] {
	if (!description) return [];
	const chunks = description
		.split(/[\n•·]|\r\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	const out = new Set<string>();
	/** Dedupe on the *normalised* keyword, not the raw line. */
	const seenNormalised = new Set<string>();
	for (const chunk of chunks) {
		// Strip a leading bullet marker and any "required:"/"preferred:" prefix,
		// keeping the marker so the requirement can still be classified.
		const cleaned = chunk
			.replace(/^[-*–—]\s*/, "")
			.replace(MARKER_LABEL_RE, "$1: ");
		if (cleaned.length < 3) continue;

		const bare = cleaned.replace(MARKER_LABEL_RE, "").trim();
		if (bare.length < 3) continue;

		// A job description repeating one skill under two markers ("Required: Docker"
		// and "Must have: Docker") is one requirement, not two. Dedupe has to happen
		// here rather than on `cleaned`, because the marker is what differed — and the
		// UI renders each entry as its own React key and its own "n of m" count.
		const normalised = bare.toLowerCase();
		if (seenNormalised.has(normalised)) continue;

		if (!MARKER_LABEL_RE.test(cleaned) && looksLikeProse(bare)) continue;
		seenNormalised.add(normalised);
		out.add(cleaned);
	}
	return [...out];
}

/** All the text in a resume that a keyword could legitimately appear in. */
function resumeText(resume: Resume): string {
	const parts: string[] = [];
	for (const section of resume.sections ?? []) {
		if (section.visible === false) continue;
		const content = section.content as {
			title?: string;
			data?: unknown;
			html?: string;
		};
		if (content?.title) parts.push(content.title);
		if (content?.html) parts.push(content.html);
		const data = content?.data;
		if (Array.isArray(data)) {
			for (const row of data) {
				if (typeof row !== "object" || row === null) continue;
				for (const [_k, v] of Object.entries(row as Record<string, unknown>)) {
					if (typeof v === "string") parts.push(v);
					else if (Array.isArray(v)) {
						for (const item of v)
							if (typeof item === "string") parts.push(item);
					}
				}
			}
		} else if (data && typeof data === "object") {
			for (const v of Object.values(data as Record<string, unknown>)) {
				if (typeof v === "string") parts.push(v);
			}
		}
	}
	return parts.join("\n");
}

function countWords(text: string): number {
	const stripped = text.replace(/<[^>]*>/g, " ");
	const matches = stripped.match(/[A-Za-z0-9][A-Za-z0-9'’./-]*/g);
	return matches ? matches.length : 0;
}

/**
 * Does the resume mention this keyword, in any known surface form?
 *
 * Tries, in order: the literal keyword, its canonical skill's variants, then a
 * confident alias-map match. The word-boundary fallback exists for plain-English
 * keywords ("team leadership") that no taxonomy covers.
 *
 * Every surface that belongs to the alias map is gated on `isConfidentMention`, not just
 * the alias-map fallback at the end. It used to return `covered: true` on the first
 * literal regex hit, which meant the AWS/Azure/Node disambiguation layer was never
 * consulted on the one path that reports coverage to a user: JD "Required: AWS" against
 * a resume reading "Held an AWS certified welding inspector qualification" was reported
 * as fully covered while `findConfidentSkills` on the same text returns `[]`.
 */
function findCoverage(
	keyword: string,
	text: string,
	skills: SkillMatch[],
): {
	covered: boolean;
	uncertain?: boolean;
	surface?: string;
	canonical?: string;
} {
	const canonical = canonicalizeSkill(keyword);

	/** Resolve a hit: confident -> covered, ambiguous -> uncertain, never covered. */
	const accept = (surface: string) => {
		if (canonical && !isConfidentMention(canonical, surface, text)) {
			return { covered: false, uncertain: true, surface, canonical };
		}
		return { covered: true, surface, ...(canonical ? { canonical } : {}) };
	};

	const literal = new RegExp(
		`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
		"i",
	);
	const literalMatch = literal.exec(text);
	if (literalMatch) {
		return accept(literalMatch[0]);
	}

	if (canonical) {
		for (const variant of expandSkillVariants(canonical)) {
			const re = new RegExp(
				`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
				"i",
			);
			const m = re.exec(text);
			// Gated too: a JD asking for "Amazon Web Services" must not be satisfied by
			// the bare word "AWS" in an unrelated context.
			if (m) return accept(m[0]);
		}
	}

	const viaMap = skills.find(
		(s) => canonicalizeSkill(s.canonical) === canonical,
	);
	if (viaMap) {
		return {
			covered: true,
			surface: viaMap.surface,
			...(canonical ? { canonical } : {}),
		};
	}

	// `canonicalizeSkill` returns null for unknown; the interface uses undefined so the
	// key is simply absent rather than present-and-null in stored JSON.
	return canonical ? { covered: false, canonical } : { covered: false };
}

export interface AtsMatchInput {
	resume: Resume;
	jobTarget: JobTargetLike;
}

/** Run the full analysis. */
export function analyzeJobMatch({
	resume,
	jobTarget,
}: AtsMatchInput): AtsMatchReport {
	const text = resumeText(resume);
	const skills = findConfidentSkills(text);

	const phrases =
		jobTarget.keywords && jobTarget.keywords.length > 0
			? jobTarget.keywords
			: extractKeywords(jobTarget.description ?? "");

	// Dedupe on the normalised keyword here too, so an explicit `keywords` array gets
	// the same treatment as a description. Two entries for one skill rendered as
	// "2 of 2" under a single bucket and collided on the React key `Required-Docker`.
	const seen = new Set<string>();
	const keywords: KeywordCoverage[] = [];
	for (const phrase of phrases) {
		const bare = phrase.replace(MARKER_LABEL_RE, "").trim();
		if (bare.length < 3) continue;
		const key = bare.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		const requirement = classifyRequirement(phrase);
		const hit = findCoverage(bare, text, skills);
		keywords.push({ keyword: bare, ...hit, requirement });
	}

	// Impact: bullets carrying evidence.
	let quantified = 0;
	let total = 0;
	const bulletsPerEntry: number[] = [];
	for (const section of resume.sections ?? []) {
		if (section.visible === false) continue;
		const data = (section.content as { data?: unknown }).data;
		if (!Array.isArray(data)) continue;
		for (const row of data) {
			const highlights = (row as { highlights?: unknown })?.highlights;
			if (!Array.isArray(highlights)) continue;
			const report = analyzeHighlights(highlights as string[]);
			if (report.total === 0) continue;
			bulletsPerEntry.push(report.total);
			total += report.total;
			quantified += report.quantifiedCount;
		}
	}

	// Same bridge the Review sheet uses. This used to pass `dates: []`, which made
	// `checkDateConsistency` structurally unreachable here: one engine, two tabs, and
	// only the Review tab could report a mixed-format timeline. Mixed date formats are
	// the top-tier parser risk, so the Job-match panel labelling this count
	// "parser-fit issues" was under-reporting exactly the thing it claimed to cover.
	const diagnostics = auditParseFidelity(buildParseAuditInput(resume));

	const requiredTotal = keywords.filter(
		(k) => k.requirement === "required",
	).length;

	const missingRequired = keywords.filter(
		(k) => k.requirement === "required" && !k.covered,
	);
	const missingPreferred = keywords.filter(
		(k) => k.requirement === "preferred" && !k.covered,
	);

	const suggestions: string[] = [];
	for (const k of missingRequired) {
		const both = k.canonical ? expandSkillVariants(k.canonical) : [];
		const hint =
			both.length > 1
				? ` Write it as both "${both[0]}" and "${both[1]}" — parsers match the acronym and readers scan for the expansion.`
				: "";
		suggestions.push(
			k.uncertain
				? `Required but not evidenced: "${k.keyword}". The resume mentions "${k.surface}", which here reads as something other than ${k.canonical} — if you mean the skill, name the service or tool next to it.${hint}`
				: `Required but not evidenced: "${k.keyword}". If you have done it, say so with a concrete example.${hint}`,
		);
	}
	for (const k of missingPreferred) {
		suggestions.push(
			k.uncertain
				? `Nice to have, not evidenced: "${k.keyword}" — the resume mentions "${k.surface}", which reads as a different meaning.`
				: `Nice to have, not evidenced: "${k.keyword}".`,
		);
	}
	if (quantified < total) {
		suggestions.push(
			`${total - quantified} of ${total} bullets make a claim with no number. Add evidence or drop them.`,
		);
	}
	// The required bucket is the half of this report a job seeker most needs, so its
	// absence has to be explained rather than left implicit. The panel renders a count
	// of zero and nothing else, which reads as "no requirements" rather than "nothing
	// was marked required".
	if (keywords.length > 0 && requiredTotal === 0) {
		suggestions.push(
			"Nothing in this job description was marked as required, so every keyword below is treated as preferred. Mark the must-haves (for example \"Required: …\") so the two can be weighed separately.",
		);
	}
	for (const d of diagnostics) {
		if (d.severity === "error") suggestions.push(`Fix: ${d.title}`);
	}

	return {
		keywords,
		requiredCovered: keywords.filter(
			(k) => k.requirement === "required" && k.covered,
		).length,
		requiredTotal,
		preferredCovered: keywords.filter(
			(k) => k.requirement === "preferred" && k.covered,
		).length,
		preferredTotal: keywords.filter((k) => k.requirement === "preferred")
			.length,
		impact: { quantified, total },
		brevity: { totalWords: countWords(text), bulletsPerEntry },
		style: {
			violations: diagnostics.length,
			errors: diagnostics.filter((d) => d.severity === "error").length,
			diagnostics,
		},
		suggestions,
	};
}
