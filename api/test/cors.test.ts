import { describe, expect, it } from "vitest";
import {
	applyCorsHeaders,
	isOriginAllowed,
	normalizeOrigin,
	parseAllowedOrigins,
} from "../src/cors";
import server from "../src/server";

/**
 * CORS tests.
 *
 * These drive the REAL Worker fetch export (`server.default.fetch`) with a mock
 * env, not a reimplementation of it. Only the D1 binding and the Clerk keys are
 * stubbed, and neither is reached on the /health, 404 or preflight paths — those
 * return before `createContext` runs. The tRPC path is covered by the unit tests
 * on `applyCorsHeaders` plus the formatter tests, which do not need a Worker env.
 *
 * Why this is worth doing against the real handler: the original bug was not a
 * wrong allow-list decision, it was that the handler applied the policy
 * inconsistently across four different code paths, and only one of them was
 * wrong in an obvious way. A unit test of `isOriginAllowed` alone would pass
 * against the unfixed server.ts.
 */

const ORIGIN_OK = "https://bettaresume.com";
const ORIGIN_OTHER = "https://evil.example";

function mockEnv(allowedOrigins?: string): Env {
	return {
		ALLOWED_ORIGINS: allowedOrigins,
		CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
		CLERK_SECRET_KEY: "sk_test_dummy",
		ENVIRONMENT: "production",
	} as unknown as Env;
}

/** Minimal ExecutionContext stand-in; the worker never touches it. */
const ctx = {} as ExecutionContext;

function call(
	path: string,
	init: { method?: string; origin?: string } = {},
	allowedOrigins?: string,
): Promise<Response> {
	const headers = new Headers();
	if (init.origin !== undefined) headers.set("origin", init.origin);

	return server.fetch(
		new Request(`https://api.example.com${path}`, {
			method: init.method ?? "GET",
			headers,
		}),
		mockEnv(allowedOrigins),
		ctx,
	);
}

describe("parseAllowedOrigins", () => {
	it("returns an empty list for unset, empty and whitespace-only values", () => {
		expect(parseAllowedOrigins(undefined)).toEqual([]);
		expect(parseAllowedOrigins("")).toEqual([]);
		expect(parseAllowedOrigins("   ")).toEqual([]);
		expect(parseAllowedOrigins(" , , ")).toEqual([]);
	});

	it("splits and trims a comma-separated list", () => {
		expect(
			parseAllowedOrigins("https://a.example, https://b.example ,"),
		).toEqual(["https://a.example", "https://b.example"]);
	});
});

describe("isOriginAllowed", () => {
	it("denies everything when the list is empty (default-deny)", () => {
		expect(isOriginAllowed(ORIGIN_OK, [])).toBe(false);
	});

	it("denies a missing origin even when the list is non-empty", () => {
		expect(isOriginAllowed(null, [ORIGIN_OK])).toBe(false);
		expect(isOriginAllowed(undefined, [ORIGIN_OK])).toBe(false);
		expect(isOriginAllowed("", [ORIGIN_OK])).toBe(false);
	});

	it("allows only an exact match", () => {
		expect(isOriginAllowed(ORIGIN_OK, [ORIGIN_OK])).toBe(true);
		expect(isOriginAllowed(ORIGIN_OTHER, [ORIGIN_OK])).toBe(false);
	});

	it("does not treat a subdomain or a prefix as a match", () => {
		const list = [ORIGIN_OK];
		expect(isOriginAllowed("https://sub.bettaresume.com", list)).toBe(false);
		expect(isOriginAllowed("https://bettaresume.com.evil.example", list)).toBe(
			false,
		);
		expect(isOriginAllowed("http://bettaresume.com", list)).toBe(false);
	});

	it("absorbs a trailing slash in configuration", () => {
		expect(isOriginAllowed(ORIGIN_OK, ["https://bettaresume.com/"])).toBe(true);
	});

	it("treats '*' as an explicit allow-all, not as the default", () => {
		expect(isOriginAllowed(ORIGIN_OTHER, ["*"])).toBe(true);
		// ...but only because it was asked for by name.
		expect(isOriginAllowed(ORIGIN_OTHER, [])).toBe(false);
		expect(isOriginAllowed(ORIGIN_OTHER, ["https://bettaresume.com"])).toBe(
			false,
		);
	});

	it("still refuses a missing origin under the wildcard", () => {
		expect(isOriginAllowed(null, ["*"])).toBe(false);
	});
});

describe("applyCorsHeaders", () => {
	it("echoes the origin and always sets Vary: Origin on a match", () => {
		const headers = new Headers();
		applyCorsHeaders(headers, ORIGIN_OK, [ORIGIN_OK]);

		expect(headers.get("access-control-allow-origin")).toBe(ORIGIN_OK);
		expect(headers.get("vary")).toContain("Origin");
		expect(headers.get("access-control-expose-headers")).toContain(
			"x-request-id",
		);
	});

	it("emits no ACAO at all when the origin is not allowed", () => {
		const headers = new Headers();
		applyCorsHeaders(headers, ORIGIN_OTHER, [ORIGIN_OK]);

		expect(headers.get("access-control-allow-origin")).toBeNull();
		// Vary is still set: the response does vary by origin even when the
		// outcome is a refusal, and a cache must not reuse it blindly.
		expect(headers.get("vary")).toContain("Origin");
	});

	it("strips an inherited wildcard when the origin is refused", () => {
		const headers = new Headers({ "Access-Control-Allow-Origin": "*" });
		applyCorsHeaders(headers, ORIGIN_OTHER, [ORIGIN_OK]);

		expect(headers.get("access-control-allow-origin")).toBeNull();
	});

	it("echoes the request origin under the '*' wildcard rather than emitting '*'", () => {
		const headers = new Headers();
		applyCorsHeaders(headers, ORIGIN_OTHER, ["*"]);

		// A literal "*" would break credentialed requests and make Vary pointless.
		expect(headers.get("access-control-allow-origin")).toBe(ORIGIN_OTHER);
	});
});

