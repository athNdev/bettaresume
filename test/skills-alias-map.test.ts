import { describe, expect, it } from "vitest";
import {
	AMBIGUOUS_ALIASES,
	buildAliasIndex,
	canonicalizeSkill,
	expandSkillVariants,
	findConfidentSkills,
	findSkillMentions,
	isConfidentMention,
	normalizeSkill,
	normalizeTaxonomy,
	SKILL_ENTRIES,
	type SkillTaxonomy,
} from "../src/lib/analysis/skills";

/**
 * The dangerous error here is a confident WRONG match.
 *
 * A false negative costs the user a missed suggestion. A false positive asserts the
 * resume claims a skill it does not — the same failure mode as the commercial parser
 * reported to have invented "AWS" on a resume that never mentioned it. So the
 * false-positive cases get the most attention, especially the guarded surface forms.
 *
 * ## On the duplicated ambiguous list
 *
 * This file used to carry its own copy of the ambiguous-alias list —
 * `["Node", "Azure", "Go", "R", "C", "REST", "Rust"]` — rather than importing the real
 * one. That copy is what let `Go`/`R`/`C`/`REST`/`Rust` stay in the set as aliases of no
 * entry at all, and what let `AWS`/`GCP` be guarded by a hardcoded branch outside the
 * set that was supposed to be the truth about ambiguity. The list is now **imported**
 * (`AMBIGUOUS_ALIASES`), which makes divergence impossible rather than merely
 * discouraged, and `describe("no duplicated alias list")` below asserts at the source
 * level that no second copy has crept back in.
 */

describe("confident detection", () => {
	it.each([
		["Built services on AWS Lambda and S3", "Amazon Web Services"],
		["Ran workloads in GCP BigQuery", "Google Cloud Platform"],
		["Deployed to Azure with IaC", "Microsoft Azure"],
		["Orchestrated workloads with Kubernetes", "Kubernetes"],
		["Containerised everything with Docker", "Docker"],
		["Built the UI in React.js", "React"],
		["Wrote the API in NodeJS", "Node.js"],
		["Migrated the schema to Postgres", "PostgreSQL"],
		["Provisioned infra with Terraform", "Terraform"],
	])("detects %j", (text, canonical) => {
		const hits = findConfidentSkills(text);
		expect(
			hits.map((h) => h.canonical),
			text,
		).toContain(canonical);
	});

	it("reports the exact surface form it found", () => {
		const hits = findConfidentSkills("Built services on AWS Lambda");
		const aws = hits.find((h) => h.canonical === "Amazon Web Services");
		expect(aws?.surface).toBe("AWS");
	});
});

/**
 * The single most important assertion in the feature.
 *
 * Lightcast's own documented example is the AWS case: "when 'AWS' appears, the
 * surrounding context helps determine whether it refers to the 'American Welding
 * Society' or 'Amazon Web Services'." Asserting a cloud skill on a welding resume
 * invents a skill the user never wrote, which is the one thing this module must never
 * do.
 */
