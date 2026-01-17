/**
 * University Resume Templates
 *
 * Modular system for university-specific resume formatting.
 * Each template includes full structure with recommended sections and formatting.
 */

import type {
	PartialResumeSettings,
	SectionType,
} from "@/features/resume-editor/types";

export interface UniversityTemplate {
	id: string;
	name: string;
	university: string;
	description: string;
	category: "ivy-league" | "top-public" | "top-private" | "international";

	// Full formatting settings
	settings: PartialResumeSettings;

	// Recommended section structure
	recommendedSections: Array<{
		type: SectionType;
		order: number;
		title: string;
		recommended: boolean; // If false, it's optional
	}>;

	// Specific guidelines
	guidelines?: {
		maxPages?: number;
		emphasis?: string; // What to emphasize (e.g., "Technical skills and projects")
		tips?: string[];
	};
}

// Color palettes for different template styles
const COLORS = {
	conservative: {
		primary: "#1e293b",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#0f172a",
		background: "#ffffff",
		accent: "#334155",
		divider: "#e2e8f0",
	},
	technical: {
		primary: "#1e40af",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#1e3a8a",
		background: "#ffffff",
		accent: "#3b82f6",
		divider: "#dbeafe",
	},
	modern: {
		primary: "#7c3aed",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#6d28d9",
		background: "#ffffff",
		accent: "#8b5cf6",
		divider: "#ede9fe",
	},
	classic: {
		primary: "#0c4a6e",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#0c4a6e",
		background: "#ffffff",
		accent: "#0369a1",
		divider: "#e0f2fe",
	},
	professional: {
		primary: "#1e293b",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#0f172a",
		background: "#ffffff",
		accent: "#475569",
		divider: "#e2e8f0",
	},
};

// ============================================
// IVY LEAGUE TEMPLATES
// ============================================

export const HARVARD_TEMPLATE: UniversityTemplate = {
	id: "harvard",
	name: "Harvard",
	university: "Harvard University",
	description:
		"Traditional, conservative format with serif fonts. Emphasizes clarity and professionalism.",
	category: "ivy-league",
	settings: {
		fontFamily: "Times New Roman",
		fontSize: 11,
		lineHeight: 1.15,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
		pageSize: "Letter",
		colors: COLORS.conservative,
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "compact",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{
			type: "personal-info",
			order: 0,
			title: "Contact Information",
			recommended: true,
		},
		{ type: "education", order: 1, title: "Education", recommended: true },
		{ type: "experience", order: 2, title: "Experience", recommended: true },
		{ type: "skills", order: 3, title: "Skills", recommended: true },
		{ type: "awards", order: 4, title: "Honors & Awards", recommended: false },
		{
			type: "publications",
			order: 5,
			title: "Publications",
			recommended: false,
		},
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Clear, concise bullets with quantifiable achievements",
		tips: [
			"Use traditional serif fonts (Times New Roman, Garamond)",
			"Keep formatting minimal and professional",
			"Focus on impact and results",
			"One page only",
		],
	},
};