describe("worker preflight (OPTIONS)", () => {
	it("echoes an allow-listed origin", async () => {
		const res = await call(
			"/trpc/resume.list",
			{ method: "OPTIONS", origin: ORIGIN_OK },
			ORIGIN_OK,
		);

		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN_OK);
		expect(res.headers.get("vary")).toContain("Origin");
	});

	it("emits no ACAO for a non-allow-listed origin", async () => {
		const res = await call(
			"/trpc/resume.list",
			{ method: "OPTIONS", origin: ORIGIN_OTHER },
			ORIGIN_OK,
		);

		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("emits no ACAO when ALLOWED_ORIGINS is unset (default-deny regression)", async () => {
		const res = await call(
			"/trpc/resume.list",
			{ method: "OPTIONS", origin: ORIGIN_OK },
			undefined,
		);

		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("emits no ACAO when ALLOWED_ORIGINS is empty", async () => {
		const res = await call(
			"/trpc/resume.list",
			{ method: "OPTIONS", origin: ORIGIN_OK },
			"",
		);

		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});
});

describe("worker /health", () => {
	it("echoes an allow-listed origin", async () => {
		const res = await call("/health", { origin: ORIGIN_OK }, ORIGIN_OK);

		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN_OK);
		expect(res.headers.get("vary")).toContain("Origin");
	});

	it("emits no ACAO for a non-allow-listed origin", async () => {
		const res = await call("/health", { origin: ORIGIN_OTHER }, ORIGIN_OK);

		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("emits no ACAO when ALLOWED_ORIGINS is unset (default-deny regression)", async () => {
		const res = await call("/health", { origin: ORIGIN_OK }, undefined);

		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("rejects POST with 405 and Allow: GET", async () => {
		const res = await call(
			"/health",
			{ method: "POST", origin: ORIGIN_OK },
			ORIGIN_OK,
		);

		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toBe("GET");
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN_OK);
	});

	it("rejects DELETE with 405 too", async () => {
		const res = await call(
			"/health",
			{ method: "DELETE", origin: ORIGIN_OK },
			ORIGIN_OK,
		);

		expect(res.status).toBe(405);
		expect(res.headers.get("allow")).toBe("GET");
	});

	it("still answers GET /", async () => {
		const res = await call("/", { origin: ORIGIN_OK }, ORIGIN_OK);

		expect(res.status).toBe(200);
		expect(res.headers.get("access-control-allow-origin")).toBe(ORIGIN_OK);
	});
});

describe("worker 404 path", () => {
	// This path previously had NO CORS headers at all, so an allowed origin
	// fetching a mistyped route got a response the browser could not read.
	it("returns CORS headers consistent with the allow-list", async () => {
		const allowed = await call("/nope", { origin: ORIGIN_OK }, ORIGIN_OK);

		expect(allowed.status).toBe(404);
		expect(allowed.headers.get("access-control-allow-origin")).toBe(ORIGIN_OK);
		expect(allowed.headers.get("vary")).toContain("Origin");
	});

	it("returns no ACAO for a non-allow-listed origin", async () => {
		const res = await call("/nope", { origin: ORIGIN_OTHER }, ORIGIN_OK);

		expect(res.status).toBe(404);
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});

	it("returns no ACAO when ALLOWED_ORIGINS is unset (default-deny regression)", async () => {
		const res = await call("/nope", { origin: ORIGIN_OK }, undefined);

		expect(res.status).toBe(404);
		expect(res.headers.get("access-control-allow-origin")).toBeNull();
	});
});

/**
 * `Origin` is attacker-controlled, so these bound the work done on it.
 *
 * CodeQL flagged the previous `/\/+$/` in `normalizeOrigin` as a potential
 * ReDoS (`js/polynomial-redos`, high): the pattern depends on library input and
 * could run slowly on many repetitions of `/`. It was replaced with a linear
 * loop plus a hard length ceiling.
 */
describe("normalizeOrigin — attacker-controlled input is bounded", () => {
	it("handles a long run of trailing slashes without pathological cost", () => {
		const hostile = `https://evil.example${"/".repeat(200)}`;
		const started = process.hrtime.bigint();
		const result = normalizeOrigin(hostile);
		const elapsedMs = Number(process.hrtime.bigint() - started) / 1e6;

		expect(result).toBe("https://evil.example");
		// Generous ceiling: the point is that it is O(n) and bounded, not that
		// it is fast. A pathological regex would blow past this.
		expect(elapsedMs).toBeLessThan(50);
	});

	it("refuses an origin longer than the ceiling instead of processing it", () => {
		const tooLong = `https://evil.example/${"a".repeat(4096)}`;

		expect(normalizeOrigin(tooLong)).toBe("");
		expect(isOriginAllowed(tooLong, [tooLong])).toBe(false);
	});

	it("still accepts a realistic origin untouched", () => {
		expect(normalizeOrigin("https://bettaresume.com")).toBe(
			"https://bettaresume.com",
		);
		expect(normalizeOrigin("  https://bettaresume.com///  ")).toBe(
			"https://bettaresume.com",
		);
	});
});
