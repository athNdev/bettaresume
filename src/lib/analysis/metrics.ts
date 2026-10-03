/**
 * Bullet quality analysis — DETECTION ONLY.
 *
 * Flags bullets that make a claim without evidence, and bullets written as job
 * description rather than accomplishment. Pure string analysis: no model, no network,
 * no API key, nothing stored.
 *
 * ## Why this detects and never invents
 *
 * Quantification is the highest-demand transformation in this category — Rezi ships a
 * dedicated "Generate Bullet With Key Numbers" button for it. But its *generation* half
 * is where this category's trust leaks. The two documented hallucination failures found
 * in the 2026-10-03 research were both generation failures: Rezi users reporting a
 * suggested job "completely unrelated to my experience", and a commercial parser
 * reportedly inventing "AWS" on a resume that never mentioned it.
 *
 * Inventing a metric puts a fabricated claim in a document the user will sign their name
 * to and send to an employer. Detecting the absence of a number costs nothing and can
 * never be wrong in that direction.
 *
 * If asked to "fix" a bullet, generate **questions to answer**, not answers.
 *
 * See docs/ROADMAP.md, Feature 7.
 */

/** A stated rate. Strong evidence even when the counted noun is unfamiliar. */
const RATE =
	/\bper\s+(?:day|week|month|year|hour|user|customer|employee|request|query|km|mile|mileage)\b/i;

/** Compact durations: 2h, 30m, 3wk. Avoids bare `m`, which is ambiguous with million. */
const DURATION = /\b\d+(?:\.\d+)?\s?(?:h|hr|hrs|min|mins|d|wk|wks|yr|yrs)\b/i;

/** Multipliers that imply scale without needing a unit noun. */
const MULTIPLIER =
	/(\d[\d,]*\.?\d*\s?(?:k|m|bn|b)\b|\b(?:thousand|million|billion)\b|\b\d[\d,]*\s?(?:x|×)\b|\b(?:doubled|tripled|quadrupled|halved)\b)/i;

const CURRENCY =
	/[$€£¥]\s?\d|\b\d[\d,]*\.?\d*\s?(?:usd|eur|gbp|inr|aud|cad)\b|\b\d[\d,]*\.?\d*\s?(?:dollars|euros|pounds|rupees)\b/i;

const PERCENT = /\d\s?(?:%|percent\b|percentage\b)|\bper cent\b/i;

/**
 * A bare count followed by a unit noun. Requires the noun so that version strings,
 * product codes and years do not masquerade as achievements.
 */
const COUNT_WITH_UNIT =
	/\b\d[\d,]*\.?\d*\+?\s+(?:users?|customers?|clients?|students?|employees?|engineers?|developers?|people|persons?|teams?|endpoints?|requests?|records?|rows?|files?|projects?|reports?|hours?|days?|weeks?|months?|years?|sites?|locations?|regions?|markets?|orders?|downloads?|installs?|queries?|tests?|apis|components?|modules?|repositories|commits?|releases?|versions?|languages?|services?|tenants?|accounts?|subscribers?|members?|candidates?|resumes?|tickets?|incidents?|alerts?|pages?|documents?|datasets?|models?|experiments?|countries?|cities|offices|stores|clinics|patients?|orders?|features?|quarters?|invoices?|deployments?|migrations?|errors?|bugs?|scripts?|jobs?|clusters?|nodes?|pods?|domains?|zones?|cohorts?|variants?|prototypes?|cases?|reviews?|locations?|properties?|listings?|rooms?|beds?|seats?|attendees?)\b/i;

/**
 * Things that contain digits but prove nothing about impact. Stripped before testing.
 *
 * Without this, "ISO-27001", "B2B SaaS", "COVID-19", "v2.1", "24/7 support" and
 * "2019-2024" all read as quantified achievements, and the warning becomes noise. A
 * detector that cries wolf on every bullet gets dismissed, which makes it worse than
 * having none.
 */