export const YALE_TEMPLATE: UniversityTemplate = {
	id: "yale",
	name: "Yale",
	university: "Yale University",
	description:
		"Classic, elegant formatting with traditional structure. Emphasizes academic and professional excellence.",
	category: "ivy-league",
	settings: {
		fontFamily: "Georgia",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: COLORS.classic,
		typography: {
			name: 22,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "Contact", recommended: true },
		{ type: "education", order: 1, title: "Education", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "Professional Experience",
			recommended: true,
		},
		{
			type: "skills",
			order: 3,
			title: "Skills & Competencies",
			recommended: true,
		},
		{
			type: "certifications",
			order: 4,
			title: "Certifications",
			recommended: false,
		},
		{ type: "languages", order: 5, title: "Languages", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Balanced presentation of academic and professional achievements",
		tips: [
			"Use elegant serif fonts",
			"Maintain consistent spacing",
			"Emphasize leadership and impact",
		],
	},
};

export const PRINCETON_TEMPLATE: UniversityTemplate = {
	id: "princeton",
	name: "Princeton",
	university: "Princeton University",
	description:
		"Refined, minimalist approach with focus on content over design.",
	category: "ivy-league",
	settings: {
		fontFamily: "Garamond",
		fontSize: 11,
		lineHeight: 1.15,
		margins: { top: 48, right: 48, bottom: 48, left: 48 },
		pageSize: "Letter",
		colors: COLORS.conservative,
		typography: {
			name: 18,
			title: 11,
			sectionHeading: 11,
			itemTitle: 11,
			body: 10,
			small: 9,
		},
		sectionSpacing: "compact",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "none",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "", recommended: true },
		{ type: "education", order: 1, title: "EDUCATION", recommended: true },
		{ type: "experience", order: 2, title: "EXPERIENCE", recommended: true },
		{ type: "skills", order: 3, title: "SKILLS", recommended: true },
		{ type: "awards", order: 4, title: "HONORS", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Minimalist design, maximum impact",
		tips: [
			"Less is more - avoid excessive formatting",
			"Use all caps for section headings",
			"Focus on substance over style",
		],
	},
};

export const COLUMBIA_TEMPLATE: UniversityTemplate = {
	id: "columbia",
	name: "Columbia",
	university: "Columbia University",
	description: "Professional format balancing traditional and modern elements.",
	category: "ivy-league",
	settings: {
		fontFamily: "Calibri",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: COLORS.professional,
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{
			type: "personal-info",
			order: 0,
			title: "Contact Information",
			recommended: true,
		},
		{
			type: "summary",
			order: 1,
			title: "Professional Summary",
			recommended: false,
		},
		{ type: "education", order: 2, title: "Education", recommended: true },
		{
			type: "experience",
			order: 3,
			title: "Work Experience",
			recommended: true,
		},
		{ type: "skills", order: 4, title: "Technical Skills", recommended: true },
		{
			type: "volunteer",
			order: 5,
			title: "Leadership & Service",
			recommended: false,
		},
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Clear structure with strong action verbs",
		tips: [
			"Start bullets with strong action verbs",
			"Quantify achievements whenever possible",
			"Tailor to specific industries",
		],
	},
};

export const PENN_TEMPLATE: UniversityTemplate = {
	id: "penn",
	name: "UPenn",
	university: "University of Pennsylvania",
	description: "Business-focused format emphasizing leadership and results.",
	category: "ivy-league",
	settings: {
		fontFamily: "Arial",
		fontSize: 11,
		lineHeight: 1.15,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
		pageSize: "Letter",
		colors: COLORS.professional,
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "compact",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "Contact", recommended: true },
		{ type: "education", order: 1, title: "Education", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "Professional Experience",
			recommended: true,
		},
		{ type: "skills", order: 3, title: "Skills", recommended: true },
		{ type: "awards", order: 4, title: "Awards & Honors", recommended: false },
		{
			type: "volunteer",
			order: 5,
			title: "Leadership Activities",
			recommended: false,
		},
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Leadership, impact, and quantifiable results",
		tips: [
			"Emphasize leadership roles and initiatives",
			"Use metrics to demonstrate impact",
			"Highlight business-relevant skills",
		],
	},
};

export const CORNELL_TEMPLATE: UniversityTemplate = {
	id: "cornell",
	name: "Cornell",
	university: "Cornell University",
	description:
		"Practical, straightforward format suitable for technical and non-technical fields.",
	category: "ivy-league",
	settings: {
		fontFamily: "Calibri",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: COLORS.professional,
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{
			type: "personal-info",
			order: 0,
			title: "Contact Information",
			recommended: true,
		},
		{ type: "education", order: 1, title: "Education", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "Relevant Experience",
			recommended: true,
		},
		{ type: "skills", order: 3, title: "Technical Skills", recommended: true },
		{ type: "projects", order: 4, title: "Projects", recommended: false },
		{
			type: "certifications",
			order: 5,
			title: "Certifications",
			recommended: false,
		},
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Relevant experience and technical competencies",
		tips: [
			"Focus on relevant experience",
			"Include technical projects for STEM fields",
			"Use clear, concise language",
		],
	},
};

