/**
 * Dashboard mutation feedback and the signed-in greeting.
 *
 * Phase A5 of docs/OVERHAUL-PLAN.md. Both of these were live bindings that nothing read:
 * `isDuplicating` from the mutation hook, and `user` from the auth store. In each case the
 * value was already there and correct — what was missing was anywhere to put it.
 */
import { describe, expect, it } from "vitest";
import { greetingName } from "@/features/dashboard/greeting";
import { plural, resultSummary } from "@/features/dashboard/result-summary";
import { catchBodies, codeOf } from "./helpers/code-source";

// Comments stripped: several assertions below are about an identifier being *absent*, and
// prose describing a fix must not be able to satisfy or break them.
const dashboard = codeOf("src/features/dashboard/dashboard.tsx");
const card = codeOf("src/features/dashboard/components/resume-card.tsx");

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

describe("plural", () => {
	it("does not pluralise a single item", () => {
		expect(plural(1, "resume")).toBe("resume");
		expect(plural(0, "resume")).toBe("resumes");
		expect(plural(2, "resume")).toBe("resumes");
	});

	it("accepts an irregular plural", () => {
		expect(plural(2, "match", "matches")).toBe("matches");
		expect(plural(1, "match", "matches")).toBe("match");
	});
});

describe("resultSummary", () => {
	it("counts everything when nothing is filtered", () => {
		expect(resultSummary({ matched: 12, total: 12 })).toBe("12 resumes");
		expect(resultSummary({ matched: 1, total: 1 })).toBe("1 resume");
	});

	it("counts of-and-when a search is active", () => {
		// A bare "3 matches" reads as "this account has three resumes" — true of the
		// query, false of the data.
		expect(resultSummary({ matched: 3, total: 12, query: "react" })).toBe(
			'3 of 12 resumes match "react"',
		);
	});

	it("agrees with itself on both counts at once", () => {
		expect(resultSummary({ matched: 1, total: 2, query: "cv" })).toBe(
			'1 of 2 resumes match "cv"',
		);
		expect(resultSummary({ matched: 2, total: 1, query: "cv" })).toBe(
			'2 of 1 resume match "cv"',
		);
	});

	it("ignores a query that is only whitespace", () => {
		// A stray space in the box is not a search; reporting "0 of 12 match ''" would be.
		expect(resultSummary({ matched: 12, total: 12, query: "   " })).toBe(
			"12 resumes",
		);
	});

	it("trims the query it echoes back", () => {
		expect(resultSummary({ matched: 1, total: 1, query: "  cv  " })).toBe(
			'1 of 1 resume match "cv"',
		);
	});

	it("says nothing when there is nothing to show", () => {
		// Zero is already covered by the empty state; a second statement about the same
		// fact is noise, and "0 of 12 match" next to "No resumes match" reads as a bug.
		expect(resultSummary({ matched: 0, total: 12, query: "zzz" })).toBe("");
		expect(resultSummary({ matched: 0, total: 0 })).toBe("");
	});
});

describe("the dashboard announces what the filter did", () => {
	it("puts the count in a live region", () => {
		// The search filters on every keystroke without moving focus, so without this the
		// grid changes silently.
		expect(dashboard).toMatch(
			/<p\s+aria-live="polite"[\s\S]{0,200}role="status"/,
		);
		expect(dashboard).toContain("resultSummary({");
	});

	it("counts against the unfiltered total, not the page it happens to show", () => {
		expect(dashboard).toMatch(/matched: filteredResumes\.length/);
		expect(dashboard).toMatch(/total: totalResumes/);
	});

	it("retries a failed load by refetching, not by reloading the page", () => {
		// `window.location.reload()` threw away the whole app to re-run one query, and lost
		// anything the user had typed.
		expect(dashboard).toMatch(/onRetry=\{\(\) => void refetch\(\)\}/);
		expect(dashboard).not.toContain("window.location.reload()");
	});

	it("uses the shared error primitive rather than a hand-rolled card", () => {
		// The hand-rolled version had no role="alert", so a failed load only changed pixels
		// and was indistinguishable from an account with no resumes.
		expect(dashboard).toContain("<PanelError");
	});
});

