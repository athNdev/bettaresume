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
 * ## The normalisation model
 *
 * Three ideas, and the whole feature is those three ideas:
 *
 * 1. **One canonical entity per skill.** An entry has exactly one display name and a
 *    set of surface forms — acronyms, abbreviations, dotted variants, historic names.
 *    `React` / `ReactJS` / `React.js` / `React 18` are one entity with four surfaces,
 *    not four skills.
 * 2. **Normalisation is a read-time view, never a write.** Nothing here mutates what the
 *    user typed and nothing writes a canonical name back into a section. `normalizeSkill`
 *    is a pure function from a surface string to a verdict. That is what lets the
 *    taxonomy be swapped without a data migration — see "Swapping the taxonomy".
 * 3. **Uncertainty is reported, never guessed away.** `normalizeSkill` returns a
 *    discriminated union, and one of its arms is `uncertain`. An ambiguous surface form
 *    with no disambiguating evidence resolves to `uncertain`, never to a confident wrong
 *    answer. See "Context disambiguation".
 *
 * ## Context disambiguation
 *
 * Copied from Lightcast's documented approach: one display name plus aliases, acronyms,
 * abbreviations and historic names, resolved using surrounding context. Their own
 * example is exactly this problem — *"when 'AWS' appears, the surrounding context helps
 * determine whether it refers to the 'American Welding Society' or 'Amazon Web
 * Services.'"*
 *
 * ### Why the guard lives *on the entry* and not in a module-level list
 *
 * Two previous shapes both rotted, in the same way, at the same time:
 *
 * - `const AMBIGUOUS_ALIASES = new Set(["Node", "Azure", "Go", "R", "C", "REST", "Rust"])`
 *   plus two hardcoded `|| alias === "AWS"` branches at the use site. Five of those
 *   members were aliases of no entry at all, so they guarded nothing while the comment
 *   claimed they did, and `AWS`/`GCP` were guarded by code outside the set that was
 *   supposed to be the truth about ambiguity.
 * - A second round moved the set to be derived, but left `disambiguators` as a separate
 *   field on the entry. Five entries declared `disambiguators` with no
 *   `ambiguousAliases`, so the list was read by nothing and `K8s`, `psql`, `HCL`, `CI`
 *   and `ML` were unconditionally `confident: true` while looking guarded.
 *
 * The shape here makes that class of bug **unrepresentable** rather than merely tested
 * for. A guard is a `GuardedForm`, and a guard can only exist attached to a specific
 * surface form of a specific entry:
 *
 * ```ts
 * { canonical: "Amazon Web Services", aliases: [...], guardedForms: [{ surface: "AWS", context: [...] }] }
 * ```
 *
 * There is no way to write `context` for an entry without naming the surface form it
 * gates, and no way to gate a surface form that does not exist. Adding a skill cannot
 * silently skip its own context rules, because the rule *is* the surface form.
 * `test/skills-alias-map.test.ts` additionally asserts enforcement behaviourally, so a
 * future refactor that decouples the two again fails the suite rather than the reviewer.
 *
 * ## Swapping the taxonomy
 *
 * Lightcast Open Skills went commercial in April 2026 (free-with-attribution ended
 * except for nonprofits and public-good use). For a zero-budget project the realistic
 * picks are **ESCO** (~14k skills, 20+ languages) and **O*NET** (free). This module ships
 * neither: it is a hand-seeded subset, because the alias map is roughly 80% of the value
 * and a 14k-row static asset is not worth its weight yet.
 *
 * **`SKILL_ENTRIES` is the taxonomy adapter seam, and nothing else is.** Every public
 * function takes an optional `taxonomy` (`SkillTaxonomy` is just
 * `readonly SkillEntry[]`), so an ESCO- or O\*NET-derived import becomes the default
 * argument at one call site rather than a rewrite. Two rules make the swap safe:
 *
 * - **No third-party taxonomy ID is ever stored on user content.** Not as a column, not
 *   in `content` JSON, not in `resume_settings`. A taxonomy ID on user content turns a
 *   taxonomy swap into a migration, which is the entire thing read-time normalisation
 *   exists to avoid.
 * - **An imported row is reference data, not user content.** If an external taxonomy is
 *   embedded later it stays in its own module and is passed in as `SkillTaxonomy`; it
 *   must not be merged into a section's stored content by any code path.
 *
 * The absence of a surface form from the map is reported as `unknown`, never inferred.
 * `normalizeSkill("Go")` says `unknown` rather than guessing a Go entry that does not
 * exist here.
 */

