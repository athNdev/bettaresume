import { describe, expect, it, vi } from "vitest";
import server from "../src/server";

/**
 * Every response the Worker can produce must carry `x-request-id`.
 *
 * `cors.ts` lists the header in `Access-Control-Expose-Headers`, which tells the
 * browser it may read it. Before this, nothing sent it — so the exposure was a
 * promise the API did not keep, and a user with a failing save had no value to
 * quote. This drives the real `fetch` export across all four paths, because the
 * original CORS defect was exactly this shape: one policy applied inconsistently
 * per branch.
 */

function mockEnv(allowedOrigins = "https://bettaresume.com"): Env {
	return {
		ALLOWED_ORIGINS: allowedOrigins,
		CLERK_PUBLISHABLE_KEY: "pk_test_dummy",
		CLERK_SECRET_KEY: "sk_test_dummy",
		ENVIRONMENT: "production",
		/*
		 * Drizzle constructs against the binding without touching it, so an empty
		 * object is enough for the tRPC handler to reach `onError`. Context creation
		 * failing first is what the previous version of this test hit — and it tested
		 * the adapter's own error log instead of ours.
		 */
		bettaresume_d1: {} as Env["bettaresume_d1"],
	} as unknown as Env;
}

const ctx = {} as ExecutionContext;
const ORIGIN = "https://bettaresume.com";

const paths = [
	{ name: "preflight", init: { method: "OPTIONS" }, path: "/trpc/resume.list" },
	{ name: "health", init: { method: "GET" }, path: "/health" },
	{ name: "method not allowed", init: { method: "POST" }, path: "/health" },
	{ name: "not found", init: { method: "GET" }, path: "/nope" },
];

describe("every response path carries a request id", () => {
	for (const { name, init, path } of paths) {
		it(`${name} does`, async () => {
			const res = await server.fetch(
				new Request(`https://api.bettaresume.com${path}`, {
					...init,
					headers: { Origin: ORIGIN },
				}),
				mockEnv(),
				ctx,
			);
			expect(res.headers.get("x-request-id")).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
		});
	}
});

describe("the id is stable within a request and honoured across one", () => {
	it("echoes a caller-supplied id", async () => {
		// A proxy or a retry that already assigned one keeps its correlation.
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/health", {
				headers: { Origin: ORIGIN, "x-request-id": "retry-0000000001" },
			}),
			mockEnv(),
			ctx,
		);
		expect(res.headers.get("x-request-id")).toBe("retry-0000000001");
	});

	it("generates a different id for each request when none is supplied", async () => {
		const call = () =>
			server.fetch(
				new Request("https://api.bettaresume.com/health", {
					headers: { Origin: ORIGIN },
				}),
				mockEnv(),
				ctx,
			);
		const [a, b] = await Promise.all([call(), call()]);
		expect(a.headers.get("x-request-id")).not.toBe(
			b.headers.get("x-request-id"),
		);
	});

	it("rejects an unparseable id rather than reflecting it", async () => {
		// The value goes into a response header, so reflecting arbitrary client bytes
		// would make the response a mirror. `\r\n` cannot survive the Request
		// constructor, which is why the injection cases are unit-tested on
		// `resolveRequestId` instead.
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/health", {
				headers: {
					Origin: ORIGIN,
					"x-request-id": "<script>alert(1)</script>",
				},
			}),
			mockEnv(),
			ctx,
		);
		expect(res.headers.get("x-request-id")).not.toContain("<script>");
		expect(res.headers.get("x-request-id")).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
	});
});

describe("the health body reports the id it returned", () => {
	it("matches the header", async () => {
		// Copying the body is the easiest way to quote it into a bug report, and a
		// body that disagreed with the header would send the reader to the wrong log.
		const res = await server.fetch(
			new Request("https://api.bettaresume.com/health", {
				headers: { Origin: ORIGIN },
			}),
			mockEnv(),
			ctx,
		);
		const body = (await res.json()) as { requestId?: string };
		expect(body.requestId).toBe(res.headers.get("x-request-id"));
	});
});

describe("a failed tRPC call logs the same id it returns", () => {
	it("leads the log line with it", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			const res = await server.fetch(
				new Request("https://api.bettaresume.com/trpc/does.notExist", {
					method: "GET",
					headers: { Origin: ORIGIN, "x-request-id": "tracing-00000001" },
				}),
				mockEnv(),
				ctx,
			);
			expect(res.headers.get("x-request-id")).toBe("tracing-00000001");
			expect(error).toHaveBeenCalled();
			// Context creation logs first on this path (the stubbed Clerk keys cannot
			// verify anything), so look for the handler's own line rather than the
			// first call — and require it to lead with the id.
			const handlerLine = error.mock.calls
				.map((call) => String(call[0]))
				.find((line) => line.includes("Error in tRPC handler"));
			expect(handlerLine).toContain("[tracing-00000001]");
			// And the context failure carries the same id, so an operator greps once.
			const contextLine = error.mock.calls
				.map((call) => String(call[0]))
				.find((line) => line.includes("Error creating context"));
			expect(contextLine).toContain("[tracing-00000001]");
		} finally {
			error.mockRestore();
		}
	});
});
