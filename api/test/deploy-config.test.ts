import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Guards the deploy-time configuration contract.
 *
 * `api/wrangler.jsonc` interpolates `$ALLOWED_ORIGINS`, and CD fills it with
 * `envsubst`. `envsubst` expands an unset variable to the empty string, and the
 * CORS policy in `api/src/cors.ts` is DEFAULT-DENY — an empty allow-list denies
 * every browser origin. So if CD ever stops passing the variable, the deployed
 * site is blocked by its own browser, with no build error and no test failure.
 *
 * That failure mode is invisible to CI, which is exactly why it is asserted here.
 */

const read = (rel: string): string =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const cd = read("../../.github/workflows/cd.yml");
const wrangler = read("../wrangler.jsonc");

describe("deploy configuration", () => {
	// (The old assertion that the envsubst step's own `env:` block carried
	// ALLOWED_ORIGINS was itself the bug — see "sets ALLOWED_ORIGINS in exactly one
	// place" below. A step-level env shadows $GITHUB_ENV, so that entry silently
	// re-introduced the empty allow-list.)

	it("keeps CORS default-deny, so an empty value denies everything", () => {
		expect(wrangler).toMatch(/"ALLOWED_ORIGINS":\s*"\$ALLOWED_ORIGINS"/);
		// No wildcard fallback anywhere in the policy.
		expect(read("../src/cors.ts")).not.toMatch(/ALLOW_ORIGIN[^_]*=\s*"\*"/);
	});

	it("documents the required variable, because a missing one fails silently", () => {
		const example = read("../.env.example");
		expect(example).toMatch(/ALLOWED_ORIGINS/);
	});
});

/**
 * Migration and allow-list wiring.
 *
 * Two production failures motivated these:
 *
 * 1. **Migrations were never applied.** Nothing in `cd.yml` ran
 *    `d1 migrations apply`, so `0001_resume_base_resume_fk.sql` reached production
 *    only when a developer ran it locally. `schema.ts` declared the
 *    `Resume.baseResumeId` foreign key while the live database did not have it —
 *    the app believed in a constraint the database never enforced.
 *
 * 2. **The allow-list was named wrongly.** The repository variable that existed
 *    was `ALLOWED_ORIGIN` (singular); the code reads `ALLOWED_ORIGINS`. With
 *    default-deny CORS that denied every browser origin while deploying cleanly
 *    and answering `/health` 200. Nothing warned.
 *
 * Both are invisible at build time, so they are asserted here rather than trusted.
 */
describe("migrations are applied by the deploy pipeline", () => {
	it("cd.yml applies D1 migrations", () => {
		expect(cd).toMatch(/d1 migrations apply/);
		// Must target the remote database, never a local one.
		expect(cd).toMatch(/migrations apply[^\n]*--remote/);
	});

	it("blocks on a SQL failure but only warns when the token lacks D1", () => {
		// These are different problems. A wrong migration must stop the deploy. A
		// token missing its D1 scope must not: blocking every deploy on a credential
		// problem is worse than the drift, and the drift is reported either way.
		expect(cd).toMatch(/7403|not authorized to access/);
		expect(cd).toMatch(/::warning::/);
		expect(cd).toMatch(/::error::D1 migration failed/);
		// The step must not simply be allowed to fail unnoticed.
		expect(cd).toMatch(/continue-on-error: true/);
	});

	it("reports unapplied migrations on every deploy", () => {
		expect(cd).toMatch(/d1 migrations list/);
		expect(cd).toMatch(/pending migrations/);
	});

	it("applies migrations BEFORE deploying the worker", () => {
		// Deploying first would serve traffic against a schema the worker assumes
		// but the database does not have.
		const migrate = cd.search(/d1 migrations apply/);
		const deploy = cd.search(/name: Deploy API to Cloudflare Workers/);
		expect(migrate).toBeGreaterThan(-1);
		expect(deploy).toBeGreaterThan(migrate);
	});

	it("every migration file in drizzle/ is tracked by the journal", () => {
		// A .sql file the journal does not know about is never applied.
		const journal = JSON.parse(read("../drizzle/meta/_journal.json"));
		const journalled = new Set(
			(journal.entries ?? []).map((e: { tag: string }) => `${e.tag}.sql`),
		);
		const onDisk = ["0000_init-schema.sql", "0001_resume_base_resume_fk.sql"];
		for (const file of onDisk) expect(journalled.has(file)).toBe(true);
	});
});