/**
 * One surface form of a skill, together with the context that establishes it.
 *
 * `surface` is a real word with a meaning outside software, so its presence alone does
 * not establish the skill: `AWS` (American Welding Society), `Azure` (the colour),
 * `Node` (a graph or cluster node).
 *
 * A surface form that cannot match inside a longer word once bounded — an acronym like
 * `CI`, `ML`, `HCL`, `K8s` — must NOT be guarded. `\bCI\b` cannot match inside another
 * word, and a standalone `CI` on a resume means continuous integration; guarding it
 * trades a false positive that cannot occur for a real false negative.
 */
export interface GuardedForm {
	/** The surface form this guard gates. Must be one of the owning entry's aliases. */
	surface: string;
	/** Context terms that, when adjacent to an occurrence, resolve the ambiguity. */
	context: readonly string[];
}

/** A canonical skill and every surface form known to mean it. */
export interface SkillEntry {
	/** The single display name. Stored in the map exactly once. */
	canonical: string;
	/** Acronyms, abbreviations, dotted variants, historic names. */
	aliases: readonly string[];
	/**
	 * Surface forms that need supporting context before they may be asserted.
	 *
	 * Omit the field entirely on an entry whose aliases are all proper nouns or bounded
	 * acronyms (`Kubernetes`, `Terraform`): an empty list and an absent one mean the same
	 * thing, and neither should imply a guard that is not there.
	 */
	guardedForms?: readonly GuardedForm[];
	/** Broad grouping, used for coverage reporting. */
	category?: string;
}

/**
 * A taxonomy is just a list of entries.
 *
 * This alias exists so the swappability claim above is a type, not a comment: the
 * default is `SKILL_ENTRIES`, and an ESCO/O\*NET import is a drop-in for the argument.
 */
export type SkillTaxonomy = readonly SkillEntry[];

/**
 * Seed set. Intentionally small and high-confidence: a large auto-generated map would
 * produce confident wrong matches, and a wrong normalisation is worse than no
 * normalisation because it silently corrupts a user's keyword coverage.
 *
 * **Not an external taxonomy.** Hand-seeded reference data, swappable, never persisted
 * onto user content. See the header for the ESCO / O\*NET position.
 */
