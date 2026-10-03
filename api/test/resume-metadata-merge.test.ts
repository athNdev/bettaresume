import { describe, expect, it } from "vitest";
import type { ResumeMetadata } from "../../packages/types/src/types";
import { resumes } from "../src/db/schema";
import { createHarness, RESUME_A, RESUME_B, USER_A } from "./helpers/harness";

/**
 * `resume.update` must not replace the whole metadata blob.
 *
 * `updateResumeInputSchema.metadata` is `partialResumeMetadataSchema.nullable()`,
 * so the contract says a partial patch is safe. The implementation did the
 * opposite: it wrote `JSON.stringify(input.data.metadata)` and dropped whatever
 * was not in the patch.
 *
 * `Resume.metadata` holds `personalInfo`, `settings`, `jobTarget`, `atsScore` and
 * `exportHistory` in one TEXT column. So a patch carrying only `settings` — which
 * is exactly what a font or margin change sends — silently destroyed the rest,
 * including the ATS score and the export history.
 *
 * The merge is recursive, because the schema is partial at several levels:
 * `settings.margins`, `settings.typography` and `settings.colors` are all
 * `.partial()`, so a shallow merge would replace `margins` wholesale when the
 * caller meant to change only `margins.top`.
 */

/** A metadata blob with every branch populated, so a lost branch is detectable. */
const FULL_METADATA = {
	personalInfo: {
		fullName: "Alexandra Chen",
		email: "alexandra.chen@example.com",
		phone: "+1 617 555 0142",
		location: "Cambridge, MA",
	},
	settings: {
		pageSize: "A4",
		fontFamily: "Inter",
		fontSize: 11,
		fontScale: 1,
		lineHeight: 1.5,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
		typography: {
			name: 24,
			title: 14,
			sectionHeading: 14,
			itemTitle: 12,
			body: 11,
			small: 9,
		},
		colors: {
			primary: "#2563eb",
			secondary: "#64748b",
			text: "#1e293b",
			heading: "#1e293b",
			accent: "#f59e0b",
			background: "#ffffff",
			divider: "#e2e8f0",
		},
		sectionSpacing: "compact",
		showIcons: true,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	jobTarget: {
		title: "Staff Engineer",
		company: "Acme",
		addedAt: "2026-09-01T00:00:00.000Z",
	},
	atsScore: {
		overall: 82,
		breakdown: { keywords: 24, formatting: 20, sections: 20, length: 18 },
		suggestions: [],
	},
	exportHistory: [
		{
			id: "exp-1",
			format: "pdf",
			timestamp: "2026-09-01T10:00:00.000Z",
			fileName: "resume.pdf",
		},
	],
} as unknown as ResumeMetadata;

async function seedFullMetadata() {
	const h = createHarness();
	await h.raw.update(resumes).set({
		metadata: JSON.stringify(FULL_METADATA),
	});
	return h;
}

describe("resume.update metadata", () => {
	it("preserves every branch when only settings are patched", async () => {
		const h = await seedFullMetadata();
		try {
			const caller = h.callerAs(USER_A);

			// What a font change sends.
			await caller.resume.update({
				id: RESUME_A,
				data: {
					metadata: {
						settings: { fontFamily: "Georgia", fontSize: 13 },
					} as never,
				},
			});

			const after = JSON.parse(
				(await h.resume(RESUME_A))!.metadata!,
			) as ResumeMetadata;

			// The patch landed.
			expect(after.settings.fontFamily).toBe("Georgia");
			expect(after.settings.fontSize).toBe(13);

			// Nothing else was destroyed.
			expect(after.personalInfo.fullName).toBe("Alexandra Chen");
			expect(after.personalInfo.email).toBe("alexandra.chen@example.com");
			expect(after.jobTarget).toEqual(FULL_METADATA.jobTarget);
			expect(after.atsScore).toEqual(FULL_METADATA.atsScore);
			expect(after.exportHistory).toEqual(FULL_METADATA.exportHistory);
		} finally {
			h.close();
		}
	});

	it("merges a nested partial without discarding its siblings", async () => {
		const h = await seedFullMetadata();
		try {
			const caller = h.callerAs(USER_A);

			await caller.resume.update({
				id: RESUME_A,
				data: {
					metadata: { settings: { margins: { top: 72 } } } as never,
				},
			});

			const after = JSON.parse(
				(await h.resume(RESUME_A))!.metadata!,
			) as ResumeMetadata;

			// The one key changed...
			expect(after.settings.margins.top).toBe(72);
			// ...and its siblings survived, which a shallow merge would have lost.
			expect(after.settings.margins).toEqual({
				top: 72,
				right: 36,
				bottom: 36,
				left: 36,
			});
			// Other nested partials are untouched.
			expect(after.settings.colors).toEqual(FULL_METADATA.settings.colors);
			expect(after.settings.typography).toEqual(
				FULL_METADATA.settings.typography,
			);
		} finally {
			h.close();
		}
	});

	it("preserves personalInfo when only the top-level settings key is absent", async () => {
		const h = await seedFullMetadata();
		try {
			const caller = h.callerAs(USER_A);

			// A patch that spreads an object whose other keys are absent.
			await caller.resume.update({
				id: RESUME_A,
				data: { metadata: { settings: { lineHeight: 1.8 } } as never },
			});

			const after = JSON.parse(
				(await h.resume(RESUME_A))!.metadata!,
			) as ResumeMetadata;
			expect(after.settings.lineHeight).toBe(1.8);
			expect(after.personalInfo).toEqual(FULL_METADATA.personalInfo);
		} finally {
			h.close();
		}
	});

	it("replaces arrays rather than concatenating them", async () => {
		const h = await seedFullMetadata();
		try {
			const caller = h.callerAs(USER_A);

			await caller.resume.update({
				id: RESUME_A,
				data: {
					metadata: {
						exportHistory: [
							{
								id: "exp-2",
								format: "json",
								timestamp: "2026-09-02T10:00:00.000Z",
								fileName: "resume.json",
							},
						],
					} as never,
				},
			});

			const after = JSON.parse(
				(await h.resume(RESUME_A))!.metadata!,
			) as ResumeMetadata;
			// The caller sent the array it wants stored. Concatenating would make an
			// explicit shrink impossible and would duplicate history on every save.
			expect(after.exportHistory).toEqual([
				{
					id: "exp-2",
					format: "json",
					timestamp: "2026-09-02T10:00:00.000Z",
					fileName: "resume.json",
				},
			]);
			// And the sibling branches still survive an array patch.
			expect(after.personalInfo.fullName).toBe("Alexandra Chen");
		} finally {
			h.close();
		}
	});

	it("still honours an explicit null as a deliberate wipe", async () => {
		const h = await seedFullMetadata();
		try {
			const caller = h.callerAs(USER_A);

			await caller.resume.update({
				id: RESUME_A,
				data: { metadata: null },
			});

			expect((await h.resume(RESUME_A))?.metadata).toBeNull();
		} finally {
			h.close();
		}
	});

	it("leaves metadata alone when the patch omits it", async () => {
		const h = await seedFullMetadata();
		try {
			const caller = h.callerAs(USER_A);

			await caller.resume.update({ id: RESUME_A, data: { name: "Renamed" } });

			const row = await h.resume(RESUME_A);
			expect(row?.name).toBe("Renamed");
			expect(JSON.parse(row!.metadata!)).toEqual(
				JSON.parse(JSON.stringify(FULL_METADATA)),
			);
		} finally {
			h.close();
		}
	});

	it("works when the stored blob was previously null", async () => {
		const h = createHarness();
		try {
			await h.raw.update(resumes).set({ metadata: null });
			const caller = h.callerAs(USER_A);

			await caller.resume.update({
				id: RESUME_A,
				data: { metadata: { settings: { fontSize: 14 } } as never },
			});

			const after = JSON.parse(
				(await h.resume(RESUME_A))!.metadata!,
			) as ResumeMetadata;
			expect(after.settings.fontSize).toBe(14);
		} finally {
			h.close();
		}
	});

	it("does not let one tenant's patch touch another tenant's metadata", async () => {
		const h = createHarness();
		try {
			const before = await h.resume(RESUME_B);
			const attacker = h.callerAs(USER_A);

			await expect(
				attacker.resume.update({
					id: RESUME_B,
					data: { metadata: { settings: { fontSize: 99 } } as never },
				}),
			).rejects.toThrowError(/not found|access denied/i);

			expect(await h.resume(RESUME_B)).toEqual(before);
		} finally {
			h.close();
		}
	});
});
