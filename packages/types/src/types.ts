/**
 * @bettaresume/types
 * Shared entity types for BettaResume.
 * These types are used by both the API server and the SPA client.
 */

// ============================================
// User Types
// ============================================
export interface User {
	id: string;
	email: string;
	name: string | null;
	emailVerified: string | Date | null;
	image: string | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	resumes?: Resume[];
}

export interface UserPreferences {
	theme: "light" | "dark" | "system";
	emailNotifications: boolean;
	autoSave: boolean;
	defaultTemplate: TemplateType;
}

export interface UserWithResumes extends User {
	resumes: Resume[];
}

// ============================================
// Resume Types
// ============================================
export interface Resume {
	id: string;
	userId: string;
	name: string;
	variationType: "base" | "variation";
	baseResumeId: string | null;
	domain: string | null;
	template: TemplateType;
	tags: string[];
	isArchived: boolean;
	metadata: ResumeMetadata | null;
	createdAt: string | Date;
	updatedAt: string | Date;
	lastSyncedAt?: string | Date;
	lastExportedAt?: string | Date;
	// Sections array - always present in frontend (initialized to [])
	// May be undefined only when fetched from DB without relations
	sections: ResumeSection[];
	user?: User;
	pages?: ResumePage[];
}

// For DB queries that include sections relation
export interface ResumeWithSections extends Resume {
	sections: ResumeSection[];
}

export interface ResumeWithUser extends Resume {
	user: User;
}

// Multi-page support
export interface ResumePage {
	id: string;
	name: string;
	order: number;
	sectionIds: string[];
}

export interface ResumeMetadata {
	personalInfo: PersonalInfo;
	settings: ResumeSettings;
	exportHistory?: ExportRecord[];
	jobTarget?: JobTarget;
	atsScore?: ATSScore;
}

// ============================================
// Section Types
// ============================================
export interface ResumeSection {
	id: string;
	resumeId?: string;
	type: SectionType;
	order: number;
	visible: boolean;
	content: SectionContent;
	layout?: SectionLayout;
	pageId?: string;
	linkedToBase?: boolean;
	createdAt?: string | Date;
	updatedAt?: string | Date;
}

// Alias for backward compatibility
export type Section = ResumeSection;

export type SectionType =
	| "personal-info"
	| "summary"
	| "experience"
	| "education"
	| "skills"
	| "projects"
	| "certifications"
	| "awards"
	| "languages"
	| "publications"
	| "volunteer"
	| "references"
	| "custom";

export interface SectionContent {
	title?: string;
	data?: Record<string, unknown> | unknown[];
	html?: string;
	[key: string]: unknown;
}

export interface SectionLayout {
	columns?: 1 | 2 | 3;
	alignment?: "left" | "center" | "right";
	spacing?: "compact" | "normal" | "spacious";
	showDivider?: boolean;
}

// ============================================
// Personal Info
// ============================================
export interface PersonalInfo {
	fullName: string;
	email: string;
	phone?: string;
	location?: string;
	linkedin?: string;
	github?: string;
	website?: string;
	portfolio?: string;
	professionalTitle?: string;
	photoUrl?: string;
}

// Alias for backward compatibility
export type PersonalInfoContent = PersonalInfo;

// ============================================
// Resume Settings
// ============================================
export interface TypographyScale {
	name: number;
	title: number;
	sectionHeading: number;
	itemTitle: number;
	body: number;
	small: number;
}

export interface ResumeSettings {
	pageSize: "A4" | "Letter";
	margins: { top: number; right: number; bottom: number; left: number };
	fontSize: number;
	fontScale: number;
	typography: TypographyScale;
	lineHeight: number;
	fontFamily: FontFamily;
	colors: ResumeColors;
	sectionSpacing: "compact" | "normal" | "spacious";
	showIcons: boolean;
	dateFormat: "MM/YYYY" | "MMM YYYY" | "MMMM YYYY" | "YYYY";
	accentStyle: "underline" | "background" | "border" | "none";
}

