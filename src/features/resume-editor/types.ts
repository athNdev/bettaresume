/**
 * Resume Types
 * Re-exports shared types from @bettaresume/types
 * and adds frontend-specific types and utilities
 */

// Re-export all shared types
export type {
	ActivityAction,
	ActivityLog,
	ATSScore,
	ATSSuggestion,
	Award,
	AwardsContent,
	Certification,
	CertificationsContent,
	CreateResumeInput,
	CreateSectionInput,
	CustomContent,
	Education,
	EducationContent,
	Experience,
	ExperienceContent,
	ExportRecord,
	FontFamily,
	JobTarget,
	Language,
	LanguagesContent,
	PartialResumeMetadata,
	PartialResumeSettings,
	PersonalInfo,
	PersonalInfoContent,
	Project,
	ProjectsContent,
	Publication,
	PublicationsContent,
	Reference,
	ReferencesContent,
	Resume,
	ResumeColors,
	ResumeLayout,
	ResumeMetadata,
	ResumePage,
	ResumeSection,
	ResumeSettings,
	ResumeWithSections,
	ResumeWithUser,
	Section,
	SectionContent,
	SectionLayout,
	SectionType,
	Skill,
	SkillCategory,
	SkillLevel,
	SkillsContent,
	SummaryContent,
	SyncQueueItem,
	SyncState,
	SyncStatus,
	TemplateConfig,
	TemplateType,
	TypographyScale,
	UpdateResumeInput,
	UpdateSectionInput,
	Volunteer,
	VolunteerContent,
} from "@bettaresume/types";

// Re-export schemas
export {
	awardSchema,
	bulkUpsertSectionsInputSchema,
	certificationSchema,
	createResumeInputSchema,
	createSectionInputSchema,
	educationSchema,
	experienceSchema,
	languageSchema,
	personalInfoSchema,
	projectSchema,
	publicationSchema,
	referenceSchema,
	reorderSectionsInputSchema,
	resumeMetadataSchema,
	resumeSettingsSchema,
	sectionContentSchema,
	sectionLayoutSchema,
	sectionTypeSchema,
	skillCategorySchema,
	skillSchema,
	templateTypeSchema,
	updateResumeInputSchema,
	updateSectionInputSchema,
	variationTypeSchema,
	volunteerSchema,
} from "@bettaresume/types";

// ============================================
// Frontend-specific types and utilities
// ============================================

import type {
	Award,
	Certification,
	Education,
	Experience,
	Language,
	PersonalInfo,
	Project,
	Publication,
	Reference,
	SectionType,
	Skill,
	SkillCategory,
	TemplateConfig,
	TemplateType,
	TypographyScale,
	Volunteer,
} from "@bettaresume/types";

// Default typography scale
export const DEFAULT_TYPOGRAPHY: TypographyScale = {
	name: 28,
	title: 14,
	sectionHeading: 13,
	itemTitle: 12,
	body: 11,
	small: 10,
};

const ALL_SECTIONS: SectionType[] = [
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
];

// Template configurations
export const TEMPLATE_CONFIGS: Record<TemplateType, TemplateConfig> = {
	minimal: {
		id: "minimal",
		name: "Minimal",
		description: "Clean and simple design that focuses on content",
		thumbnail: "/templates/minimal.png",
		features: ["Clean typography", "ATS-friendly", "Single column"],
		defaultColors: {
			primary: "#000000",
			secondary: "#666666",
			text: "#333333",
			heading: "#000000",
			accent: "#0066cc",
			background: "#ffffff",
			divider: "#e5e5e5",
		},
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
	},
	postgrad: {
		id: "postgrad",
		name: "Postgrad",
		description: "Academic style for postgraduate and research roles",
		thumbnail: "/templates/postgrad.png",
		features: ["Academic layout", "Publication-ready", "Single column"],
		defaultColors: {
			primary: "#1e2a4a",
			secondary: "#4a5568",
			text: "#2d3748",
			heading: "#1e2a4a",
			accent: "#5a67d8",
			background: "#ffffff",
			divider: "#e2e8f0",
		},
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
	},
	undergrad: {
		id: "undergrad",
		name: "Undergrad",
		description: "Fresh and clear layout for undergraduate students",
		thumbnail: "/templates/undergrad.png",
		features: ["Student-friendly", "Clean hierarchy", "Single column"],
		defaultColors: {
			primary: "#0d4f8b",
			secondary: "#2779bd",
			text: "#1a202c",
			heading: "#0d4f8b",
			accent: "#38b2ac",
			background: "#ffffff",
			divider: "#e2e8f0",
		},
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
	},
};