describe("no dashboard mutation fails silently", () => {
	/**
	 * Every `catch (err)` body that logs a failure must also report it.
	 *
	 * This is the invariant rather than a list of the six sites, so a seventh mutation added
	 * later is covered without anyone remembering to extend a table. Bodies come from
	 * `catchBodies`, which brace-matches: splitting on the literal marker made a segment run
	 * to the next handler instead of the end of its own block.
	 */
	const handlers = catchBodies(dashboard).filter((body) =>
		/console\.error\([\s\S]{0,60}Failed to/.test(body),
	);

	it("finds the handlers that log a failure", () => {
		// Guards against the split silently matching nothing and every assertion below
		// passing over an empty list. Five, not six: archive and restore share one handler
		// because they are one mutation with a different argument.
		expect(handlers.length).toBeGreaterThanOrEqual(5);
	});

	it("has a toast in every one of them", () => {
		const silent = handlers.filter(
			(segment) => !segment.includes("toast.error"),
		);

		expect(
			silent,
			`${silent.length} handler(s) log a failure without telling the user`,
		).toEqual([]);
	});

	it("does not report a success as a failure", () => {
		// The wording is the user-facing half, so it is worth pinning: "Could not" on a
		// successful action trains people to ignore toasts.
		expect(dashboard).not.toMatch(/toast\.error\((["'`])(?:Created|Deleted)/);
	});

	it("keeps the delete dialog open on failure, and says why", () => {
		// The dialog staying open is only useful if the user can tell the difference between
		// "still working" and "it did not work".
		const del = dashboard.match(/const handleDeleteResume[\s\S]*?\n\t};/)?.[0];

		expect(del).toBeDefined();
		// Cleared only on the success path.
		expect(del).toMatch(
			/await deleteResume[\s\S]{0,120}setIsDeleteDialogOpen\(false\)/,
		);
		expect(del).toContain("toast.error");
	});

	it("covers create, delete, archive, restore and import, not just the ones that were broken", () => {
		// Keyed off the toast wording rather than the logged wording. Merging archive and
		// restore into one handler turned their `console.error` calls into a template
		// literal, so a test that looked for `Failed to archive resume:` was asserting on
		// the source's phrasing rather than on the behaviour.
		for (const message of [
			"Could not create the resume.",
			"Could not delete the resume.",
			"could not be archived",
			"could not be restored",
			"Could not import the file.",
		]) {
			const segment = handlers.find((h) => h.includes(message));
			expect(segment, `no handler reports "${message}"`).toBeDefined();
			expect(segment).toContain("toast.error");
		}
	});
});

describe("archiving and restoring a resume report progress", () => {
	it("uses the pending flag the hook already exposes", () => {
		// #188 claimed the hook had nothing for archiving. It does — `isArchiving` was there
		// the whole time, next to the other three. The claim was wrong and this asserts the
		// fact instead of repeating the claim.
		const hook = codeOf("src/hooks/use-resume-mutations.ts");

		expect(hook).toContain("isArchiving: archive.isPending");
		expect(dashboard).toMatch(/\bisArchiving,\n\t\} = useResumeMutations\(\);/);
	});

	it("shares one handler for archive and restore", () => {
		// They are one mutation with a different argument, and they carry the same risk: both
		// flip a row's archived state, so a double invocation either duplicates the write or
		// undoes the first one.
		expect(dashboard).toMatch(
			/const handleArchiveResume = async \(\s*id: string,\s*archived: boolean,\s*name: string,?\s*\) => \{/,
		);
		expect(dashboard).not.toContain("handleRestoreResume");
	});

	it("names the row that is working rather than dimming all of them", () => {
		expect(dashboard).toContain("archivingId");
		expect(dashboard).toMatch(/isArchiving=\{archivingId === resume\.id\}/);
	});

	it("refuses a second archive while one is in flight", () => {
		expect(dashboard).toMatch(/if \(isArchiving\) return;/);
	});

	it("clears the marker whether it worked or not", () => {
		const handler = dashboard.match(
			/const handleArchiveResume[\s\S]*?\n\t};/,
		)?.[0];

		expect(handler).toContain("finally");
		expect(handler).toContain("setArchivingId(null)");
	});

	it("distinguishes the two failures in the message", () => {
		// "Could not archive" shown for a failed restore is the wrong sentence about the
		// user's own data, and it is the one they will read twice.
		const handler = dashboard.match(
			/const handleArchiveResume[\s\S]*?\n\t};/,
		)?.[0];

		expect(handler).toMatch(/could not be archived/);
		expect(handler).toMatch(/could not be restored/);
	});

	it("spins and disables both menu items", () => {
		expect(card).toMatch(/<DropdownMenuItem\s+disabled=\{isArchiving\}/);
		expect(card).toContain('"Archiving…"');
		expect(card).toContain('"Restoring…"');
	});
});
