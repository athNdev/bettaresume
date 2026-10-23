import { describe, expect, it } from "vitest";
import { shouldReportLocalEdit } from "@/hooks/use-auto-save";

/**
 * `onLocalUpdate` drives the live preview and the editor's dirty banner, so it has to
 * fire for real edits and stay quiet during hydration.
 *
 * `useAutoSave` seeds `localData` from `data`, so the effect runs once on mount with a
 * value the user never typed. Reporting that made the editor announce unsaved work on a
 * resume nobody had touched — visible as "Unsaved changes (1 area)" in the header.
 *
 * That was masked for as long as the Personal Information form was handed exactly the
 * value the draft was compared against. Once personal info began resolving from two
 * stores (`Resume.metadata.personalInfo` and the `personal-info` section — see
 * `resolvePersonalInfo` in `src/lib/typst/serialize.ts`) the form's initial value
 * legitimately differed from the draft baseline, and the banner lit up on open.
 *
 * These cases pin the semantics that actually matter, including the one a naive
 * "skip the first call" fix would get wrong.
 */
describe("shouldReportLocalEdit", () => {
	const saved = JSON.stringify({ fullName: "Amara Okafor" });

	it("stays quiet on hydration, where the draft equals what was saved", () => {
		expect(shouldReportLocalEdit(saved, saved)).toBe(false);
	});

	it("stays quiet when the section-resolved value matches the saved baseline", () => {
		// The real hydration case: the form is seeded from resolvePersonalInfo, and the
		// draft baseline is the same resolved object, so they stringify identically.
		const resolved = JSON.stringify({ fullName: "Amara Okafor", email: "" });
		expect(shouldReportLocalEdit(resolved, resolved)).toBe(false);
	});

	it("reports a genuine edit", () => {
		expect(
			shouldReportLocalEdit(JSON.stringify({ fullName: "Amara Okafor-Test" }), saved),
		).toBe(true);
	});

	it("reports a genuine FIRST edit, which a call-counting fix would swallow", () => {
		// The regression guard. Skipping "the first emission" would also skip this, leaving
		// the live preview frozen until the user's second keystroke.
		const firstEdit = JSON.stringify({ fullName: "A" });
		expect(shouldReportLocalEdit(firstEdit, saved)).toBe(true);
	});

	it("reports when a field is cleared back toward empty but differs from the baseline", () => {
		expect(shouldReportLocalEdit(JSON.stringify({ fullName: "" }), saved)).toBe(true);
	});

	it("is order-sensitive for object keys, matching JSON.stringify semantics", () => {
		// Documents the limitation rather than hiding it: key order changes the string, so
		// a re-ordered-but-equal object reads as an edit. Same behaviour as `isDirty`,
		// which is deliberate — one comparison rule across the hook, not two.
		expect(
			shouldReportLocalEdit(
				JSON.stringify({ fullName: "Amara Okafor" }),
				JSON.stringify({ email: "", fullName: "Amara Okafor" }),
			),
		).toBe(true);
	});

	it("treats an empty-object baseline as dirty once anything is typed", () => {
		expect(shouldReportLocalEdit(JSON.stringify({ fullName: "" }), JSON.stringify({}))).toBe(
			true,
		);
	});
});