describe("the AWS-welding ambiguity", () => {
	const WELDING = "Held an AWS certified welding inspector qualification";
	const CLOUD = "Migrated workloads from EC2 to AWS Lambda";

	it("resolves to uncertain, not to a confident wrong answer", () => {
		const verdict = normalizeSkill("AWS", { context: WELDING });
		expect(verdict.status).toBe("uncertain");
		// And specifically: no `canonical`, so a caller that reads it as a name has
		// nothing to assert. `uncertain` must not smuggle a confident answer through a
		// second field.
		expect(verdict.canonical).toBeUndefined();
		expect(verdict.reason).toBe("ambiguous-context-insufficient");
	});

	it("stays uncertain with no context at all, and says so", () => {
		const verdict = normalizeSkill("AWS");
		expect(verdict.status).toBe("uncertain");
		expect(verdict.canonical).toBeUndefined();
		expect(verdict.reason).toBe("ambiguous-without-context");
		// The candidate is offered, not asserted: the caller may ask the user.
		expect(verdict.candidates).toEqual(["Amazon Web Services"]);
	});

	it("never rewrites what the caller passed in", () => {
		// Read-time view. The input surface is echoed back verbatim in every arm.
		expect(normalizeSkill("  aws  ", { context: WELDING }).surface).toBe("aws");
		expect(normalizeSkill("nonsense").surface).toBe("nonsense");
		expect(normalizeSkill("").surface).toBe("");
	});

	it("does not read 'AWS' as cloud when the context is welding", () => {
		const confident = findConfidentSkills(WELDING);
		expect(confident.map((h) => h.canonical)).not.toContain(
			"Amazon Web Services",
		);
	});

	it("still surfaces it as low-confidence rather than hiding it", () => {
		// The caller decides. Silently dropping a real mention would be as wrong as
		// asserting a false one.
		const all = findSkillMentions(WELDING);
		const aws = all.find((h) => h.canonical === "Amazon Web Services");
		expect(aws).toBeDefined();
		expect(aws?.confident).toBe(false);
		expect(aws?.status).toBe("uncertain");
	});

	it("reads 'AWS' as cloud once a disambiguator is nearby", () => {
		expect(normalizeSkill("AWS", { context: CLOUD })).toMatchObject({
			status: "resolved",
			canonical: "Amazon Web Services",
		});
		const hits = findConfidentSkills(CLOUD);
		expect(hits.map((h) => h.canonical)).toContain("Amazon Web Services");
	});

	it("does not treat the ambiguous string as its own disambiguating context", () => {
		// `isConfidentMention` reads the surrounding text, not the keyword itself.
		expect(
			normalizeSkill("AWS", { context: "AWS" }).status,
			"the surface form is not evidence for itself",
		).toBe("uncertain");
	});
});

describe("every surface form of an entity normalises to the same canonical", () => {
	it.each(SKILL_ENTRIES.map((e) => [e.canonical, e] as const))(
		"%s",
		(canonical, entry) => {
			for (const alias of new Set([entry.canonical, ...entry.aliases])) {
				const verdict = normalizeSkill(alias, {
					// The canonical display name is itself disambiguating evidence.
					context: canonical,
				});
				expect(verdict.status, alias).toBe("resolved");
				expect(verdict.canonical, alias).toBe(canonical);
			}
		},
	);

	it("covers the whole taxonomy, not just the entries hand-picked above", () => {
		// `normalizeTaxonomy` walks every entry; an entity whose surfaces disagree fails
		// here even if no test names it.
		const rows = normalizeTaxonomy();
		const grouped = new Map<string, Set<string>>();
		for (const row of rows) {
			const bucket = grouped.get(row.canonical) ?? new Set<string>();
			bucket.add(row.surface.toLowerCase());
			grouped.set(row.canonical, bucket);
		}
		expect(grouped.size).toBe(SKILL_ENTRIES.length);
		for (const entry of SKILL_ENTRIES) {
			const surfaces = grouped.get(entry.canonical) ?? new Set();
			for (const alias of new Set([entry.canonical, ...entry.aliases])) {
				expect(
					surfaces.has(alias.toLowerCase()),
					`${entry.canonical}/${alias}`,
				).toBe(true);
			}
		}
	});

	it("is case-insensitive and whitespace-tolerant on the lookup", () => {
		for (const variant of ["reactjs", "REACTJS", "  reactjs  "]) {
			expect(normalizeSkill(variant).canonical, variant).toBe("React");
		}
	});
});

describe("uncertainty is reported, never guessed", () => {
	it("reports an unknown surface form as unknown rather than inferring an entry", () => {
		// The old hand-written set contained `Go`, `R`, `C`, `REST` and `Rust` — aliases
		// of no entry at all, guarding nothing while the comment claimed they did. There
		// is no Go entry here, so `normalizeSkill("Go")` must say `unknown`.
		for (const input of ["Go", "R", "C", "REST", "Rust"]) {
			const verdict = normalizeSkill(input);
			expect(verdict.status, input).toBe("unknown");
			expect(verdict.canonical, input).toBeUndefined();
			expect(verdict.candidates, input).toEqual([]);
			expect(verdict.reason, input).toBe("not-in-map");
		}
	});

	it("does not near-match an unknown input onto a known entity", () => {
		// "React Native" is a different technology, not a surface form of React.
		expect(canonicalizeSkill("React Native")).toBeNull();
		expect(normalizeSkill("React Native").status).toBe("unknown");
	});

	it("distinguishes 'no context' from 'context that failed to disambiguate'", () => {
		expect(normalizeSkill("Node").reason).toBe("ambiguous-without-context");
		expect(
			normalizeSkill("Node", { context: "reviewed the project timeline" })
				.reason,
		).toBe("ambiguous-context-insufficient");
	});

	it("marks the occurrence-level result with the same verdict", () => {
		expect(findSkillMentions("AWS")[0]?.status).toBe("uncertain");
		expect(findSkillMentions("AWS Lambda")[0]?.status).toBe("resolved");
		expect(findSkillMentions("AWS Lambda")[0]?.confident).toBe(true);
	});
});

