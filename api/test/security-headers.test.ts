import { describe, expect, it } from "vitest";
import server from "../src/server";

/**
 * The API can set response headers; the GitHub-Pages frontend cannot. So this is
 * where the hardening lives, and it has to reach every path — the CORS policy
 * originally shipped inconsistently across four branches, and a header set is the
 * same shape of problem.
 */

function mockEnv(): Env {
	return {
		ALLOWED_ORIGINS: "https://bettaresume.com",
		CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
		CLERK_SECRET_KEY: "sk_test_dummy",
		ENVIRONMENT: "production",
		bettaresume_d1: {} as Env["bettaresume_d1"],
	} as unknown as Env;
}

const ctx = {} as ExecutionContext;

const paths = [
	{ name: "preflight", init: { method: "OPTIONS" }, path: "/trpc/resume.list" },
	{ name: "health", init: { method: "GET" }, path: "/health" },
	{ name: "method not allowed", init: { method: "POST" }, path: "/health" },
	{ name: "not found", init: { method: "GET" }, path: "/nope" },
];

describe("every response is hardened", () => {
	for (const { name, init, path } of paths) {
		it(`${name} carries the full set`, async () => {
			const res = await server.fetch(
				new Request(`https://api.bettaresume.com${path}`, {
					...init,
					headers: { Origin: "https://bettaresume.com" },
				}),
				mockEnv(),
				ctx,
			);
			expect(res.headers.get("x-content-type-options")).toBe("nosniff");
			expect(res.headers.get("referrer-policy")).toBe("no-referrer");
			expect(res.headers.get("cache-control")).toBe("no-store");
			expect(res.headers.get("strict-transport-security")).toBe(
				"max-age=31536000; includeSubDomains",
			);
		});
	}
});

describe("per-user responses are never cacheable", () => {
	it("a tRPC response says no-store", async () => {
		// Every response is scoped to one user's Bearer token. A shared cache holding
		// one would serve it to somebody else. Cloudflare does not cache Worker
		// responses by default; this makes it a guarantee rather than a default.
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/trpc/does.notExist", {
				headers: { Origin: "https://bettaresume.com" },
			}),
			mockEnv(),
			ctx,
		);
		expect(res.headers.get("cache-control")).toBe("no-store");
	});

	it("tRPC's own content type survives, and so does the hardening", async () => {
		// The tRPC branch copies the adapter's headers before adding ours; getting the
		// order wrong would strip `content-type` and break every client.
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/trpc/does.notExist", {
				headers: { Origin: "https://bettaresume.com" },
			}),
			mockEnv(),
			ctx,
		);
		expect(res.headers.get("content-type")).toContain("application/json");
		expect(res.headers.get("x-content-type-options")).toBe("nosniff");
		expect(res.headers.get("x-request-id")).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
	});
});

describe("CORS is still applied alongside it", () => {
	it("an allowed origin still gets its allow-origin header", async () => {
		// Hardening must not have displaced the policy: a change that quietly lost
		// access-control-allow-origin would break the whole deployed app.
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/health", {
				headers: { Origin: "https://bettaresume.com" },
			}),
			mockEnv(),
			ctx,
		);
		expect(res.headers.get("access-control-allow-origin")).toBe(
			"https://bettaresume.com",
		);
		expect(res.headers.get("access-control-expose-headers")).toBe(
			"x-request-id",
		);
	});

	it("a denied origin gets none", async () => {
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/health", {
				headers: { Origin: "https://evil.example" },
			}),
			mockEnv(),
			ctx,
		);
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});
});
