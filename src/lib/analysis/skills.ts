/**
 * Skills alias / normalisation map — Feature 9 from docs/ROADMAP.md.
 *
 * ## Why this exists
 *
 * Workday's skills classifier has been observed empirically to match `AWS` but **not**
 * `Amazon Web Services`, and to drop `GCP` entirely. That is the inverse of what you
 * would design for. The practical consequence: writing only the spelled-out form can
 * lose the match, and writing only the acronym can lose it too.
 *
 * So the rule here is **emit both forms**. `expandSkillVariants` returns every surface
 * form of a canonical skill, and the resume writer is expected to include both.
 *
 * ## Taxonomy choice
 *
 * Lightcast Open Skills went commercial in April 2026 (free-with-attribution ended
 * except for nonprofits and public-good use). For a zero-budget project the realistic
 * picks are **ESCO** (~14k skills, 20+ languages) and **O*NET** (free). This module
 * deliberately ships neither: it is a hand-seeded subset, because the alias map is
 * roughly 80% of the value and a 14k-row static asset is not worth its weight yet.
 *
 * Taxonomy IDs are never stored on user content. Resolution happens at read time so
 * the map can grow or be swapped without a migration — the same reasoning as the
 * layout decision in #153.
 *
 * ## Context disambiguation
 *
 * Copied from Lightcast's documented approach: one display name plus aliases, acronyms,
 * abbreviations and historic names, resolved using surrounding context. Their own
 * example is exactly this problem — *"when 'AWS' appears, the surrounding context helps
 * determine whether it refers to the 'American Welding Society' or 'Amazon Web
 * Services.'"*
 */

/** A canonical skill and every surface form known to mean it. */
export interface SkillEntry {
	/** The single display name. Stored in the map exactly once. */
	canonical: string;
	/** Acronyms, abbreviations, dotted variants, historic names. */
	aliases: readonly string[];
	/**
	 * Words that, when adjacent, disambiguate an ambiguous alias.
	 * `AWS` alone is ambiguous; `AWS` next to `Lambda` is not.
	 */
	disambiguators?: readonly string[];
	/** Broad grouping, used for coverage reporting. */
	category?: string;
}

/**
 * Seed set. Intentionally small and high-confidence: a large auto-generated map would
 * produce confident wrong matches, and a wrong normalisation is worse than no
 * normalisation because it silently corrupts a user's keyword coverage.
 */
export const SKILL_ENTRIES: readonly SkillEntry[] = [
	{
		canonical: "Amazon Web Services",
		aliases: ["AWS", "Amazon Web Services", "Amazon Web Service"],
		// "Welding" is the documented alternative meaning of AWS.
		disambiguators: ["Lambda", "EC2", "S3", "RDS", "CloudFormation", "ECS"],
		category: "cloud",
	},
	{
		canonical: "Google Cloud Platform",
		aliases: ["GCP", "Google Cloud Platform", "Google Cloud"],
		disambiguators: ["Compute Engine", "BigQuery", "Cloud Run", "GKE"],
		category: "cloud",
	},
	{
		canonical: "Microsoft Azure",
		aliases: ["Azure", "Microsoft Azure"],
		// "Azure" is also a colour, so it stays in the ambiguous set and needs
		// supporting context. Without these it was permanently unmatchable, which the
		// map-integrity test caught.
		disambiguators: [
			"Functions",
			"App Service",
			"Entra",
			"Key Vault",
			"AKS",
			"IaC",
			"infrastructure",
		],
		category: "cloud",
	},
	{
		canonical: "Kubernetes",
		aliases: ["Kubernetes", "K8s", "k8s"],
		disambiguators: ["kubectl", "Helm", "pod", "namespace"],
		category: "devops",
	},
	{
		canonical: "Docker",
		aliases: ["Docker", "docker-compose", "Docker Compose"],
		category: "devops",
	},
	{
		canonical: "React",
		aliases: ["React", "React.js", "ReactJS", "React 18"],
		category: "frontend",
	},
	{
		canonical: "Node.js",
		aliases: ["Node.js", "NodeJS", "Node"],
		// "node" also appears in graph theory, cluster/network diagrams and "timeline".
		// A backend resume that says "Node" nearly always has one of these nearby.
		disambiguators: ["npm", "Express", "package.json", "runtime", "JavaScript"],
		category: "backend",
	},
	{
		canonical: "TypeScript",
		aliases: ["TypeScript", "TS"],
		category: "frontend",
	},
	{
		canonical: "Python",
		aliases: ["Python", "Python3", "Python 3"],
		category: "backend",
	},
	{
		canonical: "PostgreSQL",
		aliases: ["PostgreSQL", "Postgres", "psql"],
		// "SQL" is a substring of NoSQL, MySQL and SQLAlchemy. Bounded, but still far
		// too common to assert without context.
		disambiguators: [
			"Postgres",
			"psql",
			"query",
			"index",
			"schema",
			"migration",
		],
		category: "database",
	},
	{
		canonical: "SQL",
		aliases: ["SQL", "T-SQL", "PL/SQL"],
		category: "database",
	},
	{
		canonical: "Terraform",
		aliases: ["Terraform", "HCL"],
		disambiguators: [
			"provider",
			"module",
			"resource",
			"plan",
			"apply",
			"state",
		],
		category: "devops",
	},
	{
		canonical: "GraphQL",
		aliases: ["GraphQL", "Graph QL"],
		category: "backend",
	},
	{
		canonical: "Continuous Integration",
		aliases: ["CI", "Continuous Integration", "CI/CD"],
		disambiguators: ["pipeline", "build", "deploy"],
		category: "devops",
	},
	{
		canonical: "Machine Learning",
		aliases: ["ML", "Machine Learning"],
		disambiguators: ["model", "training", "inference", "dataset"],
		category: "ai",
	},
	{
		canonical: "Retrieval-Augmented Generation",
		aliases: [
			"RAG",
			"Retrieval-Augmented Generation",
			"Retrieval Augmented Generation",
		],
		category: "ai",
	},
] as const;