export const SKILL_ENTRIES: readonly SkillEntry[] = [
	{
		canonical: "Amazon Web Services",
		aliases: ["AWS", "Amazon Web Services", "Amazon Web Service"],
		guardedForms: [
			{
				// "Welding" is the documented alternative meaning of AWS.
				surface: "AWS",
				context: ["Lambda", "EC2", "S3", "RDS", "CloudFormation", "ECS"],
			},
		],
		category: "cloud",
	},
	{
		canonical: "Google Cloud Platform",
		aliases: ["GCP", "Google Cloud Platform", "Google Cloud"],
		guardedForms: [
			{
				surface: "GCP",
				context: ["Compute Engine", "BigQuery", "Cloud Run", "GKE"],
			},
		],
		category: "cloud",
	},
	{
		canonical: "Microsoft Azure",
		aliases: ["Azure", "Microsoft Azure"],
		guardedForms: [
			{
				// "Azure" is also a colour, so it stays guarded and needs supporting
				// context. Without it the entry was permanently unmatchable, which the
				// map-integrity test caught.
				surface: "Azure",
				context: [
					"Functions",
					"App Service",
					"Entra",
					"Key Vault",
					"AKS",
					"IaC",
					"infrastructure",
				],
			},
		],
		category: "cloud",
	},
	{
		// No `guardedForms`: a proper noun and two bounded acronyms. `\bK8s\b` cannot
		// match inside another word and there is no non-software meaning to guard
		// against, so a guard here would cost real matches and buy nothing.
		canonical: "Kubernetes",
		aliases: ["Kubernetes", "K8s", "k8s"],
		category: "devops",
	},
	{
		canonical: "Docker",
		aliases: ["Docker", "docker-compose", "Docker Compose"],
		category: "devops",
	},
	{
		// The motivating case from the spec: four surface forms, one entity.
		canonical: "React",
		aliases: ["React", "React.js", "ReactJS", "React 18"],
		category: "frontend",
	},
	{
		canonical: "Node.js",
		aliases: ["Node.js", "NodeJS", "Node"],
		guardedForms: [
			{
				// "node" also appears in graph theory, cluster/network diagrams and
				// "timeline". A backend resume that says "Node" nearly always has one of
				// these nearby.
				surface: "Node",
				context: ["npm", "Express", "package.json", "runtime", "JavaScript"],
			},
		],
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
		// No `guardedForms`. The worry here was `SQL`, which is a substring of NoSQL,
		// MySQL and SQLAlchemy — but bounding handles it, because `NoSQL` has no word
		// boundary before `SQL`. These three aliases are a proper noun and two bounded
		// forms.
		canonical: "PostgreSQL",
		aliases: ["PostgreSQL", "Postgres", "psql"],
		category: "database",
	},
	{
		canonical: "SQL",
		aliases: ["SQL", "T-SQL", "PL/SQL"],
		category: "database",
	},
	{
		// No `guardedForms`: a proper noun and one bounded acronym.
		canonical: "Terraform",
		aliases: ["Terraform", "HCL"],
		category: "devops",
	},
	{
		canonical: "GraphQL",
		aliases: ["GraphQL", "Graph QL"],
		category: "backend",
	},
	{
		// No `guardedForms`: `CI` is a bounded acronym, so `\bCI\b` cannot match inside
		// another word and a standalone `CI` on a resume means continuous integration.
		// Demanding "pipeline"/"build"/"deploy" nearby lost real matches (someone listing
		// "CI, Python, Docker") to protect against a false positive that bounding already
		// makes impossible.
		canonical: "Continuous Integration",
		aliases: ["CI", "Continuous Integration", "CI/CD"],
		category: "devops",
	},
	{
		// No `guardedForms`, same reasoning as `CI`.
		canonical: "Machine Learning",
		aliases: ["ML", "Machine Learning"],
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
 * A guarded surface form, resolved to its owning entry and precompiled context matchers.
 */
interface ResolvedGuard {
	canonical: string;
	surface: string;
	contextPatterns: readonly RegExp[];
}

/**
 * Guarded surface forms of a taxonomy, keyed by lowercased surface.
 *
 * **Derived from the entries**, so a guard cannot exist without an owner and the set
 * cannot drift from the entries it claims to describe. Exported because tests and copy
 * assert against this set rather than re-declaring a copy that can drift — a test file
 * that re-declared it is exactly how `Go`/`R`/`C`/`REST`/`Rust` stayed in it as aliases
 * of no entry at all while their comment claimed otherwise.
 */
function buildGuardIndex(taxonomy: SkillTaxonomy): Map<string, ResolvedGuard> {
	const index = new Map<string, ResolvedGuard>();
	for (const entry of taxonomy) {
		for (const guarded of entry.guardedForms ?? []) {
			index.set(guarded.surface.toLowerCase(), {
				canonical: entry.canonical,
				surface: guarded.surface,
				contextPatterns: evidenceFor(entry, guarded).map(contextPattern),
			});
		}
	}
	return index;
}

/**
 * Memo for the guard index.
 *
 * `isConfidentMention` is called from a nested loop in `ats-match.ts` (once per
 * keyword, once per surface variant of that keyword) and was rebuilding the whole index
 * each time. Taxonomies are treated as immutable module constants, so keying the cache
 * on identity is safe; a caller that mutated an array in place would get a stale index,
 * which is the same assumption `as const` already documents everywhere else.
 */
const GUARD_INDEX_CACHE = new WeakMap<object, Map<string, ResolvedGuard>>();

function guardIndex(taxonomy: SkillTaxonomy): Map<string, ResolvedGuard> {
	const cached = GUARD_INDEX_CACHE.get(taxonomy);
	if (cached) return cached;
	const built = buildGuardIndex(taxonomy);
	GUARD_INDEX_CACHE.set(taxonomy, built);
	return built;
}

/**
 * Match a context term without letting it match inside a longer word, while still
 * accepting a plural so "Azure App Services" satisfies the term "App Service".
 *
 * A bare substring test would let a one-character disambiguator fire inside any word;
 * a bare `\b…\b` test would drop "App Services" and lose a real match.
 */
function contextPattern(term: string): RegExp {
	return new RegExp(
		`(?<![\\p{L}\\p{N}])${escapeRe(term)}s?(?![\\p{L}\\p{N}])`,
		"iu",
	);
}

/**
 * The evidence that resolves a guarded surface form.
 *
 * The declared `context` terms, **plus the entry's own canonical name and its unguarded
 * aliases**. That second part matters and is easy to miss: `AWS` beside the spelled-out
 * `Amazon Web Services` is not ambiguous, and neither is `Node` beside `Node.js` or
 * `Azure` beside `Microsoft Azure`. Requiring a hand-listed ecosystem term
 * (`Lambda`, `npm`) for that case would make `normalizeSkill` unable to confirm an
 * entity from its own full name, which is the most reliable evidence available.
 *
 * Guarded aliases are excluded from the evidence set so the check cannot become
 * circular — `AWS` must not be evidence for `AWS`.
 */
function evidenceFor(entry: SkillEntry, guarded: GuardedForm): string[] {
	const guardedSurfaces = new Set(
		(entry.guardedForms ?? []).map((g) => g.surface.toLowerCase()),
	);
	const own = [entry.canonical, ...entry.aliases].filter(
		(surface) => !guardedSurfaces.has(surface.toLowerCase()),
	);
	return [...new Set([...guarded.context, ...own])];
}

/**
 * **Every alias is bounded**, with no exceptions.
 *
 * This used to be a hand-maintained `ALWAYS_BOUNDED` set alongside an unbounded
 * substring fallback — the same hand-written-second-list defect as `AMBIGUOUS_ALIASES`,
 * and it had already rotted: it listed `"Vue"`, an alias of no entry, while omitting
 * `Docker`, `Python` and `Terraform`, so `Docker` matched inside `Dockerfile` and
 * `Python` inside `Pythonic`. Bounding everything is both simpler and strictly safer,
 * and it cannot drift because there is nothing to maintain.
 */
function aliasPattern(alias: string): RegExp {
	return new RegExp(
		`(?<![\\p{L}\\p{N}])${escapeRe(alias)}(?![\\p{L}\\p{N}])`,
		"iu",
	);
}

/** How far either side of a match to look for disambiguating context. */
const CONTEXT_WINDOW = 120;

function contextWindow(text: string, index: number, length: number): string {
	return text.slice(
		Math.max(0, index - CONTEXT_WINDOW),
		index + length + CONTEXT_WINDOW,
	);
}

/**
 * Every occurrence of a surface form in the text, with the context window around each.
 *
 * All occurrences matter, not just the first. `findSkillMentions` used to `exec` once
 * per alias and key its result on `canonical::surface`, so a welding qualification
 * mentioned before an `AWS Lambda` project reported the whole document as an uncertain
 * mention and `findConfidentSkills` dropped a skill the resume genuinely claimed.
 */
function occurrences(
	alias: string,
	text: string,
): { match: RegExpExecArray; window: string }[] {
	const re = aliasPattern(alias);
	const found: { match: RegExpExecArray; window: string }[] = [];
	// Global + lastIndex walking, so overlapping windows are all considered.
	const global = new RegExp(re.source, `${re.flags}g`);
	let m = global.exec(text);
	while (m) {
		found.push({
			match: m,
			window: contextWindow(text, m.index, m[0].length),
		});
		if (m[0].length === 0) break;
		m = global.exec(text);
	}
	return found;
}

/**
 * Is this occurrence disambiguated by its surrounding context?
 *
 * Only ever called for a surface form that has a guard, so a missing guard cannot
 * silently read as an active one.
 */
function isDisambiguated(guard: ResolvedGuard, window: string): boolean {
	return guard.contextPatterns.some((re) => re.test(window));
}

export interface SkillMatch {
	canonical: string;
	/** The exact surface form found in the text. */
	surface: string;
	category?: string;
	/** False when a guarded surface form matched with no supporting context. */
	confident: boolean;
	/**
	 * The same verdict as `confident`, named for callers that talk in terms of
	 * resolution rather than confidence. Redundant on purpose: `confident: boolean` has
	 * three consumers and a new one would otherwise re-derive the same ternary with a
	 * subtly different polarity.
	 */
	status: "resolved" | "uncertain";
}

/**
 * Find skills mentioned in a block of text.
 *
 * Guarded surface forms (`AWS`, `Azure`, `Node`) only count as resolved when a
 * disambiguator appears near *that occurrence*, so "AWS certified welding" does not
 * become a cloud skill. Callers decide what to do with an uncertain match; the
 * alternative is silently asserting something the resume never said.
 */
export function findSkillMentions(
	text: string,
	taxonomy: SkillTaxonomy = SKILL_ENTRIES,
): SkillMatch[] {
	if (!text) return [];
	const guards = guardIndex(taxonomy);
	const found: SkillMatch[] = [];
	const seen = new Set<string>();

	for (const entry of taxonomy) {
		for (const alias of entry.aliases) {
			const hits = occurrences(alias, text);
			if (hits.length === 0) continue;

			// An occurrence is resolved unless the surface form is guarded *and* this
			// occurrence has no disambiguator near it. The guard lookup is keyed on the
			// surface, so it is the same guard the entry declares — never a side list.
			const guard = guards.get(alias.toLowerCase());
			const confident = guard
				? hits.some((hit) => isDisambiguated(guard, hit.window))
				: true;

			const key = `${entry.canonical}::${alias.toLowerCase()}`;
			if (seen.has(key)) continue;
			seen.add(key);
			found.push({
				canonical: entry.canonical,
				surface: hits[0]?.match[0] ?? alias,
				category: entry.category,
				confident,
				status: confident ? "resolved" : "uncertain",
			});
		}
	}
	return found;
}

/** Resolved mentions only — the ones safe to report to a user as claimed. */
export function findConfidentSkills(
	text: string,
	taxonomy: SkillTaxonomy = SKILL_ENTRIES,
): SkillMatch[] {
	return findSkillMentions(text, taxonomy).filter((m) => m.confident);
}

// ---------------------------------------------------------------------------
// Read-time normalisation
// ---------------------------------------------------------------------------

/**
 * Why normalisation did not reach a confident answer.
 *
 * `ambiguous-without-context` — the surface form is guarded and the caller supplied no
 * surrounding text, so the string alone cannot establish the skill.
 * `ambiguous-context-insufficient` — surrounding text was supplied and it did not
 * disambiguate. `AWS certified welding inspector` lands here.
 */
export type NormalizationReason =
	| "ambiguous-without-context"
	| "ambiguous-context-insufficient"
	| "not-in-map";

/**
 * The verdict for one surface form. Never a rewrite of the input: `surface` is always
 * exactly what the caller passed in, trimmed but otherwise untouched.
 */
export interface SkillNormalization {
	/** What the caller typed. Never replaced with a canonical name. */
	surface: string;
	/**
	 * `resolved` — the surface form establishes this canonical skill.
	 * `uncertain` — it may, but the available evidence does not decide it.
	 * `unknown`  — this taxonomy has no opinion, and it will not guess.
	 */
	status: "resolved" | "uncertain" | "unknown";
	/** Present only when `status` is `resolved`. */
	canonical?: string;
	/**
	 * Canonical names this surface form could mean, in map order. Populated for
	 * `uncertain` so the caller can ask the user; empty for `unknown`.
	 *
	 * A taxonomy where one surface form belongs to two entities is rejected by
	 * `test/skills-alias-map.test.ts`, so this never contains an actual tie.
	 */
	candidates: readonly string[];
	reason?: NormalizationReason;
}

export interface NormalizeOptions {
	/**
	 * The surrounding text, used to resolve a guarded surface form. A JD line, a
	 * sentence, or the whole section. Omitting it on a guarded form yields `uncertain`
	 * by design — the string alone is not evidence.
	 */
	context?: string;
	/** Override the taxonomy. This is the seam an ESCO / O*NET import plugs into. */
	taxonomy?: SkillTaxonomy;
}

/**
 * Map one surface form to its canonical entity, reporting uncertainty instead of
 * guessing. **Read-time, read-only.**
 *
 * The AWS-welding case is the whole point, so it is worth stating the behaviour
 * explicitly:
 *
 * - `normalizeSkill("AWS")` → `uncertain`. The string alone does not establish Amazon
 *   Web Services; it also spells a certification.
 * - `normalizeSkill("AWS", { context: "…on AWS Lambda…" })` → `resolved`.
 * - `normalizeSkill("AWS", { context: "…AWS certified welding inspector…" })` →
 *   `uncertain`. Context was supplied and it failed to disambiguate; that is
 *   meaningfully different from no context at all, and it is not `resolved`.
 * - `normalizeSkill("team leadership")` → `unknown`, not a guess.
 *
 * Every surface form of an entity normalises to the same canonical name, and no
 * taxonomy ID is written anywhere — the verdict is computed, never stored.
 */
export function normalizeSkill(
	surface: string,
	options: NormalizeOptions = {},
): SkillNormalization {
	const trimmed = surface.trim();
	if (!trimmed) {
		return {
			surface: "",
			status: "unknown",
			candidates: [],
			reason: "not-in-map",
		};
	}

	const taxonomy = options.taxonomy ?? SKILL_ENTRIES;
	const context = options.context?.trim() ?? "";
	const owners: string[] = [];
	for (const entry of taxonomy) {
		const matches =
			entry.canonical.toLowerCase() === trimmed.toLowerCase() ||
			entry.aliases.some((a) => a.toLowerCase() === trimmed.toLowerCase());
		if (matches) owners.push(entry.canonical);
	}

	if (owners.length === 0) {
		return {
			surface: trimmed,
			status: "unknown",
			candidates: [],
			reason: "not-in-map",
		};
	}

	const guard = guardIndex(taxonomy).get(trimmed.toLowerCase());
	if (!guard) {
		return {
			surface: trimmed,
			status: "resolved",
			canonical: owners[0],
			candidates: owners,
		};
	}

	// Guarded: only a disambiguator in the supplied context establishes the entity.
	// Note this reads only the caller's context, not `surface` — a caller that passes
	// `"AWS"` as its own context has not disambiguated anything.
	if (context && isDisambiguated(guard, context)) {
		return {
			surface: trimmed,
			status: "resolved",
			canonical: owners[0],
			candidates: owners,
		};
	}

	return {
		surface: trimmed,
		status: "uncertain",
		candidates: owners,
		reason: context
			? "ambiguous-context-insufficient"
			: "ambiguous-without-context",
	};
}

/**
 * Normalise every surface form of every entity in a taxonomy. Used by the integrity
 * tests to prove the "every surface form of an entity normalises to the same canonical
 * name" property holds for the shipped data rather than for a hand-picked example.
 */
export function normalizeTaxonomy(
	taxonomy: SkillTaxonomy = SKILL_ENTRIES,
): { surface: string; canonical: string }[] {
	const rows: { surface: string; canonical: string }[] = [];
	for (const entry of taxonomy) {
		for (const alias of new Set([entry.canonical, ...entry.aliases])) {
			// Each surface form is normalised with its own canonical name as context:
			// the canonical display name is itself disambiguating evidence, so this
			// resolves the guarded forms without inventing anything.
			const verdict = normalizeSkill(alias, {
				context: entry.canonical,
				taxonomy,
			});
			if (verdict.status === "resolved" && verdict.canonical) {
				rows.push({ surface: alias, canonical: verdict.canonical });
			}
		}
	}
	return rows;
}

/**
 * Is *this particular surface form*, occurring in this text, a resolved mention of the
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
	taxonomy: SkillTaxonomy = SKILL_ENTRIES,
): boolean {
	const entry = taxonomy.find(
		(e) => e.canonical.toLowerCase() === canonical.toLowerCase(),
	);
	if (!entry) return false;

	const alias = entry.aliases.find(
		(a) => a.toLowerCase() === surface.trim().toLowerCase(),
	);
	// A surface that is not a declared alias ("team leadership") carries no ambiguity
	// to resolve, so there is nothing to check.
	if (!alias) return true;

	const hits = occurrences(alias, text);
	// No occurrence means there is no mention. This used to answer `true` for an
	// unguarded alias without looking at the text at all, which made the function's
	// name a lie: `isConfidentMention("Docker", "Docker", "Dockerfile")` said yes to a
	// match that bounding had already excluded everywhere else.
	if (hits.length === 0) return false;

	const guard = guardIndex(taxonomy).get(alias.toLowerCase());
	// An unguarded alias needs no context.
	if (!guard) return true;

	// Every occurrence, not just the first: one disambiguated mention is enough to
	// establish the entity, and dropping the skill because an unrelated occurrence came
	// first is a false negative.
	return hits.some((hit) => isDisambiguated(guard, hit.window));
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
 * Look up a name in the map. **Not a confidence oracle.**
 *
 * This answers "is this string a known name or surface form", nothing more. Given
 * `"AWS"` it returns `"Amazon Web Services"` with no claim that the text meant Amazon
 * Web Services — deciding that needs the surrounding text, which is what
 * `normalizeSkill` and `isConfidentMention` are for. Kept separate, and deliberately
 * *not* implemented as `normalizeSkill(x).canonical`: a guarded form normalises to
 * `uncertain` without context, so that composition would return `null` for `"AWS"` and
 * silently strip the map from every ungated caller.
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

/**
 * Guarded surface forms across the shipped taxonomy.
 *
 * Kept for the copy in `test/marketing-claims.test.ts`, which asserts the landing page
 * describes an alias the map really disambiguates. Derived from `SKILL_ENTRIES` rather
 * than declared, so that assertion cannot pass against a stale copy of the set.
 */
export const AMBIGUOUS_ALIASES: ReadonlySet<string> = new Set(
	SKILL_ENTRIES.flatMap((entry) =>
		(entry.guardedForms ?? []).map((guarded) => guarded.surface),
	),
);