/**
 * Regression test for the defect where five entries declared `disambiguators` that no
 * code path read, so `K8s`, `psql`, `HCL`, `CI` and `ML` were unconditionally
 * `confident: true` while appearing to be context-guarded.
 *
 * The shape now makes that unrepresentable — a `GuardedForm` attaches context to a
 * named surface form of a named entry — but "unrepresentable" is a claim about the
 * type. These tests make it a claim about behaviour, so a refactor that decouples the
 * guard from the resolution path again fails here rather than in review.
 */
describe("every declared guard is actually enforced", () => {
	const guardedEntries = SKILL_ENTRIES.filter(
		(e) => (e.guardedForms ?? []).length > 0,
	);

	it("the fixture actually contains guarded entries, so this is not vacuous", () => {
		// Guards an empty suite: if someone deletes every guard, the loops below assert
		// nothing and go green.
		expect(guardedEntries.length).toBeGreaterThan(0);
		expect(SKILL_ENTRIES.length).toBeGreaterThan(guardedEntries.length);
	});

	it.each(
		SKILL_ENTRIES.flatMap((entry) =>
			(entry.guardedForms ?? []).map((guarded) => [guarded, entry] as const),
		),
	)("%s resolves to uncertain on its own", (guarded, entry) => {
		const verdict = normalizeSkill(guarded.surface);
		expect(verdict.status, guarded.surface).toBe("uncertain");
		expect(verdict.canonical, guarded.surface).toBeUndefined();

		// The occurrence path must agree, or the two disagree about the same string.
		const mentions = findSkillMentions(guarded.surface).filter(
			(m) => m.canonical === entry.canonical,
		);
		expect(mentions.length, guarded.surface).toBeGreaterThan(0);
		expect(
			mentions.every((m) => !m.confident),
			guarded.surface,
		).toBe(true);
		expect(
			isConfidentMention(entry.canonical, guarded.surface, guarded.surface),
			guarded.surface,
		).toBe(false);
	});

	it.each(
		SKILL_ENTRIES.flatMap((entry) =>
			(entry.guardedForms ?? []).flatMap((guarded) =>
				guarded.context.map((term) => [guarded, entry, term] as const),
			),
		),
	)("%s resolves with %s nearby", (guarded, entry, term) => {
		// Every declared term must actually be read. A term nothing reads is dead
		// configuration, which is exactly what the original defect was.
		const text = `${guarded.surface} with hands-on ${term} work`;
		expect(normalizeSkill(guarded.surface, { context: text })).toMatchObject({
			status: "resolved",
			canonical: entry.canonical,
		});
		expect(
			findConfidentSkills(text).map((m) => m.canonical),
			`${guarded.surface} + ${term}`,
		).toContain(entry.canonical);
		expect(
			isConfidentMention(entry.canonical, guarded.surface, text),
			`${guarded.surface} + ${term}`,
		).toBe(true);
	});

	it("every guard names a surface form its own entry owns", () => {
		// Structural half: a guard cannot point at a string the entry does not claim,
		// which is what made the old orphan members of the ambiguous set possible.
		for (const entry of SKILL_ENTRIES) {
			for (const guarded of entry.guardedForms ?? []) {
				expect(
					entry.aliases,
					`${entry.canonical} guards a surface it does not declare: ${guarded.surface}`,
				).toContain(guarded.surface);
			}
		}
	});

	it("every guard declares at least one context term", () => {
		// A guard with no terms can never be satisfied, so the surface form is dead: it
		// either fires on everything or never fires at all.
		for (const entry of SKILL_ENTRIES) {
			for (const guarded of entry.guardedForms ?? []) {
				expect(
					guarded.context.length,
					`${entry.canonical}/${guarded.surface} has no context terms`,
				).toBeGreaterThan(0);
			}
		}
	});

	it("guards the word-like surfaces and leaves bounded acronyms alone", () => {
		// The distinction is deliberate, not an oversight: `AWS` (welding), `Azure`
		// (the colour) and `Node` (a graph node) are real words with meanings outside
		// software. `CI`/`ML`/`HCL`/`K8s` cannot match inside another word once bounded,
		// so guarding them costs real matches and buys nothing.
		expect([...AMBIGUOUS_ALIASES].sort()).toEqual([
			"AWS",
			"Azure",
			"GCP",
			"Node",
		]);
	});
});

