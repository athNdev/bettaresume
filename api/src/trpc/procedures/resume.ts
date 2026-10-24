import type {
	FontFamily,
	PersonalInfo,
	ResumeMetadata,
	ResumeSettings,
	SectionType,
	TemplateType,
} from "@bettaresume/types";
import {
	createResumeInputSchema,
	createVariationInputSchema,
	updateResumeInputSchema,
} from "@bettaresume/types";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { resumes, sections } from "../../db/schema";
import { protectedProcedure, router } from "../index";
import { resumeWriteScope } from "../middleware/ownership";
import { maybeSnapshot } from "./revision";

function normalizePersonalInfo(value: unknown): PersonalInfo {
	const info =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	return {
		fullName: typeof info.fullName === "string" ? info.fullName : "",
		email: typeof info.email === "string" ? info.email : "",
		phone: typeof info.phone === "string" ? info.phone : "",
		location: typeof info.location === "string" ? info.location : "",
		linkedin: typeof info.linkedin === "string" ? info.linkedin : "",
		github: typeof info.github === "string" ? info.github : "",
		website: typeof info.website === "string" ? info.website : "",
		portfolio: typeof info.portfolio === "string" ? info.portfolio : "",
		professionalTitle:
			typeof info.professionalTitle === "string" ? info.professionalTitle : "",
		photoUrl: typeof info.photoUrl === "string" ? info.photoUrl : "",
	};
}

function normalizeSettings(value: unknown): ResumeSettings {
	// This is a simplified normalization - in a real app you'd want more comprehensive defaults
	const settings =
		value && typeof value === "object"
			? (value as Record<string, unknown>)
			: {};
	return {
		pageSize:
			typeof settings.pageSize === "string" &&
			(settings.pageSize === "A4" || settings.pageSize === "Letter")
				? settings.pageSize
				: "A4",
		margins: {
			top:
				typeof settings.margins === "object" &&
				settings.margins &&
				typeof (settings.margins as any).top === "number"
					? (settings.margins as any).top
					: 20,
			right:
				typeof settings.margins === "object" &&
				settings.margins &&
				typeof (settings.margins as any).right === "number"
					? (settings.margins as any).right
					: 20,
			bottom:
				typeof settings.margins === "object" &&
				settings.margins &&
				typeof (settings.margins as any).bottom === "number"
					? (settings.margins as any).bottom
					: 20,
			left:
				typeof settings.margins === "object" &&
				settings.margins &&
				typeof (settings.margins as any).left === "number"
					? (settings.margins as any).left
					: 20,
		},
		fontSize: typeof settings.fontSize === "number" ? settings.fontSize : 12,
		fontScale: typeof settings.fontScale === "number" ? settings.fontScale : 1,
		typography: {
			name:
				typeof settings.typography === "object" &&
				settings.typography &&
				typeof (settings.typography as any).name === "number"
					? (settings.typography as any).name
					: 24,
			title:
				typeof settings.typography === "object" &&
				settings.typography &&
				typeof (settings.typography as any).title === "number"
					? (settings.typography as any).title
					: 18,
			sectionHeading:
				typeof settings.typography === "object" &&
				settings.typography &&
				typeof (settings.typography as any).sectionHeading === "number"
					? (settings.typography as any).sectionHeading
					: 14,
			itemTitle:
				typeof settings.typography === "object" &&
				settings.typography &&
				typeof (settings.typography as any).itemTitle === "number"
					? (settings.typography as any).itemTitle
					: 12,
			body:
				typeof settings.typography === "object" &&
				settings.typography &&
				typeof (settings.typography as any).body === "number"
					? (settings.typography as any).body
					: 10,
			small:
				typeof settings.typography === "object" &&
				settings.typography &&
				typeof (settings.typography as any).small === "number"
					? (settings.typography as any).small
					: 8,
		},
		lineHeight:
			typeof settings.lineHeight === "number" ? settings.lineHeight : 1.4,
		fontFamily:
			typeof settings.fontFamily === "string" &&
			[
				"Inter",
				"Roboto",
				"Open Sans",
				"Lato",
				"Montserrat",
				"Playfair Display",
				"Georgia",
				"Times New Roman",
				"Arial",
				"Calibri",
				"Garamond",
				"Helvetica",
				"Computer Modern",
			].includes(settings.fontFamily)
				? (settings.fontFamily as FontFamily)
				: "Inter",
		colors: {
			primary:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).primary === "string"
					? (settings.colors as any).primary
					: "#000000",
			secondary:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).secondary === "string"
					? (settings.colors as any).secondary
					: "#666666",
			text:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).text === "string"
					? (settings.colors as any).text
					: "#000000",
			heading:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).heading === "string"
					? (settings.colors as any).heading
					: "#000000",
			accent:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).accent === "string"
					? (settings.colors as any).accent
					: "#007acc",
			background:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).background === "string"
					? (settings.colors as any).background
					: "#ffffff",
			divider:
				typeof settings.colors === "object" &&
				settings.colors &&
				typeof (settings.colors as any).divider === "string"
					? (settings.colors as any).divider
					: "#cccccc",
		},
		sectionSpacing:
			typeof settings.sectionSpacing === "string" &&
			(settings.sectionSpacing === "compact" ||
				settings.sectionSpacing === "normal" ||
				settings.sectionSpacing === "spacious")
				? settings.sectionSpacing
				: "normal",
		dateFormat:
			typeof settings.dateFormat === "string" &&
			(settings.dateFormat === "MM/YYYY" ||
				settings.dateFormat === "MMM YYYY" ||
				settings.dateFormat === "MMMM YYYY" ||
				settings.dateFormat === "YYYY")
				? settings.dateFormat
				: "MM/YYYY",
		accentStyle:
			typeof settings.accentStyle === "string" &&
			(settings.accentStyle === "underline" ||
				settings.accentStyle === "background" ||
				settings.accentStyle === "border" ||
				settings.accentStyle === "none")
				? settings.accentStyle
				: "underline",
	};
}

