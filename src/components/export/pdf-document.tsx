'use client';

import { Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import type { Resume, ResumeSection, Experience, Education, SkillCategory, Project, Certification, Award, Language, Volunteer, Publication, Reference, FontFamily } from '@/types/resume';

// Register fonts using Google Fonts CDN URLs (TTF format required by react-pdf)
// Note: These fonts will be fetched at render time
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfAZ9hjp-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuI6fAZ9hjp-Ek-_EeA.woff', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuGKYAZ9hjp-Ek-_EeA.woff', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v18/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYAZ9hjp-Ek-_EeA.woff', fontWeight: 700 },
  ],
});

Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOmCnqEu92Fr1Me5Q.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmEU9vAw.ttf', fontWeight: 500 },
    { src: 'https://fonts.gstatic.com/s/roboto/v32/KFOlCnqEu92Fr1MmWUlvAw.ttf', fontWeight: 700 },
  ],
});

Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsg-1x4gaVc.ttf', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsgH1x4gaVc.ttf', fontWeight: 700 },
  ],
});

// Map our font families to PDF-safe families
const getFontFamily = (family: FontFamily): string => {
  const fontMap: Record<string, string> = {
    'Inter': 'Inter',
    'Roboto': 'Roboto',
    'Open Sans': 'Open Sans',
    'Lato': 'Helvetica',
    'Montserrat': 'Helvetica',
    'Playfair Display': 'Times-Roman',
    'Georgia': 'Times-Roman',
    'Times New Roman': 'Times-Roman',
    'Arial': 'Helvetica',
  };
  return fontMap[family] || 'Helvetica';
};

interface PDFDocumentProps {
  resume: Resume;
}

