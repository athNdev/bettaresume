/**
 * Dashboard mutation feedback and the signed-in greeting.
 *
 * Phase A5 of docs/OVERHAUL-PLAN.md. Both of these were live bindings that nothing read:
 * `isDuplicating` from the mutation hook, and `user` from the auth store. In each case the
 * value was already there and correct — what was missing was anywhere to put it.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { greetingName } from "@/features/dashboard/greeting";

const dashboard = readFileSync(
	new URL("../src/features/dashboard/dashboard.tsx", import.meta.url),
	"utf8",
);
const card = readFileSync(
	new URL(
		"../src/features/dashboard/components/resume-card.tsx",
		import.meta.url,
	),
	"utf8",
);

describe("greetingName", () => {
	it("uses the first word of a full name", () => {
		expect(greetingName({ name: "Ada Lovelace" })).toBe("Ada");
		expect(greetingName({ name: "  Grace  Brewster  Hopper " })).toBe("Grace");
	});

	it("falls back to the email local part when there is no usable name", () => {
		// Common for a social login: Clerk returns an email and no name.
		expect(greetingName({ email: "alan.turing@example.com" })).toBe(
			"alan.turing",
		);
	});

	it("prefers the name over the email", () => {
		expect(
			greetingName({ name: "Ada Lovelace", email: "ada@example.com" }),
		).toBe("Ada");
	});

	it("treats blank and whitespace-only names as absent", () => {
		// A provider returning "" or " " is saying it has no name. `name.trim()` of " " is
		// not a greeting, and `"".split(/\s+/)[0]` is "" which would render "Welcome back, ".
		expect(greetingName({ name: "" })).toBeUndefined();
		expect(greetingName({ name: "   " })).toBeUndefined();
		expect(greetingName({ name: "", email: "kay@example.com" })).toBe("kay");
	});

	it("skips an initial-only name in favour of the email", () => {
		// "Welcome back, A" reads as a rendering bug, not a greeting.
		expect(greetingName({ name: "A", email: "ada@example.com" })).toBe("ada");
	});

	it("returns undefined when there is genuinely nothing to call someone", () => {
		expect(greetingName(null)).toBeUndefined();
		expect(greetingName({})).toBeUndefined();
		expect(greetingName({ name: "", email: "" })).toBeUndefined();
		// Single-letter email local part is no better than an initial.
		expect(greetingName({ email: "a@example.com" })).toBeUndefined();
	});

	it("does not invent a name for a signed-out user", () => {
		expect(greetingName({ name: null, email: null })).toBeUndefined();
	});
});

describe("the dashboard greets the signed-in user", () => {
	it("renders the derived name rather than only subscribing to the store", () => {
		expect(dashboard).toContain("greetingName(user)");
		expect(dashboard).toMatch(/<h1[^>]*>\s*\{firstName\s*\?/);
	});

	it("says who is signed in even when no name can be derived", () => {
		// Silently rendering nothing would leave the page with no heading at all, which is
		// the state this whole change exists to fix.
		expect(dashboard).toContain('"Welcome back"');
	});

	it("yields the heading to the welcome guide for a new account", () => {
		// Two headings compete when an account has no resumes yet, and the guide is the
		// more useful of the two there.
		expect(dashboard).toMatch(/user && totalResumes > 0/);
	});
});

describe("duplicating a resume reports what happened", () => {
	it("surfaces a failed duplicate instead of only logging it", () => {
		// Previously a bare console.error, which is the same as saying nothing: the user
		// clicked Duplicate, the menu closed, no copy appeared.
		const handler = dashboard.match(
			/const handleDuplicateResume[\s\S]*?\n\t};/,
		)?.[0];

		expect(handler).toBeDefined();
		expect(handler).toContain("toast.error");
	});

	it("also reports the case where the call resolves but yields no id", () => {
		// Without this the control looks inert: no error, no navigation, no copy.
		expect(dashboard).toMatch(/else \{\s*toast\.error\(/);
	});

	it("shows progress on the card that was clicked, not every card", () => {
		// `isDuplicating` is dashboard-wide. Used alone it would spin the duplicate control
		// on all of them, telling the user about rows they did not touch.
		expect(dashboard).toContain("duplicatingId");
		expect(dashboard).toMatch(/isDuplicating=\{duplicatingId === resume\.id\}/);
	});

	it("refuses a second duplicate while one is in flight", () => {
		// `duplicateResume` is not idempotent: a re-entry produces two copies and no way to
		// tell which was intended.
		expect(dashboard).toMatch(/if \(isDuplicating\) return;/);
	});

	it("clears the in-flight marker on both success and failure", () => {
		const handler = dashboard.match(
			/const handleDuplicateResume[\s\S]*?\n\t};/,
		)?.[0];

		expect(handler).toContain("finally");
		expect(handler).toContain("setDuplicatingId(null)");
	});

	it("disables and spins the duplicate item itself", () => {
		expect(card).toMatch(/<DropdownMenuItem\s+disabled=\{isDuplicating\}/);
		expect(card).toContain('"Duplicating…"');
		expect(card).toContain("animate-spin");
	});
});
