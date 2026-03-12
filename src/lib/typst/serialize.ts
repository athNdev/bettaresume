/**
 * Serializes a Resume object into a JSON string suitable for injection into
 * a Typst template via `json(...)`.
 *
 * Handles:
 * - Stripping HTML from summary sections
 * - Null-coalescing optional fields to safe defaults
 * - Ensuring all values are Typst-compatible (no undefined)
 */

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
	Resume,
	ResumeSettings,
	SkillCategory,
	Volunteer,
} from "@/features/resume-editor/types";

// Canonical font names as Typst knows them (keys are lowercase for lookup)
const CANONICAL_FONT_NAMES: Record<string, string> = {
	inter: "Inter",
	roboto: "Roboto",
	"open sans": "Open Sans",
	lato: "Lato",
	montserrat: "Montserrat",
	"playfair display": "Playfair Display",
};

function normalizeFont(name: string): string {
	return CANONICAL_FONT_NAMES[name.toLowerCase()] ?? name;
}

// Default settings mirroring preview.tsx defaults
const defaultSettings: ResumeSettings = {
	fontFamily: "Inter",
	fontSize: 11,
	fontScale: 1,
	lineHeight: 1.5,
	margins: { top: 40, right: 40, bottom: 40, left: 40 },
	pageSize: "Letter",
	colors: {
		primary: "#2563eb",
		secondary: "#64748b",
		text: "#1e293b",
		heading: "#1e293b",
		background: "#ffffff",
		accent: "#f59e0b",
		divider: "#e2e8f0",
	},
	typography: {
		name: 24,
		title: 14,
		sectionHeading: 14,
		itemTitle: 12,
		body: 11,
		small: 9,
	},
	sectionSpacing: "normal",
	showIcons: true,
	dateFormat: "MMM YYYY",
	accentStyle: "underline",
};

const defaultPersonalInfo: PersonalInfo = {
	fullName: "",
	email: "",
};

function stripHtml(html: string): string {
	// First normalize some common block/inline tags to text representations.
	let text = html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/p>/gi, "\n")
		.replace(/<\/li>/gi, "\n")
		.replace(/<li>/gi, "• ");

	// Repeatedly strip any remaining HTML tags to avoid incomplete
	// multi-character sanitization where earlier replacements reveal
	// new tags (e.g. nested or overlapping constructs).
	let previous: string;
	do {
		previous = text;
		text = text.replace(/<[^>]*>/g, "");
	} while (text !== previous);

	// Decode a subset of common HTML entities to their character forms.
	text = text
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

	// Finally, escape any remaining angle brackets so the returned string
	// cannot introduce new HTML elements (e.g. "<script>") when embedded
	// into HTML contexts.
	return text
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.trim();
}

function safeStr(val: unknown, fallback = ""): string {
	if (typeof val === "string") return val;
	if (val == null) return fallback;
	return String(val);
}

function safeBool(val: unknown, fallback = false): boolean {
	if (typeof val === "boolean") return val;
	return fallback;
}

function safeArr<T>(val: unknown): T[] {
	if (Array.isArray(val)) return val as T[];
	return [];
}

function serializePersonalInfo(pi: PersonalInfo) {
	return {
		fullName: safeStr(pi.fullName, "Your Name"),
		email: safeStr(pi.email),
		phone: safeStr(pi.phone),
		location: safeStr(pi.location),
		linkedin: safeStr(pi.linkedin),
		github: safeStr(pi.github),
		website: safeStr(pi.website),
		portfolio: safeStr(pi.portfolio),
		professionalTitle: safeStr(pi.professionalTitle),
		photoUrl: safeStr(pi.photoUrl),
	};
}

function serializeSettings(settings: ResumeSettings) {
	const merged: ResumeSettings = {
		...defaultSettings,
		...settings,
		colors: { ...defaultSettings.colors, ...settings.colors },
		typography: { ...defaultSettings.typography, ...settings.typography },
		margins: { ...defaultSettings.margins, ...settings.margins },
	};
	return {
		pageSize: merged.pageSize ?? defaultSettings.pageSize,
		margins: {
			top: merged.margins.top,
			right: merged.margins.right,
			bottom: merged.margins.bottom,
			left: merged.margins.left,
		},
		fontFamily: normalizeFont(merged.fontFamily ?? defaultSettings.fontFamily),
		fontSize: merged.fontSize ?? defaultSettings.fontSize,
		fontScale: merged.fontScale ?? defaultSettings.fontScale,
		lineHeight: merged.lineHeight ?? defaultSettings.lineHeight,
		typography: {
			name: merged.typography.name,
			title: merged.typography.title,
			sectionHeading: merged.typography.sectionHeading,
			itemTitle: merged.typography.itemTitle,
			body: merged.typography.body,
			small: merged.typography.small,
		},
		colors: {
			primary: merged.colors.primary,
			secondary: merged.colors.secondary,
			text: merged.colors.text,
			heading: merged.colors.heading,
			accent: merged.colors.accent,
			background: merged.colors.background,
			divider: merged.colors.divider,
		},
		layout: merged.layout ?? "single-column",
		sectionSpacing: merged.sectionSpacing,
		showIcons: safeBool(merged.showIcons, true),
		dateFormat: merged.dateFormat,
		accentStyle: merged.accentStyle,
	};
}

