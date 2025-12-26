'use client';

import { forwardRef } from 'react';
import type { 
  Resume, 
  Experience, 
  Education, 
  SkillCategory, 
  Project, 
  Certification, 
  Award, 
  Language, 
  Publication, 
  Volunteer, 
  Reference,
  SectionType,
  TemplateType
} from '@/types/resume';
import { format, parseISO } from 'date-fns';

interface ResumeRendererProps {
  resume: Resume;
  darkMode?: boolean;
  scale?: number;
  className?: string;
  forExport?: boolean;
}

const SECTION_LABELS: Record<SectionType, string> = {
  'personal-info': 'Personal Info',
  'summary': 'Professional Summary',
  'experience': 'Work Experience',
  'education': 'Education',
  'skills': 'Skills',
  'projects': 'Projects',
  'certifications': 'Certifications',
  'awards': 'Awards & Honors',
  'languages': 'Languages',
  'publications': 'Publications',
  'volunteer': 'Volunteer Experience',
  'references': 'References',
  'custom': 'Additional Information',
};

const formatDate = (dateStr: string, dateFormat: string = 'MMM yyyy') => {
  if (!dateStr) return '';
  try {
    const formatMap: Record<string, string> = {
      'MM/YYYY': 'MM/yyyy',
      'MMM YYYY': 'MMM yyyy',
      'MMMM YYYY': 'MMMM yyyy',
      'YYYY': 'yyyy',
    };
    return format(parseISO(dateStr), formatMap[dateFormat] || 'MMM yyyy');
  } catch {
    return dateStr;
  }
};

// Template-specific styles
const getTemplateStyles = (template: TemplateType, darkMode: boolean) => {
  const baseColors = {
    minimal: { primary: '#1a1a1a', accent: '#666666', divider: '#e5e5e5', text: '#333333', muted: '#666666' },
    modern: { primary: '#2563eb', accent: '#3b82f6', divider: '#dbeafe', text: '#1f2937', muted: '#6b7280' },
    classic: { primary: '#1e3a5f', accent: '#2d5a87', divider: '#d1d5db', text: '#374151', muted: '#6b7280' },
    professional: { primary: '#0f172a', accent: '#334155', divider: '#e2e8f0', text: '#1e293b', muted: '#64748b' },
    creative: { primary: '#7c3aed', accent: '#a78bfa', divider: '#ede9fe', text: '#1f2937', muted: '#6b7280' },
    executive: { primary: '#14532d', accent: '#166534', divider: '#dcfce7', text: '#1f2937', muted: '#6b7280' },
    tech: { primary: '#0891b2', accent: '#06b6d4', divider: '#cffafe', text: '#1f2937', muted: '#6b7280' },
  };

  const colors = baseColors[template] || baseColors.minimal;
  
  if (darkMode) {
    return {
      primary: '#60a5fa',
      accent: '#3b82f6',
      divider: '#374151',
      text: '#e5e7eb',
      muted: '#9ca3af',
      bg: '#1f2937',
      cardBg: '#111827',
    };
  }

  return { ...colors, bg: '#ffffff', cardBg: '#f9fafb' };
};

// Template Layout Components
const MinimalTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata.personalInfo;

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, padding: '40px 48px', minHeight: '100%' }}>
        {/* Header */}
        <header style={{ marginBottom: '24px', borderBottom: `1px solid ${colors.divider}`, paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.primary, margin: 0, letterSpacing: '-0.5px' }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: '14px', color: colors.muted, marginTop: '4px' }}>{pi.professionalTitle}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginTop: '12px', fontSize: '12px', color: colors.muted }}>
            {pi.email && <span>{pi.email}</span>}
            {pi.phone && <span>{pi.phone}</span>}
            {pi.location && <span>{pi.location}</span>}
            {pi.linkedin && <span>{pi.linkedin}</span>}
            {pi.github && <span>{pi.github}</span>}
            {pi.website && <span>{pi.website}</span>}
          </div>
        </header>

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.id} style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: '11px', 
              fontWeight: '700', 
              color: colors.primary, 
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              borderBottom: `1px solid ${colors.divider}`,
              paddingBottom: '6px',
              marginBottom: '12px'
            }}>
              {section.content.title || SECTION_LABELS[section.type]}
            </h2>
            <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="minimal" />
          </section>
        ))}
      </div>
    );
  }
);
MinimalTemplate.displayName = 'MinimalTemplate';

const ModernTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata.personalInfo;

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100%' }}>
        {/* Header with accent bar */}
        <header style={{ 
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          color: '#ffffff',
          padding: '32px 48px'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px' }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: '16px', opacity: 0.9, marginTop: '4px' }}>{pi.professionalTitle}</p>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '16px', fontSize: '13px', opacity: 0.85 }}>
            {pi.email && <span>✉ {pi.email}</span>}
            {pi.phone && <span>☎ {pi.phone}</span>}
            {pi.location && <span>📍 {pi.location}</span>}
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', marginTop: '8px', fontSize: '12px', opacity: 0.8 }}>
              {pi.linkedin && <span>{pi.linkedin}</span>}
              {pi.github && <span>{pi.github}</span>}
              {pi.website && <span>{pi.website}</span>}
            </div>
          )}
        </header>

        {/* Content */}
        <div style={{ padding: '32px 48px' }}>
          {sections.map((section) => (
            <section key={section.id} style={{ marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: colors.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '14px'
              }}>
                <span style={{ 
                  width: '4px', 
                  height: '20px', 
                  backgroundColor: colors.accent,
                  borderRadius: '2px'
                }}></span>
                {section.content.title || SECTION_LABELS[section.type]}
              </h2>
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="modern" />
            </section>
          ))}
        </div>
      </div>
    );
  }
);
ModernTemplate.displayName = 'ModernTemplate';

const ClassicTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata.personalInfo;

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, padding: '48px 56px', minHeight: '100%' }}>
        {/* Header - Classic centered */}
        <header style={{ textAlign: 'center', marginBottom: '28px', paddingBottom: '20px', borderBottom: `2px solid ${colors.primary}` }}>
          <h1 style={{ fontSize: '26px', fontWeight: '700', color: colors.primary, margin: 0, fontVariant: 'small-caps', letterSpacing: '2px' }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: '14px', color: colors.muted, marginTop: '6px', fontStyle: 'italic' }}>{pi.professionalTitle}</p>
          )}
          <div style={{ marginTop: '12px', fontSize: '12px', color: colors.muted }}>
            {[pi.email, pi.phone, pi.location].filter(Boolean).join('  |  ')}
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ marginTop: '4px', fontSize: '11px', color: colors.muted }}>
              {[pi.linkedin, pi.github, pi.website].filter(Boolean).join('  |  ')}
            </div>
          )}
        </header>

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.id} style={{ marginBottom: '22px' }}>
            <h2 style={{ 
              fontSize: '13px', 
              fontWeight: '700', 
              color: colors.primary,
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '3px',
              marginBottom: '12px',
              position: 'relative'
            }}>
              <span style={{ 
                backgroundColor: colors.bg, 
                padding: '0 16px', 
                position: 'relative',
                zIndex: 1
              }}>
                {section.content.title || SECTION_LABELS[section.type]}
              </span>
              <span style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                height: '1px',
                backgroundColor: colors.divider,
                zIndex: 0
              }}></span>
            </h2>
            <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="classic" />
          </section>
        ))}
      </div>
    );
  }
);
ClassicTemplate.displayName = 'ClassicTemplate';

const ProfessionalTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata.personalInfo;

    // Split sections into main and sidebar
    const sidebarTypes: SectionType[] = ['skills', 'languages', 'certifications', 'awards'];
    const mainSections = sections.filter(s => !sidebarTypes.includes(s.type));
    const sidebarSections = sections.filter(s => sidebarTypes.includes(s.type));

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100%', display: 'flex' }}>
        {/* Sidebar */}
        <aside style={{ 
          width: '220px', 
          backgroundColor: colors.primary,
          color: '#ffffff',
          padding: '32px 24px',
          flexShrink: 0
        }}>
          <div style={{ marginBottom: '28px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
              {pi.fullName || 'Your Name'}
            </h1>
            {pi.professionalTitle && (
              <p style={{ fontSize: '12px', opacity: 0.85, marginTop: '6px' }}>{pi.professionalTitle}</p>
            )}
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '10px' }}>Contact</h3>
            <div style={{ fontSize: '11px', lineHeight: 1.8 }}>
              {pi.email && <div>{pi.email}</div>}
              {pi.phone && <div>{pi.phone}</div>}
              {pi.location && <div>{pi.location}</div>}
              {pi.linkedin && <div style={{ wordBreak: 'break-all' }}>{pi.linkedin}</div>}
              {pi.github && <div style={{ wordBreak: 'break-all' }}>{pi.github}</div>}
              {pi.website && <div style={{ wordBreak: 'break-all' }}>{pi.website}</div>}
            </div>
          </div>

          {sidebarSections.map((section) => (
            <div key={section.id} style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '10px' }}>
                {section.content.title || SECTION_LABELS[section.type]}
              </h3>
              <SectionContent section={section} colors={{ ...colors, text: '#ffffff', muted: 'rgba(255,255,255,0.7)' }} dateFormat={dateFormat} template="professional" compact />
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '32px 40px' }}>
          {mainSections.map((section) => (
            <section key={section.id} style={{ marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: '14px', 
                fontWeight: '700', 
                color: colors.primary,
                borderBottom: `2px solid ${colors.accent}`,
                paddingBottom: '6px',
                marginBottom: '14px'
              }}>
                {section.content.title || SECTION_LABELS[section.type]}
              </h2>
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="professional" />
            </section>
          ))}
        </main>
      </div>
    );
  }
);
ProfessionalTemplate.displayName = 'ProfessionalTemplate';

const TechTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string }>(
  ({ resume, darkMode, colors, dateFormat }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata.personalInfo;

    return (
      <div ref={ref} style={{ backgroundColor: darkMode ? '#0f172a' : '#f8fafc', color: colors.text, minHeight: '100%' }}>
        {/* Header */}
        <header style={{ 
          padding: '28px 48px',
          backgroundColor: darkMode ? '#1e293b' : '#ffffff',
          borderBottom: `3px solid ${colors.primary}`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.primary, margin: 0 }}>
                {pi.fullName || 'Your Name'}
              </h1>
              {pi.professionalTitle && (
                <p style={{ fontSize: '14px', color: colors.muted, marginTop: '4px' }}>{pi.professionalTitle}</p>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: colors.muted, lineHeight: 1.7 }}>
              {pi.email && <div>{pi.email}</div>}
              {pi.phone && <div>{pi.phone}</div>}
              {pi.location && <div>{pi.location}</div>}
            </div>
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ display: 'flex', gap: '24px', marginTop: '12px', fontSize: '12px' }}>
              {pi.github && (
                <span style={{ 
                  padding: '4px 12px', 
                  backgroundColor: darkMode ? '#374151' : '#f1f5f9',
                  borderRadius: '4px',
                  color: colors.primary
                }}>
                  {pi.github}
                </span>
              )}
              {pi.linkedin && (
                <span style={{ 
                  padding: '4px 12px', 
                  backgroundColor: darkMode ? '#374151' : '#f1f5f9',
                  borderRadius: '4px',
                  color: colors.primary
                }}>
                  {pi.linkedin}
                </span>
              )}
              {pi.website && (
                <span style={{ 
                  padding: '4px 12px', 
                  backgroundColor: darkMode ? '#374151' : '#f1f5f9',
                  borderRadius: '4px',
                  color: colors.primary
                }}>
                  {pi.website}
                </span>
              )}
            </div>
          )}
        </header>

        {/* Content */}
        <div style={{ padding: '28px 48px' }}>
          {sections.map((section) => (
            <section key={section.id} style={{ 
              marginBottom: '24px',
              padding: '20px 24px',
              backgroundColor: darkMode ? '#1e293b' : '#ffffff',
              borderRadius: '8px',
              boxShadow: darkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)'
            }}>
              <h2 style={{ 
                fontSize: '13px', 
                fontWeight: '700', 
                color: colors.primary,
                marginBottom: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  backgroundColor: colors.accent,
                  borderRadius: '50%'
                }}></span>
                {section.content.title || SECTION_LABELS[section.type]}
              </h2>
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="tech" />
            </section>
          ))}
        </div>
      </div>
    );
  }
);
TechTemplate.displayName = 'TechTemplate';