export const BROWN_TEMPLATE: UniversityTemplate = {
	id: "brown",
	name: "Brown",
	university: "Brown University",
	description:
		"Creative yet professional format allowing for individual expression.",
	category: "ivy-league",
	settings: {
		fontFamily: "Helvetica",
		fontSize: 11,
		lineHeight: 1.25,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: {
			primary: "#4a1e0f",
			secondary: "#64748b",
			text: "#1e293b",
			heading: "#4a1e0f",
			background: "#ffffff",
			accent: "#b45f06",
			divider: "#fef3c7",
		},
		typography: {
			name: 22,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "Contact", recommended: true },
		{ type: "education", order: 1, title: "Education", recommended: true },
		{ type: "experience", order: 2, title: "Experience", recommended: true },
		{
			type: "skills",
			order: 3,
			title: "Skills & Interests",
			recommended: true,
		},
		{
			type: "volunteer",
			order: 4,
			title: "Community Engagement",
			recommended: false,
		},
		{ type: "awards", order: 5, title: "Achievements", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Interdisciplinary experience and unique perspectives",
		tips: [
			"Highlight interdisciplinary work",
			"Show creativity and initiative",
			"Include relevant extracurriculars",
		],
	},
};

export const DARTMOUTH_TEMPLATE: UniversityTemplate = {
	id: "dartmouth",
	name: "Dartmouth",
	university: "Dartmouth College",
	description: "Clean, organized format emphasizing well-rounded experience.",
	category: "ivy-league",
	settings: {
		fontFamily: "Georgia",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: {
			primary: "#00693e",
			secondary: "#64748b",
			text: "#1e293b",
			heading: "#00693e",
			background: "#ffffff",
			accent: "#00693e",
			divider: "#d1fae5",
		},
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{
			type: "personal-info",
			order: 0,
			title: "Contact Information",
			recommended: true,
		},
		{ type: "education", order: 1, title: "Education", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "Professional Experience",
			recommended: true,
		},
		{ type: "skills", order: 3, title: "Skills", recommended: true },
		{
			type: "volunteer",
			order: 4,
			title: "Leadership & Service",
			recommended: false,
		},
		{ type: "awards", order: 5, title: "Honors & Awards", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Well-rounded profile with leadership",
		tips: [
			"Balance academic and extracurricular activities",
			"Highlight leadership roles",
			"Show commitment and passion",
		],
	},
};

// ============================================
// TOP PUBLIC UNIVERSITIES
// ============================================

export const MIT_TEMPLATE: UniversityTemplate = {
	id: "mit",
	name: "MIT",
	university: "Massachusetts Institute of Technology",
	description: "Technical, clean format with emphasis on projects and skills.",
	category: "top-private",
	settings: {
		fontFamily: "Computer Modern",
		fontSize: 11,
		lineHeight: 1.15,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
		pageSize: "Letter",
		colors: COLORS.technical,
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 10,
			small: 9,
		},
		sectionSpacing: "compact",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "Contact", recommended: true },
		{ type: "education", order: 1, title: "Education", recommended: true },
		{ type: "skills", order: 2, title: "Technical Skills", recommended: true },
		{ type: "experience", order: 3, title: "Experience", recommended: true },
		{ type: "projects", order: 4, title: "Projects", recommended: true },
		{
			type: "publications",
			order: 5,
			title: "Publications",
			recommended: false,
		},
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Technical depth and project work",
		tips: [
			"Lead with technical skills",
			"Include detailed project descriptions",
			"Quantify technical impact",
			"Include links to GitHub/portfolio",
		],
	},
};

