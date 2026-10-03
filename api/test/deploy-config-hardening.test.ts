import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

/**
 * Reproduces the CD step's substitution logic against the real wrangler.jsonc.
 *
 * This exists because a hardcoded placeholder list broke production once already: it
 * named three variables and omitted $ALLOWED_ORIGINS and $CLERK_PUBLISHABLE_KEY, so
 * both were deployed as the literal string "$ALLOWED_ORIGINS". The API then matched no
 * browser origin, emitted no access-control-allow-origin header, and the deployed app
 * could not load any data.
 */
/**
 * Runs the CD step's ACTUAL shell block against the real wrangler.jsonc.
 *
 * The first version of this test reimplemented the derivation in TypeScript, which
 * meant it kept passing while the workflow itself regressed -- it could not see the
 * bug it was written for. Now the `run:` block is extracted from cd.yml and executed,
 * so the thing under test is the thing that ships.
 *
 * Requires `envsubst` (gettext), which the CD image also relies on.
 */
function runWorkflowStep() {
	const cd = read("../.github/workflows/cd.yml");
	const i = cd.indexOf("- name: Substitute wrangler config placeholders");
	const step = cd.slice(i, cd.indexOf("- name:", i + 10));
	const m = step.match(/run:\s*\|[+-]?\s*\n([\s\S]*?)\n\s*env:/);
	if (!m?.[1]) throw new Error("could not extract the substitution step body");

	const dir = mkdtempSync(join(tmpdir(), "wr-"));
	mkdirSync(join(dir, "api"));
	copyFileSync("wrangler.jsonc", join(dir, "api", "wrangler.jsonc"));

	try {
		execFileSync("bash", ["-c", m[1]], {
			cwd: dir,
			encoding: "utf8",
			env: {
				PATH: process.env.PATH ?? "",
				ALLOWED_ORIGINS: "https://app.bettaresume.com",
				CF_WORKER_CUSTOM_URL: "api.bettaresume.com",
				CLERK_PUBLISHABLE_KEY: "pk_test_real",
				D1_DATABASE_ID: "db-real",
				D1_DATABASE_NAME: "bettaresume",
			},
		});
	} catch (e) {
		// The step is expected to fail when a variable is missing; callers that
		// want that behaviour assert on the thrown error.
		return { failed: true, stderr: String(e), output: "" };
	}

	return {
		failed: false,
		output: readFileSync(join(dir, "api", "wrangler.jsonc"), "utf8"),
	};
}

function placeholdersIn(file: string) {
	return [
		...new Set(
			(file.match(/\$\{?[A-Z_][A-Z0-9_]*\}?/g) ?? []).map((t) =>
				t.replace(/[${}]/g, ""),
			),
		),
	].sort();
}

describe("the placeholder substitution does not corrupt the wrangler config", () => {
	it("substitutes EVERY placeholder the file actually contains", () => {
		const r = runWorkflowStep();
		expect(r.failed, `step failed: ${r.stderr}`).toBe(false);

		// The regression: a hand-written list covering 3 of the 4 real ones.
		expect(placeholdersIn(read("wrangler.jsonc"))).toEqual([
			"ALLOWED_ORIGINS",
			"CF_WORKER_CUSTOM_URL",
			"CLERK_PUBLISHABLE_KEY",
			"D1_DATABASE_ID",
		]);

		expect(
			placeholdersIn(r.output),
			"unsubstituted placeholder deploys as a literal string",
		).toEqual([]);
	});

	it("resolves ALLOWED_ORIGINS and CLERK_PUBLISHABLE_KEY, the two that broke prod", () => {
		const r = runWorkflowStep();
		expect(r.failed, `step failed: ${r.stderr}`).toBe(false);

		// Named explicitly so the outage cannot recur quietly.
		expect(r.output).toContain(
			'"ALLOWED_ORIGINS": "https://app.bettaresume.com"',
		);
		expect(r.output).toContain('"CLERK_PUBLISHABLE_KEY": "pk_test_real"');
		expect(r.output).not.toContain('"$ALLOWED_ORIGINS"');
		expect(r.output).not.toContain('"$CLERK_PUBLISHABLE_KEY"');
	});

	it("leaves $schema intact, which unscoped envsubst blanked", () => {
		const r = runWorkflowStep();
		expect(r.failed).toBe(false);
		expect(r.output).not.toMatch(/^\s*""\s*:/m);
		expect(r.output).toMatch(/"\$schema"\s*:\s*"[^"]+"/);
	});

	it("fails the step when a required variable is missing", () => {
		const cd = read("../.github/workflows/cd.yml");
		const i = cd.indexOf("- name: Substitute wrangler config placeholders");
		const body = cd
			.slice(i, cd.indexOf("- name:", i + 10))
			.match(/run:\s*\|[+-]?\s*\n([\s\S]*?)\n\s*env:/)?.[1];
		const dir = mkdtempSync(join(tmpdir(), "wr-"));
		mkdirSync(join(dir, "api"));
		copyFileSync("wrangler.jsonc", join(dir, "api", "wrangler.jsonc"));

		// No env vars at all: this is the "someone deleted a repository variable"
		// case that used to ship an empty D1 id with a green build.
		let failed = false;
		try {
			execFileSync("bash", ["-c", body ?? ""], {
				cwd: dir,
				encoding: "utf8",
				env: { PATH: process.env.PATH ?? "" },
			});
		} catch {
			failed = true;
		}
		expect(failed, "step must fail loudly rather than ship empty values").toBe(
			true,
		);
	});

	it("supplies every placeholder to the step", () => {
		const cd = read("../.github/workflows/cd.yml");
		// Every placeholder must be in the environment when the step runs, by one
		// of the two legitimate routes: supplied in the step's `env:` block, or
		// written to $GITHUB_ENV by an earlier step.
		//
		// ALLOWED_ORIGINS MUST arrive by the second route. Giving it a step-level
		// `env:` entry shadows the $GITHUB_ENV value and deployed a
		// deny-everything worker -- twice, under two different fixes.
		for (const name of placeholdersIn(read("wrangler.jsonc"))) {
			const viaStepEnv = new RegExp(`^\\s+${name}:`, "m").test(cd);
			const viaGithubEnv = new RegExp(`${name}=.*>> "\\$GITHUB_ENV"`).test(cd);
			expect(
				viaStepEnv || viaGithubEnv,
				`${name} is in wrangler.jsonc but never reaches the substitution step`,
			).toBe(true);
		}

		// And the shadowing form specifically must not return.
		const substitute = cd.slice(
			cd.indexOf("- name: Substitute wrangler config placeholders"),
			cd.indexOf(
				"- name:",
				cd.indexOf("- name: Substitute wrangler config placeholders") + 10,
			),
		);
		expect(
			substitute,
			"a step-level ALLOWED_ORIGINS shadows $GITHUB_ENV and deploys deny-everything",
		).not.toMatch(/ALLOWED_ORIGINS:/);
	});

	it("derives its list from the file rather than hardcoding one", () => {
		const cd = read("../.github/workflows/cd.yml");
		expect(cd).toMatch(/grep -oE/);
		expect(cd).toMatch(/wrangler\.jsonc/);
		// envsubst's argument is a shell-format string; bare names are a silent
		// no-op, so each name must be re-wrapped in braces.
		expect(cd).toMatch(/s\/\^\/\$\{\//);
		expect(cd).not.toMatch(/envsubst '\$\{[A-Z_]/);
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