function normalizeMetadata(value: unknown): ResumeMetadata | null {
	if (!value || typeof value !== "object") return null;
	const obj = value as Record<string, unknown>;
	// Build the optional branches conditionally rather than assigning
	// `undefined`. With `exactOptionalPropertyTypes` an explicit `undefined`
	// is not assignable, and — more importantly — writing the key at all makes
	// the field look "present but blank" to `resume.update`, which replaces the
	// whole metadata blob. Omitting the key keeps absent data absent.
	const metadata: ResumeMetadata = {
		personalInfo: normalizePersonalInfo(obj.personalInfo),
		settings: normalizeSettings(obj.settings),
	};
	if (Array.isArray(obj.exportHistory)) {
		metadata.exportHistory = obj.exportHistory as NonNullable<
			ResumeMetadata["exportHistory"]
		>;
	}
	if (obj.jobTarget && typeof obj.jobTarget === "object") {
		metadata.jobTarget = obj.jobTarget as NonNullable<
			ResumeMetadata["jobTarget"]
		>;
	}
	if (obj.atsScore && typeof obj.atsScore === "object") {
		metadata.atsScore = obj.atsScore as NonNullable<ResumeMetadata["atsScore"]>;
	}
	return metadata;
}

/**
 * Recursively merge `patch` into `base`, returning a new object.
 *
 * Plain objects merge key-by-key at every depth, because the metadata schema is
 * nested and partial at several levels: `settings.margins`, `settings.typography`
 * and `settings.colors` are all `.partial()`. A shallow merge would replace
 * `margins` wholesale when a caller meant to change only `margins.top`.
 *
 * Arrays replace rather than concatenate. `exportHistory` is append-only by
 * intent, but the caller sends the array it wants stored, and silently
 * concatenating would make an explicit shrink impossible.
 *
 * `undefined` in the patch is ignored, so a spread of an object with absent
 * optional keys cannot erase stored data. An explicit `null` is kept, so a
 * caller can still clear a single branch.
 */
function deepMergeMetadata(
	base: Record<string, unknown>,
	patch: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = { ...base };

	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;

		const existing = out[key];
		const bothPlainObjects =
			value !== null &&
			typeof value === "object" &&
			!Array.isArray(value) &&
			existing !== null &&
			typeof existing === "object" &&
			!Array.isArray(existing);

		out[key] = bothPlainObjects
			? deepMergeMetadata(
					existing as Record<string, unknown>,
					value as Record<string, unknown>,
				)
			: value;
	}

	return out;
}

function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
	if (!value) return fallback;
	try {
		return JSON.parse(value) as T;
	} catch {
		return fallback;
	}
}

/**
 * Shape a resume row for the client: JSON columns parsed, sections' content parsed.
 *
 * Every read path has to do this, and the copy that lived inline in each of them is why
 * a newly added column could be returned by one procedure and silently dropped by
 * another. Kept generic over the row so a caller passing `with: { sections: true }` keeps
 * the exact inferred type.
 */
