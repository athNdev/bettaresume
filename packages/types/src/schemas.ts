/**
 * @bettaresume/types
 * Shared Zod validation schemas for BettaResume.
 * Used by both API server and frontend for input validation.
 */

import { z } from "zod";

// ============================================
// Base Schemas
// ============================================

export const userPreferencesSchema = z.object({
	theme: z.enum(["light", "dark", "system"]),
	emailNotifications: z.boolean(),
	autoSave: z.boolean(),
	defaultTemplate: z.enum(["minimal", "postgrad", "undergrad"]),
});

// ============================================
// Section Type Schema
// ============================================

export const sectionTypeSchema = z.enum([
	"personal-info",
	"summary",
	"experience",
	"education",
	"skills",
	"projects",
	"certifications",
	"awards",
	"languages",
	"publications",
	"volunteer",
	"references",
	"custom",
]);

export const templateTypeSchema = z.enum(["minimal", "postgrad", "undergrad"]);

export const variationTypeSchema = z.enum(["base", "variation"]);

// ============================================
// Personal Info Schema
// ============================================

export const personalInfoSchema = z.object({
	fullName: z.string().optional().or(z.literal("")),
	email: z.string().email("Invalid email address").optional().or(z.literal("")),
	phone: z.string().optional(),
	location: z.string().optional(),
	linkedin: z.string().optional().or(z.literal("")),
	github: z.string().optional().or(z.literal("")),
	website: z.string().optional().or(z.literal("")),
	portfolio: z.string().optional().or(z.literal("")),
	professionalTitle: z.string().optional(),
	photoUrl: z.string().optional().or(z.literal("")),
});

// ============================================
// Section Content Schemas
// ============================================

export const experienceSchema = z.object({
	id: z.string(),
	company: z.string().min(1, "Company name is required"),
	position: z.string().min(1, "Position is required"),
	startDate: z.string(),
	endDate: z.string().optional(),
	current: z.boolean(),
	location: z.string().optional(),
	locationType: z.enum(["onsite", "remote", "hybrid"]).optional(),
	employmentType: z
		.enum(["full-time", "part-time", "contract", "freelance", "internship"])
		.optional(),
	description: z.string(),
	highlights: z.array(z.string()).optional(),
	technologies: z.array(z.string()).optional(),
});

export const educationSchema = z.object({
	id: z.string(),
	institution: z.string().min(1, "Institution is required"),
	degree: z.string().min(1, "Degree is required"),
	field: z.string(),
	startDate: z.string().optional(),
	graduationDate: z.string(),
	endDate: z.string().optional(),
	current: z.boolean(),
	gpa: z.string().optional(),
	maxGpa: z.string().optional(),
	location: z.string().optional(),
	achievements: z.array(z.string()).optional(),
	coursework: z.array(z.string()).optional(),
	honors: z.array(z.string()).optional(),
});

export const skillSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Skill name is required"),
	level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
	yearsOfExperience: z.number().optional(),
});

export const skillCategorySchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Category name is required"),
	skills: z.array(skillSchema),
	order: z.number(),
});

export const projectSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Project name is required"),
	description: z.string(),
	role: z.string().optional(),
	technologies: z.array(z.string()).optional(),
	url: z.string().url().optional().or(z.literal("")),
	github: z.string().url().optional().or(z.literal("")),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	current: z.boolean().optional(),
	highlights: z.array(z.string()).optional(),
});

export const certificationSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Certification name is required"),
	issuer: z.string().min(1, "Issuer is required"),
	date: z.string(),
	expirationDate: z.string().optional(),
	noExpiration: z.boolean().optional(),
	credentialId: z.string().optional(),
	url: z.string().url().optional().or(z.literal("")),
	description: z.string().optional(),
});

export const awardSchema = z.object({
	id: z.string(),
	title: z.string().min(1, "Award title is required"),
	issuer: z.string().min(1, "Issuer is required"),
	date: z.string(),
	description: z.string().optional(),
});

export const languageSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Language name is required"),
	proficiency: z.enum([
		"native",
		"fluent",
		"advanced",
		"intermediate",
		"basic",
	]),
	certification: z.string().optional(),
});