const ESCAPE = /[.*+?^${}()|[\]\\]/g;

const escapeRe = (value: string) => value.replace(ESCAPE, "\\$&");

/**
 * Aliases that are real words in their own right, so matching them without context
 * would assert a skill the resume never claimed.
 *
 * Only genuinely word-like aliases belong here. An acronym such as `TS`, `ML`, `CI`,
 * `SQL` or `HCL` is NOT ambiguous once bounded: `\bTS\b` cannot match inside `HTML` or
 * `HTML5`, and a standalone `TS` in a resume means TypeScript. Putting those in this
 * set would trade a non-existent false positive for a real false negative -- someone
 * listing "TS, React, Node" would silently lose their TypeScript match.
 *
 * `Node` and `Azure` are the real cases: graph nodes, cluster nodes, and the colour.
 */
const AMBIGUOUS_ALIASES = new Set([
	"Node",
	"Azure",
	"Go",
	"R",
	"C",
	"REST",
	"Rust",
]);

/**
 * Aliases that must be bounded on both sides, so they can never match inside a longer
 * word. Union of the ambiguous set and every short acronym.
 */
const ALWAYS_BOUNDED = new Set([
	...AMBIGUOUS_ALIASES,
	"AWS",
	"GCP",
	"CI/CD",
	"RAG",
	"K8s",
	"React",
	"Vue",
	"TS",
	"ML",
	"CI",
	"SQL",
	"HCL",
]);

function aliasPattern(alias: string): RegExp {
	const body = escapeRe(alias);
	// Word-boundary only where it is meaningful; otherwise a substring match.
	if (ALWAYS_BOUNDED.has(alias)) {
		return new RegExp(`\\b${body}\\b`, "i");
	}
	return new RegExp(body, "i");
}

export interface SkillMatch {
	canonical: string;
	/** The exact surface form found in the text. */
	surface: string;
	category?: string;
	/** False when an ambiguous alias matched with no supporting context. */
	confident: boolean;
}

/**
 * Find skills mentioned in a block of text.
 *
 * Ambiguous aliases (`AWS`, `TS`, `CI`…) only count when a disambiguator appears
 * nearby, so "AWS certified welding" does not become a cloud skill. Callers decide
 * what to do with a low-confidence match; the alternative is silently asserting
 * something the resume never said.
 */
export function findSkillMentions(text: string): SkillMatch[] {
	if (!text) return [];
	const found: SkillMatch[] = [];
	const seen = new Set<string>();

	for (const entry of SKILL_ENTRIES) {
		for (const alias of entry.aliases) {
			const re = aliasPattern(alias);
			const m = re.exec(text);
			if (!m) continue;

			let confident = true;
			if (AMBIGUOUS_ALIASES.has(alias) || alias === "AWS" || alias === "GCP") {
				const near = text.slice(
					Math.max(0, m.index - 120),
					m.index + m[0].length + 120,
				);
				confident = (entry.disambiguators ?? []).some((d) =>
					new RegExp(escapeRe(d), "i").test(near),
				);
			}

			const key = `${entry.canonical}::${m[0].toLowerCase()}`;
			if (seen.has(key)) continue;
			seen.add(key);
			found.push({
				canonical: entry.canonical,
				surface: m[0],
				category: entry.category,
				confident,
			});
		}
	}
	return found;
}

/** Confident mentions only — the ones safe to report to a user. */
export function findConfidentSkills(text: string): SkillMatch[] {
	return findSkillMentions(text).filter((m) => m.confident);
}

/**
 * Every surface form of a canonical skill.
 *
 * This is the "emit both forms" primitive. Given a canonical skill the resume writer
 * should include every returned variant, because Workday matches the acronym and not
 * the expansion, while a human reader skims for the expansion.
 */
export function expandSkillVariants(canonical: string): string[] {
	const entry = SKILL_ENTRIES.find(
		(e) => e.canonical.toLowerCase() === canonical.toLowerCase(),
	);
	return entry ? [...entry.aliases] : [];
}

/**
 * Resolve an arbitrary user-typed string to a canonical skill.
 *
 * Used to normalise JD keywords against resume skills without storing any taxonomy ID.
 */
export function canonicalizeSkill(input: string): string | null {
	const trimmed = input.trim();
	if (!trimmed) return null;
	for (const entry of SKILL_ENTRIES) {
		if (
			entry.canonical.toLowerCase() === trimmed.toLowerCase() ||
			entry.aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase())
		) {
			return entry.canonical;
		}
	}
	return null;
}

/** Flat lookup: every alias, lowercased, to its canonical name. */
export function buildAliasIndex(): Map<string, string> {
	const index = new Map<string, string>();
	for (const entry of SKILL_ENTRIES) {
		index.set(entry.canonical.toLowerCase(), entry.canonical);
		for (const alias of entry.aliases) {
			index.set(alias.toLowerCase(), entry.canonical);
		}
	}
	return index;
}
