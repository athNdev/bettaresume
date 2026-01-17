"use client";

import { useMemo } from "react";
import type {
	Certification,
	Education,
	Experience,
	Language,
	PersonalInfo,
	Project,
	Resume,
	ResumeSection,
	ResumeSettings,
	SkillCategory,
} from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";

interface PreviewProps {
	resume: Resume;
	scale?: number;
	className?: string;
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

export function Preview({ resume, scale = 1, className }: PreviewProps) {
	const { metadata, sections, template } = resume;
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

	const containerStyle: React.CSSProperties = {
		width: pageWidth * scale,
		minHeight: pageHeight * scale,
		backgroundColor: colors.background,
		color: colors.text,
		fontFamily: settings.fontFamily,
		fontSize: typography.body * scale,
		lineHeight: settings.lineHeight,
		padding: `${settings.margins.top * scale}px ${settings.margins.right * scale}px ${settings.margins.bottom * scale}px ${settings.margins.left * scale}px`,
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

	const renderSummary = (section: ResumeSection) => {
		const html =
			section.content.html ||
			(section.content.data as { summary?: string })?.summary ||
			"";
		return (
			<div style={{ marginBottom: sectionSpacingPx * scale }}>
				<SectionTitle>
					{section.content.title || "Professional Summary"}
				</SectionTitle>
				<div
					dangerouslySetInnerHTML={{ __html: html }}
					style={{
						fontSize: typography.body * scale,
						lineHeight: settings.lineHeight * 1.2,
					}}
				/>
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
										key={i}
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
										key={i}
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
			default:
				return null;
		}
	};

	return (
		<div className={cn("bg-white", className)} style={containerStyle}>
			{renderPersonalInfo()}
			{visibleSections.map((section) => (
				<div key={section.id}>{renderSection(section)}</div>
			))}
		</div>
	);
}
