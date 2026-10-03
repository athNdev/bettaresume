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
	 *
	 * Declared per entry rather than in a module-level list so the set of guarded
	 * aliases and the set of disambiguators can never drift apart — see
	 * `AMBIGUOUS_ALIASES`.
	 */
	disambiguators?: readonly string[];
	/**
	 * Which of this entry's own aliases need `disambiguators` before they may be
	 * asserted as a skill.
	 *
	 * An alias belongs here only if it is **word-like**: a real word or common noun
	 * with a meaning outside software, so a bounded match could be asserting something
	 * the resume never said. `AWS` (American Welding Society), `Azure` (the colour),
	 * `Node` (a graph or cluster node) qualify. `TS`, `ML`, `CI`, `SQL`, `HCL` and
	 * `K8s` do NOT: once bounded, `\bCI\b` cannot match inside another word, and a
	 * standalone `CI` in a resume means continuous integration. Guarding those would
	 * trade a false positive that cannot occur for a real false negative.
	 *
	 * Omitting this field on an entry whose aliases are all proper nouns or bounded
	 * acronyms (`Kubernetes`, `Terraform`) is deliberate: a disambiguator list nothing
	 * reads is dead configuration, and it reads as if the guard is active when it is
	 * not.
	 */
	ambiguousAliases?: readonly string[];
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
		ambiguousAliases: ["AWS"],
		disambiguators: ["Lambda", "EC2", "S3", "RDS", "CloudFormation", "ECS"],
		category: "cloud",
	},
	{
		canonical: "Google Cloud Platform",
		aliases: ["GCP", "Google Cloud Platform", "Google Cloud"],
		ambiguousAliases: ["GCP"],
		disambiguators: ["Compute Engine", "BigQuery", "Cloud Run", "GKE"],
		category: "cloud",
	},
	{
		canonical: "Microsoft Azure",
		aliases: ["Azure", "Microsoft Azure"],
		// "Azure" is also a colour, so it stays in the ambiguous set and needs
		// supporting context. Without these it was permanently unmatchable, which the
		// map-integrity test caught.
		ambiguousAliases: ["Azure"],
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
		// No `ambiguousAliases`: a proper noun and two bounded acronyms. Nothing here
		// needs disambiguating, so no disambiguators are declared.
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
		ambiguousAliases: ["Node"],
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
		// No `ambiguousAliases`. The worry here was `SQL`, which is a substring of
		// NoSQL, MySQL and SQLAlchemy — but bounding already handles it, because
		// `NoSQL` has no word boundary before `SQL`. These three aliases are a proper
		// noun and two bounded forms, so nothing needs disambiguating.
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
		// No `ambiguousAliases`: a proper noun and one bounded acronym.
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
		// No `ambiguousAliases`: `CI` is a bounded acronym, so `\bCI\b` cannot match
		// inside another word and a standalone `CI` in a resume means continuous
		// integration. Demanding "pipeline"/"build"/"deploy" nearby lost real matches
		// (someone listing "CI, Python, Docker") to protect against a false positive
		// that bounding already makes impossible.
		category: "devops",
	},
	{
		canonical: "Machine Learning",
		aliases: ["ML", "Machine Learning"],
		// No `ambiguousAliases`, same reasoning as `CI`.
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
 * **Derived from the entries that declare `ambiguousAliases`**, not hand-maintained.
 * It used to be a literal `new Set(["Node", "Azure", "Go", "R", "C", "REST", "Rust"])`
 * plus two `|| alias === "AWS" || alias === "GCP"` branches at the use site. That had
 * three separate failure modes, all of which are now impossible:
 *
 * 1. `Go`, `R`, `C`, `REST` and `Rust` are aliases of no entry at all, so they guarded
 *    nothing while their comment claimed they did.
 * 2. `AWS` and `GCP` were guarded by a hardcoded branch *outside* the set, so the set
 *    was not the truth about ambiguity even for the entries that exist.
 * 3. Five entries declared `disambiguators` that were never read, so a reader could
 *    reasonably believe `K8s`, `psql`, `HCL`, `CI` and `ML` were context-guarded when
 *    they were not.
 *
 * The word-like/acronym distinction that justifies the contents now lives on each
 * entry as `ambiguousAliases`, next to the `disambiguators` it gates. Exported so
 * tests assert against this set rather than re-declaring a copy that can drift.
 */
export const AMBIGUOUS_ALIASES: ReadonlySet<string> = new Set(
	SKILL_ENTRIES.flatMap((entry) => [...(entry.ambiguousAliases ?? [])]),
);

/**
 * Aliases that must be bounded on both sides, so they can never match inside a longer
 * word. Union of the ambiguous set and every short acronym.
 */
const ALWAYS_BOUNDED = new Set([
	...AMBIGUOUS_ALIASES,
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

/** How far either side of a match to look for disambiguating context. */
const CONTEXT_WINDOW = 120;

function contextWindow(text: string, index: number, length: number): string {
	return text.slice(
		Math.max(0, index - CONTEXT_WINDOW),
		index + length + CONTEXT_WINDOW,
	);
}

function hasDisambiguatorNear(entry: SkillEntry, window: string): boolean {
	return (entry.disambiguators ?? []).some((d) =>
		new RegExp(escapeRe(d), "i").test(window),
	);
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
 * Ambiguous aliases (`AWS`, `Azure`, `Node`) only count when a disambiguator appears
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

			// Guarded by the derived set, so an alias that declares disambiguators is
			// gated by exactly the list it ships with.
			const confident = AMBIGUOUS_ALIASES.has(alias)
				? hasDisambiguatorNear(entry, contextWindow(text, m.index, m[0].length))
				: true;

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
 * Is *this particular surface form*, occurring in this text, a confident mention of the
 * canonical skill?
 *
 * `findSkillMentions` answers "does this text mention the skill at all". A caller that
 * already holds a specific hit — a regex match on a job-description keyword, or one of
 * the expanded alias variants — needs the narrower question, because `AWS` in a welding
 * qualification and `AWS` beside Lambda are the same string and different facts.
 *
 * Without this, a keyword-coverage report that greps for the literal keyword first will
 * happily call `AWS` covered on a welding resume, and the whole disambiguation layer
 * becomes dead code on the one path that reports to a user.
 */
export function isConfidentMention(
	canonical: string,
	surface: string,
	text: string,
): boolean {
	const entry = SKILL_ENTRIES.find(
		(e) => e.canonical.toLowerCase() === canonical.toLowerCase(),
	);
	if (!entry) return false;

	const alias = entry.aliases.find(
		(a) => a.toLowerCase() === surface.trim().toLowerCase(),
	);
	// A surface that is not a declared alias ("team leadership") carries no ambiguity
	// to resolve, and an unambiguous alias needs no context.
	if (!alias || !AMBIGUOUS_ALIASES.has(alias)) return true;

	const m = new RegExp(`\\b${escapeRe(alias)}\\b`, "i").exec(text);
	if (!m) return false;
	return hasDisambiguatorNear(entry, contextWindow(text, m.index, m[0].length));
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