// Section Content Renderer
interface SectionContentProps {
  section: Resume['sections'][0];
  colors: ReturnType<typeof getTemplateStyles>;
  dateFormat: string;
  template: TemplateType;
  compact?: boolean;
}

function SectionContent({ section, colors, dateFormat, template: _template, compact }: SectionContentProps) {
  const data = section.content.data;
  const smallFontSize = compact ? '9px' : '11px';

  switch (section.type) {
    case 'experience':
      return (
        <div>
          {(Array.isArray(data) ? data as Experience[] : []).map((exp, idx, arr) => (
            <div key={exp.id} style={{ marginBottom: idx < arr.length - 1 ? '16px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: colors.text }}>{exp.position}</h3>
                  <p style={{ fontSize: smallFontSize, color: colors.muted, margin: '2px 0 0 0' }}>
                    {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: smallFontSize, color: colors.muted, whiteSpace: 'nowrap' }}>
                  {formatDate(exp.startDate, dateFormat)} – {exp.current ? 'Present' : formatDate(exp.endDate || '', dateFormat)}
                </span>
              </div>
              {exp.description && (
                <p style={{ fontSize: smallFontSize, color: colors.text, margin: '8px 0 0 0', lineHeight: 1.6 }}>{exp.description}</p>
              )}
              {exp.highlights && exp.highlights.length > 0 && (
                <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: smallFontSize, color: colors.text, lineHeight: 1.6 }}>
                  {exp.highlights.map((h, i) => <li key={i} style={{ marginBottom: '3px' }}>{h}</li>)}
                </ul>
              )}
              {exp.technologies && exp.technologies.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {exp.technologies.map((tech, i) => (
                    <span key={i} style={{ 
                      fontSize: '10px', 
                      padding: '2px 8px', 
                      backgroundColor: colors.divider,
                      borderRadius: '3px',
                      color: colors.muted
                    }}>{tech}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case 'education':
      return (
        <div>
          {(Array.isArray(data) ? data as Education[] : []).map((edu, idx, arr) => (
            <div key={edu.id} style={{ marginBottom: idx < arr.length - 1 ? '14px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: colors.text }}>
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </h3>
                  <p style={{ fontSize: smallFontSize, color: colors.muted, margin: '2px 0 0 0' }}>{edu.institution}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: smallFontSize, color: colors.muted }}>
                    {formatDate(edu.startDate, dateFormat)} – {edu.current ? 'Present' : formatDate(edu.endDate || '', dateFormat)}
                  </span>
                  {edu.gpa && <div style={{ fontSize: '10px', color: colors.muted }}>GPA: {edu.gpa}</div>}
                </div>
              </div>
              {edu.achievements && edu.achievements.length > 0 && (
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: smallFontSize, color: colors.text, lineHeight: 1.5 }}>
                  {edu.achievements.map((a, i) => <li key={i} style={{ marginBottom: '2px' }}>{a}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      );

    case 'skills':
      if (compact) {
        return (
          <div style={{ fontSize: smallFontSize, lineHeight: 1.7 }}>
            {(Array.isArray(data) ? data as SkillCategory[] : []).map((cat) => (
              <div key={cat.id} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: '600', marginBottom: '3px' }}>{cat.name}</div>
                <div style={{ opacity: 0.85 }}>{cat.skills.map(s => s.name).join(', ')}</div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px 24px' }}>
          {(Array.isArray(data) ? data as SkillCategory[] : []).map((cat) => (
            <div key={cat.id}>
              <h4 style={{ fontSize: smallFontSize, fontWeight: '600', color: colors.text, marginBottom: '4px' }}>{cat.name}</h4>
              <p style={{ fontSize: smallFontSize, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
                {cat.skills.map(s => s.name).join(', ')}
              </p>
            </div>
          ))}
        </div>
      );

    case 'projects':
      return (
        <div>
          {(Array.isArray(data) ? data as Project[] : []).map((proj, idx, arr) => (
            <div key={proj.id} style={{ marginBottom: idx < arr.length - 1 ? '14px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: colors.text }}>{proj.name}</h3>
                {proj.url && (
                  <span style={{ fontSize: '10px', color: colors.muted }}>{proj.url}</span>
                )}
              </div>
              {proj.description && (
                <p style={{ fontSize: smallFontSize, color: colors.text, margin: '4px 0 0 0', lineHeight: 1.5 }}>{proj.description}</p>
              )}
              {proj.technologies && proj.technologies.length > 0 && (
                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {proj.technologies.map((tech, i) => (
                    <span key={i} style={{ 
                      fontSize: '10px', 
                      padding: '2px 8px', 
                      backgroundColor: colors.divider,
                      borderRadius: '3px',
                      color: colors.muted
                    }}>{tech}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      );

    case 'certifications':
      if (compact) {
        return (
          <div style={{ fontSize: smallFontSize, lineHeight: 1.8 }}>
            {(Array.isArray(data) ? data as Certification[] : []).map((cert) => (
              <div key={cert.id}>
                <div style={{ fontWeight: '500' }}>{cert.name}</div>
                <div style={{ opacity: 0.7 }}>{cert.issuer}</div>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div>
          {(Array.isArray(data) ? data as Certification[] : []).map((cert) => (
            <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: smallFontSize }}>
              <div>
                <span style={{ fontWeight: '600', color: colors.text }}>{cert.name}</span>
                <span style={{ color: colors.muted }}> – {cert.issuer}</span>
              </div>
              <span style={{ color: colors.muted }}>{formatDate(cert.issueDate, dateFormat)}</span>
            </div>
          ))}
        </div>
      );

    case 'awards':
      if (compact) {
        return (
          <div style={{ fontSize: smallFontSize, lineHeight: 1.8 }}>
            {(Array.isArray(data) ? data as Award[] : []).map((award) => (
              <div key={award.id}>
                <div style={{ fontWeight: '500' }}>{award.title}</div>
                {award.issuer && <div style={{ opacity: 0.7 }}>{award.issuer}</div>}
              </div>
            ))}
          </div>
        );
      }
      return (
        <div>
          {(Array.isArray(data) ? data as Award[] : []).map((award) => (
            <div key={award.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: smallFontSize }}>
              <div>
                <span style={{ fontWeight: '600', color: colors.text }}>{award.title}</span>
                {award.issuer && <span style={{ color: colors.muted }}> – {award.issuer}</span>}
              </div>
              <span style={{ color: colors.muted }}>{formatDate(award.date, dateFormat)}</span>
            </div>
          ))}
        </div>
      );

    case 'languages':
      if (compact) {
        return (
          <div style={{ fontSize: smallFontSize, lineHeight: 1.8 }}>
            {(Array.isArray(data) ? data as Language[] : []).map((lang) => (
              <div key={lang.id}>
                <span style={{ fontWeight: '500' }}>{lang.name}</span>
                <span style={{ opacity: 0.7 }}> ({lang.proficiency})</span>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: smallFontSize }}>
          {(Array.isArray(data) ? data as Language[] : []).map((lang) => (
            <span key={lang.id}>
              <span style={{ fontWeight: '600', color: colors.text }}>{lang.name}</span>
              <span style={{ color: colors.muted }}> ({lang.proficiency})</span>
            </span>
          ))}
        </div>
      );

    case 'publications':
      return (
        <div>
          {(Array.isArray(data) ? data as Publication[] : []).map((pub) => (
            <div key={pub.id} style={{ marginBottom: '8px', fontSize: smallFontSize }}>
              <span style={{ fontWeight: '600', color: colors.text }}>{pub.title}</span>
              {pub.publisher && <span style={{ color: colors.muted }}>, {pub.publisher}</span>}
              <span style={{ color: colors.muted }}> ({formatDate(pub.date, dateFormat)})</span>
            </div>
          ))}
        </div>
      );

    case 'volunteer':
      return (
        <div>
          {(Array.isArray(data) ? data as Volunteer[] : []).map((vol, idx, arr) => (
            <div key={vol.id} style={{ marginBottom: idx < arr.length - 1 ? '14px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2px' }}>
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: colors.text }}>{vol.role}</h3>
                  <p style={{ fontSize: smallFontSize, color: colors.muted, margin: '2px 0 0 0' }}>{vol.organization}</p>
                </div>
                <span style={{ fontSize: smallFontSize, color: colors.muted }}>
                  {formatDate(vol.startDate, dateFormat)} – {vol.current ? 'Present' : formatDate(vol.endDate || '', dateFormat)}
                </span>
              </div>
              {vol.description && (
                <p style={{ fontSize: smallFontSize, color: colors.text, margin: '6px 0 0 0', lineHeight: 1.5 }}>{vol.description}</p>
              )}
            </div>
          ))}
        </div>
      );

    case 'references':
      const refs = Array.isArray(data) ? data as Reference[] : [];
      if (refs.length === 0) {
        return <p style={{ fontSize: smallFontSize, color: colors.muted, fontStyle: 'italic' }}>Available upon request</p>;
      }
      return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
          {refs.map((ref) => (
            <div key={ref.id} style={{ fontSize: smallFontSize }}>
              <div style={{ fontWeight: '600', color: colors.text }}>{ref.name}</div>
              {ref.title && <div style={{ color: colors.muted }}>{ref.title}</div>}
              {ref.company && <div style={{ color: colors.muted }}>{ref.company}</div>}
              {ref.email && <div style={{ color: colors.muted, marginTop: '4px' }}>{ref.email}</div>}
            </div>
          ))}
        </div>
      );

    case 'summary':
    case 'custom':
      if (section.content.html) {
        return (
          <div 
            style={{ fontSize: smallFontSize, color: colors.text, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: section.content.html }} 
          />
        );
      }
      return null;

    default:
      return null;
  }
}

// Main Resume Renderer Component
export const ResumeRenderer = forwardRef<HTMLDivElement, ResumeRendererProps>(
  ({ resume, darkMode = false, scale = 100, className = '', forExport = false }, ref) => {
    const colors = getTemplateStyles(resume.template, forExport ? false : darkMode);
    const dateFormat = resume.metadata.settings?.dateFormat || 'MMM YYYY';
    
    const templateProps = { resume, darkMode: forExport ? false : darkMode, colors, dateFormat };

    const renderTemplate = () => {
      switch (resume.template) {
        case 'modern':
          return <ModernTemplate ref={ref} {...templateProps} />;
        case 'classic':
          return <ClassicTemplate ref={ref} {...templateProps} />;
        case 'professional':
          return <ProfessionalTemplate ref={ref} {...templateProps} />;
        case 'tech':
          return <TechTemplate ref={ref} {...templateProps} />;
        case 'creative':
        case 'executive':
        case 'minimal':
        default:
          return <MinimalTemplate ref={ref} {...templateProps} />;
      }
    };

    return (
      <div 
        className={className}
        style={{
          transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
          transformOrigin: 'top center',
          width: forExport ? '794px' : '100%',
          minHeight: forExport ? '1123px' : 'auto',
          fontFamily: resume.metadata.settings?.fontFamily || 'Inter, system-ui, sans-serif',
          fontSize: `${resume.metadata.settings?.fontSize || 11}px`,
          lineHeight: resume.metadata.settings?.lineHeight || 1.5,
        }}
      >
        {renderTemplate()}
      </div>
    );
  }
);
ResumeRenderer.displayName = 'ResumeRenderer';

export default ResumeRenderer;