const NON_QUANTIFIERS: RegExp[] = [
	/\bv?\d+\.\d+(?:\.\d+)*\b/g, // versions: v2.1, 2.1.0
	/\b\d{4}-\d{2}-\d{2}\b/g, // ISO dates: 2024-01-31
	/\b\d{4}\/\d{1,2}\b/g, // 2024/01
	/\b[A-Z]{2,}-\d+\b/g, // ISO-27001, SOC-2
	/\b\d+\s?\/\s?\d+\s?(?:h|hr|hrs|day|days|week|weeks|month|months|year|years)\b/gi, // 24/7
	/\b(?:19|20)\d{2}\b/g, // bare years
	/\bQ[1-4]\s?(?:19|20)?\d{2}\b/gi, // Q3 2024
	/\b[A-Za-z]+\d+[A-Za-z]+\b/g, // camelCase/sku-ish: OAuth2, GitHub3
	/\b[a-z]{2,}-[a-z]+-\d+\b/g, // cloud regions: eu-west-1, us-east-2
	/(?<=\w)-(\d+)\b/g, // any trailing number bound by a hyphen
];

/** Duty language: describes the job, not the result. */
const DUTY_PHRASES: RegExp[] = [
	/\bresponsible for\b/i,
	/\bin charge of\b/i,
	/\bassisted with\b/i,
	/\bhelped (?:with|out)?\b/i,
	/\bworked (?:on|with)\b/i,
	/\bparticipated in\b/i,
	/\bsupported (?:the )?(?:team|project|process)\b/i,
	/\bcontributed to\b/i,
	/\bwas tasked with\b/i,
	/\binvolved in\b/i,
	/\bday[- ]to[- ]day (?:duties|tasks|activities)\b/i,
	/\bmaintained existing\b/i,
	/\bperformed (?:administrative|clerical|general)\b/i,
];

/**
 * Verbs that imply ownership and outcome rather than activity.
 *
 * Matched as STEMS plus an inflection suffix, because resumes mix tenses freely --
 * "Led the migration", "Lead a team of 8", "Migrating 40k rows". A list of only past
 * participles misses the plain present entirely.
 */
const STRONG_VERB_STEMS =
	"led|lead|ship|build|creat|design|launch|reduc|increas|grew|grow|cut|sav|generat|deliver|establish|negotiat|secur|own|drive|elimin|rewrit|rewram|migrat|automat|optimi[sz]|streamlin|orchestrat|champion|standardiz|revamp|accelerat|consolidat";

const STRONG_VERBS = new RegExp(
	`\\b(?:${STRONG_VERB_STEMS})(?:s|ed|e[sd]|ing)?\\b`,
	"i",
);

/** First-person pronouns — Rezi flags these. */
const PERSONAL_PRONOUN = /\b(?:i|me|my|mine|myself|we|our|ours|us)\b/i;

/** Passive voice, used as a weak signal only (not a hard failure). */
const PASSIVE = /\b(?:was|were|been|being|is|are|be)\s+\w+(?:ed|en)\b/i;

export type BulletSeverity = "none" | "advice" | "warning";

export interface BulletDiagnosis {
	/** The bullet as analysed. */
	text: string;
	/** True when a number, percentage, currency or multiplier was found. */
	quantified: boolean;
	/** The duty phrase that matched, if any. */
	dutyPhrase: string | null;
	/** A strong/ownership verb was present. */
	hasStrongVerb: boolean;
	/** A first-person pronoun was present. */
	hasPersonalPronoun: boolean;
	/** Passive-voice-ish wording was present. */
	looksPassive: boolean;
	/** Worst applicable severity. */
	severity: BulletSeverity;
	/** Human-readable reasons, most important first. */
	reasons: string[];
}

function stripNonQuantifiers(text: string): string {
	return NON_QUANTIFIERS.reduce((acc, re) => acc.replace(re, " "), text);
}

