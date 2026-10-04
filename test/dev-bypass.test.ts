import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { requestHeadersFor as requestHeadersForReal } from "../api/src/cors";

/**
 * The local development auth bypass must be unreachable from a production build.
 *
 * ## The history, because it explains every assertion here
 *
 * The first version of this bypass sent `x-dev-mode: true` from the tRPC client whenever
 * `NODE_ENV === "development"`, and the Worker granted a full session on that header
 * alone. It was the worst bug in this repository's history:
 *
 *   - the Worker had no way to tell production from development,
 *   - CORS allow-listed `x-dev-mode`, so **any site on the internet** could obtain a
 *     session by sending one header,
 *   - and the frontend rendered as signed-in, so the bypass was invisible until you
 *     looked at the network.
 *
 * It was removed. That left the dashboard and editor impossible to see without Clerk keys,
 * which is why **neither surface had ever been visually verified by anyone** until a
 * browser could be pointed at them.
 *
 * ## Why these tests read source but CI asserts on the artifact
 *
 * Source tests can prove the gates are written correctly. They cannot prove the gates
 * *fold away*, because that depends on what Next's bundler does with `process.env` — and
 * reading the source is exactly what failed last time.
 *
 * So the load-bearing assertion lives in CI, on the built output: `.github/workflows/ci.yml`
 * greps `out/` for `x-dev-mode` and fails if it appears. That job is a required status
 * check. These tests cover the parts that are decidable here.
 */

/**
 * The real function, imported rather than re-implemented.
 *
 * A test that copies the branching logic proves only that the copy is correct — the exact
 * failure mode this repo keeps meeting. Importing means these assertions break when the
 * implementation changes.
 */
const requestHeadersForFor = (environment: string | undefined) =>
	requestHeadersForReal(environment as never);

const read = (rel: string) =>
	readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

describe("the dev bypass is off by default", () => {
	it("needs an explicit opt-in, and it is not the default", () => {
		const source = read("../src/lib/dev-bypass.ts");
		// Both conditions must be present. One gate is what failed before.
		expect(source).toContain('process.env.NEXT_PUBLIC_DEV_MODE === "true"');
		expect(source).toContain('process.env.NODE_ENV === "development"');
	});

	it("resolves the flag once, from both conditions combined", () => {
		// The exact formatting is not the point; the conjunction is. Both identifiers
		// must appear in the single assignment that defines the flag.
		const source = read("../src/lib/dev-bypass.ts");
		const assignment = source
			.slice(source.indexOf("export const DEV_BYPASS_ACTIVE"))
			.split(";")[0];
		expect(assignment).toContain("DEV_MODE_REQUESTED");
		expect(assignment).toContain("NODE_ENV");
	});
});

describe("no CI or CD job can turn the bypass on", () => {
	const workflows = [
		"../.github/workflows/ci.yml",
		"../.github/workflows/cd.yml",
		"../.github/workflows/visual.yml",
	];

	for (const file of workflows) {
		it(`${file.split("/").pop()} never sets NEXT_PUBLIC_DEV_MODE`, () => {
			const yaml = read(file);
			// A comment mentioning the variable is fine; an assignment is not.
			const assignment = yaml
				.split("\n")
				.filter((line) => /NEXT_PUBLIC_DEV_MODE\s*:/.test(line));
			expect(
				assignment,
				`${file} sets NEXT_PUBLIC_DEV_MODE, which would enable the bypass in a build: ${assignment.join(" | ")}`,
			).toEqual([]);
		});
	}

	it("the example env file cannot enable the bypass on its own", () => {
		// `.env.example` ships `NEXT_PUBLIC_DEV_MODE=true`, and that is deliberate: it is
		// a local development convenience, and the second gate (`NODE_ENV ===
		// "development"`) is what makes it inert everywhere else. No workflow reads this
		// file — asserted above — so no production build can inherit it.
		//
		// Asserting it reads `false` here would be asserting the wrong property. The
		// property is "one variable is not enough", and that is covered by the two
		// conditions in the first describe block.
		const example = read("../.env.example");
		const line = example
			.split("\n")
			.find((l) => l.startsWith("NEXT_PUBLIC_DEV_MODE"));
		expect(line, "expected .env.example to document the flag").toBeDefined();
		expect(read("../src/lib/dev-bypass.ts")).toContain(
			'process.env.NODE_ENV === "development"',
		);
	});
});

