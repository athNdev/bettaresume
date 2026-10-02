import { describe, expect, it, vi } from "vitest";
import { sectionTypeSchema } from "../packages/types/src/schemas";
import type { Resume, ResumeSection } from "../packages/types/src/types";
import { resumeToTypstJson } from "../src/lib/typst/serialize";

/**
 * Serialiser tests.
 *
 * The bug these exist for: `serializeSection` handled 11 of 13 section types
 * and fell through to `default: return { ...base, items: [] }`. `personal-info`
 * and `custom` therefore exported as empty — and since `api/src/db/seed.sql`
 * makes `personal-info` the FIRST section of the seeded demo resume, the demo
 * data itself demonstrated the blank header.
 *
 * The coverage test below is the durable fix: every type in `sectionTypeSchema`
 * gets a fixture containing a distinctive marker, and the serialised output must
 * contain that marker. Adding a new section type without a serialiser now fails
 * loudly instead of exporting blank.
 */

const SECTION_TYPES = sectionTypeSchema.options;

/** Distinctive marker per type, asserted to survive serialisation. */
const FIXTURES: Record<
	string,
	{ content: Record<string, unknown>; marker: string }
> = {
	"personal-info": {
		content: {
			title: "Personal Information",
			data: {
				fullName: "MARKER-PERSONAL-INFO",
				email: "avery@chen.dev",
				phone: "+49 30 123456",
				location: "Berlin, DE",
			},
		},
		marker: "MARKER-PERSONAL-INFO",
	},
	summary: {
		content: {
			title: "Summary",
			html: "<p>MARKER-SUMMARY backend engineer.</p>",
		},
		marker: "MARKER-SUMMARY",
	},
	experience: {
		content: {
			title: "Experience",
			data: [
				{
					id: "exp-1",
					company: "MARKER-EXPERIENCE-COMPANY",
					position: "Senior Backend Engineer",
					startDate: "2022-01",
					current: true,
					highlights: ["Cut p99 latency 41%"],
					technologies: ["Go"],
				},
			],
		},
		marker: "MARKER-EXPERIENCE-COMPANY",
	},
	education: {
		content: {
			title: "Education",
			data: [
				{
					id: "edu-1",
					institution: "MARKER-EDUCATION-INSTITUTION",
					degree: "BSc",
					field: "Computer Science",
					startDate: "2015",
					current: false,
				},
			],
		},
		marker: "MARKER-EDUCATION-INSTITUTION",
	},
	skills: {
		content: {
			title: "Skills",
			data: [
				{
					id: "cat-1",
					name: "MARKER-SKILLS-CATEGORY",
					order: 0,
					skills: [{ id: "sk-1", name: "TypeScript", level: "advanced" }],
				},
			],
		},
		marker: "MARKER-SKILLS-CATEGORY",
	},
	projects: {
		content: {
			title: "Projects",
			data: [
				{
					id: "prj-1",
					name: "MARKER-PROJECT",
					description: "A thing",
					highlights: [],
				},
			],
		},
		marker: "MARKER-PROJECT",
	},
	certifications: {
		content: {
			title: "Certifications",
			data: [
				{
					id: "cert-1",
					name: "MARKER-CERTIFICATION",
					issuer: "ACME",
					date: "2023",
				},
			],
		},
		marker: "MARKER-CERTIFICATION",
	},
	awards: {
		content: {
			title: "Awards",
			data: [
				{ id: "aw-1", title: "MARKER-AWARD", issuer: "ACME", date: "2023" },
			],
		},
		marker: "MARKER-AWARD",
	},
	languages: {
		content: {
			title: "Languages",
			data: [{ id: "lg-1", name: "MARKER-LANGUAGE", proficiency: "native" }],
		},
		marker: "MARKER-LANGUAGE",
	},
	publications: {
		content: {
			title: "Publications",
			data: [
				{
					id: "pub-1",
					title: "MARKER-PUBLICATION",
					publisher: "ACM",
					date: "2021",
				},
			],
		},
		marker: "MARKER-PUBLICATION",
	},
	volunteer: {
		content: {
			title: "Volunteer",
			data: [
				{
					id: "vol-1",
					organization: "MARKER-VOLUNTEER",
					role: "Mentor",
					startDate: "2020",
					current: true,
				},
			],
		},
		marker: "MARKER-VOLUNTEER",
	},
	references: {
		content: {
			title: "References",
			data: [
				{
					id: "ref-1",
					name: "MARKER-REFERENCE",
					position: "CTO",
					company: "ACME",
					isHidden: false,
				},
			],
		},
		marker: "MARKER-REFERENCE",
	},
	custom: {
		content: {
			title: "MARKER-CUSTOM-TITLE",
			html: "<p>MARKER-CUSTOM-BODY free-form prose.</p>",
		},
		marker: "MARKER-CUSTOM",
	},
};

function makeResume(
	sections: ResumeSection[],
	personalInfo?: Record<string, unknown>,
) {
	return {
		id: "resume-1",
		userId: "user-1",
		name: "Avery Chen",
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "minimal",
		tags: [],
		isArchived: false,
		metadata: (personalInfo
			? { personalInfo, settings: {} }
			: { settings: {} }) as unknown as Resume["metadata"],
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01",
		sections,
	} as unknown as Resume;
}