export const publicationSchema = z.object({
	id: z.string(),
	title: z.string().min(1, "Publication title is required"),
	publisher: z.string().min(1, "Publisher is required"),
	date: z.string(),
	authors: z.array(z.string()).optional(),
	url: z.string().url().optional().or(z.literal("")),
	summary: z.string().optional(),
});

export const volunteerSchema = z.object({
	id: z.string(),
	organization: z.string().min(1, "Organization is required"),
	role: z.string().min(1, "Role is required"),
	startDate: z.string(),
	endDate: z.string().optional(),
	current: z.boolean(),
	location: z.string().optional(),
	cause: z.string().optional(),
	description: z.string().optional(),
	highlights: z.array(z.string()).optional(),
});

export const referenceSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	position: z.string().min(1, "Position is required"),
	company: z.string().optional(),
	relationship: z.string().optional(),
	email: z.string().email().optional().or(z.literal("")),
	phone: z.string().optional(),
	linkedin: z.string().url().optional().or(z.literal("")),
	isHidden: z.boolean().optional(),
});

// ============================================
// Section Layout Schema
// ============================================

export const sectionLayoutSchema = z.object({
	columns: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
	alignment: z.enum(["left", "center", "right"]).optional(),
	spacing: z.enum(["compact", "normal", "spacious"]).optional(),
	showDivider: z.boolean().optional(),
});

// ============================================
// Section Content Schema (generic)
// ============================================

export const sectionContentSchema = z
	.object({
		title: z.string().optional(),
		data: z.union([z.record(z.string(), z.any()), z.array(z.any())]).optional(),
		html: z.string().optional(),
	})
	.passthrough();

// ============================================
// Resume Settings Schemas
// ============================================

/**
 * The canonical type scale, in **true points** (docs/research/template-research.md §3).
 *
 * These values used to be CSS px: `sections.typ` multiplied every size by 0.75 before
 * rendering, so the UI's "11pt" body exported at 8.25pt — below every published floor.
 * The unit is now points end to end, so the numbers the UI shows are the numbers the
 * PDF prints. The supported band is what the product allows; the default is the
 * canonical value. See `normalizeTypeSettings` in `metadata.ts` for how stored px-era
 * values are migrated on read.
 */
export const TYPE_SCALE_DEFAULTS = {
	name: 18,
	title: 11,
	sectionHeading: 11,
	itemTitle: 10.5,
	body: 10.5,
	small: 9.5,
} as const;

/**
 * Supported bands per role, in points. `min` is the readability floor — body 10pt and
 * small 9pt are the hard floors from the research (MIT 10pt minimum; Butterick 9pt for
 * small text). The serialiser clamps into these bands and the UI slider ranges mirror
 * them.
 */
export const TYPE_SCALE_BANDS = {
	name: { min: 16, max: 20 },
	title: { min: 10.5, max: 12 },
	sectionHeading: { min: 10.5, max: 12 },
	itemTitle: { min: 10, max: 11.5 },
	body: { min: 10, max: 12 },
	small: { min: 9, max: 10.5 },
} as const;

/**
 * Page margins, in points. Defaults are 0.7in sides / 0.6in top and bottom; the hard
 * floor is 0.5in (36pt) and 1in (72pt) is the top of the supported range.
 */
export const MARGIN_DEFAULTS = {
	top: 43,
	right: 50,
	bottom: 43,
	left: 50,
} as const;
export const MARGIN_BAND = { min: 36, max: 72 } as const;

export const typographyScaleSchema = z.object({
	name: z.number(),
	title: z.number(),
	sectionHeading: z.number(),
	itemTitle: z.number(),
	body: z.number(),
	small: z.number(),
});

export const resumeColorsSchema = z.object({
	primary: z.string(),
	secondary: z.string(),
	text: z.string(),
	heading: z.string(),
	accent: z.string(),
	background: z.string(),
	divider: z.string(),
});