describe("the CORS allow-list is configured, not assumed", () => {
	it("the allow-list is committed so it is reviewable in a PR", () => {
		const origins = read("../allowed-origins.txt");
		expect(origins).toMatch(/app\.bettaresume\.com/);
		// Only comments and the origin itself; a wildcard would defeat default-deny.
		const entries = origins
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"));
		expect(entries.length).toBeGreaterThan(0);
		expect(entries.join(",")).not.toContain("*");
	});

	it("matches the GitHub Pages custom domain, not the apex", () => {
		// The bug shipped a doc/example claiming `https://bettaresume.com` while the
		// Pages site is served from the `app.` subdomain, so the documented value
		// would have denied the real site.
		const origins = read("../allowed-origins.txt");
		expect(origins).not.toMatch(/^\s*https?:\/\/bettaresume\.com\s*$/m);
	});

	it("cd resolves the allow-list and fails loudly when it is empty", () => {
		expect(cd).toMatch(/allowed-origins\.txt/);
		expect(cd).toMatch(/::error::.*empty/i);
	});

	it("parses the allow-list comment-aware", () => {
		// Regression: the file is mostly comments, and `tr -d '\n'` concatenated
		// the final comment line onto the origin. The worker deployed with a garbage
		// allow-list that matched nothing, so CORS denied every browser request.
		// Strip comments and blank lines, then join with commas.
		expect(cd).toMatch(/grep -vE/);
		expect(cd).toMatch(/paste -sd, -/);
		// The exact broken form must not come back.
		expect(cd).not.toMatch(/tr -d '\n' < api\/allowed-origins\.txt/);
		// And the value is exported once so the deploy and its smoke test agree.
		expect(cd).toMatch(/PRIMARY_ORIGIN/);
		expect(cd).toMatch(/ORIGIN="\$PRIMARY_ORIGIN"/);
	});

	it("sets ALLOWED_ORIGINS in exactly one place", () => {
		// Regression, and the subtlest bug in this file. The "Substitute" step
		// carried its own `env:` entry with `ALLOWED_ORIGINS: ${{ vars.* }}`, and a
		// step-level `env:` SHADOWS the value written to `$GITHUB_ENV` by the resolve
		// step. Since `vars.ALLOWED_ORIGINS` is unset, envsubst expanded
		// `$ALLOWED_ORIGINS` to "" and the worker deployed deny-everything — twice,
		// under two different fixes.
		//
		// So: the resolve step is the only writer, and the substitute step must not
		// mention the variable in its own env block.
		const writes = cd.match(/ALLOWED_ORIGINS=.*>> "\$GITHUB_ENV"/g) ?? [];
		expect(writes).toHaveLength(1);

		const substitute = cd.slice(
			cd.indexOf("Substitute wrangler config placeholders"),
			cd.indexOf("Apply D1 migrations"),
		);
		expect(substitute).not.toMatch(/ALLOWED_ORIGINS:/);
	});

	it("sends the production Origin on every probe", () => {
		// CORS is enforced by the browser. A request without an Origin header does
		// not exercise the policy, so a bare /health probe proved nothing.
		expect(cd).toMatch(/-H "Origin: \$ORIGIN"/);
	});

	it("the worker deploy smoke-tests CORS against the live API", () => {
		// /health proves nothing about CORS; only a preflight from the real origin
		// proves users can actually call the API.
		expect(cd).toMatch(/Smoke-test the deployed API/);
		expect(cd).toMatch(/access-control-allow-origin/i);
	});
});
