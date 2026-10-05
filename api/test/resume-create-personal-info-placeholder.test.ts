import { describe, expect, it } from "vitest";
import { createHarness, USER_A } from "./helpers/harness";

/**
 * `resume.create` must not seed placeholder text as if it were user data.
 *
 * Personal info is stored in two places: `Resume.metadata.personalInfo` and a
 * `personal-info` section's `content.data`. `resolvePersonalInfo` in
 * `src/lib/typst/serialize.ts` prefers `metadata` per field and falls through to
 * the section when the metadata value is empty or missing:
 *
 *     const fromMetadata = metadataInfo?.[field];
 *     if (typeof fromMetadata === "string" && fromMetadata.trim() !== "") { ... }
 *
 * `resume.create` seeded `fullName: "Your Name"`. That string is not empty, so it
 * won the per-field resolution on every single newly created resume. Three
 * consequences, all user-visible:
 *
 *  1. The editor's Personal Information form showed "Your Name" as an actual field
 *     value rather than showing the input's placeholder, so a user could not tell
 *     the field was untouched.
 *  2. A name written only to the `personal-info` section was shadowed and never
 *     rendered, which is why building sample resumes through the API produced a
 *     form full of placeholders while the section row held the real data.
 *  3. The exported PDF header read "Your Name".
 *
 * The placeholder belongs to the input element, not to the database.
 */

describe("resume.create default metadata", () => {
	it("stores an empty fullName, not the placeholder string", async () => {
		const h = createHarness();

		const created = await h.callerAs(USER_A).resume.create({
			name: "Fresh resume",
			template: "minimal",
		});

		const stored = await h.resume(created.id);
		const metadata = JSON.parse(stored?.metadata ?? "{}") as {
			personalInfo?: Record<string, unknown>;
		};

		expect(metadata.personalInfo).toBeDefined();
		expect(metadata.personalInfo?.fullName).toBe("");

		h.close();
	});

	it("leaves no personal-info field holding placeholder text", async () => {
		const h = createHarness();

		const created = await h.callerAs(USER_A).resume.create({
			name: "Another fresh resume",
			template: "minimal",
		});

		const stored = await h.resume(created.id);
		const metadata = JSON.parse(stored?.metadata ?? "{}") as {
			personalInfo?: Record<string, unknown>;
		};

		// Any non-empty value here shadows the section copy under the resolver's rules.
		// Emptiness is what makes the section fallback work.
		for (const [field, value] of Object.entries(metadata.personalInfo ?? {})) {
			expect(value, `${field} must not be seeded with a value`).toBe("");
		}

		h.close();
	});

	it("keeps settings intact so the resolver can fall through to the section", async () => {
		const h = createHarness();

		const created = await h.callerAs(USER_A).resume.create({
			name: "Resume with a section-only name",
			template: "minimal",
		});

		// Write the name the way an API-driven generator does: into the section.
		await h.callerAs(USER_A).section.upsert({
			resumeId: created.id,
			type: "personal-info",
			order: 0,
			visible: true,
			content: {
				title: "Personal Information",
				data: { fullName: "Amara Okafor" },
			},
		});

		const stored = await h.resume(created.id);
		const metadata = JSON.parse(stored?.metadata ?? "{}") as {
			personalInfo?: Record<string, unknown>;
		};

		// This is the condition the resolver depends on. If create seeded "Your Name"
		// again, this assertion is what would stop it.
		const name = metadata.personalInfo?.fullName;
		expect(typeof name === "string" && name.trim() === "").toBe(true);

		h.close();
	});
});