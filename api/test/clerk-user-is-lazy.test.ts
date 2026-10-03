import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The Clerk user object must not be fetched on every request.
 *
 * `createContext` used to do `await clerkClient.users.getUser(userId)` before every
 * procedure ran. That is a network round-trip to Clerk's API, and across the backend
 * `ctx.user` was genuinely read by exactly one procedure — `auth.upsert`, for
 * email/name/image fallbacks. The other two references were `user: ctx.user`
 * pass-throughs that `{ ...ctx }` already performs.
 *
 * So every resume list, section write, and export paid a Clerk request for a field
 * almost nothing used. `ctx.loadUser()` replaces it: lazy, and memoised so a procedure
 * that does need it still pays only once.
 */

const getUser = vi.fn();
const authenticateRequest = vi.fn();

// Mock the Clerk SDK before the module under test imports it. `authenticateRequest`
// is the token check (local verification + JWKS, which the SDK caches); `getUser` is
// the API call this ticket is about.
vi.mock("@clerk/backend", () => ({
	createClerkClient: () => ({
		authenticateRequest: (...args: unknown[]) => authenticateRequest(...args),
		users: { getUser: (...args: unknown[]) => getUser(...args) },
	}),
}));

vi.mock("../src/db/index", () => ({
	createDb: () => ({}),
}));

const { createContext } = await import("../src/trpc/context");

function env() {
	return {
		CLERK_SECRET_KEY: "sk_test",
		CLERK_PUBLISHABLE_KEY: "pk_test",
		ENVIRONMENT: "production",
		bettaresume_d1: {},
	} as never;
}

function request(headers: Record<string, string> = {}) {
	return new Request("https://api.example.com/trpc/resume.list", { headers });
}

function authenticated() {
	return {
		isAuthenticated: true,
		toAuth: () => ({ userId: "user_real" }),
	};
}

describe("createContext does not eagerly fetch the Clerk user", () => {
	beforeEach(() => {
		getUser.mockReset();
		authenticateRequest.mockReset();
		authenticateRequest.mockResolvedValue(authenticated());
		getUser.mockResolvedValue({ id: "user_real" });
	});

	it("makes NO users.getUser call while building the context", async () => {
		// This is the whole point. Before the fix this was 1.
		await createContext({ request: request(), env: env() });
		expect(getUser).not.toHaveBeenCalled();
	});

	it("exposes userId without needing the user object", async () => {
		const ctx = await createContext({ request: request(), env: env() });
		expect(ctx.userId).toBe("user_real");
		// And it still verifies the token.
		expect(authenticateRequest).toHaveBeenCalledTimes(1);
	});

	it("does not drop the session just because the user is now lazy", async () => {
		// Guards the obvious regression: returning early without populating anything.
		const ctx = await createContext({ request: request(), env: env() });
		expect(ctx.userId).toBeTruthy();
		expect(typeof ctx.loadUser).toBe("function");
	});

	it("fetches on demand and memoises, so repeated reads cost one call", async () => {
		const ctx = await createContext({ request: request(), env: env() });
		expect(getUser).not.toHaveBeenCalled();

		const first = await ctx.loadUser();
		const second = await ctx.loadUser();

		expect(getUser).toHaveBeenCalledTimes(1);
		expect(first).toEqual({ id: "user_real" });
		// Same object, not a refetch.
		expect(second).toBe(first);
	});

	it("passes the authenticated userId to Clerk, not a client-supplied one", async () => {
		await createContext({ request: request(), env: env() });
		await (await createContext({ request: request(), env: env() })).loadUser();
		expect(getUser).toHaveBeenCalledWith("user_real");
	});

	it("returns a null-user loader when unauthenticated, without calling Clerk", async () => {
		authenticateRequest.mockResolvedValue({ isAuthenticated: false });

		const ctx = await createContext({ request: request(), env: env() });

		expect(ctx.userId).toBeNull();
		expect(getUser).not.toHaveBeenCalled();
		// Same type as the authenticated case, so callers need no null branch.
		await expect(ctx.loadUser()).resolves.toBeNull();
	});

	it("still fails loudly on a verification error rather than degrading to logged-out", async () => {
		authenticateRequest.mockRejectedValue(new Error("clerk outage"));

		// Credentials were presented, so an outage must not look like a normal
		// anonymous request. Guards the behaviour #123 established.
		await expect(
			createContext({
				request: request({ authorization: "Bearer x" }),
				env: env(),
			}),
		).rejects.toThrow(/Authentication verification failed/);
	});

	it("falls back to an anonymous context when no credentials were presented", async () => {
		authenticateRequest.mockRejectedValue(new Error("no token"));

		const ctx = await createContext({ request: request(), env: env() });

		expect(ctx.userId).toBeNull();
		expect(getUser).not.toHaveBeenCalled();
	});
});

describe("the eager fetch is really gone", () => {
	it("no source file calls users.getUser outside the lazy loader", async () => {
		const { readFileSync, readdirSync } = await import("node:fs");
		const root = new URL("../src/", import.meta.url).pathname;
		const files: string[] = [];
		const walk = (dir: string) => {
			for (const e of readdirSync(dir, { withFileTypes: true })) {
				const p = `${dir}/${e.name}`;
				if (e.isDirectory()) walk(p);
				else if (e.name.endsWith(".ts")) files.push(p);
			}
		};
		walk(root);

		const offenders = files.filter((f) => {
			const src = readFileSync(f, "utf8");
			// Allow exactly one call site: the memoised loader in context.ts.
			const calls = src.match(/users\.getUser\(/g) ?? [];
			return calls.length > 0 && !f.endsWith("trpc/context.ts");
		});

		expect(
			offenders.map((f) => f.replace(root, "src/")),
			"users.getUser must only be called from the lazy loader",
		).toEqual([]);
	});
});