export interface PartialResumeSettings {
	pageSize?: "A4" | "Letter";
	margins?: Partial<{
		top: number;
		right: number;
		bottom: number;
		left: number;
	}>;
	fontSize?: number;
	fontScale?: number;
	typography?: Partial<TypographyScale>;
	lineHeight?: number;
	fontFamily?: FontFamily;
	colors?: Partial<ResumeColors>;
	sectionSpacing?: "compact" | "normal" | "spacious";
	showIcons?: boolean;
	dateFormat?: "MM/YYYY" | "MMM YYYY" | "MMMM YYYY" | "YYYY";
	accentStyle?: "underline" | "background" | "border" | "none";
}

export type FontFamily =
	| "Inter"
	| "Roboto"
	| "Open Sans"
	| "Lato"
	| "Montserrat"
	| "Playfair Display"
	| "Georgia"
	| "Times New Roman"
	| "Arial"
	| "Calibri"
	| "Garamond"
	| "Helvetica"
	| "Computer Modern";

export interface ResumeColors {
	primary: string;
	secondary: string;
	text: string;
	heading: string;
	accent: string;
	background: string;
	divider: string;
}

// ============================================
// Template Types
// ============================================
export type TemplateType =
	| "minimal"
	| "modern"
	| "classic"
	| "professional"
	| "creative"
	| "executive"
	| "tech";

export interface TemplateConfig {
	id: TemplateType;
	name: string;
	description: string;
	thumbnail: string;
	features: string[];
	defaultColors: ResumeColors;
	supportedSections: SectionType[];
	layout: "single-column" | "two-column" | "sidebar";
}

// ============================================
// Export & Job Target Types
// ============================================
export interface ExportRecord {
	id: string;
	format: "pdf" | "json" | "docx" | "txt";
	timestamp: string;
	fileName: string;
	fileSize?: number;
}

export interface JobTarget {
	title: string;
	company?: string;
	description?: string;
	keywords?: string[];
	url?: string;
	addedAt: string;
}

export interface ATSScore {
	overall: number;
	breakdown: {
		keywords: number;
		formatting: number;
		sections: number;
		length: number;
	};
	suggestions: ATSSuggestion[];
	lastAnalyzed: string;
}

export interface ATSSuggestion {
	type: "warning" | "error" | "success" | "info";
	category: "keywords" | "formatting" | "content" | "structure";
	message: string;
	sectionId?: string;
	priority: "high" | "medium" | "low";
}

// ============================================
// Section Content Types
// ============================================

// Experience
export interface Experience {
	id: string;
	company: string;
	position: string;
	startDate: string;
	endDate?: string;
	current: boolean;
	location?: string;
	locationType?: "onsite" | "remote" | "hybrid";
	employmentType?:
		| "full-time"
		| "part-time"
		| "contract"
		| "freelance"
		| "internship";
	description: string;
	highlights?: string[];
	technologies?: string[];
}

export interface ExperienceContent extends SectionContent {
	items?: Experience[];
}

// Education
export interface Education {
	id: string;
	institution: string;
	degree: string;
	field: string;
	startDate?: string;
	graduationDate: string;
	endDate?: string;
	current: boolean;
	gpa?: string;
	maxGpa?: string;
	location?: string;
	achievements?: string[];
	coursework?: string[];
	honors?: string[];
}

export interface EducationContent extends SectionContent {
	items?: Education[];
}

// Skills
export interface SkillCategory {
	id: string;
	name: string;
	skills: Skill[];
	order: number;
}

export interface Skill {
	id: string;
	name: string;
	level?: SkillLevel;
	yearsOfExperience?: number;
}

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillsContent extends SectionContent {
	categories?: SkillCategory[];
}

// Projects
export interface Project {
	id: string;
	name: string;
	description: string;
	role?: string;
	technologies?: string[];
	url?: string;
	github?: string;
	startDate?: string;
	endDate?: string;
	current?: boolean;
	highlights?: string[];
}

