"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
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
	ResumeSection,
	ResumeSettings,
	SkillCategory,
	Volunteer,
} from "@/features/resume-editor/types";

import { resolveTypstFont } from "@/lib/typst/fonts";
import { cn } from "@/lib/utils";

interface PreviewProps {
	resume: Resume;
	scale?: number;
	className?: string;
	paginate?: boolean;
}

// Default settings for when metadata is null
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

/**
 * Resolve a family to a CSS stack for the in-browser preview.
 *
 * Deliberately mirrors `resolveTypstFont` in `src/lib/typst/fonts.ts`: when the
 * PDF pipeline cannot embed a family it substitutes, and the preview must show
 * the substitution too — otherwise the preview is not a preview of the export.
 *
 * The `var(--font-*)` families are self-hosted by `src/lib/fonts.ts` and are the
 * embeddable set. Everything else follows the same substitution table, plus the
 * local system font so the browser has something to pick before the PDF loads.
 */
function resolveFontFamily(fontFamily: string): string {
	const { typstFamily, substituted } = resolveTypstFont(fontFamily);
	if (!substituted) {
		return CSS_FAMILY_BY_TYPST_NAME[typstFamily] ?? fontFamily;
	}
	const local = CSS_FAMILY_BY_REQUESTED[fontFamily] ?? fontFamily;
	return `${local}, ${CSS_FAMILY_BY_TYPST_NAME[typstFamily] ?? "serif"}`;
}

/** Embeddable families, self-hosted as CSS variables. */
const CSS_FAMILY_BY_TYPST_NAME: Record<string, string> = {
	Inter: "var(--font-inter)",
	Roboto: "var(--font-roboto)",
	"Open Sans": "var(--font-open-sans)",
	Lato: "var(--font-lato)",
	Montserrat: "var(--font-montserrat)",
	"Playfair Display": "var(--font-playfair)",
	"New Computer Modern": "serif",
};

/** The real font, used only as a first-paint hint before substitution takes over. */
const CSS_FAMILY_BY_REQUESTED: Record<string, string> = {
	Georgia: "Georgia",
	"Times New Roman": '"Times New Roman", Times',
	Garamond: "Garamond, Georgia",
	Arial: "Arial",
	Helvetica: "Helvetica",
	Calibri: "Calibri",
};

const PRIMARY_SECTION_TYPES = new Set([
	"summary",
	"experience",
	"projects",
	"education",
]);
const SECONDARY_SECTION_TYPES = new Set([
	"skills",
	"certifications",
	"languages",
	"awards",
]);

function sameStringArray(a: string[], b: string[]) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}

function sameSinglePagination(a: string[][], b: string[][]) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		const ap = a[i];
		const bp = b[i];
		if (!ap || !bp) return false;
		if (!sameStringArray(ap, bp)) return false;
	}
	return true;
}

function sameColumnPagination(
	a: Array<{ main: string[]; side: string[] }>,
	b: Array<{ main: string[]; side: string[] }>,
) {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i += 1) {
		const ap = a[i];
		const bp = b[i];
		if (!ap || !bp) return false;
		if (!sameStringArray(ap.main, bp.main)) return false;
		if (!sameStringArray(ap.side, bp.side)) return false;
	}
	return true;
}

