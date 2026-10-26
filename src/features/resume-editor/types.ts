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
	KeepTogether,
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
	PartialResumeSettings,
	PersonalInfo,
	Project,
	Publication,
	Reference,
	ResumeColors,
	SectionType,
	Skill,
	SkillCategory,
	TemplateConfig,
	TemplateType,
	TypographyScale,
	Volunteer,
} from "@bettaresume/types";
import { TYPE_SCALE_DEFAULTS } from "@bettaresume/types";

// Default typography scale — the canonical point scale from `@bettaresume/types`,
// one source of truth for the toolbar's reset and the serialiser's defaults.
export const DEFAULT_TYPOGRAPHY: TypographyScale = TYPE_SCALE_DEFAULTS;

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
//
// Six archetypes from docs/research/template-research.md §7. Each one is a document, not
// a skin: the differentiation is structure (header treatment, what an entry renders) and
// density (margins, leading, section gap).
//
// `sourceFile` is the `.typ` file that renders the archetype. `compact` deliberately
// points at `standard.typ`: it *is* the standard document at the tight end of the spacing
// scale, which the brief allows as a config variant, whereas a copy of the file would be
// two sources of truth for one layout. Every other archetype has its own file because its
// structure genuinely differs.
//
// `defaults` are applied when the archetype is selected (and when its gallery specimen is
// rendered). They carry layout only — margins, leading, section spacing, and (for the
// executive name block) the name size. They never carry colour: the brief is explicit
// that archetypes are not differentiated by decoration.
//
// One palette for every archetype. The shipped templates used to carry three different
// accent colours, which made "pick a template" partly a colour choice and contradicted
// the rule that headings stay in text ink.
export interface TemplatePreset extends TemplateConfig {
	/** `.typ` file in `typst_templates/`, without the extension. */
	sourceFile: string;
	/** Layout settings applied when this archetype is selected. */
	defaults: PartialResumeSettings;
}

const TEMPLATE_COLORS: ResumeColors = {
	primary: "#000000",
	secondary: "#666666",
	text: "#333333",
	heading: "#000000",
	accent: "#0066cc",
	background: "#ffffff",
	divider: "#e5e5e5",
};

export const TEMPLATE_CONFIGS: Record<TemplateType, TemplatePreset> = {
	standard: {
		id: "standard",
		name: "Standard",
		description:
			"Balanced, left-aligned and conventional. The layout to reach for first.",
		thumbnail: "/templates/standard.svg",
		features: ["Balanced density", "Dates in a right column", "Single column"],
		defaultColors: TEMPLATE_COLORS,
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
		sourceFile: "standard",
		// Balanced: 0.5in margins, 1.25 leading (`docs/research/space-efficiency.md` §5).
		defaults: {
			sectionSpacing: "normal",
			lineHeight: 1.25,
			margins: { top: 36, right: 36, bottom: 36, left: 36 },
		},
	},
	compact: {
		id: "compact",
		name: "Compact",
		description:
			"The Standard layout at the tight end of the spacing scale, for one page.",
		thumbnail: "/templates/compact.svg",
		features: ["Tightest spacing band", "0.5 in margins", "Single column"],
		defaultColors: TEMPLATE_COLORS,
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
		sourceFile: "standard",
		// Tight: 1.22 leading on the margin floor, gaps at their narrowest.
		defaults: {
			sectionSpacing: "compact",
			lineHeight: 1.22,
			margins: { top: 36, right: 36, bottom: 36, left: 36 },
		},
	},
	technical: {
		id: "technical",
		name: "Technical",
		description:
			"Skills as scannable category lines; projects carry their stack and bullets.",
		thumbnail: "/templates/technical.svg",
		features: ["Category: item lines", "Project-centric", "Single column"],
		defaultColors: TEMPLATE_COLORS,
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
		sourceFile: "technical",
		defaults: {
			sectionSpacing: "normal",
			lineHeight: 1.25,
			margins: { top: 36, right: 36, bottom: 36, left: 36 },
		},
	},
	graduate: {
		id: "graduate",
		name: "Graduate",
		description:
			"Education carries GPA, coursework and honours; projects show their bullets.",
		thumbnail: "/templates/graduate.svg",
		features: ["Education detail", "Coursework and honours", "Single column"],
		defaultColors: TEMPLATE_COLORS,
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
		sourceFile: "graduate",
		defaults: {
			sectionSpacing: "normal",
			lineHeight: 1.25,
			margins: { top: 36, right: 36, bottom: 36, left: 36 },
		},
	},
	academic: {
		id: "academic",
		name: "Academic CV",
		description:
			"Centred header, justified body, 1 in margins and numbered publications.",
		thumbnail: "/templates/academic.svg",
		features: ["Numbered publications", "1 in margins", "Multi-page"],
		defaultColors: TEMPLATE_COLORS,
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
		sourceFile: "academic",
		defaults: {
			sectionSpacing: "spacious",
			lineHeight: 1.3,
			margins: { top: 72, right: 72, bottom: 72, left: 72 },
		},
	},
	executive: {
		id: "executive",
		name: "Executive",
		description:
			"A larger name block, one-line expertise and more air around each role.",
		thumbnail: "/templates/executive.svg",
		features: ["20 pt name block", "One-line expertise", "Selected roles"],
		defaultColors: TEMPLATE_COLORS,
		supportedSections: ALL_SECTIONS,
		layout: "single-column",
		sourceFile: "executive",
		defaults: {
			sectionSpacing: "spacious",
			lineHeight: 1.3,
			margins: { top: 54, right: 54, bottom: 54, left: 54 },
			typography: { name: 20 },
		},
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