export interface ProjectsContent extends SectionContent {
	items?: Project[];
}

// Certifications
export interface Certification {
	id: string;
	name: string;
	issuer: string;
	date: string;
	expirationDate?: string;
	noExpiration?: boolean;
	credentialId?: string;
	url?: string;
	description?: string;
}

export interface CertificationsContent extends SectionContent {
	items?: Certification[];
}

// Awards
export interface Award {
	id: string;
	title: string;
	issuer: string;
	date: string;
	description?: string;
}

export interface AwardsContent extends SectionContent {
	items?: Award[];
}

// Languages
export interface Language {
	id: string;
	name: string;
	proficiency: "native" | "fluent" | "advanced" | "intermediate" | "basic";
	certification?: string;
}

export interface LanguagesContent extends SectionContent {
	items?: Language[];
}

// Publications
export interface Publication {
	id: string;
	title: string;
	publisher: string;
	date: string;
	authors?: string[];
	url?: string;
	summary?: string;
}

export interface PublicationsContent extends SectionContent {
	items?: Publication[];
}

// Volunteer
export interface Volunteer {
	id: string;
	organization: string;
	role: string;
	startDate: string;
	endDate?: string;
	current: boolean;
	location?: string;
	cause?: string;
	description?: string;
	highlights?: string[];
}

export interface VolunteerContent extends SectionContent {
	items?: Volunteer[];
}

// References
export interface Reference {
	id: string;
	name: string;
	position: string;
	company?: string;
	relationship?: string;
	email?: string;
	phone?: string;
	linkedin?: string;
	isHidden?: boolean;
}

export interface ReferencesContent extends SectionContent {
	items?: Reference[];
}

// Summary
export interface SummaryContent extends SectionContent {
	text?: string;
}

// Custom Section
export interface CustomContent extends SectionContent {
	customTitle?: string;
	items?: Array<{
		id: string;
		title?: string;
		subtitle?: string;
		date?: string;
		description?: string;
	}>;
}

// ============================================
// Activity Log
// ============================================
export interface ActivityLog {
	id: string;
	resumeId: string;
	action: ActivityAction;
	description: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export type ActivityAction =
	| "created"
	| "updated"
	| "deleted"
	| "exported"
	| "imported"
	| "duplicated"
	| "variation_created"
	| "synced_with_base"
	| "sync_conflicts_resolved"
	| "section_added"
	| "section_removed"
	| "template_changed"
	| "settings_changed"
	| "section_updated";

// ============================================
// API Input Types
// ============================================
export interface CreateResumeInput {
	name: string;
	variationType?: "base" | "variation";
	baseResumeId?: string;
	domain?: string;
	template?: TemplateType;
	tags?: string[];
	isArchived?: boolean;
	metadata?: ResumeMetadata;
}

export interface UpdateResumeInput {
	name?: string;
	variationType?: "base" | "variation";
	baseResumeId?: string | null;
	domain?: string | null;
	template?: TemplateType;
	tags?: string[];
	isArchived?: boolean;
	metadata?: ResumeMetadata | null;
}

export interface CreateSectionInput {
	resumeId: string;
	type: SectionType;
	order?: number;
	visible?: boolean;
	content: SectionContent;
	layout?: SectionLayout;
}

export interface UpdateSectionInput {
	type?: SectionType;
	order?: number;
	visible?: boolean;
	content?: SectionContent;
	layout?: SectionLayout;
}

// ============================================
// Sync Types
// ============================================
export type SyncStatus = "synced" | "pending" | "syncing" | "error" | "offline";

export interface SyncQueueItem {
	id: string;
	operation: "create" | "update" | "delete";
	entity: "resume" | "section";
	entityId: string;
	data: unknown;
	timestamp: number;
	retryCount: number;
}

export interface SyncState {
	status: SyncStatus;
	lastSyncedAt: string | null;
	pendingChanges: number;
	error: string | null;
}
