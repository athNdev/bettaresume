import { describe, expect, it } from "vitest";
import { isSectionEmpty } from "@/features/resume-editor/section-state";

/**
 * The editor could not distinguish "this section is empty" from "this section is
 * broken and the user thinks they filled it in". Both look like a form with blank
 * inputs, so a user whose Work Experience silently failed to save had no way to tell
 * that from never having started it.
 *
 * The section content shapes are not uniform, which is why this is worth pinning:
 * list sections use arrays, `personal-info` uses an object of empty strings, `summary`
 * stores rich text under `html`, and a freshly added section is seeded with `data: []`.
 */

describe("isSectionEmpty", () => {
	it("treats a section with no content object as empty", () => {
		expect(isSectionEmpty({})).toBe(true);
		expect(isSectionEmpty({ content: null })).toBe(true);
		expect(isSectionEmpty(null)).toBe(true);
		expect(isSectionEmpty(undefined)).toBe(true);
	});

	it("treats the seeded `data: []` of a newly added section as empty", () => {
		expect(
			isSectionEmpty({ content: { title: "Work Experience", data: [] } }),
		).toBe(true);
	});

	it("treats a list section with entries as filled", () => {
		expect(
			isSectionEmpty({
				content: { title: "Work Experience", data: [{ company: "Northwind" }] },
			}),
		).toBe(false);
	});

	it("treats an object of empty strings as empty, which is the personal-info case", () => {
		expect(
			isSectionEmpty({
				content: {
					title: "Personal Information",
					data: {
						fullName: "",
						email: "",
						phone: "",
						linkedin: "",
					},
				},
			}),
		).toBe(true);
	});

	it("treats an object with one real value as filled", () => {
		expect(
			isSectionEmpty({
				content: {
					title: "Personal Information",
					data: { fullName: "Amara Okafor", email: "" },
				},
			}),
		).toBe(false);
	});

	it("treats whitespace-only values as empty", () => {
		expect(
			isSectionEmpty({
				content: { title: "Summary", data: { fullName: "   " } },
			}),
		).toBe(true);
	});

	it("reads summary rich text from html, which has no data", () => {
		expect(
			isSectionEmpty({
				content: {
					title: "Professional Summary",
					html: "<p>Platform engineer</p>",
				},
			}),
		).toBe(false);

		expect(
			isSectionEmpty({
				content: { title: "Professional Summary", html: "   " },
			}),
		).toBe(true);

		expect(isSectionEmpty({ content: { title: "Professional Summary" } })).toBe(
			true,
		);
	});

	it("ignores the title, since every section carries a default one", () => {
		expect(
			isSectionEmpty({ content: { title: "Work Experience", data: [] } }),
		).toBe(true);
	});

	it("treats nested empty structures as empty", () => {
		expect(
			isSectionEmpty({
				content: { title: "Skills", data: { frontend: [], backend: [] } },
			}),
		).toBe(true);

		expect(
			isSectionEmpty({
				content: {
					title: "Skills",
					data: { frontend: ["React"], backend: [] },
				},
			}),
		).toBe(false);
	});

	it("counts 0 and false as real content, unlike null", () => {
		// A false flag or a zero score is something the user chose; treating it as
		// blank would mark a deliberately empty field as untouched.
		expect(isSectionEmpty({ content: { data: { score: 0 } } })).toBe(false);
		expect(isSectionEmpty({ content: { data: { remote: false } } })).toBe(
			false,
		);
		expect(isSectionEmpty({ content: { data: { score: null } } })).toBe(true);
	});

	it("handles an array whose entries are themselves blank", () => {
		expect(isSectionEmpty({ content: { data: [{}, { company: "" }] } })).toBe(
			true,
		);
		expect(
			isSectionEmpty({ content: { data: [{}, { company: "Acme" }] } }),
		).toBe(false);
	});
});
