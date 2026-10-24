import { describe, expect, it } from "vitest";
import { matchRoute, parseHash } from "@/lib/hash-router";

/**
 * The hash router is the only router this app has. Every navigation goes through these
 * two pure functions, and neither had a test — it was on the `[GATE]` ticket's list and
 * was never picked up.
 *
 * Why it matters more than it looks: GitHub Pages cannot serve arbitrary paths, so the
 * app addresses everything as `#/…`. A parse that silently mangles a fragment breaks a
 * bookmarked resume, and a matcher that is too permissive sends `/resume-editor/settings`
 * into the editor as a resume id, where it fails as a 404 from the API rather than as a
 * wrong route.
 */

describe("parseHash keeps the path and lifts the query", () => {
	it("normalises the empty and root cases", () => {
		expect(parseHash("")).toEqual({ path: "/", params: {} });
		expect(parseHash("#")).toEqual({ path: "/", params: {} });
		expect(parseHash("#/")).toEqual({ path: "/", params: {} });
		expect(parseHash("/")).toEqual({ path: "/", params: {} });
	});

	it("reads a plain fragment", () => {
		expect(parseHash("#/dashboard")).toEqual({
			path: "/dashboard",
			params: {},
		});
	});

	it("reads a nested path", () => {
		expect(parseHash("#/resume-editor/abc-123")).toEqual({
			path: "/resume-editor/abc-123",
			params: {},
		});
	});

	it("accepts a fragment without the leading slash", () => {
		// `location.hash` is `#dashboard` when someone types it, and `#` is optional in
		// the regex that strips it.
		expect(parseHash("#dashboard")).toEqual({ path: "/dashboard", params: {} });
	});

	it("lifts query parameters out of the path", () => {
		// The path must NOT keep the query: `matchRoute` compares segments, so a stray
		// `?a=1` would make every route unfindable.
		expect(parseHash("#/resume-editor/42?section=skills&tab=review")).toEqual({
			path: "/resume-editor/42",
			params: { section: "skills", tab: "review" },
		});
	});

	it("decodes what URLSearchParams decodes, and no more", () => {
		expect(parseHash("#/x?q=hello%20world&plus=a+b").params).toEqual({
			q: "hello world",
			plus: "a b",
		});
	});

	it("keeps a repeated parameter last-wins, as URLSearchParams does", () => {
		expect(parseHash("#/x?a=1&a=2").params).toEqual({ a: "2" });
	});

	it("survives a bare `?` with nothing after it", () => {
		expect(parseHash("#/x?")).toEqual({ path: "/x", params: {} });
	});
});

describe("matchRoute extracts dynamic segments", () => {
	it("matches a static route", () => {
		expect(matchRoute("/dashboard", "/dashboard")).toEqual({});
	});

	it("returns null for a different static route", () => {
		expect(matchRoute("/resume-editor", "/dashboard")).toBeNull();
	});

	it("extracts a single param", () => {
		expect(matchRoute("/resume-editor/abc", "/resume-editor/:id")).toEqual({
			id: "abc",
		});
	});

	it("extracts several params", () => {
		expect(matchRoute("/a/1/b/2", "/a/:x/b/:y")).toEqual({ x: "1", y: "2" });
	});

	it("refuses a route with the wrong number of segments", () => {
		// Too few, and too many. Both would otherwise match a prefix and route the user
		// into a page for a different path.
		expect(matchRoute("/resume-editor", "/resume-editor/:id")).toBeNull();
		expect(
			matchRoute("/resume-editor/1/extra", "/resume-editor/:id"),
		).toBeNull();
	});

	it("is not fooled by trailing slashes or doubled slashes", () => {
		// `filter(Boolean)` drops empty segments, so these all normalise.
		expect(matchRoute("/resume-editor/1/", "/resume-editor/:id")).toEqual({
			id: "1",
		});
		expect(matchRoute("//resume-editor//1", "/resume-editor/:id")).toEqual({
			id: "1",
		});
	});

	it("treats a static segment as case-sensitive", () => {
		// `/Resume-Editor/1` must not land in the editor; the router is not a fuzzy
		// matcher and a wrong-case URL is a stale link, not a route.
		expect(matchRoute("/Resume-Editor/1", "/resume-editor/:id")).toBeNull();
	});

	it("lets a dynamic segment match anything, including a word that is also a route", () => {
		// Documented behaviour, and the reason callers must place specific routes before
		// dynamic ones: `/resume-editor/settings` is a valid `:id` match.
		expect(matchRoute("/resume-editor/settings", "/resume-editor/:id")).toEqual(
			{
				id: "settings",
			},
		);
	});

	it("matches the root pattern only against the root", () => {
		expect(matchRoute("/", "/")).toEqual({});
		expect(matchRoute("/dashboard", "/")).toBeNull();
	});
});

describe("the two halves compose", () => {
	it("a real deep link parses and matches in one step", () => {
		const { path, params } = parseHash("#/resume-editor/9f1c?tab=review");
		expect(matchRoute(path, "/resume-editor/:id")).toEqual({ id: "9f1c" });
		expect(params).toEqual({ tab: "review" });
	});

	it("an unknown path matches nothing, which is how the router 404s", () => {
		const { path } = parseHash("#/nowhere/at/all");
		expect(matchRoute(path, "/")).toBeNull();
		expect(matchRoute(path, "/dashboard")).toBeNull();
		expect(matchRoute(path, "/resume-editor/:id")).toBeNull();
	});
});
