import { describe, expect, it, vi } from "vitest";
import {
	checkRateLimit,
	RATE_LIMIT_RETRY_AFTER_SECONDS,
	rateLimitKey,
} from "../src/rate-limit";
import server from "../src/server";

/**
 * Rate limiting at the edge.
 *
 * The property that matters is not the bucket arithmetic — Cloudflare owns that — it is
 * *where* the limiter sits and *what happens when it fires*. Both are asserted here:
 * the bucket is keyed by the header Cloudflare sets, and a rejection is a 429 with a
 * `Retry-After` and CORS headers, before any tRPC work.
 */

const request = (headers: Record<string, string> = {}) =>
	new Request("https://api.bettaresume.com/trpc/resume.list", { headers });

const limiterThat = (success: boolean) => ({
	limit: vi.fn(async () => ({ success })),
});

describe("the key is the edge-provided IP", () => {
	it("reads cf-connecting-ip", () => {
		expect(rateLimitKey(request({ "cf-connecting-ip": "203.0.113.7" }))).toBe(
			"203.0.113.7",
		);
	});

	it("ignores x-forwarded-for, which the client can set", () => {
		// Trusting this header would let anyone mint a fresh bucket per request and make
		// the limiter a no-op — the exact failure a limiter must not have.
		const key = rateLimitKey(
			request({ "x-forwarded-for": "198.51.100.1", "cf-connecting-ip": "" }),
		);
		expect(key).toBe("unknown");
	});
});

describe("checkRateLimit", () => {
	it("allows the request when the bucket has room", async () => {
		expect(
			await checkRateLimit({ RATE_LIMITER: limiterThat(true) }, request()),
		).toBeNull();
	});

	it("reports a retry window when the bucket is empty", async () => {
		expect(
			await checkRateLimit({ RATE_LIMITER: limiterThat(false) }, request()),
		).toEqual({ retryAfterSeconds: RATE_LIMIT_RETRY_AFTER_SECONDS });
	});

	it("allows everything when the binding is absent", async () => {
		// A preview environment without the binding must not fail closed and take the
		// API down. The protection is the limiter's availability, not the app's
		// correctness.
		expect(await checkRateLimit({}, request())).toBeNull();
	});

	it("passes the derived key to the limiter, not the whole request", async () => {
		const limiter = limiterThat(true);
		await checkRateLimit(
			{ RATE_LIMITER: limiter },
			request({ "cf-connecting-ip": "203.0.113.7" }),
		);
		expect(limiter.limit).toHaveBeenCalledWith({ key: "203.0.113.7" });
	});
});

describe("the Worker rejects before doing any work", () => {
	/** Only the fields the 429 path touches. */
	const env = (limiter: { limit: () => Promise<{ success: boolean }> }) =>
		({
			RATE_LIMITER: limiter,
			ENVIRONMENT: "production",
			ALLOWED_ORIGINS: "https://app.bettaresume.com",
		}) as never;

	const run = (limit: { limit: () => Promise<{ success: boolean }> }) =>
		server.fetch(
			new Request("https://api.bettaresume.com/trpc/resume.list", {
				headers: {
					origin: "https://app.bettaresume.com",
					"cf-connecting-ip": "203.0.113.7",
				},
			}),
			env(limit),
			{} as never,
		);

	it("answers 429 with Retry-After", async () => {
		const response = await run({ limit: async () => ({ success: false }) });
		expect(response.status).toBe(429);
		expect(response.headers.get("retry-after")).toBe(
			String(RATE_LIMIT_RETRY_AFTER_SECONDS),
		);
		expect(await response.json()).toMatchObject({ error: "Too many requests" });
	});

	it("keeps the CORS headers on the rejection, or the browser cannot read it", async () => {
		// Without `Access-Control-Allow-Origin` the browser reports a network error and
		// the user sees "saving failed" with no explanation, instead of "slow down".
		const response = await run({ limit: async () => ({ success: false }) });
		expect(response.headers.get("access-control-allow-origin")).toBe(
			"https://app.bettaresume.com",
		);
	});

	it("does not reach the tRPC handler when limited", async () => {
		// A procedure would have to touch D1 to answer; a 429 that still ran one would be
		// rate limiting the response, not the work.
		const response = await run({ limit: async () => ({ success: false }) });
		expect(response.headers.get("content-type")).toBe("application/json");
		expect(response.status).not.toBe(200);
	});
});