export function Preview({
	resume,
	scale = 1,
	className,
	paginate = true,
}: PreviewProps) {
	const { metadata, sections } = resume;
	const [paginatedSingle, setPaginatedSingle] = useState<string[][]>([]);
	const [paginatedColumns, setPaginatedColumns] = useState<
		Array<{ main: string[]; side: string[] }>
	>([]);

	const headerMeasureRef = useRef<HTMLDivElement | null>(null);
	const singleMeasureRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const mainMeasureRefs = useRef<Record<string, HTMLDivElement | null>>({});
	const sideMeasureRefs = useRef<Record<string, HTMLDivElement | null>>({});
	// Deep merge settings with defaults to ensure all properties exist
	const settings: ResumeSettings = {
		...defaultSettings,
		...(metadata?.settings ?? {}),
		colors: {
			...defaultSettings.colors,
			...(metadata?.settings?.colors ?? {}),
		},
		typography: {
			...defaultSettings.typography,
			...(metadata?.settings?.typography ?? {}),
		},
		margins: {
			...defaultSettings.margins,
			...(metadata?.settings?.margins ?? {}),
		},
	};
	const personalInfo = metadata?.personalInfo ?? defaultPersonalInfo;
	const colors = settings.colors;
	const typography = settings.typography;

	// Get visible sections sorted by order
	const visibleSections = useMemo(
		() => sections.filter((s) => s.visible).sort((a, b) => a.order - b.order),
		[sections],
	);

	// Page dimensions in pixels (at 96 DPI)
	const pageWidth = settings.pageSize === "A4" ? 794 : 816;
	const pageHeight = settings.pageSize === "A4" ? 1123 : 1056;
	const pageInnerHeight =
		pageHeight - (settings.margins.top + settings.margins.bottom);

	const basePageStyle: React.CSSProperties = {
		width: pageWidth * scale,
		height: pageHeight * scale,
		backgroundColor: colors.background,
		color: colors.text,
		fontFamily: resolveFontFamily(settings.fontFamily),
		fontSize: typography.body * scale,
		lineHeight: settings.lineHeight,
		padding: `${settings.margins.top * scale}px ${settings.margins.right * scale}px ${settings.margins.bottom * scale}px ${settings.margins.left * scale}px`,
		boxSizing: "border-box",
		overflow: "hidden",
		boxShadow:
			"0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
	};

	const renderPersonalInfo = () => (
		<div
			style={{
				borderBottom: `1px solid ${colors.divider}`,
				paddingBottom: 12 * scale,
				marginBottom: 16 * scale,
			}}
		>
			<h1
				style={{
					fontSize: typography.name * scale,
					fontWeight: 700,
					color: colors.heading,
					marginBottom: 4 * scale,
				}}
			>
				{personalInfo.fullName || "Your Name"}
			</h1>
			{personalInfo.professionalTitle && (
				<p
					style={{
						fontSize: typography.title * scale,
						color: colors.secondary,
						marginBottom: 8 * scale,
					}}
				>
					{personalInfo.professionalTitle}
				</p>
			)}
			<div
				style={{
					display: "flex",
					flexWrap: "wrap",
					gap: 12 * scale,
					fontSize: typography.small * scale,
				}}
			>
				{personalInfo.email && <span>{personalInfo.email}</span>}
				{personalInfo.phone && <span>{personalInfo.phone}</span>}
				{personalInfo.location && <span>{personalInfo.location}</span>}
				{personalInfo.linkedin && (
					<a href={personalInfo.linkedin} style={{ color: colors.accent }}>
						LinkedIn
					</a>
				)}
				{personalInfo.github && (
					<a href={personalInfo.github} style={{ color: colors.accent }}>
						GitHub
					</a>
				)}
				{personalInfo.website && (
					<a href={personalInfo.website} style={{ color: colors.accent }}>
						Portfolio
					</a>
				)}
			</div>
		</div>
	);

	const sectionSpacingPx =
		settings.sectionSpacing === "compact"
			? 12
			: settings.sectionSpacing === "spacious"
				? 24
				: 16;

	const SectionTitle = ({ children }: { children: React.ReactNode }) => (
		<h2
			style={{
				fontSize: typography.sectionHeading * scale,
				fontWeight: 600,
				color: colors.heading,
				marginBottom: 8 * scale,
				paddingBottom: 4 * scale,
				borderBottom:
					settings.accentStyle === "underline"
						? `2px solid ${colors.accent}`
						: "none",
			}}
		>
			{children}
		</h2>
	);

	const stripHtml = (input: string) => input.replace(/<[^>]*>/g, "");

	const renderSummary = (section: ResumeSection) => {
		const html =
			section.content.html ||
			(section.content.data as { summary?: string })?.summary ||
			"";
		const summaryText = stripHtml(html);
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>
					{section.content.title || "Professional Summary"}
				</SectionTitle>
				<p
					style={{
						fontSize: typography.body * scale,
						lineHeight: settings.lineHeight * 1.2,
					}}
				>
					{summaryText}
				</p>
			</div>
		);
	};

	const renderExperience = (section: ResumeSection) => {
		const experiences = section.content.data as Experience[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>
					{section.content.title || "Work Experience"}
				</SectionTitle>
				{experiences.map((exp) => (
					<div key={exp.id} style={{ marginBottom: 10 * scale }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<div
									style={{
										fontSize: typography.itemTitle * scale,
										fontWeight: 600,
										color: colors.heading,
									}}
								>
									{exp.position}
								</div>
								<div
									style={{
										fontSize: typography.body * scale,
										color: colors.secondary,
									}}
								>
									{exp.company}
									{exp.location && ` • ${exp.location}`}
								</div>
							</div>
							<div
								style={{
									fontSize: typography.small * scale,
									color: colors.secondary,
								}}
							>
								{exp.startDate} - {exp.current ? "Present" : exp.endDate}
							</div>
						</div>
						{exp.description && (
							<p
								style={{
									fontSize: typography.body * scale,
									marginTop: 4 * scale,
								}}
							>
								{exp.description}
							</p>
						)}
						{exp.highlights && exp.highlights.length > 0 && (
							<ul style={{ paddingLeft: 16 * scale, marginTop: 4 * scale }}>
								{exp.highlights.map((h, i) => (
									<li
										key={`${exp.id}-${h}-${i}`}
										style={{
											fontSize: typography.body * scale,
											marginBottom: 2 * scale,
										}}
									>
										{h}
									</li>
								))}
							</ul>
						)}
					</div>
				))}
			</div>
		);
	};

	const renderEducation = (section: ResumeSection) => {
		const education = section.content.data as Education[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "Education"}</SectionTitle>
				{education.map((edu) => (
					<div key={edu.id} style={{ marginBottom: 10 * scale }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<div
									style={{
										fontSize: typography.itemTitle * scale,
										fontWeight: 600,
										color: colors.heading,
									}}
								>
									{edu.degree} in {edu.field}
								</div>
								<div
									style={{
										fontSize: typography.body * scale,
										color: colors.secondary,
									}}
								>
									{edu.institution}
									{edu.gpa && ` • GPA: ${edu.gpa}`}
								</div>
							</div>
							<div
								style={{
									fontSize: typography.small * scale,
									color: colors.secondary,
								}}
							>
								{edu.graduationDate}
							</div>
						</div>
					</div>
				))}
			</div>
		);
	};

	const renderSkills = (section: ResumeSection) => {
		const categories = section.content.data as SkillCategory[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "Skills"}</SectionTitle>
				{categories.map((cat) => (
					<div key={cat.id} style={{ marginBottom: 8 * scale }}>
						<div
							style={{
								fontSize: typography.itemTitle * scale,
								fontWeight: 600,
								color: colors.heading,
								marginBottom: 4 * scale,
							}}
						>
							{cat.name}
						</div>
						<div style={{ display: "flex", flexWrap: "wrap", gap: 4 * scale }}>
							{cat.skills.map((skill) => (
								<span
									key={skill.id}
									style={{
										fontSize: typography.small * scale,
										backgroundColor: `${colors.accent}20`,
										color: colors.accent,
										padding: `${2 * scale}px ${6 * scale}px`,
										borderRadius: 4 * scale,
									}}
								>
									{skill.name}
								</span>
							))}
						</div>
					</div>
				))}
			</div>
		);
	};

	const renderProjects = (section: ResumeSection) => {
		const projects = section.content.data as Project[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "Projects"}</SectionTitle>
				{projects.map((proj) => (
					<div key={proj.id} style={{ marginBottom: 10 * scale }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div
								style={{
									fontSize: typography.itemTitle * scale,
									fontWeight: 600,
									color: colors.heading,
								}}
							>
								{proj.name}
							</div>
							{proj.startDate && (
								<div
									style={{
										fontSize: typography.small * scale,
										color: colors.secondary,
									}}
								>
									{proj.startDate} - {proj.current ? "Present" : proj.endDate}
								</div>
							)}
						</div>
						<p
							style={{
								fontSize: typography.body * scale,
								marginTop: 4 * scale,
							}}
						>
							{proj.description}
						</p>
						{proj.technologies && proj.technologies.length > 0 && (
							<div
								style={{
									display: "flex",
									flexWrap: "wrap",
									gap: 4 * scale,
									marginTop: 4 * scale,
								}}
							>
								{proj.technologies.map((tech, i) => (
									<span
										key={`${proj.id}-${tech}-${i}`}
										style={{
											fontSize: typography.small * scale,
											backgroundColor: `${colors.accent}20`,
											color: colors.accent,
											padding: `${2 * scale}px ${6 * scale}px`,
											borderRadius: 4 * scale,
										}}
									>
										{tech}
									</span>
								))}
							</div>
						)}
					</div>
				))}
			</div>
		);
	};

	const renderCertifications = (section: ResumeSection) => {
		const certs = section.content.data as Certification[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "Certifications"}</SectionTitle>
				{certs.map((cert) => (
					<div key={cert.id} style={{ marginBottom: 8 * scale }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<div
									style={{
										fontSize: typography.itemTitle * scale,
										fontWeight: 600,
										color: colors.heading,
									}}
								>
									{cert.name}
								</div>
								<div
									style={{
										fontSize: typography.body * scale,
										color: colors.secondary,
									}}
								>
									{cert.issuer}
								</div>
							</div>
							<div
								style={{
									fontSize: typography.small * scale,
									color: colors.secondary,
								}}
							>
								{cert.date}
							</div>
						</div>
					</div>
				))}
			</div>
		);
	};

	const renderLanguages = (section: ResumeSection) => {
		const languages = section.content.data as Language[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "Languages"}</SectionTitle>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 8 * scale }}>
					{languages.map((lang) => (
						<span
							key={lang.id}
							style={{
								fontSize: typography.small * scale,
								backgroundColor: `${colors.accent}20`,
								color: colors.accent,
								padding: `${2 * scale}px ${6 * scale}px`,
								borderRadius: 4 * scale,
							}}
						>
							{lang.name} ({lang.proficiency})
						</span>
					))}
				</div>
			</div>
		);
	};

	const renderAwards = (section: ResumeSection) => {
		const awards = section.content.data as Award[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>
					{section.content.title || "Awards & Honors"}
				</SectionTitle>
				{awards.map((award) => (
					<div key={award.id} style={{ marginBottom: 8 * scale }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<div
									style={{
										fontSize: typography.itemTitle * scale,
										fontWeight: 600,
										color: colors.heading,
									}}
								>
									{award.title}
								</div>
								<div
									style={{
										fontSize: typography.body * scale,
										color: colors.secondary,
									}}
								>
									{award.issuer}
								</div>
							</div>
							<div
								style={{
									fontSize: typography.small * scale,
									color: colors.secondary,
								}}
							>
								{award.date}
							</div>
						</div>
						{award.description && (
							<p
								style={{
									fontSize: typography.body * scale,
									marginTop: 4 * scale,
								}}
							>
								{award.description}
							</p>
						)}
					</div>
				))}
			</div>
		);
	};

	const renderVolunteer = (section: ResumeSection) => {
		const volunteers = section.content.data as Volunteer[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>
					{section.content.title || "Volunteer Experience"}
				</SectionTitle>
				{volunteers.map((vol) => (
					<div key={vol.id} style={{ marginBottom: 10 * scale }}>
						<div
							style={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "flex-start",
							}}
						>
							<div>
								<div
									style={{
										fontSize: typography.itemTitle * scale,
										fontWeight: 600,
										color: colors.heading,
									}}
								>
									{vol.role}
								</div>
								<div
									style={{
										fontSize: typography.body * scale,
										color: colors.secondary,
									}}
								>
									{vol.organization}
									{vol.location && ` • ${vol.location}`}
								</div>
							</div>
							<div
								style={{
									fontSize: typography.small * scale,
									color: colors.secondary,
								}}
							>
								{vol.startDate} - {vol.current ? "Present" : vol.endDate}
							</div>
						</div>
						{vol.description && (
							<p
								style={{
									fontSize: typography.body * scale,
									marginTop: 4 * scale,
								}}
							>
								{vol.description}
							</p>
						)}
						{vol.highlights && vol.highlights.length > 0 && (
							<ul
								style={{
									paddingLeft: 16 * scale,
									marginTop: 4 * scale,
								}}
							>
								{vol.highlights.map((h, i) => (
									<li
										key={`${vol.id}-${i}`}
										style={{
											fontSize: typography.body * scale,
											marginBottom: 2 * scale,
										}}
									>
										{h}
									</li>
								))}
							</ul>
						)}
					</div>
				))}
			</div>
		);
	};

	const renderPublications = (section: ResumeSection) => {
		const pubs = section.content.data as Publication[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "Publications"}</SectionTitle>
				{pubs.map((pub) => (
					<div key={pub.id} style={{ marginBottom: 8 * scale }}>
						<div
							style={{
								fontSize: typography.itemTitle * scale,
								fontWeight: 600,
								color: colors.heading,
							}}
						>
							{pub.title}
						</div>
						<div
							style={{
								fontSize: typography.body * scale,
								color: colors.secondary,
							}}
						>
							{pub.publisher} • {pub.date}
						</div>
						{pub.authors && pub.authors.length > 0 && (
							<div
								style={{
									fontSize: typography.small * scale,
									color: colors.secondary,
									marginTop: 2 * scale,
								}}
							>
								Authors: {pub.authors.join(", ")}
							</div>
						)}
						{pub.summary && (
							<p
								style={{
									fontSize: typography.body * scale,
									marginTop: 4 * scale,
								}}
							>
								{pub.summary}
							</p>
						)}
					</div>
				))}
			</div>
		);
	};

	const renderReferences = (section: ResumeSection) => {
		const refs = section.content.data as Reference[];
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>{section.content.title || "References"}</SectionTitle>
				{refs
					.filter((r) => !r.isHidden)
					.map((ref) => (
						<div key={ref.id} style={{ marginBottom: 8 * scale }}>
							<div
								style={{
									fontSize: typography.itemTitle * scale,
									fontWeight: 600,
									color: colors.heading,
								}}
							>
								{ref.name}
							</div>
							<div
								style={{
									fontSize: typography.body * scale,
									color: colors.secondary,
								}}
							>
								{ref.position}
								{ref.company && ` at ${ref.company}`}
							</div>
							{ref.email && (
								<div
									style={{
										fontSize: typography.small * scale,
										color: colors.text,
									}}
								>
									{ref.email}
								</div>
							)}
						</div>
					))}
			</div>
		);
	};

	const renderSection = (section: ResumeSection) => {
		switch (section.type) {
			case "personal-info":
				return null;
			case "summary":
				return renderSummary(section);
			case "experience":
				return renderExperience(section);
			case "education":
				return renderEducation(section);
			case "skills":
				return renderSkills(section);
			case "projects":
				return renderProjects(section);
			case "certifications":
				return renderCertifications(section);
			case "languages":
				return renderLanguages(section);
			case "awards":
				return renderAwards(section);
			case "volunteer":
				return renderVolunteer(section);
			case "publications":
				return renderPublications(section);
			case "references":
				return renderReferences(section);
			default:
				return null;
		}
	};

	/**
	 * The preview renders SINGLE-COLUMN, unconditionally.
	 *
	 * `settings.layout` used to accept "two-column" and "sidebar", and this
	 * component faithfully drew both -- but no Typst template ever read `layout`,
	 * so the exported PDF was single-column no matter what. A user could pick
	 * "Sidebar", watch the preview reflow into one, and export a document that
	 * looked nothing like what they approved. That is worse than not offering the
	 * option, because it destroys trust in the preview itself.
	 *
	 * Single-column is also the only correct choice here: multi-column layouts are
	 * the single largest cause of ATS parse failure (text layers scramble by
	 * coordinate), and the Typst pipeline's guaranteed single-column text layer is
	 * this product's structural advantage over every browser-rendered competitor.
	 *
	 * The `layout` field is kept in the schema so existing stored resumes that
	 * carry it still load; it is simply ignored here, which is what the exporter
	 * already did.
	 */
	const layout = "single-column";
	const isTwoColumn = false;
	const isSidebar = false;

	const mainSections = useMemo(
		() =>
			visibleSections.filter(
				(s) =>
					PRIMARY_SECTION_TYPES.has(s.type) ||
					(!SECONDARY_SECTION_TYPES.has(s.type) && !isTwoColumn),
			),
		[visibleSections],
	);
	const sideSections = useMemo(
		() => visibleSections.filter((s) => SECONDARY_SECTION_TYPES.has(s.type)),
		[visibleSections],
	);

	useLayoutEffect(() => {
		if (!paginate) return;
		const headerHeight = headerMeasureRef.current?.offsetHeight ?? 0;
		const firstPageAvailable = pageInnerHeight * scale - headerHeight;
		const laterPageAvailable = pageInnerHeight * scale;

		if (layout === "single-column") {
			const pages: string[][] = [];
			let remaining = Math.max(0, firstPageAvailable);
			let current: string[] = [];

			for (const section of visibleSections) {
				const h = singleMeasureRefs.current[section.id]?.offsetHeight ?? 0;
				if (current.length === 0) {
					remaining =
						pages.length === 0
							? Math.max(0, firstPageAvailable)
							: laterPageAvailable;
				}

				if (h <= remaining || current.length === 0) {
					current.push(section.id);
					remaining -= h;
					continue;
				}

				pages.push(current);
				current = [section.id];
				remaining = laterPageAvailable - h;
			}

			if (current.length > 0) pages.push(current);
			setPaginatedSingle((prev) =>
				sameSinglePagination(prev, pages) ? prev : pages,
			);
			setPaginatedColumns((prev) => (prev.length === 0 ? prev : []));
			return;
		}

		const pages: Array<{ main: string[]; side: string[] }> = [];
		let mainIndex = 0;
		let sideIndex = 0;

		while (mainIndex < mainSections.length || sideIndex < sideSections.length) {
			const isFirstPage = pages.length === 0;
			let remainingMain = Math.max(
				0,
				isFirstPage ? firstPageAvailable : laterPageAvailable,
			);
			let remainingSide = Math.max(
				0,
				isFirstPage ? firstPageAvailable : laterPageAvailable,
			);
			const page = { main: [] as string[], side: [] as string[] };

			while (mainIndex < mainSections.length) {
				const s = mainSections[mainIndex];
				if (!s) break;
				const h = mainMeasureRefs.current[s.id]?.offsetHeight ?? 0;
				if (h <= remainingMain || page.main.length === 0) {
					page.main.push(s.id);
					remainingMain -= h;
					mainIndex += 1;
					continue;
				}
				break;
			}

			while (sideIndex < sideSections.length) {
				const s = sideSections[sideIndex];
				if (!s) break;
				const h = sideMeasureRefs.current[s.id]?.offsetHeight ?? 0;
				if (h <= remainingSide || page.side.length === 0) {
					page.side.push(s.id);
					remainingSide -= h;
					sideIndex += 1;
					continue;
				}
				break;
			}

			pages.push(page);
		}

		setPaginatedColumns((prev) =>
			sameColumnPagination(prev, pages) ? prev : pages,
		);
		setPaginatedSingle((prev) => (prev.length === 0 ? prev : []));
	}, [
		paginate,
		mainSections,
		pageInnerHeight,
		scale,
		sideSections,
		visibleSections,
	]);

	const sectionsById = useMemo(() => {
		const map = new Map<string, ResumeSection>();
		for (const s of visibleSections) map.set(s.id, s);
		return map;
	}, [visibleSections]);

	const renderPage = (
		content: React.ReactNode,
		key: string,
		includeHeader: boolean,
	) => (
		<div key={key} style={{ marginBottom: 16 * scale }}>
			<div style={basePageStyle}>
				{includeHeader && renderPersonalInfo()}
				{content}
			</div>
		</div>
	);

	const renderSingleColumnPages = () => {
		const pages =
			paginate && paginatedSingle.length > 0
				? paginatedSingle
				: [visibleSections.map((s) => s.id)];
		return pages.map((ids, i) =>
			renderPage(
				ids.map((id) => {
					const section = sectionsById.get(id);
					if (!section) return null;
					return <div key={id}>{renderSection(section)}</div>;
				}),
				`page-${i}`,
				i === 0,
			),
		);
	};

	const renderColumnPages = () => {
		const pages =
			paginate && paginatedColumns.length > 0
				? paginatedColumns
				: [
						{
							main: mainSections.map((s) => s.id),
							side: sideSections.map((s) => s.id),
						},
					];
		const sideWidth = isTwoColumn ? 220 * scale : 240 * scale;
		const gap = 20 * scale;
		const mainStyle: React.CSSProperties = isTwoColumn
			? { flex: 1 }
			: { flex: 1 };
		const sideStyle: React.CSSProperties = isTwoColumn
			? { width: sideWidth }
			: { width: sideWidth };

		return pages.map((p, i) =>
			renderPage(
				<div style={{ display: "flex", gap }}>
					{isSidebar && (
						<div style={sideStyle}>
							{p.side.map((id) => {
								const section = sectionsById.get(id);
								if (!section) return null;
								return <div key={id}>{renderSection(section)}</div>;
							})}
						</div>
					)}
					<div style={mainStyle}>
						{p.main.map((id) => {
							const section = sectionsById.get(id);
							if (!section) return null;
							return <div key={id}>{renderSection(section)}</div>;
						})}
					</div>
					{isTwoColumn && (
						<div style={sideStyle}>
							{p.side.map((id) => {
								const section = sectionsById.get(id);
								if (!section) return null;
								return <div key={id}>{renderSection(section)}</div>;
							})}
						</div>
					)}
				</div>,
				`page-${i}`,
				i === 0,
			),
		);
	};

	return (
		<div
			className={cn("bg-white", className)}
			style={{ width: pageWidth * scale }}
		>
			{layout === "single-column" && renderSingleColumnPages()}
			{(isTwoColumn || isSidebar) && renderColumnPages()}
			{paginate && (
				<div
					aria-hidden="true"
					style={{
						position: "absolute",
						left: -100000,
						top: 0,
						visibility: "hidden",
						width: pageWidth * scale,
					}}
				>
					<div
						style={{
							...basePageStyle,
							height: "auto",
							overflow: "visible",
							boxShadow: "none",
						}}
					>
						<div ref={headerMeasureRef}>{renderPersonalInfo()}</div>
						{layout === "single-column" &&
							visibleSections.map((section) => (
								<div
									key={section.id}
									ref={(el) => {
										singleMeasureRefs.current[section.id] = el;
									}}
								>
									{renderSection(section)}
								</div>
							))}
						{(isTwoColumn || isSidebar) && (
							<div style={{ display: "flex", gap: 20 * scale }}>
								{isSidebar && (
									<div style={{ width: 240 * scale }}>
										{sideSections.map((section) => (
											<div
												key={section.id}
												ref={(el) => {
													sideMeasureRefs.current[section.id] = el;
												}}
											>
												{renderSection(section)}
											</div>
										))}
									</div>
								)}
								<div style={{ flex: 1 }}>
									{mainSections.map((section) => (
										<div
											key={section.id}
											ref={(el) => {
												mainMeasureRefs.current[section.id] = el;
											}}
										>
											{renderSection(section)}
										</div>
									))}
								</div>
								{isTwoColumn && (
									<div style={{ width: 220 * scale }}>
										{sideSections.map((section) => (
											<div
												key={section.id}
												ref={(el) => {
													sideMeasureRefs.current[section.id] = el;
												}}
											>
												{renderSection(section)}
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
