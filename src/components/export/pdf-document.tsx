'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import type {
  Resume,
  Experience,
  Education,
  SkillCategory,
  Project,
  Certification,
  Award,
  Language,
  Volunteer,
  Publication,
  Reference,
} from '@/types/resume';

// Create styles using built-in Helvetica font
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    lineHeight: 1.4,
    color: '#333',
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    fontSize: 9,
    color: '#555',
  },
  contactItem: {
    marginRight: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitleColored: {
    color: '#6366f1',
  },
  entryContainer: {
    marginBottom: 10,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  entryTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
  },
  entrySubtitle: {
    fontSize: 10,
    color: '#555',
  },
  entryDate: {
    fontSize: 9,
    color: '#666',
  },
  entryDescription: {
    fontSize: 9,
    color: '#444',
    marginTop: 4,
  },
  bulletList: {
    marginTop: 4,
    paddingLeft: 12,
  },
  bulletItem: {
    fontSize: 9,
    marginBottom: 2,
    color: '#444',
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  skillCategory: {
    marginBottom: 6,
  },
  skillCategoryName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  skillsList: {
    fontSize: 9,
    color: '#555',
  },
  techList: {
    fontSize: 9,
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },
  twoColumn: {
    flexDirection: 'row',
    gap: 20,
  },
  column: {
    flex: 1,
  },
  summaryText: {
    fontSize: 10,
    color: '#444',
    lineHeight: 1.5,
  },
  link: {
    color: '#6366f1',
    textDecoration: 'none',
  },
  languageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  languageName: {
    fontSize: 10,
  },
  languageLevel: {
    fontSize: 9,
    color: '#666',
    textTransform: 'capitalize',
  },
});

interface PDFDocumentProps {
  resume: Resume;
}

// Helper to strip HTML tags
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