describe("no duplicated alias list", () => {
	it("imports the real set instead of re-declaring it", async () => {
		// Once the import exists, divergence is impossible — there is no second copy to
		// diverge. This asserts the import is still there and still used, so a future
		// edit cannot quietly reintroduce a local literal.
		//
		// Comments are stripped first: this file's own prose names `Go`, `R`, `C`,
		// `REST` and `Rust` to explain why they are gone, and a naive scan would trip
		// on its own documentation.
		const { readFileSync } = await import("node:fs");
		const raw = readFileSync(new URL(import.meta.url), "utf8");
		// Only whole-line comments are stripped: a trailing-comment regex would eat
		// the `//` inside an import path and take the rest of the file with it.
		const code = raw
			.replace(/\/\*[\s\S]*?\*\//g, "")
			.replace(/^\s*\/\/.*$/gm, "");

		expect(code).toMatch(/import\s*\{[^}]*\bAMBIGUOUS_ALIASES\b[^}]*\}\s*from/);
		// Imported once and referenced by the assertions below: more than one hit means
		// it is live, not merely listed.
		expect(code.match(/AMBIGUOUS_ALIASES/g)?.length ?? 0).toBeGreaterThan(2);
		// No local binding and no array literal that could be a copy of the set.
		expect(code).not.toMatch(/(const|let|var)\s+\w*[Aa]mbiguous\w*\s*[:=]/);
		expect(code).not.toMatch(/\[\s*"Node"\s*,\s*"Azure"/);
		// The precise shape of the old duplication: the seven-member literal. A blanket
		// `no "Go" anywhere` check would be wrong, because the unknown-input test below
		// legitimately names those five to assert they are *not* in the map.
		expect(code).not.toMatch(
			/"Node"\s*,\s*"Azure"\s*,\s*"Go"\s*,\s*"R"\s*,\s*"C"\s*,\s*"REST"\s*,\s*"Rust"/,
		);
	});

	it("the imported set is derived from the entries, so nothing can be an orphan", () => {
		const owned = new Map<string, string>();
		for (const entry of SKILL_ENTRIES) {
			for (const alias of entry.aliases) owned.set(alias, entry.canonical);
		}
		const orphans = [...AMBIGUOUS_ALIASES].filter((a) => !owned.has(a));
		expect(orphans).toEqual([]);
	});

	it("the set agrees with what the entries declare, member for member", () => {
		const declared = SKILL_ENTRIES.flatMap((entry) =>
			(entry.guardedForms ?? []).map((g) => g.surface),
		);
		expect([...AMBIGUOUS_ALIASES].sort()).toEqual(declared.sort());
	});
});

/**
 * Bounding is what makes an unguarded acronym safe, so it must apply to *every* alias.
 *
 * This used to be a hand-maintained list, and the list had already rotted: it named
 * `"Vue"` (an alias of no entry) while omitting `Docker`, `Python` and `Terraform`.
 */