describe("the API side of the bypass is default-deny", () => {
	const context = read("../api/src/trpc/context.ts");

	it("requires ENVIRONMENT to be exactly 'development'", () => {
		expect(context).toContain('const DEV_ENVIRONMENT = "development"');
		expect(context).toMatch(/env\.ENVIRONMENT === DEV_ENVIRONMENT/);
	});

	it("requires both the header and the environment, not either", () => {
		expect(context).toContain('request.headers.get("x-dev-mode") === "true"');
		// The conjunction is the security property: an OR would let a stray header through.
		expect(context).toMatch(
			/devBypassRequested\s*&&\s*isDevEnvironment\(env\)/,
		);
	});

	it("production wrangler does not set the development environment", () => {
		const prod = read("../api/wrangler.jsonc");
		expect(prod).toMatch(/"ENVIRONMENT":\s*"production"/);
		expect(prod).not.toMatch(/"ENVIRONMENT":\s*"development"/);
	});
});

describe("the frontend routes every Clerk hook through one wrapper", () => {
	it("no component calls a Clerk hook directly except the wrapper", () => {
		const wrapper = read("../src/lib/auth/use-auth-session.ts");
		expect(wrapper).toContain('from "@clerk/react"');

		// The point of the wrapper: a build that skips ClerkProvider cannot have a
		// call site reaching for Clerk's context, because `useAuth()` throws outside it.
		// These are the files that previously did.
		for (const file of [
			"../src/app/router.tsx",
			"../src/app/protected-route.tsx",
			"../src/components/providers/auth-provider.tsx",
			"../src/lib/trpc/react.tsx",
			"../src/features/dashboard/components/user-menu.tsx",
		]) {
			const source = read(file);
			expect(
				source.includes("useAuth as useClerkAuth") ||
					source.includes('useUser } from "@clerk/react"') ||
					source.includes('useClerk } from "@clerk/react"') ||
					source.includes("{ useAuth, useUser }"),
				`${file} imports a Clerk hook directly; route it through useAuthSession so a bypass build does not crash`,
			).toBe(false);
		}
	});

	it("the tRPC client only sends the header behind the gate", () => {
		const trpc = read("../src/lib/trpc/react.tsx");
		expect(trpc).toContain("DEV_BYPASS_ACTIVE");
		// The header set must be inside a guard, not unconditional.
		expect(trpc).toMatch(
			/if \(DEV_BYPASS_ACTIVE\) \{\s*headers\.set\("x-dev-mode", "true"\)/,
		);
	});
});

describe("CORS keeps the bypass header unreachable cross-origin", () => {
	const cors = read("../api/src/cors.ts");

	it("does not put x-dev-mode in the shared allow-list", () => {
		// A custom request header forces a preflight, so leaving it out means no
		// cross-origin browser can send it. This was the second half of the original
		// bypass: the Worker honoured the header AND CORS permitted it.
		expect(cors).toContain(
			'"Content-Type, Authorization, x-trpc-source, trpc-accept"',
		);
		// Only the declaration itself. The doc comment beside it deliberately names the
		// header while explaining why it is absent, so slicing to the next export would
		// match the prose and fail for the wrong reason.
		const declaration = cors
			.split("\n")
			.find((line) => line.includes("export const ALLOWED_REQUEST_HEADERS"));
		expect(declaration).toBeDefined();
		expect(declaration).not.toContain("x-dev-mode");
	});

	it("adds it only when ENVIRONMENT is exactly development", () => {
		expect(cors).toContain('const DEV_ENVIRONMENT = "development"');
		expect(cors).toMatch(
			/environment === DEV_ENVIRONMENT[\s\S]{0,160}DEV_ONLY_REQUEST_HEADERS/,
		);
	});

	it("returns the production list for every other environment, including unset", () => {
		// Unset must deny. `ENVIRONMENT` missing is the case that turns a
		// default-deny gate into a default-allow one.
		for (const value of ["production", "staging", "prod", "", undefined]) {
			expect(requestHeadersForFor(value)).not.toContain("x-dev-mode");
		}
		expect(requestHeadersForFor("development")).toContain("x-dev-mode");
	});
});

describe("the CI build asserts the bypass is absent from the artifact", () => {
	it("ci.yml greps the built output for the header", () => {
		const ci = read("../.github/workflows/ci.yml");
		// Source tests cannot prove the bundler folded the branch away. This step can.
		expect(ci).toContain("x-dev-mode");
		expect(ci).toMatch(/grep[^\n]*x-dev-mode/);
	});
});
