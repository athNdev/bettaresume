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

/** Phrases that mark a requirement as mandatory. */
const REQUIRED_MARKERS = [
	/\brequired\b/i,
	/\bmust\b/i,
	/\bmust-have\b/i,
	/\bessential\b/i,
	/\bminimum\b/i,
	/\bwe are looking for\b/i,
	/\byou have\b/i,
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

/** Split a job description into candidate keyword phrases. */
export function extractKeywords(description: string): string[] {
	if (!description) return [];
	const chunks = description
		.split(/[\n•·]|\r\n/)
		.map((line) => line.trim())
		.filter(Boolean);

	const out = new Set<string>();
	for (const chunk of chunks) {
		// Strip a leading bullet marker and any "required:"/"preferred:" prefix,
		// keeping the marker so the requirement can still be classified.
		const cleaned = chunk
			.replace(/^[-*–—]\s*/, "")
			.replace(MARKER_LABEL_RE, "$1: ");
		if (cleaned.length < 3) continue;
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
 */
function findCoverage(
	keyword: string,
	text: string,
	skills: SkillMatch[],
): { covered: boolean; surface?: string; canonical?: string } {
	const literal = new RegExp(
		`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
		"i",
	);
	const literalMatch = literal.exec(text);
	if (literalMatch) {
		return { covered: true, surface: literalMatch[0] };
	}

	const canonical = canonicalizeSkill(keyword);
	if (canonical) {
		for (const variant of expandSkillVariants(canonical)) {
			const re = new RegExp(
				`\\b${variant.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
				"i",
			);
			const m = re.exec(text);
			if (m) return { covered: true, surface: m[0], canonical };
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

	const keywords: KeywordCoverage[] = phrases.map((phrase) => {
		const requirement = classifyRequirement(phrase);
		const bare = phrase.replace(MARKER_LABEL_RE, "").trim();
		const hit = findCoverage(bare, text, skills);
		return { keyword: bare, ...hit, requirement };
	});

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

	const diagnostics = auditParseFidelity({
		sections: (resume.sections ?? []).map((s) => ({
			type: s.type,
			title: (s.content as { title?: string })?.title?.trim() || s.type,
			visible: s.visible,
		})),
		dates: [],
		dateFormat: resume.metadata?.settings?.dateFormat,
		layout: resume.metadata?.settings?.layout,
	});

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
			`Required but not evidenced: "${k.keyword}". If you have done it, say so with a concrete example.${hint}`,
		);
	}
	for (const k of missingPreferred) {
		suggestions.push(`Nice to have, not evidenced: "${k.keyword}".`);
	}
	if (quantified < total) {
		suggestions.push(
			`${total - quantified} of ${total} bullets make a claim with no number. Add evidence or drop them.`,
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
		requiredTotal: keywords.filter((k) => k.requirement === "required").length,
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
