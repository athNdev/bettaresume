import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Two deploy-time traps, both of which had already caused a real outage or a real
 * warning in anger.
 *
 * 1. `envsubst` with no argument list substitutes EVERY `$VAR` in the file.
 *    `wrangler.jsonc` begins with a JSON Schema `$schema` key, so that key was
 *    rewritten to `""` and wrangler warned on every single deploy:
 *      Unexpected fields found in top-level field: ""
 *
 * 2. `api/.env.example` shipped `ALLOWED_ORIGINS=app.bettaresume.com` -- a bare host.
 *    The same file's comment demands "a bare origin (`scheme://host[:port]`)". A bare
 *    host can never equal a browser `Origin` header, so local dev was blocked from the
 *    API, and that malformed shape is exactly what took production down in #146.
 */

const read = (p: string) => readFileSync(p, "utf8");

describe("the placeholder substitution does not corrupt the wrangler config", () => {
	it("leaves $schema intact when substitution is scoped", () => {
		// Runs the real envsubst with the real command from the workflow.
		const out = execFileSync(
			"bash",
			[
				"-c",
				`envsubst '\${D1_DATABASE_ID} \${D1_DATABASE_NAME} \${CF_WORKER_CUSTOM_URL}' <<'EOF'\n${read("wrangler.jsonc")}\nEOF`,
			],
			{
				encoding: "utf8",
				env: {
					...process.env,
					D1_DATABASE_ID: "db-123",
					D1_DATABASE_NAME: "bettaresume",
					CF_WORKER_CUSTOM_URL: "api.bettaresume.com",
				},
			},
		);

		// The regression: unscoped envsubst turns this key into "".
		expect(out).not.toMatch(/^\s*""\s*:/m);
		// Checked as text, not JSON.parse: wrangler.jsonc is JSONC (line comments
		// and trailing commas), so JSON.parse cannot read it.
		expect(out).toMatch(/"\$schema"\s*:\s*"[^"]+"/);

		// And the real placeholders still resolve, or the deploy is pointless.
		expect(out).toContain("db-123");
		expect(out).toContain("api.bettaresume.com");
	});

	it("the workflow scopes envsubst instead of substituting everything", () => {
		const cd = read("../.github/workflows/cd.yml");

		// A bare `envsubst < file` is the bug: every invocation must carry an
		// explicit variable list. Comments explaining why are filtered out, and
		// the run block is multi-line (line continuation), so this inspects every
		// line rather than assuming one line holds both halves.
		const invocations = cd
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.includes("envsubst") && !l.startsWith("#"));

		expect(invocations.length).toBeGreaterThan(0);
		const unscoped = invocations.filter((l) => !/envsubst '\$\{/.test(l));
		expect(unscoped, "unscoped envsubst would blank $schema").toEqual([]);

		// And it must name exactly the placeholders the step supplies.
		expect(invocations[0]).toMatch(
			/envsubst '\$\{D1_DATABASE_ID\} \$\{D1_DATABASE_NAME\} \$\{CF_WORKER_CUSTOM_URL\}'/,
		);
	});

	it("fails the deploy if a placeholder is left unsubstituted", () => {
		const cd = read("../.github/workflows/cd.yml");
		// Otherwise a missing repository variable silently ships an empty
		// database id, which looks like a successful deploy and a broken API.
		expect(cd).toMatch(/still contains an unsubstituted placeholder/);
	});

	it("keeps set -euo pipefail so a substitution failure is not swallowed", () => {
		const cd = read("../.github/workflows/cd.yml");
		const step = cd.slice(
			cd.indexOf("- name: Substitute wrangler config placeholders"),
			cd.indexOf(
				"- name:",
				cd.indexOf("- name: Substitute wrangler config placeholders") + 10,
			),
		);
		expect(step).toMatch(/set -euo pipefail/);
	});
});

describe("the committed origin examples are usable", () => {
	const isOrigin = (v: string) =>
		/^https?:\/\/[^\s/]+(?::\d+)?$/.test(v) && !v.endsWith("/");

	it("api/.env.example ships a value that can actually match an Origin header", () => {
		const example = read(".env.example");
		const value = example.match(/^ALLOWED_ORIGINS=(.*)$/m)?.[1]?.trim();

		expect(value, "ALLOWED_ORIGINS must be set in the example").toBeTruthy();
		expect(
			isOrigin(value as string),
			`ALLOWED_ORIGINS="${value}" is not a bare origin (scheme://host[:port])`,
		).toBe(true);
	});

	it("the example satisfies the contract its own comment states", () => {
		const example = read(".env.example");
		// The comment right above it demands a bare origin. The shipped value did
		// not, which is how the trap survived.
		expect(example).toMatch(/scheme:\/\/host/);
		expect(example).toMatch(/^ALLOWED_ORIGINS=https?:\/\//m);
	});

	it("every non-comment origin assignment in the repo is a valid origin", async () => {
		// Belt and braces: catches api/.dev.vars-style files if one is ever committed.
		const { readdirSync } = await import("node:fs");
		const files = readdirSync(".")
			.filter((f) => f.startsWith(".env"))
			.concat(readdirSync("../api").filter((f) => f.startsWith(".env")));

		const bad: string[] = [];
		for (const f of files) {
			for (const line of read(f).split("\n")) {
				const m = line.match(/^ALLOWED_ORIGINS=(.*)$/);
				if (!m) continue;
				const v = (m[1] ?? "").trim();
				if (v && v !== "*" && !isOrigin(v)) bad.push(`${f}: ${v}`);
			}
		}
		expect(bad).toEqual([]);
	});

	it("the production allow-list stays the committed full origin", () => {
		// Guards against "fixing" the example by regressing #146.
		const origins = read("allowed-origins.txt")
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"));
		expect(origins).toEqual(["https://app.bettaresume.com"]);
	});
});