describe("every alias is bounded", () => {
	it.each([
		["Dockerfile", "Docker"],
		["Dockerising", "Docker"],
		["Pythonic", "Python"],
		["Terraforming", "Terraform"],
		["Kubernetics", "Kubernetes"],
		["GraphQLite", "GraphQL"],
		["Postgresman", "PostgreSQL"],
	])("%j must not become %s", (text, canonical) => {
		expect(findConfidentSkills(text).map((m) => m.canonical)).not.toContain(
			canonical,
		);
		expect(
			isConfidentMention(canonical, canonical, text),
			`${text} must not read as ${canonical}`,
		).toBe(false);
	});

	it("still matches the alias itself, bounded or not", () => {
		expect(findConfidentSkills("Docker").map((m) => m.canonical)).toContain(
			"Docker",
		);
		expect(findConfidentSkills("Python 3").map((m) => m.canonical)).toContain(
			"Python",
		);
		expect(
			findConfidentSkills("docker-compose").map((m) => m.canonical),
		).toContain("Docker");
	});

	it("a context term does not match inside a longer word", async () => {
		// Synthetic entry, because the shipped disambiguators are all multi-word or
		// capitalised enough to survive this. Proves the boundary guard applies to the
		// context side of the decision, not only the surface side.
		const synthetic: SkillTaxonomy = [
			{
				canonical: "Alpha Platform",
				aliases: ["Alpha Platform", "AP"],
				guardedForms: [{ surface: "AP", context: ["Cloud"] }],
				category: "test",
			},
		];
		expect(
			normalizeSkill("AP", { context: "shipped on AP", taxonomy: synthetic })
				.status,
		).toBe("uncertain");
		expect(
			normalizeSkill("AP", {
				context: "shipped on AP Cloud",
				taxonomy: synthetic,
			}).status,
		).toBe("resolved");
		expect(
			findConfidentSkills("AP in Cloudy weather", synthetic).map(
				(m) => m.canonical,
			),
		).not.toContain("Alpha Platform");
		expect(
			findConfidentSkills("AP and Cloud hosting", synthetic).map(
				(m) => m.canonical,
			),
		).toContain("Alpha Platform");
	});

	it("accepts a plural of a declared context term", () => {
		// "App Service" must satisfy a guard when the resume says "App Services",
		// otherwise bounding turns into a silent false negative.
		expect(
			normalizeSkill("Azure", { context: "moved to Azure App Services" }),
		).toMatchObject({ status: "resolved", canonical: "Microsoft Azure" });
	});
});

describe("all occurrences are considered, not just the first", () => {
	const PREFIX =
		"Held an AWS certified welding inspector qualification, which is what I did for four years across two separate fabrication shops, first on pressure vessel work and then on structural steel, before I ever wrote a line of software. ";
	const LATER =
		" Much later I finally moved into cloud work and ran services on AWS Lambda.";

	it("builds a fixture where the context window cannot leak between occurrences", () => {
		// Self-verifying: if the two `AWS` occurrences ever came within 120 characters,
		// the test would stop testing what it claims to.
		const text = `${PREFIX}${LATER}`;
		const first = text.indexOf("AWS");
		const second = text.indexOf("AWS", first + 1);
		expect(first).toBeGreaterThanOrEqual(0);
		expect(
			second - first,
			"occurrences must be further apart than CONTEXT_WINDOW * 2",
		).toBeGreaterThan(250);
	});

	it("reports uncertain when no occurrence is disambiguated", () => {
		const hits = findSkillMentions(PREFIX).filter(
			(h) => h.canonical === "Amazon Web Services",
		);
		expect(hits.every((h) => !h.confident)).toBe(true);
	});

	it("reports resolved when a later occurrence is disambiguated", () => {
		// The first `AWS` is a welding certification and the second is a cloud project.
		// Reporting the document as "uncertain AWS" would drop a skill the resume
		// genuinely claims.
		const hits = findSkillMentions(`${PREFIX}${LATER}`).filter(
			(h) => h.canonical === "Amazon Web Services",
		);
		expect(hits.length).toBeGreaterThan(0);
		expect(hits.every((h) => h.confident)).toBe(true);
		expect(
			isConfidentMention("Amazon Web Services", "AWS", `${PREFIX}${LATER}`),
		).toBe(true);
	});
});

/**
 * Read-time normalisation only. Nothing here may be persisted onto user content, so
 * the entities carry no identifier a taxonomy swap would have to migrate.
 */
describe("no taxonomy id on user content", () => {
	it("an entry has no identifier field to store", () => {
		const allowed = new Set([
			"canonical",
			"aliases",
			"guardedForms",
			"category",
		]);
		for (const entry of SKILL_ENTRIES) {
			for (const key of Object.keys(entry)) {
				expect(
					allowed.has(key),
					`${entry.canonical} declares field "${key}"`,
				).toBe(true);
			}
		}
	});

	it("a verdict carries a resolved name, not a stored identifier", () => {
		const verdict = normalizeSkill("AWS", { context: "on AWS Lambda" });
		expect(Object.keys(verdict).sort()).toEqual([
			"candidates",
			"canonical",
			"status",
			"surface",
		]);
	});
});

