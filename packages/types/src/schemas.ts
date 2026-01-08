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
  defaultTemplate: z.enum([
    "minimal",
    "modern",
    "classic",
    "professional",
    "creative",
    "executive",
    "tech",
  ]),
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

export const templateTypeSchema = z.enum([
  "minimal",
  "modern",
  "classic",
  "professional",
  "creative",
  "executive",
  "tech",
]);

export const variationTypeSchema = z.enum(["base", "variation"]);

// ============================================
// Personal Info Schema
// ============================================

export const personalInfoSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional().or(z.literal("")),
  github: z.string().url().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  portfolio: z.string().url().optional().or(z.literal("")),
  professionalTitle: z.string().optional(),
  photoUrl: z.string().url().optional().or(z.literal("")),
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
  proficiency: z.enum(["native", "fluent", "advanced", "intermediate", "basic"]),
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

export const sectionContentSchema = z.object({
  title: z.string().optional(),
  data: z.union([z.record(z.unknown()), z.array(z.unknown())]).optional(),
  html: z.string().optional(),
}).passthrough();

// ============================================
// Resume Settings Schemas
// ============================================

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
  fontSize: z.number(),
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
  ]),
  colors: resumeColorsSchema,
  sectionSpacing: z.enum(["compact", "normal", "spacious"]),
  showIcons: z.boolean(),
  dateFormat: z.enum(["MM/YYYY", "MMM YYYY", "MMMM YYYY", "YYYY"]),
  accentStyle: z.enum(["underline", "background", "border", "none"]),
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

export const atsScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  breakdown: z.object({
    keywords: z.number(),
    formatting: z.number(),
    sections: z.number(),
    length: z.number(),
  }),
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

// ============================================
// API Input Schemas
// ============================================

export const createResumeInputSchema = z.object({
  name: z.string().min(1, "Resume name is required").max(100),
  variationType: variationTypeSchema.optional().default("base"),
  baseResumeId: z.string().optional(),
  domain: z.string().optional(),
  template: templateTypeSchema.optional().default("modern"),
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
  metadata: resumeMetadataSchema.nullable().optional(),
});

export const createSectionInputSchema = z.object({
  resumeId: z.string().min(1),
  type: sectionTypeSchema,
  order: z.number().optional().default(0),
  visible: z.boolean().optional().default(true),
  content: sectionContentSchema,
  layout: sectionLayoutSchema.optional(),
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
    })
  ),
});

export const reorderSectionsInputSchema = z.object({
  resumeId: z.string().min(1),
  sectionIds: z.array(z.string()),
});

// ============================================
// Auth Schemas
// ============================================

export const verifySessionInputSchema = z.object({
  // Token is passed via Authorization header, not in body
  // This schema is for any additional data needed
}).optional();

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
export type BulkUpsertSectionsInputSchema = z.infer<typeof bulkUpsertSectionsInputSchema>;
export type ReorderSectionsInputSchema = z.infer<typeof reorderSectionsInputSchema>;