export const STANFORD_TEMPLATE: UniversityTemplate = {
	id: "stanford",
	name: "Stanford",
	university: "Stanford University",
	description:
		"Modern, balanced format with subtle color accents and clean design.",
	category: "top-private",
	settings: {
		fontFamily: "Helvetica",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: COLORS.modern,
		typography: {
			name: 22,
			title: 12,
			sectionHeading: 13,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "Contact", recommended: true },
		{ type: "education", order: 1, title: "Education", recommended: true },
		{ type: "experience", order: 2, title: "Experience", recommended: true },
		{ type: "projects", order: 3, title: "Projects", recommended: true },
		{ type: "skills", order: 4, title: "Skills", recommended: true },
		{ type: "awards", order: 5, title: "Honors & Awards", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Innovation, impact, and entrepreneurial spirit",
		tips: [
			"Highlight innovative projects",
			"Show initiative and leadership",
			"Emphasize impact and results",
			"Include startup/entrepreneurial experience",
		],
	},
};

export const BERKELEY_TEMPLATE: UniversityTemplate = {
	id: "berkeley",
	name: "UC Berkeley",
	university: "University of California, Berkeley",
	description:
		"Professional, straightforward layout for technical and research roles.",
	category: "top-public",
	settings: {
		fontFamily: "Arial",
		fontSize: 11,
		lineHeight: 1.15,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
		pageSize: "Letter",
		colors: {
			primary: "#003262",
			secondary: "#64748b",
			text: "#1e293b",
			heading: "#003262",
			background: "#ffffff",
			accent: "#fdb515",
			divider: "#e2e8f0",
		},
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "compact",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{
			type: "personal-info",
			order: 0,
			title: "Contact Information",
			recommended: true,
		},
		{ type: "education", order: 1, title: "Education", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "Research & Work Experience",
			recommended: true,
		},
		{ type: "skills", order: 3, title: "Technical Skills", recommended: true },
		{ type: "projects", order: 4, title: "Projects", recommended: false },
		{
			type: "publications",
			order: 5,
			title: "Publications",
			recommended: false,
		},
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Research experience and technical expertise",
		tips: [
			"Emphasize research and technical work",
			"Include publications if applicable",
			"Quantify research impact",
		],
	},
};

export const CALTECH_TEMPLATE: UniversityTemplate = {
	id: "caltech",
	name: "Caltech",
	university: "California Institute of Technology",
	description:
		"Highly technical format focused on research and scientific achievements.",
	category: "top-private",
	settings: {
		fontFamily: "Computer Modern",
		fontSize: 10,
		lineHeight: 1.15,
		margins: { top: 36, right: 36, bottom: 36, left: 36 },
		pageSize: "Letter",
		colors: COLORS.technical,
		typography: {
			name: 18,
			title: 11,
			sectionHeading: 11,
			itemTitle: 10,
			body: 10,
			small: 9,
		},
		sectionSpacing: "compact",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "none",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "", recommended: true },
		{ type: "education", order: 1, title: "EDUCATION", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "RESEARCH EXPERIENCE",
			recommended: true,
		},
		{
			type: "publications",
			order: 3,
			title: "PUBLICATIONS",
			recommended: false,
		},
		{ type: "skills", order: 4, title: "TECHNICAL SKILLS", recommended: true },
		{ type: "awards", order: 5, title: "HONORS & AWARDS", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Research depth and scientific rigor",
		tips: [
			"Focus on research contributions",
			"Include publications and presentations",
			"Use technical terminology appropriately",
			"Highlight scientific impact",
		],
	},
};

export const NORTHWESTERN_TEMPLATE: UniversityTemplate = {
	id: "northwestern",
	name: "Northwestern",
	university: "Northwestern University",
	description: "Polished professional format suitable for diverse industries.",
	category: "top-private",
	settings: {
		fontFamily: "Calibri",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: {
			primary: "#4e2a84",
			secondary: "#64748b",
			text: "#1e293b",
			heading: "#4e2a84",
			background: "#ffffff",
			accent: "#4e2a84",
			divider: "#e2e8f0",
		},
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{ type: "personal-info", order: 0, title: "Contact", recommended: true },
		{ type: "education", order: 1, title: "Education", recommended: true },
		{
			type: "experience",
			order: 2,
			title: "Professional Experience",
			recommended: true,
		},
		{ type: "skills", order: 3, title: "Skills", recommended: true },
		{
			type: "volunteer",
			order: 4,
			title: "Leadership & Activities",
			recommended: false,
		},
		{ type: "awards", order: 5, title: "Honors", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Professional polish and diverse experience",
		tips: [
			"Maintain professional tone",
			"Show breadth of experience",
			"Highlight collaborative work",
		],
	},
};

export const DUKE_TEMPLATE: UniversityTemplate = {
	id: "duke",
	name: "Duke",
	university: "Duke University",
	description:
		"Balanced format emphasizing leadership and service alongside professional experience.",
	category: "top-private",
	settings: {
		fontFamily: "Georgia",
		fontSize: 11,
		lineHeight: 1.2,
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
		pageSize: "Letter",
		colors: {
			primary: "#012169",
			secondary: "#64748b",
			text: "#1e293b",
			heading: "#012169",
			background: "#ffffff",
			accent: "#012169",
			divider: "#e0f2fe",
		},
		typography: {
			name: 20,
			title: 12,
			sectionHeading: 12,
			itemTitle: 11,
			body: 11,
			small: 10,
		},
		sectionSpacing: "normal",
		showIcons: false,
		dateFormat: "MMM YYYY",
		accentStyle: "underline",
	},
	recommendedSections: [
		{
			type: "personal-info",
			order: 0,
			title: "Contact Information",
			recommended: true,
		},
		{ type: "education", order: 1, title: "Education", recommended: true },
		{ type: "experience", order: 2, title: "Experience", recommended: true },
		{ type: "skills", order: 3, title: "Skills", recommended: true },
		{
			type: "volunteer",
			order: 4,
			title: "Service & Leadership",
			recommended: true,
		},
		{ type: "awards", order: 5, title: "Awards", recommended: false },
	],
	guidelines: {
		maxPages: 1,
		emphasis: "Leadership, service, and professional achievement",
		tips: [
			"Highlight service and leadership",
			"Show commitment to community",
			"Balance professional and service experience",
		],
	},
};

// ============================================
// TEMPLATE REGISTRY
// ============================================

export const UNIVERSITY_TEMPLATES: Record<string, UniversityTemplate> = {
	// Ivy League (All 8)
	harvard: HARVARD_TEMPLATE,
	yale: YALE_TEMPLATE,
	princeton: PRINCETON_TEMPLATE,
	columbia: COLUMBIA_TEMPLATE,
	penn: PENN_TEMPLATE,
	cornell: CORNELL_TEMPLATE,
	brown: BROWN_TEMPLATE,
	dartmouth: DARTMOUTH_TEMPLATE,

	// Top Private
	mit: MIT_TEMPLATE,
	stanford: STANFORD_TEMPLATE,
	caltech: CALTECH_TEMPLATE,
	northwestern: NORTHWESTERN_TEMPLATE,
	duke: DUKE_TEMPLATE,

	// Top Public
	berkeley: BERKELEY_TEMPLATE,
};

/**
 * Get all templates, optionally filtered by category
 */
export function getUniversityTemplates(
	category?: UniversityTemplate["category"],
): UniversityTemplate[] {
	const templates = Object.values(UNIVERSITY_TEMPLATES);
	if (category) {
		return templates.filter((t) => t.category === category);
	}
	return templates;
}

/**
 * Get a specific template by ID
 */
export function getTemplate(id: string): UniversityTemplate | undefined {
	return UNIVERSITY_TEMPLATES[id];
}

/**
 * Get templates grouped by category
 */
export function getTemplatesByCategory(): Record<
	UniversityTemplate["category"],
	UniversityTemplate[]
> {
	const templates = Object.values(UNIVERSITY_TEMPLATES);
	return {
		"ivy-league": templates.filter((t) => t.category === "ivy-league"),
		"top-public": templates.filter((t) => t.category === "top-public"),
		"top-private": templates.filter((t) => t.category === "top-private"),
		international: templates.filter((t) => t.category === "international"),
	};
}
