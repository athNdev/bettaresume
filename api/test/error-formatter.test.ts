import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	REDACTED_ERROR_MESSAGE,
	type ValidationIssue,
} from "../src/trpc/index";
import { publicProcedure, router } from "../src/trpc/index";

/**
 * Error-formatter tests.
 *
 * These go through tRPC's real pipeline — `createInputMiddleware` /
 * `getTRPCErrorFromUnknown` / `getErrorShape` / the app's `errorFormatter` — and
 * assert on the JSON that would actually go over the wire.
 *
 * Asserting on the formatter's return value alone would miss the part that
 * actually leaked most: tRPC's own `shape.message` also carries the cause's
 * message, because `getTRPCErrorFromUnknown` builds
 * `new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause })` and `TRPCError` falls
 * back to `cause.message` when no explicit message is given.
 *
 * The router is built from the app's own `router` / `publicProcedure` exports, so
 * the formatter under test is the one shipped in src/trpc/index.ts — reverting it
 * fails these tests rather than silently passing against a local copy.
 */

/**
 * The wire shape, after superjson's envelope.
 *
 * superjson is the app's transformer, so a serialized error arrives as
 * `{ error: { json: <shape>, meta: ... } }` and the tRPC client unwraps it. This
 * helper performs that same unwrap so the tests assert on exactly what travels
 * over the wire.
 */
type ErrorShape = {
	message: string;
	/** JSON-RPC numeric code (-32603 for INTERNAL_SERVER_ERROR). */
	code: number;
	data: {
		/** The tRPC code key ("INTERNAL_SERVER_ERROR", "NOT_FOUND", ...). */
		code: string;
		/** The renamed field. The old name was `zodError`. */
		validationIssues: ValidationIssue[] | null;
		[key: string]: unknown;
	};
};

/** A router exposing one procedure that throws, plus one with a Zod input. */
function routerThatThrows(thrower: () => never) {
	return router({
		boom: publicProcedure
			.input(z.object({ id: z.string().min(1) }))
			.mutation(async () => thrower()),
		badInput: publicProcedure
			.input(z.object({ name: z.string().min(3), email: z.email() }))
			.mutation(async () => ({ ok: true })),
	});
}

async function callProcedure(
	procedureRouter: ReturnType<typeof routerThatThrows>,
	path: string,
	input: unknown,
): Promise<ErrorShape> {
	const response = await fetchRequestHandler({
		endpoint: "/trpc",
		req: new Request(`https://api.example.com/trpc/${path}`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ json: input }),
		}),
		router: procedureRouter,
		createContext: () => ({}) as never,
		onError: () => {
			// Every case in this file is a failure path; the server.ts onError hook
			// logs these in production.
		},
	});

	const body = (await response.json()) as {
		error: { json: ErrorShape };
	};
	return body.error.json;
}

describe("errorFormatter: what reaches the client", () => {
	it("publishes structured field issues for a ZodError cause, not a raw message", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error("unreachable");
			}),
			"badInput",
			{ name: "a", email: "not-an-email" },
		);

		expect(body.data.code).toBe("BAD_REQUEST");

		const issues = body.data.validationIssues;
		expect(Array.isArray(issues)).toBe(true);

		// Both bad fields are reported, each with a path a form control can use.
		expect(issues?.map((issue) => issue.path).sort()).toEqual([
			"email",
			"name",
		]);
		for (const issue of issues ?? []) {
			expect(issue.message).toBeTypeOf("string");
			expect(issue.code).toBeTypeOf("string");
		}

		// Zod's own `.message` is a JSON blob; it must not be what we publish.
		expect(JSON.stringify(body)).not.toContain("ZodError");
	});

	it("publishes validationIssues as null when the failure is not a ZodError", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error("secret internal detail");
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.data.validationIssues).toBeNull();
	});

	it("keeps a deliberately-written TRPCError message", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				// The exact shape used at resume.ts:456 and section.ts:145.
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Resume not found or access denied",
				});
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.message).toBe("Resume not found or access denied");
		expect(body.data.code).toBe("NOT_FOUND");
	});

	it("keeps a deliberate message on an INTERNAL_SERVER_ERROR that has a cause", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				// context.ts:143 does exactly this: a hand-written message with the
				// underlying error attached as `cause`. Redacting it would break the
				// only signal that auth verification failed, and the cause is the part
				// that leaks — so only the cause goes.
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Authentication verification failed",
					cause: new Error("Clerk JWKS fetch failed: ETIMEDOUT 10.0.0.4:443"),
				});
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.message).toBe("Authentication verification failed");
		expect(JSON.stringify(body)).not.toContain("ETIMEDOUT");
	});

	it("redacts a plain Error's message", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error("secret internal detail");
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.message).toBe(REDACTED_ERROR_MESSAGE);
		expect(body.data.code).toBe("INTERNAL_SERVER_ERROR");
		expect(JSON.stringify(body)).not.toContain("secret internal detail");
	});

	it("redacts a D1/SQLite UNIQUE constraint driver message", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error(
					"SQLITE_CONSTRAINT: UNIQUE constraint failed: User.email",
				);
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.message).toBe(REDACTED_ERROR_MESSAGE);
		expect(JSON.stringify(body)).not.toContain("SQLITE_CONSTRAINT");
		expect(JSON.stringify(body)).not.toContain("User.email");
	});

	it("redacts a 'no such table' driver message", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error("no such table: Resume");
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.message).toBe(REDACTED_ERROR_MESSAGE);
		expect(JSON.stringify(body)).not.toContain("no such table");
	});

	it("no longer exposes the misnamed zodError field", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error("secret internal detail");
			}),
			"boom",
			{ id: "x" },
		);

		expect(body.data).not.toHaveProperty("zodError");
		expect(body.data).toHaveProperty("validationIssues");
	});

	it("does not publish a stack trace", async () => {
		const body = await callProcedure(
			routerThatThrows(() => {
				throw new Error("secret internal detail");
			}),
			"boom",
			{ id: "x" },
		);

		// tRPC adds shape.data.stack when isDev is true. The app never sets isDev;
		// this asserts it so that flipping it cannot slip through unnoticed in a
		// test whose whole purpose is checking for leakage.
		expect(body.data).not.toHaveProperty("stack");
	});
});