describe("the taxonomy is swappable without a migration", () => {
	const synthetic: SkillTaxonomy = [
		{
			canonical: "Widget Framework",
			aliases: ["Widget Framework", "WF", "widgetjs"],
			guardedForms: [{ surface: "WF", context: ["Bundler", "Loader"] }],
			category: "test",
		},
	];

	it("normalises against an injected taxonomy", () => {
		expect(
			normalizeSkill("widgetjs", {
				taxonomy: synthetic,
				context: "Widget Framework",
			}),
		).toMatchObject({ status: "resolved", canonical: "Widget Framework" });
		// And the shipped taxonomy knows nothing about it.
		expect(normalizeSkill("widgetjs").status).toBe("unknown");
	});

	it("carries the guards across the swap", () => {
		expect(normalizeSkill("WF", { taxonomy: synthetic }).status).toBe(
			"uncertain",
		);
		expect(
			normalizeSkill("WF", { context: "the Bundler", taxonomy: synthetic })
				.status,
		).toBe("resolved");
	});

	it("findSkillMentions takes the same taxonomy", () => {
		expect(
			findSkillMentions("wrote it in widgetjs", synthetic).map(
				(m) => m.canonical,
			),
		).toContain("Widget Framework");
		expect(
			findSkillMentions("wrote it in widgetjs").map((m) => m.canonical),
		).not.toContain("Widget Framework");
	});

	it("defaults to the shipped taxonomy when no override is given", () => {
		expect(normalizeSkill("reactjs").canonical).toBe("React");
	});
});

describe("emit both forms", () => {
	it("expands a canonical skill to every surface form", () => {
		expect(expandSkillVariants("Amazon Web Services").sort()).toEqual(
			["AWS", "Amazon Web Service", "Amazon Web Services"].sort(),
		);
	});

	it("returns an empty list for an unknown skill rather than guessing", () => {
		expect(expandSkillVariants("Nonexistent Skill")).toEqual([]);
	});

	it("includes both the acronym and the expansion, which is the whole point", () => {
		// Workday matched the acronym and not the expansion. Writing both is the fix.
		const variants = expandSkillVariants("Google Cloud Platform");
		expect(variants).toContain("GCP");
		expect(variants).toContain("Google Cloud Platform");
	});

	it("covers the motivating case: four React surfaces, one entity", () => {
		expect(expandSkillVariants("React").sort()).toEqual([
			"React",
			"React 18",
			"React.js",
			"ReactJS",
		]);
		for (const surface of expandSkillVariants("React")) {
			expect(normalizeSkill(surface, { context: "React" }).canonical).toBe(
				"React",
			);
		}
	});
});

describe("canonicalizeSkill", () => {
	it.each([
		["aws", "Amazon Web Services"],
		["AWS", "Amazon Web Services"],
		["Amazon Web Services", "Amazon Web Services"],
		["postgres", "PostgreSQL"],
		["k8s", "Kubernetes"],
		["reactjs", "React"],
		[" nodejs ", "Node.js"],
	])("resolves %j", (input, expected) => {
		expect(canonicalizeSkill(input)).toBe(expected);
	});

	it("returns null for something unknown, not a near-match", () => {
		// A near-match here would silently rewrite a user's keyword.
		expect(canonicalizeSkill("React Native")).toBeNull();
		expect(canonicalizeSkill("")).toBeNull();
		expect(canonicalizeSkill("   ")).toBeNull();
	});

	it("is a name lookup, not a confidence oracle", () => {
		// Documented as such, and tested so: it answers "is this string a known name",
		// never "did this text claim the skill". `isConfidentMention` is the gate.
		expect(canonicalizeSkill("AWS")).toBe("Amazon Web Services");
		expect(
			isConfidentMention("Amazon Web Services", "AWS", "AWS welding cert"),
		).toBe(false);
	});
});

