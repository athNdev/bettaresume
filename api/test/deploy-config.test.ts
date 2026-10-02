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

const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("deploy configuration", () => {
	const cd = read("../../.github/workflows/cd.yml");
	const wrangler = read("../wrangler.jsonc");

	it("CD passes ALLOWED_ORIGINS into the envsubst step", () => {
		// Isolate the substitution step; other steps may legitimately omit it.
		const step = cd.slice(
			cd.indexOf("Substitute wrangler config placeholders"),
		);
		const envBlock = step.slice(0, step.indexOf("Deploy API"));
		expect(envBlock).toMatch(/ALLOWED_ORIGINS:\s*\$\{\{\s*vars\./);
	});

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