function section(
	type: string,
	order = 0,
	content?: Record<string, unknown>,
): ResumeSection {
	return {
		id: `${type}-${order}`,
		resumeId: "resume-1",
		type,
		order,
		visible: true,
		content: content ?? FIXTURES[type]?.content ?? { title: "T", data: [] },
		createdAt: "2026-01-01",
		updatedAt: "2026-01-01",
	} as unknown as ResumeSection;
}

describe("serializeSection — coverage across every SectionType", () => {
	/*
	 * The test that would have caught the original bug. It is written so that
	 * adding a type to `sectionTypeSchema` without adding a serialiser fails here
	 * first, with a message naming the type.
	 */
	it.each(SECTION_TYPES)("serialises `%s` to non-empty output", (type) => {
		const fixture = FIXTURES[type];
		expect(
			fixture,
			`No test fixture for section type "${type}". Add one to FIXTURES so this ` +
				`type is covered — otherwise it can regress to exporting empty.`,
		).toBeDefined();

		const parsed = JSON.parse(resumeToTypstJson(makeResume([section(type)])));
		const entry = (parsed.sections as { type: string }[]).find(
			(s) => s.type === type,
		);

		// Assert on the SECTION ENTRY, not on the whole document. Asserting
		// `expect(json).toContain(marker)` is too weak: the top-level
		// `personalInfo` payload can satisfy it even when the section itself
		// serialised to nothing, which is exactly the original bug.
		expect(
			JSON.stringify(entry),
			`Section type "${type}" serialised without its content. The serialiser ` +
				`fell through to its default branch.`,
		).toContain(fixture.marker);
	});

	it("has a fixture for every type and no fixture for a type that does not exist", () => {
		expect(Object.keys(FIXTURES).sort()).toEqual([...SECTION_TYPES].sort());
	});
});

describe("personal-info", () => {
	it("exports the name held in metadata.personalInfo", () => {
		const json = resumeToTypstJson(
			makeResume([section("personal-info")], {
				fullName: "Metadata Name",
				email: "m@example.com",
			}),
		);
		expect(json).toContain("Metadata Name");
		expect(json).toContain("m@example.com");
	});

	/*
	 * The seeded `resume-1` has a `personal-info` SECTION carrying the name while
	 * `metadata` has no `personalInfo` key at all. Trusting only metadata is what
	 * made the demo resume export with a blank header, so this case is real data,
	 * not a hypothetical.
	 */
	it("falls back to the section copy when metadata has no personalInfo", () => {
		const json = resumeToTypstJson(makeResume([section("personal-info")]));
		expect(json).toContain("MARKER-PERSONAL-INFO");
	});

	it("prefers metadata over the section when both are present", () => {
		const json = resumeToTypstJson(
			makeResume([section("personal-info")], { fullName: "From Metadata" }),
		);
		expect(json).toContain("From Metadata");
		expect(json).not.toContain("MARKER-PERSONAL-INFO");
	});

	it("merges per field, so a field present only in the section still survives", () => {
		const json = resumeToTypstJson(
			makeResume([section("personal-info")], {
				email: "only-in-metadata@example.com",
			}),
		);
		expect(json).toContain("only-in-metadata@example.com");
		expect(json).toContain("MARKER-PERSONAL-INFO");
	});

	it("does not throw when the section carries data as an empty array", () => {
		// `handleAddSection` seeds a new personal-info section with `data: []`,
		// so the array shape has to be tolerated rather than assumed away.
		const json = resumeToTypstJson(
			makeResume([
				section("personal-info", 0, {
					title: "Personal Information",
					data: [],
				}),
			]),
		);
		expect(json).toContain("personalInfo");
	});
});

describe("custom", () => {
	it("exports the title and strips the body to plain text", () => {
		const json = resumeToTypstJson(makeResume([section("custom")]));
		expect(json).toContain("MARKER-CUSTOM-TITLE");
		expect(json).toContain("MARKER-CUSTOM-BODY");
		// Markup must not survive into the Typst payload.
		expect(json).not.toContain("<p>");
	});

	it("accepts data as an array of blocks", () => {
		const json = resumeToTypstJson(
			makeResume([
				section("custom", 0, {
					title: "Custom",
					data: [{ title: "Block Title", body: "Block body" }],
				}),
			]),
		);
		expect(json).toContain("Block Title");
		expect(json).toContain("Block body");
	});
});

describe("unhandled section types", () => {
	it("warns naming the type instead of exporting blank silently", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		try {
			// A type that does not exist — e.g. added to the DB before a
			// serialiser lands.
			const json = resumeToTypstJson(
				makeResume([section("totally-unknown-type")]),
			);
			expect(warn).toHaveBeenCalled();
			expect(String(warn.mock.calls[0]?.[0])).toContain("totally-unknown-type");
			expect(json).toContain("totally-unknown-type");
		} finally {
			warn.mockRestore();
		}
	});
});

describe("invisible and unordered sections", () => {
	it("omits sections marked not visible", () => {
		const hidden = section("experience");
		(hidden as unknown as { visible: boolean }).visible = false;
		const json = resumeToTypstJson(makeResume([hidden]));
		expect(json).not.toContain("MARKER-EXPERIENCE-COMPANY");
	});

	it("emits sections in `order` regardless of array order", () => {
		const json = resumeToTypstJson(
			makeResume([
				section("experience", 2),
				section("education", 1),
				section("projects", 0),
			]),
		);
		const types = JSON.parse(json).sections.map(
			(s: { type: string }) => s.type,
		);
		expect(types).toEqual(["projects", "education", "experience"]);
	});
});