function formatResumeWithSections<
	T extends typeof resumes.$inferSelect & {
		sections: (typeof sections.$inferSelect)[];
	},
>(resume: T | undefined) {
	if (!resume) return null;
	return {
		...resume,
		tags: safeJsonParse<string[]>(resume.tags, []),
		metadata: resume.metadata
			? normalizeMetadata(
					safeJsonParse<Record<string, unknown> | null>(resume.metadata, null),
				)
			: null,
		sections: resume.sections.map((section) => ({
			...section,
			content: safeJsonParse<Record<string, unknown>>(section.content, {}),
		})),
	};
}

export const resumeRouter = router({
	/**
	 * List all resumes for the current user
	 */
	list: protectedProcedure
		.input(
			z
				.object({
					includeArchived: z.boolean().optional().default(false),
				})
				.optional(),
		)
		.query(async ({ ctx, input }) => {
			const includeArchived = input?.includeArchived ?? false;

			const userResumes = await ctx.db.query.resumes.findMany({
				where: includeArchived
					? eq(resumes.userId, ctx.userId)
					: and(eq(resumes.userId, ctx.userId), eq(resumes.isArchived, false)),
				with: {
					sections: true,
				},
				orderBy: [desc(resumes.updatedAt)],
			});

			console.log(
				"[resume.list] userId=",
				ctx.userId,
				"includeArchived=",
				includeArchived,
				"count=",
				userResumes.length,
			);

			// Parse JSON fields
			return userResumes.map((resume) => ({
				...resume,
				tags: safeJsonParse<string[]>(resume.tags, []),
				metadata: resume.metadata
					? normalizeMetadata(
							safeJsonParse<Record<string, unknown> | null>(
								resume.metadata,
								null,
							),
						)
					: null,
				sections: resume.sections.map((section) => ({
					...section,
					content: safeJsonParse<Record<string, unknown>>(section.content, {}),
				})),
			}));
		}),

	/**
	 * Get a single resume by ID
	 */
	getById: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const resume = await ctx.db.query.resumes.findFirst({
				where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
				with: {
					sections: {
						orderBy: (sections, { asc }) => [asc(sections.order)],
					},
				},
			});

			if (!resume) {
				return null;
			}

			return {
				...resume,
				tags: safeJsonParse<string[]>(resume.tags, []),
				metadata: resume.metadata
					? normalizeMetadata(
							safeJsonParse<Record<string, unknown> | null>(
								resume.metadata,
								null,
							),
						)
					: null,
				sections: resume.sections.map((section) => ({
					...section,
					content: safeJsonParse<Record<string, unknown>>(section.content, {}),
				})),
			};
		}),

	/**
	 * Create a new resume
	 */
	create: protectedProcedure
		.input(createResumeInputSchema)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();
			const resumeId = crypto.randomUUID();

			// Create default metadata if not provided
			const defaultMetadata = {
				personalInfo: {
					/*
					 * Empty, deliberately — do not seed placeholder text as if it were data.
					 *
					 * This used to be the literal string "Your Name". Personal info is stored
					 * in two places (`Resume.metadata.personalInfo` and a `personal-info`
					 * section's `content.data`), and `resolvePersonalInfo` in
					 * `src/lib/typst/serialize.ts` prefers `metadata` per field, treating an
					 * empty or missing value as "fall through to the section".
					 *
					 * "Your Name" is non-empty, so it won: every freshly created resume
					 * displayed "Your Name" as a real value in the editor instead of showing
					 * the field's placeholder, and any name written only to the section was
					 * shadowed and never rendered. An empty string falls through correctly.
					 */
					fullName: "",
					email: "",
					phone: "",
					location: "",
					professionalTitle: "",
					linkedin: "",
					website: "",
					github: "",
					portfolio: "",
				},
				settings: {
					pageSize: "Letter" as const,
					margins: { top: 40, right: 40, bottom: 40, left: 40 },
					fontSize: 11,
					fontScale: 1,
					typography: {
						name: 24,
						title: 14,
						sectionHeading: 14,
						itemTitle: 12,
						body: 11,
						small: 9,
					},
					lineHeight: 1.5,
					fontFamily: "Inter" as const,
					colors: {
						primary: "#2563eb",
						secondary: "#64748b",
						text: "#1e293b",
						heading: "#1e293b",
						accent: "#0891b2",
						background: "#ffffff",
						divider: "#e2e8f0",
					},
					sectionSpacing: "normal" as const,
					dateFormat: "MMM YYYY" as const,
					accentStyle: "underline" as const,
				},
			};

			await ctx.db.insert(resumes).values({
				id: resumeId,
				userId: ctx.userId,
				name: input.name,
				variationType: input.variationType ?? "base",
				baseResumeId: input.baseResumeId ?? null,
				domain: input.domain ?? null,
				template: input.template ?? "minimal",
				tags: JSON.stringify(input.tags ?? []),
				isArchived: input.isArchived ?? false,
				metadata: JSON.stringify(input.metadata ?? defaultMetadata),
				createdAt: now,
				updatedAt: now,
			});

			return ctx.db.query.resumes
				.findFirst({
					where: eq(resumes.id, resumeId),
					with: {
						sections: true,
					},
				})
				.then((resume) => {
					if (!resume) return null;
					return {
						...resume,
						tags: safeJsonParse<string[]>(resume.tags, []),
						metadata: resume.metadata
							? normalizeMetadata(
									safeJsonParse<Record<string, unknown> | null>(
										resume.metadata,
										null,
									),
								)
							: null,
						sections: resume.sections.map((section) => ({
							...section,
							content: safeJsonParse<Record<string, unknown>>(
								section.content,
								{},
							),
						})),
					};
				});
		}),

	/**
	 * Update an existing resume
	 */
	update: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				data: updateResumeInputSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();

			// Verify ownership
			const existing = await ctx.db.query.resumes.findFirst({
				where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
			});

			if (!existing) {
				throw new Error("Resume not found or access denied");
			}

			const updateData: Record<string, unknown> = {
				updatedAt: now,
			};

			if (input.data.name !== undefined) updateData.name = input.data.name;
			if (input.data.variationType !== undefined)
				updateData.variationType = input.data.variationType;
			if (input.data.baseResumeId !== undefined)
				updateData.baseResumeId = input.data.baseResumeId;
			if (input.data.domain !== undefined)
				updateData.domain = input.data.domain;
			if (input.data.template !== undefined)
				updateData.template = input.data.template;
			if (input.data.tags !== undefined)
				updateData.tags = JSON.stringify(input.data.tags);
			if (input.data.isArchived !== undefined)
				updateData.isArchived = input.data.isArchived;
			if (input.data.metadata !== undefined) {
				if (input.data.metadata === null) {
					// An explicit null is a deliberate wipe; keep it.
					updateData.metadata = null;
				} else {
					// `updateResumeInputSchema.metadata` is `partialResumeMetadataSchema`,
					// so callers are told partial updates are safe. Replacing the blob here
					// made that a lie: a patch carrying only `settings` silently destroyed
					// `personalInfo`, `jobTarget`, `atsScore` and `exportHistory`.
					//
					// Merge against what is actually stored, so the partial contract holds
					// at every nesting level.
					const stored = safeJsonParse<Record<string, unknown>>(
						existing.metadata,
						{},
					);
					updateData.metadata = JSON.stringify(
						deepMergeMetadata(
							stored && typeof stored === "object" ? stored : {},
							input.data.metadata as Record<string, unknown>,
						),
					);
				}
			}

			await ctx.db
				.update(resumes)
				.set(updateData)
				.where(resumeWriteScope(input.id, ctx.userId));

			// History without a button press. Coalesced by `maybeSnapshot` so a burst of
			// settings changes is one entry rather than fifty.
			await maybeSnapshot(ctx.db, input.id);

			return ctx.db.query.resumes
				.findFirst({
					where: eq(resumes.id, input.id),
					with: {
						sections: true,
					},
				})
				.then((resume) => {
					if (!resume) return null;
					return {
						...resume,
						tags: safeJsonParse<string[]>(resume.tags, []),
						metadata: resume.metadata
							? normalizeMetadata(
									safeJsonParse<Record<string, unknown> | null>(
										resume.metadata,
										null,
									),
								)
							: null,
						sections: resume.sections.map((section) => ({
							...section,
							content: safeJsonParse<Record<string, unknown>>(
								section.content,
								{},
							),
						})),
					};
				});
		}),

	/**
	 * Delete a resume
	 */
	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const existing = await ctx.db.query.resumes.findFirst({
				where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
			});

			if (!existing) {
				throw new Error("Resume not found or access denied");
			}

			await ctx.db.delete(resumes).where(eq(resumes.id, input.id));

			return { success: true, id: input.id };
		}),

	/**
	 * Duplicate a resume
	 */
	duplicate: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				newName: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();
			const newResumeId = crypto.randomUUID();

			// Get original resume with sections
			const original = await ctx.db.query.resumes.findFirst({
				where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
				with: {
					sections: true,
				},
			});

			if (!original) {
				throw new Error("Resume not found or access denied");
			}

			// Create new resume
			await ctx.db.insert(resumes).values({
				id: newResumeId,
				userId: ctx.userId,
				name: input.newName ?? `${original.name} (Copy)`,
				variationType: original.variationType,
				baseResumeId: original.baseResumeId,
				domain: original.domain,
				template: original.template,
				tags: original.tags,
				isArchived: false,
				metadata: original.metadata,
				createdAt: now,
				updatedAt: now,
			});

			// Duplicate sections
			for (const section of original.sections) {
				await ctx.db.insert(sections).values({
					id: crypto.randomUUID(),
					resumeId: newResumeId,
					type: section.type,
					order: section.order,
					visible: section.visible,
					content: section.content,
					createdAt: now,
					updatedAt: now,
				});
			}

			return ctx.db.query.resumes
				.findFirst({
					where: eq(resumes.id, newResumeId),
					with: {
						sections: true,
					},
				})
				.then((resume) => {
					if (!resume) return null;
					return {
						...resume,
						tags: safeJsonParse<string[]>(resume.tags, []),
						metadata: resume.metadata
							? normalizeMetadata(
									safeJsonParse<Record<string, unknown> | null>(
										resume.metadata,
										null,
									),
								)
							: null,
						sections: resume.sections.map((section) => ({
							...section,
							content: safeJsonParse<Record<string, unknown>>(
								section.content,
								{},
							),
						})),
					};
				});
		}),

	/**
	 * Create a variant of a resume, with every section linked to its base counterpart.
	 *
	 * ## Why the root is resolved here, not stored as given
	 *
	 * A variant-of-a-variant would make propagation a chain: editing the root has to
	 * reach grandchildren, and each hop is another chance to miss one. Flattening at
	 * creation time keeps linkage exactly two levels deep -- every variant points at the
	 * root -- so `Section.baseSectionId` is always a root section and propagation is a
	 * single indexed update.
	 *
	 * ## Why sections are copied rather than referenced
	 *
	 * A variant must survive the base being edited, detached from, or deleted. Copying
	 * gives each variant its own rows -- so it can be exported, reordered and partially
	 * detached -- while `baseSectionId` records where each copy came from. Referencing
	 * would make a variant unusable the moment it diverged.
	 */
	createVariation: protectedProcedure
		.input(createVariationInputSchema)
		.mutation(async ({ ctx, input }) => {
			const anchor = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.baseResumeId),
					eq(resumes.userId, ctx.userId),
				),
				columns: { id: true, baseResumeId: true },
			});

			if (!anchor) {
				throw new Error("Resume not found or access denied");
			}

			// Flatten `variation -> variation` to the root by walking ids, then load the root
			// once. The guard bounds a corrupt or hand-edited pointer chain rather than
			// looping forever.
			let rootId = anchor.id;
			for (let depth = 0; depth < 16; depth++) {
				const parent = await ctx.db.query.resumes.findFirst({
					where: and(eq(resumes.id, rootId), eq(resumes.userId, ctx.userId)),
					columns: { id: true, baseResumeId: true },
				});
				if (!parent?.baseResumeId) break;
				rootId = parent.baseResumeId;
			}

			const root = await ctx.db.query.resumes.findFirst({
				where: and(eq(resumes.id, rootId), eq(resumes.userId, ctx.userId)),
				with: { sections: true },
			});

			if (!root) {
				throw new Error("Resume not found or access denied");
			}

			const now = new Date();
			const newResumeId = crypto.randomUUID();

			await ctx.db.insert(resumes).values({
				id: newResumeId,
				userId: ctx.userId,
				name: input.name,
				variationType: "variation",
				baseResumeId: root.id,
				domain: input.domain ?? root.domain ?? null,
				template: root.template,
				// Copied rather than shared: a variant is a document in its own right, and
				// tagging it should not retag the base.
				tags: root.tags,
				isArchived: false,
				metadata: root.metadata,
				createdAt: now,
				updatedAt: now,
			});

			for (const section of root.sections) {
				await ctx.db.insert(sections).values({
					id: crypto.randomUUID(),
					resumeId: newResumeId,
					type: section.type,
					order: section.order,
					visible: section.visible,
					content: section.content,
					// Keep the library placement: the variant shows the same master item.
					contentItemId: section.contentItemId ?? null,
					baseSectionId: section.id,
					linkedToBase: true,
					createdAt: now,
					updatedAt: now,
				});
			}

			// The starting point of a variant is worth recording: it is the state the user
			// will compare every later change against, and by definition nothing in the
			// base's history describes it.
			await maybeSnapshot(ctx.db, newResumeId, {
				force: true,
				label: "Created from base",
			});

			return formatResumeWithSections(
				await ctx.db.query.resumes.findFirst({
					where: eq(resumes.id, newResumeId),
					with: { sections: true },
				}),
			);
		}),

	/**
	 * Variants of a resume, newest first.
	 *
	 * Accepts either the root or one of its variants, because the editor asks from
	 * whichever document is open. Always resolves to the same set, so the selector
	 * cannot show a different list depending on where you are standing.
	 */
	listVariations: protectedProcedure
		.input(z.object({ baseResumeId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			const anchor = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.baseResumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!anchor) {
				throw new Error("Resume not found or access denied");
			}

			const rootId = anchor.baseResumeId ?? anchor.id;
			const rows = await ctx.db.query.resumes.findMany({
				where: and(
					eq(resumes.baseResumeId, rootId),
					eq(resumes.userId, ctx.userId),
				),
				orderBy: [desc(resumes.createdAt)],
			});

			return rows.map((row) => ({
				...row,
				tags: safeJsonParse<string[]>(row.tags, []),
			}));
		}),

	/**
	 * Re-pull every linked section from the base resume.
	 *
	 * This is "sync with base" as an explicit action. Detached sections are untouched:
	 * taking a section over is a decision, and a sync button must not quietly undo it.
	 */
	pullFromBase: protectedProcedure
		.input(z.object({ resumeId: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			const variant = await ctx.db.query.resumes.findFirst({
				where: and(
					eq(resumes.id, input.resumeId),
					eq(resumes.userId, ctx.userId),
				),
			});

			if (!variant) {
				throw new Error("Resume not found or access denied");
			}
			if (!variant.baseResumeId) {
				throw new Error("This resume is not a variation of another");
			}

			const variantSections = await ctx.db.query.sections.findMany({
				where: eq(sections.resumeId, variant.id),
			});
			const linked = variantSections.filter(
				(s) => s.linkedToBase && s.baseSectionId,
			);
			if (linked.length === 0) return { updated: 0 };

			const now = new Date();
			let updated = 0;
			for (const section of linked) {
				const base = await ctx.db.query.sections.findFirst({
					where: and(
						eq(sections.id, section.baseSectionId as string),
						eq(sections.resumeId, variant.baseResumeId),
					),
				});
				// The base section was deleted. The FK would normally have nulled the
				// pointer; if it has not, leave the local copy alone rather than blanking it.
				if (!base) continue;

				await ctx.db
					.update(sections)
					.set({
						type: base.type,
						content: base.content,
						contentItemId: base.contentItemId ?? null,
						updatedAt: now,
					})
					.where(
						and(eq(sections.id, section.id), eq(sections.resumeId, variant.id)),
					);
				updated++;
			}

			await ctx.db
				.update(resumes)
				.set({ updatedAt: now })
				.where(eq(resumes.id, variant.id));

			await maybeSnapshot(ctx.db, variant.id, {
				force: true,
				label: "Synced with base",
			});

			return { updated };
		}),

	/**
	 * Archive/unarchive a resume
	 */
	archive: protectedProcedure
		.input(
			z.object({
				id: z.string(),
				archived: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify ownership
			const existing = await ctx.db.query.resumes.findFirst({
				where: and(eq(resumes.id, input.id), eq(resumes.userId, ctx.userId)),
			});

			if (!existing) {
				throw new Error("Resume not found or access denied");
			}

			await ctx.db
				.update(resumes)
				.set({
					isArchived: input.archived,
					updatedAt: new Date(),
				})
				.where(eq(resumes.id, input.id));

			return { success: true, id: input.id, archived: input.archived };
		}),

	seedDemo: protectedProcedure
		.input(
			z.object({ force: z.boolean().optional().default(false) }).optional(),
		)
		.mutation(async ({ ctx, input }) => {
			const force = input?.force ?? false;
			console.log(
				"[resume.seedDemo] called userId=",
				ctx.userId,
				"force=",
				force,
			);
			const existingResume = await ctx.db.query.resumes.findFirst({
				where: eq(resumes.userId, ctx.userId),
			});

			if (!force && existingResume) {
				console.log(
					"[resume.seedDemo] skipped (already has resumes) userId=",
					ctx.userId,
				);
				return { seeded: false };
			}

			if (force) {
				const existing = await ctx.db.query.resumes.findMany({
					where: eq(resumes.userId, ctx.userId),
				});
				for (const r of existing) {
					await ctx.db.delete(resumes).where(eq(resumes.id, r.id));
				}
			}

			const now = new Date();
			const mkId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
			const mkHighlights = (base: string, count: number) =>
				Array.from({ length: count }, (_, i) => `${base} (impact ${i + 1})`);
			const mkTech = (items: string[]) => items;

			const sharedSettings = {
				fontFamily: "Inter",
				fontSize: 11,
				lineHeight: 1.4,
				margins: { top: 40, right: 40, bottom: 40, left: 40 },
				sectionSpacing: "normal",
				colors: {
					primary: "#1e293b",
					secondary: "#64748b",
					text: "#0f172a",
					heading: "#0f172a",
					background: "#ffffff",
					accent: "#2563eb",
					divider: "#e2e8f0",
				},
			};

			const createResume = async (def: {
				name: string;
				template: TemplateType;
				tags: string[];
				personalInfo: Record<string, unknown>;
				sections: Array<{
					type: SectionType;
					order: number;
					visible: boolean;
					content: unknown;
				}>;
			}) => {
				const resumeId = crypto.randomUUID();
				await ctx.db.insert(resumes).values({
					id: resumeId,
					userId: ctx.userId,
					name: def.name,
					variationType: "base",
					baseResumeId: null,
					domain: null,
					template: def.template,
					tags: JSON.stringify(def.tags),
					isArchived: false,
					metadata: JSON.stringify({
						personalInfo: def.personalInfo,
						settings: sharedSettings,
					}),
					createdAt: now,
					updatedAt: now,
				});

				for (const s of def.sections) {
					await ctx.db.insert(sections).values({
						id: crypto.randomUUID(),
						resumeId,
						type: s.type,
						order: s.order,
						visible: s.visible,
						content: JSON.stringify(s.content),
						createdAt: now,
						updatedAt: now,
					});
				}

				return resumeId;
			};

			const buildExperience = (rolePrefix: string, companies: string[]) =>
				companies.map((company, idx) => ({
					id: mkId(`exp-${rolePrefix}-${idx + 1}`),
					company,
					position: `${rolePrefix} ${idx + 1}`,
					startDate: `201${idx}-01`,
					endDate: idx === 0 ? "" : `201${idx}-12`,
					current: idx === 0,
					location: "Australia",
					description: `Owned ${rolePrefix.toLowerCase()} deliverables across multiple stakeholders and systems.`,
					highlights: mkHighlights(
						`Delivered ${rolePrefix.toLowerCase()} initiative at ${company}`,
						8,
					),
					technologies: mkTech([
						"TypeScript",
						"PostgreSQL",
						"Redis",
						"Docker",
						"Kubernetes",
					]),
				}));

			const buildProjects = (prefix: string) =>
				Array.from({ length: 5 }, (_, i) => ({
					id: mkId(`pr-${prefix}-${i + 1}`),
					name: `${prefix} Project ${i + 1}`,
					description:
						"Designed, built, and iterated on a production-grade project with measurable outcomes.",
					url: "",
					technologies: ["Next.js", "TypeScript", "PostgreSQL"],
					highlights: mkHighlights("Shipped feature", 6),
				}));

			const buildSkills = () => [
				{
					id: mkId("sc-1"),
					name: "Core",
					order: 0,
					skills: [
						{
							id: mkId("sk"),
							name: "TypeScript",
							level: "expert",
							yearsOfExperience: 8,
						},
						{
							id: mkId("sk"),
							name: "React",
							level: "advanced",
							yearsOfExperience: 6,
						},
						{
							id: mkId("sk"),
							name: "PostgreSQL",
							level: "expert",
							yearsOfExperience: 8,
						},
					],
				},
				{
					id: mkId("sc-2"),
					name: "Infra",
					order: 1,
					skills: [
						{
							id: mkId("sk"),
							name: "Docker",
							level: "advanced",
							yearsOfExperience: 5,
						},
						{
							id: mkId("sk"),
							name: "Kubernetes",
							level: "advanced",
							yearsOfExperience: 4,
						},
						{
							id: mkId("sk"),
							name: "CI/CD",
							level: "advanced",
							yearsOfExperience: 6,
						},
					],
				},
			];

			const resumeDefs: Parameters<typeof createResume>[0][] = [
				{
					name: "Senior Software Engineer — Platform & Reliability",
					template: "minimal",
					tags: ["engineering", "platform", "sre"],
					personalInfo: {
						fullName: "Alex Chen",
						email: "avery.chen@example.com",
						phone: "+61 400 000 001",
						location: "Melbourne, VIC",
						linkedin: "linkedin.com/in/averychen",
						github: "github.com/averychen",
						website: "averychen.dev",
						portfolio: "",
						professionalTitle: "Senior / Staff Software Engineer",
						photoUrl: "",
					},
					sections: [
						{
							type: "summary",
							order: 0,
							visible: true,
							content: {
								title: "Summary",
								html: "<p>Senior backend engineer with deep distributed-systems experience. Led large migrations, improved reliability, and built high-throughput data pipelines.</p>",
							},
						},
						{
							type: "experience",
							order: 1,
							visible: true,
							content: {
								title: "Experience",
								data: buildExperience("Platform Engineer", [
									"Nimbus Cloud",
									"Finly",
									"Atlas Pay",
									"DataRail",
									"Monarch Systems",
								]),
							},
						},
						{
							type: "projects",
							order: 2,
							visible: true,
							content: { title: "Projects", data: buildProjects("Platform") },
						},
						{
							type: "skills",
							order: 3,
							visible: true,
							content: { title: "Skills", data: buildSkills() },
						},
					],
				},
				{
					name: "Product Engineer — Growth & Experimentation",
					template: "minimal",
					tags: ["product", "growth", "experimentation"],
					personalInfo: {
						fullName: "Sam Rivera",
						email: "sam.rivera@example.com",
						phone: "+61 400 000 002",
						location: "Sydney, NSW",
						linkedin: "linkedin.com/in/samrivera",
						github: "github.com/samrivera",
						website: "",
						portfolio: "",
						professionalTitle: "Product Engineer",
						photoUrl: "",
					},
					sections: [
						{
							type: "summary",
							order: 0,
							visible: true,
							content: {
								title: "Profile",
								html: "<p>Full-stack engineer focused on UX, performance, and reliable delivery. Shipped features from discovery to launch with strong product sense.</p>",
							},
						},
						{
							type: "experience",
							order: 1,
							visible: true,
							content: {
								title: "Experience",
								data: buildExperience("Product Engineer", [
									"Betta Labs",
									"CartPilot",
									"MarketPulse",
									"FlowCRM",
									"Onboardly",
								]),
							},
						},
						{
							type: "projects",
							order: 2,
							visible: true,
							content: { title: "Projects", data: buildProjects("Product") },
						},
						{
							type: "skills",
							order: 3,
							visible: true,
							content: { title: "Skills", data: buildSkills() },
						},
					],
				},
				{
					name: "Consulting — Strategy & Operations",
					template: "minimal",
					tags: ["consulting", "strategy", "ops"],
					personalInfo: {
						fullName: "Jordan Patel",
						email: "jordan.patel@example.com",
						phone: "+61 400 000 003",
						location: "Brisbane, QLD",
						linkedin: "linkedin.com/in/jordanpatel",
						github: "",
						website: "",
						portfolio: "",
						professionalTitle: "Consultant",
						photoUrl: "",
					},
					sections: [
						{
							type: "summary",
							order: 0,
							visible: true,
							content: {
								title: "Profile",
								html: "<p>Consultant delivering cost transformation, operating model design, and analytics-driven decision support across multiple industries.</p>",
							},
						},
						{
							type: "experience",
							order: 1,
							visible: true,
							content: {
								title: "Experience",
								data: buildExperience("Consultant", [
									"Northbridge Consulting",
									"Crescent Retail",
									"Metro Bank",
									"TransitCo",
									"HealthWorks",
								]),
							},
						},
						{
							type: "projects",
							order: 2,
							visible: true,
							content: { title: "Projects", data: buildProjects("Analytics") },
						},
						{
							type: "skills",
							order: 3,
							visible: true,
							content: { title: "Skills", data: buildSkills() },
						},
					],
				},
			];

			const resumeIds: string[] = [];
			for (const def of resumeDefs) {
				resumeIds.push(await createResume(def));
			}

			console.log(
				"[resume.seedDemo] seeded resumes=",
				resumeIds.length,
				"userId=",
				ctx.userId,
			);
			return { seeded: true, resumeIds };
		}),
});