// Helper to format date
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function PDFDocument({ resume }: PDFDocumentProps) {
  const { metadata, sections } = resume;
  const { personalInfo, settings } = metadata;
  const primaryColor = settings?.colors?.primary || '#6366f1';

  // Find sections by type
  const getSection = (type: string) => sections.find((s) => s.type === type && s.visible);

  const summarySection = getSection('summary');
  const experienceSection = getSection('experience');
  const educationSection = getSection('education');
  const skillsSection = getSection('skills');
  const projectsSection = getSection('projects');
  const certificationsSection = getSection('certifications');
  const awardsSection = getSection('awards');
  const languagesSection = getSection('languages');
  const volunteerSection = getSection('volunteer');
  const publicationsSection = getSection('publications');
  const referencesSection = getSection('references');

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.name, { color: primaryColor }]}>
            {personalInfo.fullName}
          </Text>
          {personalInfo.professionalTitle && (
            <Text style={styles.title}>{personalInfo.professionalTitle}</Text>
          )}
          <View style={styles.contactRow}>
            {personalInfo.email && <Text style={styles.contactItem}>{personalInfo.email}</Text>}
            {personalInfo.phone && <Text style={styles.contactItem}>{personalInfo.phone}</Text>}
            {personalInfo.location && <Text style={styles.contactItem}>{personalInfo.location}</Text>}
            {personalInfo.linkedin && <Text style={styles.contactItem}>{personalInfo.linkedin}</Text>}
            {personalInfo.github && <Text style={styles.contactItem}>{personalInfo.github}</Text>}
            {personalInfo.website && <Text style={styles.contactItem}>{personalInfo.website}</Text>}
          </View>
        </View>

        {/* Summary */}
        {summarySection && summarySection.content.html && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {summarySection.content.title || 'About Me'}
            </Text>
            <Text style={styles.summaryText}>
              {stripHtml(summarySection.content.html)}
            </Text>
          </View>
        )}

        {/* Experience */}
        {experienceSection && (experienceSection.content.data as Experience[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {experienceSection.content.title || 'Experience'}
            </Text>
            {(experienceSection.content.data as Experience[]).map((exp) => (
              <View key={exp.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{exp.position}</Text>
                    <Text style={styles.entrySubtitle}>
                      {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.entryDate}>
                    {formatDate(exp.startDate)} - {exp.current ? 'Present' : formatDate(exp.endDate || '')}
                  </Text>
                </View>
                {exp.description && (
                  <Text style={styles.entryDescription}>{stripHtml(exp.description)}</Text>
                )}
                {exp.highlights && exp.highlights.length > 0 && (
                  <View style={styles.bulletList}>
                    {exp.highlights.map((h, i) => (
                      <Text key={i} style={styles.bulletItem}>• {h}</Text>
                    ))}
                  </View>
                )}
                {exp.technologies && exp.technologies.length > 0 && (
                  <Text style={styles.techList}>{exp.technologies.join(' • ')}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Education */}
        {educationSection && (educationSection.content.data as Education[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {educationSection.content.title || 'Education'}
            </Text>
            {(educationSection.content.data as Education[]).map((edu) => (
              <View key={edu.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{edu.degree} in {edu.field}</Text>
                    <Text style={styles.entrySubtitle}>
                      {edu.institution}{edu.location ? ` • ${edu.location}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.entryDate}>
                    {formatDate(edu.startDate)} - {edu.current ? 'Present' : formatDate(edu.endDate || '')}
                  </Text>
                </View>
                {edu.gpa && (
                  <Text style={styles.entryDescription}>GPA: {edu.gpa}{edu.maxGpa ? `/${edu.maxGpa}` : ''}</Text>
                )}
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
        )}

        {/* Skills */}
        {skillsSection && (skillsSection.content.data as SkillCategory[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {skillsSection.content.title || 'Skills'}
            </Text>
            {(skillsSection.content.data as SkillCategory[]).map((cat) => (
              <View key={cat.id} style={styles.skillCategory}>
                <Text style={styles.skillCategoryName}>{cat.name}</Text>
                <Text style={styles.skillsList}>
                  {cat.skills.map((s) => s.name).join(' • ')}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {projectsSection && (projectsSection.content.data as Project[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {projectsSection.content.title || 'Projects'}
            </Text>
            {(projectsSection.content.data as Project[]).map((proj) => (
              <View key={proj.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryTitle}>{proj.name}</Text>
                  {(proj.startDate || proj.endDate) && (
                    <Text style={styles.entryDate}>
                      {proj.startDate ? formatDate(proj.startDate) : ''}{proj.endDate ? ` - ${formatDate(proj.endDate)}` : ''}
                    </Text>
                  )}
                </View>
                {proj.description && (
                  <Text style={styles.entryDescription}>{stripHtml(proj.description)}</Text>
                )}
                {proj.technologies && proj.technologies.length > 0 && (
                  <Text style={styles.techList}>{proj.technologies.join(' • ')}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Certifications */}
        {certificationsSection && (certificationsSection.content.data as Certification[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {certificationsSection.content.title || 'Certifications'}
            </Text>
            {(certificationsSection.content.data as Certification[]).map((cert) => (
              <View key={cert.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{cert.name}</Text>
                    <Text style={styles.entrySubtitle}>{cert.issuer}</Text>
                  </View>
                  <Text style={styles.entryDate}>{formatDate(cert.issueDate)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Awards */}
        {awardsSection && (awardsSection.content.data as Award[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {awardsSection.content.title || 'Awards & Recognition'}
            </Text>
            {(awardsSection.content.data as Award[]).map((award) => (
              <View key={award.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{award.title}</Text>
                    <Text style={styles.entrySubtitle}>{award.issuer}</Text>
                  </View>
                  <Text style={styles.entryDate}>{formatDate(award.date)}</Text>
                </View>
                {award.description && (
                  <Text style={styles.entryDescription}>{award.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Languages */}
        {languagesSection && (languagesSection.content.data as Language[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {languagesSection.content.title || 'Languages'}
            </Text>
            {(languagesSection.content.data as Language[]).map((lang) => (
              <View key={lang.id} style={styles.languageRow}>
                <Text style={styles.languageName}>{lang.name}</Text>
                <Text style={styles.languageLevel}>{lang.proficiency}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Volunteer */}
        {volunteerSection && (volunteerSection.content.data as Volunteer[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {volunteerSection.content.title || 'Volunteer Experience'}
            </Text>
            {(volunteerSection.content.data as Volunteer[]).map((vol) => (
              <View key={vol.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{vol.role}</Text>
                    <Text style={styles.entrySubtitle}>{vol.organization}</Text>
                  </View>
                  <Text style={styles.entryDate}>
                    {formatDate(vol.startDate)} - {vol.current ? 'Present' : formatDate(vol.endDate || '')}
                  </Text>
                </View>
                {vol.description && (
                  <Text style={styles.entryDescription}>{stripHtml(vol.description)}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Publications */}
        {publicationsSection && (publicationsSection.content.data as Publication[])?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {publicationsSection.content.title || 'Publications'}
            </Text>
            {(publicationsSection.content.data as Publication[]).map((pub) => (
              <View key={pub.id} style={styles.entryContainer}>
                <View style={styles.entryHeader}>
                  <View>
                    <Text style={styles.entryTitle}>{pub.title}</Text>
                    <Text style={styles.entrySubtitle}>
                      {pub.publisher}{pub.authors?.length ? ` • ${pub.authors.join(', ')}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.entryDate}>{formatDate(pub.date)}</Text>
                </View>
                {pub.description && (
                  <Text style={styles.entryDescription}>{pub.description}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* References */}
        {referencesSection && (referencesSection.content.data as Reference[])?.filter(r => !r.isHidden).length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: primaryColor }]}>
              {referencesSection.content.title || 'References'}
            </Text>
            {(referencesSection.content.data as Reference[]).filter(r => !r.isHidden).map((ref) => (
              <View key={ref.id} style={styles.entryContainer}>
                <Text style={styles.entryTitle}>{ref.name}</Text>
                <Text style={styles.entrySubtitle}>{ref.title} at {ref.company}</Text>
                <Text style={styles.entryDescription}>
                  {ref.email}{ref.phone ? ` • ${ref.phone}` : ''}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