export const resumeSettingsSchema = z.object({
	pageSize: z.enum(["A4", "Letter"]),
	margins: z.object({
		top: z.number(),
		right: z.number(),
		bottom: z.number(),
		left: z.number(),
	}),
	fontScale: z.number(),
	typography: typographyScaleSchema,
	lineHeight: z.number(),
	fontFamily: z.enum([
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
	]),
	colors: resumeColorsSchema,
	sectionSpacing: z.enum(["compact", "normal", "spacious"]),
	dateFormat: z.enum(["MM/YYYY", "MMM YYYY", "MMMM YYYY", "YYYY"]),
	accentStyle: z.enum(["underline", "background", "border", "none"]),
});

export const partialResumeSettingsSchema = resumeSettingsSchema
	.partial()
	.extend({
		margins: z
			.object({
				top: z.number(),
				right: z.number(),
				bottom: z.number(),
				left: z.number(),
			})
			.partial()
			.optional(),
		typography: typographyScaleSchema.partial().optional(),
		colors: resumeColorsSchema.partial().optional(),
	});

// ============================================
// Resume Metadata Schema
// ============================================

export const jobTargetSchema = z.object({
	title: z.string(),
	company: z.string().optional(),
	description: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	url: z.string().url().optional().or(z.literal("")),
	addedAt: z.string(),
});

export const atsSuggestionSchema = z.object({
	type: z.enum(["warning", "error", "success", "info"]),
	category: z.enum(["keywords", "formatting", "content", "structure"]),
	message: z.string(),
	sectionId: z.string().optional(),
	priority: z.enum(["high", "medium", "low"]),
});

/**
 * Parse/ATS diagnostics.
 *
 * `overall` is DEPRECATED and deliberately not computed. A single headline score is the
 * documented credibility failure of this whole category: users report 94/100 on resumes
 * that human reviewers reject, and two tools disagreeing 82-vs-20 on the same file. It
 * was made optional rather than removed so existing stored resumes still validate.
 *
 * Use `dimensions` and `keywords` instead. Each is a separate, explainable measurement,
 * so a user can disagree with one part without the whole number being wrong.
 */
/** One job-description keyword and whether the resume evidences it. */
export const keywordCoverageSchema = z.object({
	/** The keyword as written in the job description. */
	keyword: z.string(),
	/** Resolved canonical skill, when the alias map recognises it. */
	canonical: z.string().optional(),
	/** True when any surface form of this skill appears in the resume. */
	covered: z.boolean(),
	/** The exact surface form found, for showing the user why it matched. */
	surface: z.string().optional(),
});

export const atsScoreSchema = z.object({
	/** @deprecated Intentionally unpopulated. See the note above. */
	overall: z.number().min(0).max(100).optional(),
	breakdown: z.object({
		keywords: z.number(),
		formatting: z.number(),
		sections: z.number(),
		length: z.number(),
	}),
	/**
	 * The three dimensions used by the reference implementation. Kept as discrete
	 * measurements with counts, not percentages-of-a-score.
	 */
	dimensions: z
		.object({
			/** Achievements carrying evidence, vs claims without any. */
			impact: z.object({ quantified: z.number(), total: z.number() }),
			/** Length signals: total words, bullets per role. */
			brevity: z.object({
				totalWords: z.number(),
				bulletsPerEntry: z.array(z.number()),
			}),
			/** Parser-constraint violations, counted rather than scored. */
			style: z.object({ violations: z.number(), errors: z.number() }),
		})
		.optional(),
	/** Per-keyword coverage against the job target. */
	keywords: z
		.object({
			required: z.array(keywordCoverageSchema),
			preferred: z.array(keywordCoverageSchema),
		})
		.optional(),
	suggestions: z.array(atsSuggestionSchema),
	lastAnalyzed: z.string(),
});

export const exportRecordSchema = z.object({
	id: z.string(),
	format: z.enum(["pdf", "json", "docx", "txt"]),
	timestamp: z.string(),
	fileName: z.string(),
	fileSize: z.number().optional(),
});

export const resumeMetadataSchema = z.object({
	personalInfo: personalInfoSchema,
	settings: resumeSettingsSchema,
	exportHistory: z.array(exportRecordSchema).optional(),
	jobTarget: jobTargetSchema.optional(),
	atsScore: atsScoreSchema.optional(),
});