function serializeSection(section: {
	id: string;
	type: string;
	order: number;
	visible: boolean;
	content: Record<string, unknown>;
}) {
	const { type, content } = section;
	const base = {
		id: section.id,
		type,
		order: section.order,
		visible: section.visible,
		title: safeStr(content.title as string),
	};

	switch (type) {
		case "summary": {
			const html = safeStr(
				(content.html as string) ||
					((content.data as { summary?: string })?.summary ?? ""),
			);
			return { ...base, summaryText: stripHtml(html) };
		}

		case "experience": {
			const items = safeArr<Experience>(content.data);
			return {
				...base,
				items: items.map((exp) => ({
					id: safeStr(exp.id),
					company: safeStr(exp.company),
					position: safeStr(exp.position),
					startDate: safeStr(exp.startDate),
					endDate: safeStr(exp.endDate),
					current: safeBool(exp.current),
					location: safeStr(exp.location),
					description: safeStr(exp.description),
					highlights: safeArr<string>(exp.highlights),
					technologies: safeArr<string>(exp.technologies),
				})),
			};
		}

		case "education": {
			const items = safeArr<Education>(content.data);
			return {
				...base,
				items: items.map((edu) => ({
					id: safeStr(edu.id),
					institution: safeStr(edu.institution),
					degree: safeStr(edu.degree),
					field: safeStr(edu.field),
					graduationDate: safeStr(edu.graduationDate),
					startDate: safeStr(edu.startDate),
					current: safeBool(edu.current),
					gpa: safeStr(edu.gpa),
					location: safeStr(edu.location),
					honors: safeArr<string>(edu.honors),
					coursework: safeArr<string>(edu.coursework),
					achievements: safeArr<string>(edu.achievements),
				})),
			};
		}

		case "skills": {
			const items = safeArr<SkillCategory>(content.data);
			return {
				...base,
				categories: items.map((cat) => ({
					id: safeStr(cat.id),
					name: safeStr(cat.name),
					skills: safeArr<{ id: string; name: string; level?: string }>(
						cat.skills,
					).map((s) => ({
						id: safeStr(s.id),
						name: safeStr(s.name),
						level: safeStr(s.level),
					})),
				})),
			};
		}

		case "projects": {
			const items = safeArr<Project>(content.data);
			return {
				...base,
				items: items.map((p) => ({
					id: safeStr(p.id),
					name: safeStr(p.name),
					description: safeStr(p.description),
					role: safeStr(p.role),
					technologies: safeArr<string>(p.technologies),
					url: safeStr(p.url),
					github: safeStr(p.github),
					startDate: safeStr(p.startDate),
					endDate: safeStr(p.endDate),
					current: safeBool(p.current),
					highlights: safeArr<string>(p.highlights),
				})),
			};
		}

		case "certifications": {
			const items = safeArr<Certification>(content.data);
			return {
				...base,
				items: items.map((c) => ({
					id: safeStr(c.id),
					name: safeStr(c.name),
					issuer: safeStr(c.issuer),
					date: safeStr(c.date),
					expirationDate: safeStr(c.expirationDate),
					credentialId: safeStr(c.credentialId),
					url: safeStr(c.url),
					description: safeStr(c.description),
				})),
			};
		}

		case "awards": {
			const items = safeArr<Award>(content.data);
			return {
				...base,
				items: items.map((a) => ({
					id: safeStr(a.id),
					title: safeStr(a.title),
					issuer: safeStr(a.issuer),
					date: safeStr(a.date),
					description: safeStr(a.description),
				})),
			};
		}

		case "languages": {
			const items = safeArr<Language>(content.data);
			return {
				...base,
				items: items.map((l) => ({
					id: safeStr(l.id),
					name: safeStr(l.name),
					proficiency: safeStr(l.proficiency),
					certification: safeStr(l.certification),
				})),
			};
		}

		case "publications": {
			const items = safeArr<Publication>(content.data);
			return {
				...base,
				items: items.map((p) => ({
					id: safeStr(p.id),
					title: safeStr(p.title),
					publisher: safeStr(p.publisher),
					date: safeStr(p.date),
					authors: safeArr<string>(p.authors),
					url: safeStr(p.url),
					summary: safeStr(p.summary),
				})),
			};
		}

		case "volunteer": {
			const items = safeArr<Volunteer>(content.data);
			return {
				...base,
				items: items.map((v) => ({
					id: safeStr(v.id),
					organization: safeStr(v.organization),
					role: safeStr(v.role),
					startDate: safeStr(v.startDate),
					endDate: safeStr(v.endDate),
					current: safeBool(v.current),
					location: safeStr(v.location),
					description: safeStr(v.description),
					highlights: safeArr<string>(v.highlights),
				})),
			};
		}

		case "references": {
			const items = safeArr<Reference>(content.data);
			return {
				...base,
				items: items
					.filter((r) => !r.isHidden)
					.map((r) => ({
						id: safeStr(r.id),
						name: safeStr(r.name),
						position: safeStr(r.position),
						company: safeStr(r.company),
						email: safeStr(r.email),
						phone: safeStr(r.phone),
					})),
			};
		}

		default:
			return { ...base, items: [] };
	}
}

/**
 * Converts a Resume object to a JSON string safe for Typst's `json()`.
 */
export function resumeToTypstJson(resume: Resume): string {
	const settings = serializeSettings(
		resume.metadata?.settings ?? defaultSettings,
	);
	const personalInfo = serializePersonalInfo(
		resume.metadata?.personalInfo ?? defaultPersonalInfo,
	);

	const visibleSections = resume.sections
		.filter((s) => s.visible)
		.sort((a, b) => a.order - b.order)
		.map((s) =>
			serializeSection({
				id: s.id,
				type: s.type,
				order: s.order,
				visible: s.visible,
				content: s.content as Record<string, unknown>,
			}),
		);

	const data = {
		template: resume.template,
		settings,
		personalInfo,
		sections: visibleSections,
	};

	return JSON.stringify(data);
}