// Section type configurations
export const SECTION_CONFIGS: Record<
	SectionType,
	{ icon: string; label: string; description: string; defaultTitle: string }
> = {
	"personal-info": {
		icon: "",
		label: "Personal Info",
		description: "Contact information and social links",
		defaultTitle: "Personal Information",
	},
	summary: {
		icon: "",
		label: "Summary",
		description: "Professional summary or objective",
		defaultTitle: "Professional Summary",
	},
	experience: {
		icon: "",
		label: "Experience",
		description: "Work history and achievements",
		defaultTitle: "Work Experience",
	},
	education: {
		icon: "",
		label: "Education",
		description: "Academic background",
		defaultTitle: "Education",
	},
	skills: {
		icon: "",
		label: "Skills",
		description: "Technical and soft skills",
		defaultTitle: "Skills",
	},
	projects: {
		icon: "",
		label: "Projects",
		description: "Personal and professional projects",
		defaultTitle: "Projects",
	},
	certifications: {
		icon: "",
		label: "Certifications",
		description: "Professional certifications",
		defaultTitle: "Certifications",
	},
	awards: {
		icon: "",
		label: "Awards",
		description: "Awards and achievements",
		defaultTitle: "Awards & Honors",
	},
	languages: {
		icon: "",
		label: "Languages",
		description: "Language proficiencies",
		defaultTitle: "Languages",
	},
	publications: {
		icon: "",
		label: "Publications",
		description: "Published works",
		defaultTitle: "Publications",
	},
	volunteer: {
		icon: "",
		label: "Volunteer",
		description: "Volunteer experience",
		defaultTitle: "Volunteer Experience",
	},
	references: {
		icon: "",
		label: "References",
		description: "Professional references",
		defaultTitle: "References",
	},
	custom: {
		icon: "",
		label: "Custom",
		description: "Custom section",
		defaultTitle: "Custom Section",
	},
};

// ============================================
// Factory functions for creating default data
// ============================================

export const generateId = (): string =>
	`${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const createDefaultExperience = (): Experience => ({
	id: generateId(),
	company: "",
	position: "",
	startDate: "",
	endDate: "",
	current: false,
	location: "",
	employmentType: "full-time",
	description: "",
	highlights: [],
	technologies: [],
});

export const createDefaultEducation = (): Education => ({
	id: generateId(),
	institution: "",
	degree: "",
	field: "",
	startDate: "",
	graduationDate: "",
	endDate: "",
	current: false,
	gpa: "",
	location: "",
	achievements: [],
	coursework: [],
	honors: [],
});

export const createDefaultSkillCategory = (): SkillCategory => ({
	id: generateId(),
	name: "",
	skills: [],
	order: 0,
});

export const createDefaultSkill = (): Skill => ({
	id: generateId(),
	name: "",
	level: "intermediate",
});

export const createDefaultProject = (): Project => ({
	id: generateId(),
	name: "",
	description: "",
	role: "",
	technologies: [],
	url: "",
	github: "",
	startDate: "",
	endDate: "",
	current: false,
	highlights: [],
});

export const createDefaultCertification = (): Certification => ({
	id: generateId(),
	name: "",
	issuer: "",
	date: "",
	expirationDate: "",
	noExpiration: false,
	credentialId: "",
	url: "",
});

export const createDefaultAward = (): Award => ({
	id: generateId(),
	title: "",
	issuer: "",
	date: "",
	description: "",
});

export const createDefaultLanguage = (): Language => ({
	id: generateId(),
	name: "",
	proficiency: "intermediate",
});

export const createDefaultVolunteer = (): Volunteer => ({
	id: generateId(),
	organization: "",
	role: "",
	startDate: "",
	endDate: "",
	current: false,
	location: "",
	cause: "",
	description: "",
	highlights: [],
});

export const createDefaultPublication = (): Publication => ({
	id: generateId(),
	title: "",
	publisher: "",
	date: "",
	authors: [],
	url: "",
	summary: "",
});

export const createDefaultReference = (): Reference => ({
	id: generateId(),
	name: "",
	position: "",
	company: "",
	relationship: "",
	email: "",
	phone: "",
});

export const createDefaultPersonalInfo = (): PersonalInfo => ({
	fullName: "",
	email: "",
	phone: "",
	location: "",
	linkedin: "",
	github: "",
	website: "",
	portfolio: "",
	professionalTitle: "",
});