/** Does this text carry evidence of scale or outcome? */
export function hasQuantification(text: string): boolean {
	const cleaned = stripNonQuantifiers(text);
	return (
		CURRENCY.test(cleaned) ||
		PERCENT.test(cleaned) ||
		RATE.test(cleaned) ||
		DURATION.test(cleaned) ||
		COUNT_WITH_UNIT.test(cleaned) ||
		MULTIPLIER.test(cleaned)
	);
}

/** Returns the duty phrase that matched, or null. */
export function findDutyPhrase(text: string): string | null {
	for (const re of DUTY_PHRASES) {
		const m = text.match(re);
		if (m) return m[0];
	}
	return null;
}

/**
 * Analyse one bullet.
 *
 * Severity is advisory, never a score. There is deliberately no 0-100 number: a single
 * headline figure is the failure mode of every incumbent "ATS score", and users report
 * high scores on resumes that human reviewers reject.
 */
export function analyzeBullet(text: string): BulletDiagnosis {
	const trimmed = (text ?? "").trim();
	const quantified = hasQuantification(trimmed);
	const dutyPhrase = findDutyPhrase(trimmed);
	const hasStrongVerb = STRONG_VERBS.test(trimmed);
	const hasPersonalPronoun = PERSONAL_PRONOUN.test(trimmed);
	const looksPassive = PASSIVE.test(trimmed);

	const reasons: string[] = [];

	if (dutyPhrase) {
		reasons.push(
			`Reads as a job description ("${dutyPhrase}"). Say what changed because you were there.`,
		);
	}
	if (!quantified) {
		reasons.push(
			"No number, percentage or scale word. Add evidence, or drop the bullet if you have none.",
		);
	}
	if (!hasStrongVerb) {
		reasons.push(
			"No ownership verb (led, built, reduced, shipped...). Start with the strongest one you can defend.",
		);
	}
	if (hasPersonalPronoun) {
		reasons.push(
			'First-person pronoun ("I", "we"). Resumes omit them — a reader supplies them.',
		);
	}

	// A duty phrase is the strongest signal: it means the bullet describes scope rather
	// than outcome. Everything else is refinement.
	// A duty phrase means scope, not outcome -- but only if nothing else in the bullet
	// supplies the outcome. "Worked with the design team to ship 3x faster" opens with
	// weak language and still lands a hard number and an ownership verb, so it is
	// advice, not a warning.
	let severity: BulletSeverity = "none";
	if (!quantified) severity = "warning";
	else if (dutyPhrase && !hasStrongVerb) severity = "advice";
	else if (dutyPhrase) severity = "advice";
	if (looksPassive && !hasStrongVerb && !quantified) severity = "warning";

	return {
		text: trimmed,
		quantified,
		dutyPhrase,
		hasStrongVerb,
		hasPersonalPronoun,
		looksPassive,
		severity,
		reasons,
	};
}

export interface HighlightsReport {
	/** One entry per bullet, in order. */
	bullets: BulletDiagnosis[];
	/** How many bullets carried evidence. */
	quantifiedCount: number;
	/** How many bullets were written as job description. */
	dutyCount: number;
	/** Bullets that need at least one edit. */
	needsWork: number;
	/** bullets.length === 0 means there is nothing to say — not a perfect score. */
	total: number;
}

/** Analyse a list of bullets (an experience `highlights` array, or project bullets). */
export function analyzeHighlights(
	highlights: readonly string[] | undefined,
): HighlightsReport {
	const list = (highlights ?? []).filter(
		(h) => typeof h === "string" && h.trim().length > 0,
	);
	const bullets = list.map(analyzeBullet);

	return {
		bullets,
		total: bullets.length,
		quantifiedCount: bullets.filter((b) => b.quantified).length,
		dutyCount: bullets.filter((b) => b.dutyPhrase !== null).length,
		needsWork: bullets.filter((b) => b.severity !== "none").length,
	};
}