export function PDFDocument({ resume }: PDFDocumentProps) {
  const { metadata, sections, template } = resume;
  const { settings, personalInfo } = metadata;
  const fontFamily = getFontFamily(settings.fontFamily);
  const colors = settings.colors;
  const typography = settings.typography;

  // Create dynamic styles based on resume settings
  const styles = StyleSheet.create({
    page: {
      fontFamily,
      fontSize: typography.body,
      lineHeight: settings.lineHeight,
      color: colors.text,
      backgroundColor: colors.background,
      paddingTop: settings.margins.top,
      paddingRight: settings.margins.right,
      paddingBottom: settings.margins.bottom,
      paddingLeft: settings.margins.left,
    },
    header: {
      marginBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
      paddingBottom: 12,
    },
    name: {
      fontSize: typography.name,
      fontWeight: 700,
      color: colors.heading,
      marginBottom: 4,
    },
    title: {
      fontSize: typography.title,
      color: colors.secondary,
      marginBottom: 8,
    },
    contactRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      fontSize: typography.small,
      color: colors.text,
    },
    contactItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    section: {
      marginBottom: settings.sectionSpacing === 'compact' ? 12 : settings.sectionSpacing === 'spacious' ? 24 : 16,
    },
    sectionTitle: {
      fontSize: typography.sectionHeading,
      fontWeight: 600,
      color: colors.heading,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: settings.accentStyle === 'underline' ? 2 : 0,
      borderBottomColor: colors.accent,
    },
    itemContainer: {
      marginBottom: 10,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 2,
    },
    itemTitle: {
      fontSize: typography.itemTitle,
      fontWeight: 600,
      color: colors.heading,
    },
    itemSubtitle: {
      fontSize: typography.body,
      color: colors.secondary,
    },
    itemDate: {
      fontSize: typography.small,
      color: colors.secondary,
    },
    itemDescription: {
      fontSize: typography.body,
      marginTop: 4,
      color: colors.text,
    },
    bulletList: {
      marginTop: 4,
      paddingLeft: 12,
    },
    bulletItem: {
      fontSize: typography.body,
      marginBottom: 2,
      color: colors.text,
    },
    skillsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    skillCategory: {
      marginBottom: 8,
    },
    skillCategoryName: {
      fontSize: typography.itemTitle,
      fontWeight: 600,
      color: colors.heading,
      marginBottom: 4,
    },
    skillTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    skillTag: {
      fontSize: typography.small,
      backgroundColor: colors.accent + '20',
      color: colors.accent,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    link: {
      color: colors.accent,
      textDecoration: 'none',
    },
    summary: {
      fontSize: typography.body,
      lineHeight: settings.lineHeight * 1.2,
      color: colors.text,
    },
  });

  // Get visible sections sorted by order
  const visibleSections = sections
    .filter((s) => s.visible)
    .sort((a, b) => a.order - b.order);

  const renderPersonalInfo = () => (
    <View style={styles.header}>
      <Text style={styles.name}>{personalInfo.fullName}</Text>
      {personalInfo.professionalTitle && (
        <Text style={styles.title}>{personalInfo.professionalTitle}</Text>
      )}
      <View style={styles.contactRow}>
        {personalInfo.email && <Text style={styles.contactItem}>{personalInfo.email}</Text>}
        {personalInfo.phone && <Text style={styles.contactItem}>{personalInfo.phone}</Text>}
        {personalInfo.location && <Text style={styles.contactItem}>{personalInfo.location}</Text>}
        {personalInfo.linkedin && (
          <Link src={personalInfo.linkedin} style={styles.link}>
            LinkedIn
          </Link>
        )}
        {personalInfo.github && (
          <Link src={personalInfo.github} style={styles.link}>
            GitHub
          </Link>
        )}
        {personalInfo.website && (
          <Link src={personalInfo.website} style={styles.link}>
            Portfolio
          </Link>
        )}
      </View>
    </View>
  );

  const renderSummary = (section: ResumeSection) => {
    const html = section.content.html || (section.content.data as { summary?: string })?.summary || '';
    // Strip HTML tags for PDF (basic implementation)
    const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ');
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Professional Summary'}</Text>
        <Text style={styles.summary}>{text}</Text>
      </View>
    );
  };

  const renderExperience = (section: ResumeSection) => {
    const experiences = section.content.data as Experience[];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Work Experience'}</Text>
        {experiences.map((exp) => (
          <View key={exp.id} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemTitle}>{exp.position}</Text>
                <Text style={styles.itemSubtitle}>
                  {exp.company}
                  {exp.location && ` • ${exp.location}`}
                </Text>
              </View>
              <Text style={styles.itemDate}>
                {exp.startDate} - {exp.current ? 'Present' : exp.endDate}
              </Text>
            </View>
            {exp.description && <Text style={styles.itemDescription}>{exp.description}</Text>}
            {exp.highlights && exp.highlights.length > 0 && (
              <View style={styles.bulletList}>
                {exp.highlights.map((h, i) => (
                  <Text key={i} style={styles.bulletItem}>• {h}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderEducation = (section: ResumeSection) => {
    const education = section.content.data as Education[];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Education'}</Text>
        {education.map((edu) => (
          <View key={edu.id} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemTitle}>{edu.degree} in {edu.field}</Text>
                <Text style={styles.itemSubtitle}>
                  {edu.institution}
                  {edu.gpa && ` • GPA: ${edu.gpa}`}
                </Text>
              </View>
              <Text style={styles.itemDate}>{edu.graduationDate}</Text>
            </View>
            {edu.achievements && edu.achievements.length > 0 && (
              <View style={styles.bulletList}>
                {edu.achievements.map((a, i) => (
                  <Text key={i} style={styles.bulletItem}>• {a}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderSkills = (section: ResumeSection) => {
    const categories = section.content.data as SkillCategory[];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Skills'}</Text>
        {categories.map((cat) => (
          <View key={cat.id} style={styles.skillCategory}>
            <Text style={styles.skillCategoryName}>{cat.name}</Text>
            <View style={styles.skillTags}>
              {cat.skills.map((skill) => (
                <Text key={skill.id} style={styles.skillTag}>
                  {skill.name}
                </Text>
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderProjects = (section: ResumeSection) => {
    const projects = section.content.data as Project[];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Projects'}</Text>
        {projects.map((proj) => (
          <View key={proj.id} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{proj.name}</Text>
              {proj.startDate && (
                <Text style={styles.itemDate}>
                  {proj.startDate} - {proj.current ? 'Present' : proj.endDate}
                </Text>
              )}
            </View>
            <Text style={styles.itemDescription}>{proj.description}</Text>
            {proj.technologies && proj.technologies.length > 0 && (
              <View style={{ ...styles.skillTags, marginTop: 4 }}>
                {proj.technologies.map((tech, i) => (
                  <Text key={i} style={styles.skillTag}>{tech}</Text>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>
    );
  };

  const renderCertifications = (section: ResumeSection) => {
    const certs = section.content.data as Certification[];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Certifications'}</Text>
        {certs.map((cert) => (
          <View key={cert.id} style={styles.itemContainer}>
            <View style={styles.itemHeader}>
              <View>
                <Text style={styles.itemTitle}>{cert.name}</Text>
                <Text style={styles.itemSubtitle}>{cert.issuer}</Text>
              </View>
              <Text style={styles.itemDate}>{cert.date}</Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const renderLanguages = (section: ResumeSection) => {
    const languages = section.content.data as Language[];
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{section.content.title || 'Languages'}</Text>
        <View style={styles.skillTags}>
          {languages.map((lang) => (
            <Text key={lang.id} style={styles.skillTag}>
              {lang.name} ({lang.proficiency})
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const renderSection = (section: ResumeSection) => {
    switch (section.type) {
      case 'personal-info':
        return null; // Rendered in header
      case 'summary':
        return renderSummary(section);
      case 'experience':
        return renderExperience(section);
      case 'education':
        return renderEducation(section);
      case 'skills':
        return renderSkills(section);
      case 'projects':
        return renderProjects(section);
      case 'certifications':
        return renderCertifications(section);
      case 'languages':
        return renderLanguages(section);
      default:
        return null;
    }
  };

  return (
    <Document>
      <Page size={settings.pageSize === 'Letter' ? 'LETTER' : 'A4'} style={styles.page}>
        {renderPersonalInfo()}
        {visibleSections.map((section) => (
          <View key={section.id}>{renderSection(section)}</View>
        ))}
      </Page>
    </Document>
  );
}