export const partialResumeMetadataSchema = z.object({
	personalInfo: personalInfoSchema.partial().optional(),
	settings: partialResumeSettingsSchema.optional(),
	exportHistory: z.array(exportRecordSchema).optional(),
	jobTarget: jobTargetSchema.optional(),
	atsScore: atsScoreSchema.optional(),
});

// ============================================
// API Input Schemas
// ============================================

export const createResumeInputSchema = z.object({
	name: z.string().min(1, "Resume name is required").max(100),
	variationType: variationTypeSchema.optional().default("base"),
	baseResumeId: z.string().optional(),
	domain: z.string().optional(),
	template: templateTypeSchema.optional().default("minimal"),
	tags: z.array(z.string()).optional().default([]),
	isArchived: z.boolean().optional().default(false),
	metadata: resumeMetadataSchema.optional(),
});

export const updateResumeInputSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	variationType: variationTypeSchema.optional(),
	baseResumeId: z.string().nullable().optional(),
	domain: z.string().nullable().optional(),
	template: templateTypeSchema.optional(),
	tags: z.array(z.string()).optional(),
	isArchived: z.boolean().optional(),
	metadata: partialResumeMetadataSchema.nullable().optional(),
});

export const createSectionInputSchema = z.object({
	resumeId: z.string().min(1),
	type: sectionTypeSchema,
	order: z.number().optional().default(0),
	visible: z.boolean().optional().default(true),
	content: sectionContentSchema,
	layout: sectionLayoutSchema.optional(),
});

/**
 * Create a variant of a base resume.
 *
 * `baseResumeId` is the resume being copied, not necessarily the root: the server
 * flattens a variation-of-a-variation to the root base so linkage never chains.
 */
export const createVariationInputSchema = z.object({
	baseResumeId: z.string().min(1),
	name: z.string().min(1).max(100),
	domain: z.string().max(100).optional(),
});

/**
 * Link or detach one section from the base resume it mirrors.
 *
 * Linking pulls the base content immediately; detaching freezes the current copy.
 * The operation is per section because a user tailoring a summary usually still
 * wants their experience bullets to follow the master.
 */
export const setSectionLinkInputSchema = z.object({
	id: z.string().min(1),
	linked: z.boolean(),
});

export const updateSectionInputSchema = z.object({
	type: sectionTypeSchema.optional(),
	order: z.number().optional(),
	visible: z.boolean().optional(),
	content: sectionContentSchema.optional(),
	layout: sectionLayoutSchema.optional(),
});

export const bulkUpsertSectionsInputSchema = z.object({
	resumeId: z.string().min(1),
	sections: z.array(
		z.object({
			id: z.string().optional(),
			type: sectionTypeSchema,
			order: z.number(),
			visible: z.boolean(),
			content: sectionContentSchema,
			layout: sectionLayoutSchema.optional(),
		}),
	),
});

export const reorderSectionsInputSchema = z.object({
	resumeId: z.string().min(1),
	sectionIds: z.array(z.string()),
});

// ============================================
// Auth Schemas
// ============================================

export const verifySessionInputSchema = z
	.object({
		// Token is passed via Authorization header, not in body
		// This schema is for any additional data needed
	})
	.optional();

export const updateUserPreferencesInputSchema = z.object({
	preferences: userPreferencesSchema.partial(),
});

// ============================================
// Type Exports (inferred from schemas)
// ============================================

export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
export type CreateResumeInputSchema = z.infer<typeof createResumeInputSchema>;
export type UpdateResumeInputSchema = z.infer<typeof updateResumeInputSchema>;
export type CreateSectionInputSchema = z.infer<typeof createSectionInputSchema>;
export type UpdateSectionInputSchema = z.infer<typeof updateSectionInputSchema>;
export type BulkUpsertSectionsInputSchema = z.infer<
	typeof bulkUpsertSectionsInputSchema
>;
export type ReorderSectionsInputSchema = z.infer<
	typeof reorderSectionsInputSchema
>;