describe("map integrity", () => {
	it("every canonical is unique", () => {
		const seen = new Set(SKILL_ENTRIES.map((e) => e.canonical));
		expect(seen.size).toBe(SKILL_ENTRIES.length);
	});

	it("every entry lists its canonical as one of its own aliases", () => {
		// Otherwise expandSkillVariants can omit the display name and a writer
		// following it would drop the canonical form entirely.
		for (const entry of SKILL_ENTRIES) {
			expect(
				entry.aliases,
				`${entry.canonical} does not list itself`,
			).toContain(entry.canonical);
		}
	});

	it("an alias never maps to two different canonicals", () => {
		// A collision would make normalisation non-deterministic, and would give
		// `normalizeSkill` a real tie to break — which it deliberately does not.
		const owners = new Map<string, string>();
		const clashes: string[] = [];
		for (const entry of SKILL_ENTRIES) {
			for (const alias of [...entry.aliases, entry.canonical]) {
				const key = alias.toLowerCase();
				const prior = owners.get(key);
				if (prior && prior !== entry.canonical) {
					clashes.push(`${key}: ${prior} vs ${entry.canonical}`);
				}
				owners.set(key, entry.canonical);
			}
		}
		expect(clashes).toEqual([]);
	});

	it("the alias index resolves every alias to its canonical", () => {
		const index = buildAliasIndex();
		for (const entry of SKILL_ENTRIES) {
			for (const alias of entry.aliases) {
				expect(index.get(alias.toLowerCase()), alias).toBe(entry.canonical);
			}
		}
	});
});

describe("isConfidentMention", () => {
	it("separates the same string in a different context", () => {
		// The narrower question `findSkillMentions` cannot answer: not "is this skill
		// mentioned" but "is THIS hit a mention of it".
		expect(
			isConfidentMention(
				"Amazon Web Services",
				"AWS",
				"Held an AWS certified welding inspector qualification",
			),
		).toBe(false);
		expect(
			isConfidentMention(
				"Amazon Web Services",
				"AWS",
				"Migrated workloads from EC2 to AWS Lambda",
			),
		).toBe(true);
	});

	it("accepts an unguarded alias without context", () => {
		expect(
			isConfidentMention(
				"Amazon Web Services",
				"Amazon Web Services",
				"Ran workloads on Amazon Web Services",
			),
		).toBe(true);
	});

	it("accepts a surface that is not a declared alias", () => {
		// Plain-English keywords resolve to no canonical at all, so there is no
		// ambiguity to resolve.
		expect(
			isConfidentMention(
				"Kubernetes",
				"team leadership",
				"Led team leadership",
			),
		).toBe(true);
	});

	it("returns false for an unknown canonical rather than guessing", () => {
		expect(isConfidentMention("Nonexistent Skill", "AWS", "AWS")).toBe(false);
	});

	it("does not find a hit in text that does not contain the surface", () => {
		expect(
			isConfidentMention("Amazon Web Services", "AWS", "nothing relevant here"),
		).toBe(false);
	});
});

describe("robustness", () => {
	it("handles empty input", () => {
		expect(findSkillMentions("")).toEqual([]);
		expect(findConfidentSkills("")).toEqual([]);
		expect(findConfidentSkills(undefined as unknown as string)).toEqual([]);
		expect(normalizeSkill("").status).toBe("unknown");
		expect(normalizeSkill("   ").status).toBe("unknown");
	});

	it("does not loop forever on a pathological string", () => {
		const long = "React ".repeat(5000);
		expect(() => findSkillMentions(long)).not.toThrow();
		// Also the all-occurrence walk, which is a loop the first version did not have.
		const dense = "AWS ".repeat(2000);
		expect(() => findSkillMentions(dense)).not.toThrow();
	});

	it("handles an entry with no guards and an entry with several", () => {
		const synthetic: SkillTaxonomy = [
			{ canonical: "Plain Thing", aliases: ["Plain Thing", "PT"] },
			{
				canonical: "Multi Guard",
				aliases: ["Multi Guard", "MG"],
				guardedForms: [
					{ surface: "MG", context: ["First"] },
					{ surface: "Multi Guard", context: ["Second"] },
				],
			},
		];
		expect(normalizeSkill("PT", { taxonomy: synthetic }).status).toBe(
			"resolved",
		);
		expect(normalizeSkill("MG", { taxonomy: synthetic }).status).toBe(
			"uncertain",
		);
		expect(
			normalizeSkill("MG", { context: "First", taxonomy: synthetic }).status,
		).toBe("resolved");
		expect(normalizeSkill("Multi Guard", { taxonomy: synthetic }).status).toBe(
			"uncertain",
		);
		expect(
			normalizeSkill("Multi Guard", { context: "Second", taxonomy: synthetic })
				.status,
		).toBe("resolved");
	});
});
