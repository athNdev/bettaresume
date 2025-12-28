'use client';

import { forwardRef, memo, useRef, useState, useEffect } from 'react';
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
  TemplateType,
  ResumeColors,
  TypographyScale
} from '@/types/resume';
import { DEFAULT_TYPOGRAPHY } from '@/types/resume';
import { format, parseISO } from 'date-fns';

interface ResumeRendererProps {
  resume: Resume;
  darkMode?: boolean;
  scale?: number;
  className?: string;
  forExport?: boolean;
}

// Typography context for consistent font sizes
interface ScaledTypography {
  name: string;
  title: string;
  sectionHeading: string;
  itemTitle: string;
  body: string;
  small: string;
}

// Helper to calculate scaled typography
const getScaledTypography = (typography: TypographyScale, fontScale: number): ScaledTypography => {
  return {
    name: `${Math.round(typography.name * fontScale)}px`,
    title: `${Math.round(typography.title * fontScale)}px`,
    sectionHeading: `${Math.round(typography.sectionHeading * fontScale)}px`,
    itemTitle: `${Math.round(typography.itemTitle * fontScale)}px`,
    body: `${Math.round(typography.body * fontScale)}px`,
    small: `${Math.round(typography.small * fontScale)}px`,
  };
};

// Page dimensions in pixels (at 96 DPI)
const PAGE_SIZES = {
  A4: { width: 794, height: 1123 }, // 210mm x 297mm
  Letter: { width: 816, height: 1056 }, // 8.5in x 11in
};

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

// Template-specific styles - user colors always take priority
const getTemplateStyles = (template: TemplateType, darkMode: boolean, userColors?: ResumeColors) => {
  const baseColors = {
    minimal: { primary: '#1a1a1a', accent: '#666666', divider: '#e5e5e5', text: '#333333', muted: '#666666' },
    modern: { primary: '#2563eb', accent: '#3b82f6', divider: '#dbeafe', text: '#1f2937', muted: '#6b7280' },
    classic: { primary: '#1e3a5f', accent: '#2d5a87', divider: '#d1d5db', text: '#374151', muted: '#6b7280' },
    professional: { primary: '#0f172a', accent: '#334155', divider: '#e2e8f0', text: '#1e293b', muted: '#64748b' },
    creative: { primary: '#7c3aed', accent: '#a78bfa', divider: '#ede9fe', text: '#1f2937', muted: '#6b7280' },
    executive: { primary: '#14532d', accent: '#166534', divider: '#dcfce7', text: '#1f2937', muted: '#6b7280' },
    tech: { primary: '#0891b2', accent: '#06b6d4', divider: '#cffafe', text: '#1f2937', muted: '#6b7280' },
  };

  const templateDefaults = baseColors[template] || baseColors.minimal;
  
  // Dark mode fallback colors (only used if no user colors set)
  const darkDefaults = {
    primary: '#60a5fa',
    accent: '#3b82f6',
    divider: '#374151',
    text: '#e5e7eb',
    muted: '#9ca3af',
    bg: '#1f2937',
    cardBg: '#111827',
  };

  // Check if userColors has any actual values
  const hasUserColors = userColors && Object.values(userColors).some(v => v && v !== '');
  
  // Build final colors - user colors take priority when set
  const defaults = darkMode ? darkDefaults : templateDefaults;
  
  return {
    primary: (hasUserColors && userColors?.primary) || defaults.primary,
    accent: (hasUserColors && userColors?.accent) || defaults.accent,
    divider: (hasUserColors && userColors?.divider) || defaults.divider,
    text: (hasUserColors && userColors?.text) || defaults.text,
    muted: defaults.muted,
    bg: (hasUserColors && userColors?.background) || (darkMode ? darkDefaults.bg : '#ffffff'),
    cardBg: darkMode ? darkDefaults.cardBg : '#f9fafb',
  };
};

// Template Layout Components
const MinimalTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string; typography: ScaledTypography }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat, typography }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

    // Contact items with separator
    const contactItems = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.website].filter(Boolean);

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, padding: '40px 48px', minHeight: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <header style={{ marginBottom: '24px', borderBottom: `1px solid ${colors.divider}`, paddingBottom: '16px' }}>
          <h1 style={{ fontSize: typography.name, fontWeight: '700', color: colors.primary, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: typography.title, color: colors.muted, marginTop: '4px', lineHeight: 1.4 }}>{pi.professionalTitle}</p>
          )}
          {/* Use inline spans with separators instead of flex gap */}
          <div style={{ marginTop: '12px', fontSize: typography.small, color: colors.muted, lineHeight: 1.6 }}>
            {contactItems.map((item, idx) => (
              <span key={idx}>
                {item}
                {idx < contactItems.length - 1 && <span style={{ margin: '0 8px' }}>•</span>}
              </span>
            ))}
          </div>
        </header>

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.id} style={{ marginBottom: '20px' }}>
            <h2 style={{ 
              fontSize: typography.sectionHeading, 
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
            <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="minimal" typography={typography} />
          </section>
        ))}
      </div>
    );
  }
);
MinimalTemplate.displayName = 'MinimalTemplate';

const ModernTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string; typography: ScaledTypography }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat, typography }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100%', boxSizing: 'border-box' }}>
        {/* Header with accent bar */}
        <header style={{ 
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          color: '#ffffff',
          padding: '32px 48px'
        }}>
          <h1 style={{ fontSize: typography.name, fontWeight: '700', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: typography.title, opacity: 0.9, marginTop: '4px', lineHeight: 1.4 }}>{pi.professionalTitle}</p>
          )}
          {/* Contact info using margin spacing instead of gap */}
          <div style={{ marginTop: '16px', fontSize: typography.small, opacity: 0.85, lineHeight: 1.8 }}>
            {pi.email && <span style={{ marginRight: '20px' }}>✉ {pi.email}</span>}
            {pi.phone && <span style={{ marginRight: '20px' }}>☎ {pi.phone}</span>}
            {pi.location && <span>📍 {pi.location}</span>}
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ marginTop: '8px', fontSize: typography.small, opacity: 0.8, lineHeight: 1.6 }}>
              {pi.linkedin && <span style={{ marginRight: '20px' }}>{pi.linkedin}</span>}
              {pi.github && <span style={{ marginRight: '20px' }}>{pi.github}</span>}
              {pi.website && <span>{pi.website}</span>}
            </div>
          )}
        </header>

        {/* Content */}
        <div style={{ padding: '32px 48px' }}>
          {sections.map((section) => (
            <section key={section.id} style={{ marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: typography.sectionHeading, 
                fontWeight: '700', 
                color: colors.primary,
                marginBottom: '14px',
                lineHeight: 1.4
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: '4px', 
                  height: '16px', 
                  backgroundColor: colors.accent,
                  borderRadius: '2px',
                  marginRight: '12px',
                  verticalAlign: 'middle'
                }}></span>
                {section.content.title || SECTION_LABELS[section.type]}
              </h2>
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="modern" typography={typography} />
            </section>
          ))}
        </div>
      </div>
    );
  }
);
ModernTemplate.displayName = 'ModernTemplate';

const ClassicTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string; typography: ScaledTypography }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat, typography }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, padding: '48px 56px', minHeight: '100%' }}>
        {/* Header - Classic centered */}
        <header style={{ textAlign: 'center', marginBottom: '28px', paddingBottom: '20px', borderBottom: `2px solid ${colors.primary}` }}>
          <h1 style={{ fontSize: typography.name, fontWeight: '700', color: colors.primary, margin: 0, fontVariant: 'small-caps', letterSpacing: '2px' }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: typography.title, color: colors.muted, marginTop: '6px', fontStyle: 'italic' }}>{pi.professionalTitle}</p>
          )}
          <div style={{ marginTop: '12px', fontSize: typography.small, color: colors.muted }}>
            {[pi.email, pi.phone, pi.location].filter(Boolean).join('  |  ')}
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ marginTop: '4px', fontSize: typography.small, color: colors.muted }}>
              {[pi.linkedin, pi.github, pi.website].filter(Boolean).join('  |  ')}
            </div>
          )}
        </header>

        {/* Sections */}
        {sections.map((section) => (
          <section key={section.id} style={{ marginBottom: '22px' }}>
            <h2 style={{ 
              fontSize: typography.sectionHeading, 
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
            <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="classic" typography={typography} />
          </section>
        ))}
      </div>
    );
  }
);
ClassicTemplate.displayName = 'ClassicTemplate';

const ProfessionalTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string; typography: ScaledTypography }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat, typography }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

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
            <h1 style={{ fontSize: typography.name, fontWeight: '700', margin: 0, lineHeight: 1.2 }}>
              {pi.fullName || 'Your Name'}
            </h1>
            {pi.professionalTitle && (
              <p style={{ fontSize: typography.small, opacity: 0.85, marginTop: '6px' }}>{pi.professionalTitle}</p>
            )}
          </div>
          
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: typography.small, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '10px' }}>Contact</h3>
            <div style={{ fontSize: typography.body, lineHeight: 1.8 }}>
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
              <h3 style={{ fontSize: typography.small, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, marginBottom: '10px' }}>
                {section.content.title || SECTION_LABELS[section.type]}
              </h3>
              <SectionContent section={section} colors={{ ...colors, text: '#ffffff', muted: 'rgba(255,255,255,0.7)' }} dateFormat={dateFormat} template="professional" compact typography={typography} />
            </div>
          ))}
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: '32px 40px' }}>
          {mainSections.map((section) => (
            <section key={section.id} style={{ marginBottom: '24px' }}>
              <h2 style={{ 
                fontSize: typography.sectionHeading, 
                fontWeight: '700', 
                color: colors.primary,
                borderBottom: `2px solid ${colors.accent}`,
                paddingBottom: '6px',
                marginBottom: '14px'
              }}>
                {section.content.title || SECTION_LABELS[section.type]}
              </h2>
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="professional" typography={typography} />
            </section>
          ))}
        </main>
      </div>
    );
  }
);
ProfessionalTemplate.displayName = 'ProfessionalTemplate';

const TechTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string; typography: ScaledTypography }>(
  ({ resume, darkMode, colors, dateFormat, typography }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

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
              <h1 style={{ fontSize: typography.name, fontWeight: '700', color: colors.primary, margin: 0 }}>
                {pi.fullName || 'Your Name'}
              </h1>
              {pi.professionalTitle && (
                <p style={{ fontSize: typography.title, color: colors.muted, marginTop: '4px' }}>{pi.professionalTitle}</p>
              )}
            </div>
            <div style={{ textAlign: 'right', fontSize: typography.small, color: colors.muted, lineHeight: 1.7 }}>
              {pi.email && <div>{pi.email}</div>}
              {pi.phone && <div>{pi.phone}</div>}
              {pi.location && <div>{pi.location}</div>}
            </div>
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ marginTop: '12px', fontSize: typography.small }}>
              {pi.github && (
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 12px',
                  lineHeight: '18px',
                  backgroundColor: darkMode ? '#374151' : '#f1f5f9',
                  borderRadius: '4px',
                  color: colors.primary,
                  marginRight: '12px',
                }}>
                  {pi.github}
                </span>
              )}
              {pi.linkedin && (
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 12px',
                  lineHeight: '18px',
                  backgroundColor: darkMode ? '#374151' : '#f1f5f9',
                  borderRadius: '4px',
                  color: colors.primary,
                  marginRight: '12px',
                }}>
                  {pi.linkedin}
                </span>
              )}
              {pi.website && (
                <span style={{ 
                  display: 'inline-block',
                  padding: '4px 12px',
                  lineHeight: '18px',
                  backgroundColor: darkMode ? '#374151' : '#f1f5f9',
                  borderRadius: '4px',
                  color: colors.primary,
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
                fontSize: typography.sectionHeading, 
                fontWeight: '700', 
                color: colors.primary,
                marginBottom: '14px',
                lineHeight: 1.4
              }}>
                <span style={{ 
                  display: 'inline-block',
                  width: '8px',
                  height: '8px',
                  backgroundColor: colors.accent,
                  borderRadius: '50%',
                  marginRight: '8px',
                  verticalAlign: 'middle'
                }}></span>
                {section.content.title || SECTION_LABELS[section.type]}
              </h2>
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template="tech" typography={typography} />
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
  typography?: ScaledTypography;
}



function SectionContent({ section, colors, dateFormat, template: _template, compact, typography }: SectionContentProps) {
  const data = section.content.data;
  // Use typography values if provided, otherwise fall back to default sizes
  const itemTitleSize = typography?.itemTitle || (compact ? '11px' : '13px');
  const bodySize = typography?.body || (compact ? '9px' : '11px');
  const smallSize = typography?.small || (compact ? '8px' : '10px');

  switch (section.type) {
    case 'experience':
      return (
        <div>
          {(Array.isArray(data) ? data as Experience[] : []).map((exp, idx, arr) => (
            <div key={exp.id} style={{ marginBottom: idx < arr.length - 1 ? '16px' : 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <div>
                  <h3 style={{ fontSize: itemTitleSize, fontWeight: '600', margin: 0, color: colors.text, lineHeight: 1.3 }}>{exp.position}</h3>
                  <p style={{ fontSize: smallSize, color: colors.muted, margin: '2px 0 0 0', lineHeight: 1.4 }}>
                    {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: smallSize, color: colors.muted, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                  {formatDate(exp.startDate, dateFormat)} – {exp.current ? 'Present' : formatDate(exp.endDate || '', dateFormat)}
                </span>
              </div>
              {exp.description && (
                <p style={{ fontSize: bodySize, color: colors.text, margin: '8px 0 0 0', lineHeight: 1.6 }}>{exp.description}</p>
              )}
              {exp.highlights && exp.highlights.length > 0 && (
                <ul style={{ margin: '8px 0 0 16px', padding: 0, fontSize: bodySize, color: colors.text, lineHeight: 1.6 }}>
                  {exp.highlights.map((h, i) => <li key={i} style={{ marginBottom: '3px' }}>{h}</li>)}
                </ul>
              )}
              {exp.technologies && exp.technologies.length > 0 && (
                <p style={{ fontSize: smallSize, color: colors.muted, margin: '6px 0 0 0', fontStyle: 'italic' }}>
                  {exp.technologies.join(' • ')}
                </p>
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
                  <h3 style={{ fontSize: itemTitleSize, fontWeight: '600', margin: 0, color: colors.text }}>
                    {edu.degree}{edu.field ? ` in ${edu.field}` : ''}
                  </h3>
                  <p style={{ fontSize: smallSize, color: colors.muted, margin: '2px 0 0 0' }}>{edu.institution}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: smallSize, color: colors.muted }}>
                    {formatDate(edu.startDate, dateFormat)} – {edu.current ? 'Present' : formatDate(edu.endDate || '', dateFormat)}
                  </span>
                  {edu.gpa && <div style={{ fontSize: smallSize, color: colors.muted }}>GPA: {edu.gpa}</div>}
                </div>
              </div>
              {edu.achievements && edu.achievements.length > 0 && (
                <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: bodySize, color: colors.text, lineHeight: 1.5 }}>
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
          <div style={{ fontSize: bodySize, lineHeight: 1.7 }}>
            {(Array.isArray(data) ? data as SkillCategory[] : []).map((cat) => (
              <div key={cat.id} style={{ marginBottom: '8px' }}>
                <div style={{ fontWeight: '600', marginBottom: '3px' }}>{cat.name}</div>
                <div style={{ opacity: 0.85 }}>{cat.skills.map(s => s.name).join(', ')}</div>
              </div>
            ))}
          </div>
        );
      }
      // Use table-like layout for skills (better html2canvas support than grid with gap)
      return (
        <div style={{ display: 'table', width: '100%', borderSpacing: '0 12px', marginTop: '-12px' }}>
          {(Array.isArray(data) ? data as SkillCategory[] : []).reduce<SkillCategory[][]>((rows, cat, idx, arr) => {
            if (idx % 2 === 0) rows.push(arr.slice(idx, idx + 2));
            return rows;
          }, []).map((row, rowIdx) => (
            <div key={rowIdx} style={{ display: 'table-row' }}>
              {row.map((cat) => (
                <div key={cat.id} style={{ display: 'table-cell', width: '50%', paddingRight: '24px', verticalAlign: 'top' }}>
                  <h4 style={{ fontSize: bodySize, fontWeight: '600', color: colors.text, marginBottom: '4px' }}>{cat.name}</h4>
                  <p style={{ fontSize: bodySize, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
                    {cat.skills.map(s => s.name).join(', ')}
                  </p>
                </div>
              ))}
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
                <h3 style={{ fontSize: itemTitleSize, fontWeight: '600', margin: 0, color: colors.text, lineHeight: 1.3 }}>{proj.name}</h3>
                {proj.url && (
                  <span style={{ fontSize: smallSize, color: colors.muted, lineHeight: 1.3 }}>{proj.url}</span>
                )}
              </div>
              {proj.description && (
                <p style={{ fontSize: bodySize, color: colors.text, margin: '4px 0 0 0', lineHeight: 1.5 }}>{proj.description}</p>
              )}
              {proj.technologies && proj.technologies.length > 0 && (
                <p style={{ fontSize: smallSize, color: colors.muted, margin: '4px 0 0 0', fontStyle: 'italic' }}>
                  {proj.technologies.join(' • ')}
                </p>
              )}
            </div>
          ))}
        </div>
      );

    case 'certifications':
      if (compact) {
        return (
          <div style={{ fontSize: bodySize, lineHeight: 1.8 }}>
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
            <div key={cert.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: bodySize }}>
              <div>
                <span style={{ fontWeight: '600', color: colors.text }}>{cert.name}</span>
                <span style={{ color: colors.muted }}> – {cert.issuer}</span>
              </div>
              <span style={{ color: colors.muted, fontSize: smallSize }}>{formatDate(cert.issueDate, dateFormat)}</span>
            </div>
          ))}
        </div>
      );

    case 'awards':
      if (compact) {
        return (
          <div style={{ fontSize: bodySize, lineHeight: 1.8 }}>
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
            <div key={award.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: bodySize }}>
              <div>
                <span style={{ fontWeight: '600', color: colors.text }}>{award.title}</span>
                {award.issuer && <span style={{ color: colors.muted }}> – {award.issuer}</span>}
              </div>
              <span style={{ color: colors.muted, fontSize: smallSize }}>{formatDate(award.date, dateFormat)}</span>
            </div>
          ))}
        </div>
      );

    case 'languages':
      if (compact) {
        return (
          <div style={{ fontSize: bodySize, lineHeight: 1.8 }}>
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
        <div style={{ fontSize: bodySize }}>
          {(Array.isArray(data) ? data as Language[] : []).map((lang, idx, arr) => (
            <span key={lang.id}>
              <span style={{ fontWeight: '600', color: colors.text }}>{lang.name}</span>
              <span style={{ color: colors.muted }}> ({lang.proficiency})</span>
              {idx < arr.length - 1 && <span style={{ color: colors.muted }}> • </span>}
            </span>
          ))}
        </div>
      );

    case 'publications':
      return (
        <div>
          {(Array.isArray(data) ? data as Publication[] : []).map((pub) => (
            <div key={pub.id} style={{ marginBottom: '8px', fontSize: bodySize }}>
              <span style={{ fontWeight: '600', color: colors.text }}>{pub.title}</span>
              {pub.publisher && <span style={{ color: colors.muted }}>, {pub.publisher}</span>}
              <span style={{ color: colors.muted, fontSize: smallSize }}> ({formatDate(pub.date, dateFormat)})</span>
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
                  <h3 style={{ fontSize: itemTitleSize, fontWeight: '600', margin: 0, color: colors.text }}>{vol.role}</h3>
                  <p style={{ fontSize: smallSize, color: colors.muted, margin: '2px 0 0 0' }}>{vol.organization}</p>
                </div>
                <span style={{ fontSize: smallSize, color: colors.muted }}>
                  {formatDate(vol.startDate, dateFormat)} – {vol.current ? 'Present' : formatDate(vol.endDate || '', dateFormat)}
                </span>
              </div>
              {vol.description && (
                <p style={{ fontSize: bodySize, color: colors.text, margin: '6px 0 0 0', lineHeight: 1.5 }}>{vol.description}</p>
              )}
            </div>
          ))}
        </div>
      );

    case 'references':
      const refs = Array.isArray(data) ? data as Reference[] : [];
      if (refs.length === 0) {
        return <p style={{ fontSize: bodySize, color: colors.muted, fontStyle: 'italic' }}>Available upon request</p>;
      }
      // Use table layout for references (better html2canvas support)
      return (
        <div style={{ display: 'table', width: '100%', borderSpacing: '16px 0', marginLeft: '-16px' }}>
          <div style={{ display: 'table-row' }}>
            {refs.slice(0, 2).map((ref) => (
              <div key={ref.id} style={{ display: 'table-cell', width: '50%', fontSize: bodySize, verticalAlign: 'top' }}>
                <div style={{ fontWeight: '600', color: colors.text }}>{ref.name}</div>
                {ref.title && <div style={{ color: colors.muted, fontSize: smallSize }}>{ref.title}</div>}
                {ref.company && <div style={{ color: colors.muted, fontSize: smallSize }}>{ref.company}</div>}
                {ref.email && <div style={{ color: colors.muted, marginTop: '4px', fontSize: smallSize }}>{ref.email}</div>}
              </div>
            ))}
          </div>
          {refs.length > 2 && (
            <div style={{ display: 'table-row' }}>
              {refs.slice(2, 4).map((ref) => (
                <div key={ref.id} style={{ display: 'table-cell', width: '50%', fontSize: bodySize, verticalAlign: 'top', paddingTop: '16px' }}>
                  <div style={{ fontWeight: '600', color: colors.text }}>{ref.name}</div>
                  {ref.title && <div style={{ color: colors.muted, fontSize: smallSize }}>{ref.title}</div>}
                  {ref.company && <div style={{ color: colors.muted, fontSize: smallSize }}>{ref.company}</div>}
                  {ref.email && <div style={{ color: colors.muted, marginTop: '4px', fontSize: smallSize }}>{ref.email}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      );

    case 'summary':
    case 'custom':
      if (section.content.html) {
        return (
          <div 
            style={{ fontSize: bodySize, color: colors.text, lineHeight: 1.7 }}
            dangerouslySetInnerHTML={{ __html: section.content.html }} 
          />
        );
      }
      return null;

    default:
      return null;
  }
}

// Simple Resume Renderer - renders content in fixed A4 pages with automatic overflow
const ResumeRendererInner = forwardRef<HTMLDivElement, ResumeRendererProps>(
  ({ resume, darkMode = false, className = '', forExport = false }, ref) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [numPages, setNumPages] = useState(1);
    
    // Get page dimensions
    const pageSize = PAGE_SIZES[resume.metadata?.settings?.pageSize || 'A4'];
    const margins = resume.metadata?.settings?.margins || { top: 40, right: 48, bottom: 40, left: 48 };
    
    // Get user colors from settings
    const userColors = resume.metadata?.settings?.colors;
    const colors = getTemplateStyles(resume.template, forExport ? false : darkMode, userColors);
    const dateFormat = resume.metadata?.settings?.dateFormat || 'MMM YYYY';
    
    // Map font family names to CSS font stacks
    const getFontStack = (fontFamily: string) => {
      const fontStacks: Record<string, string> = {
        'Inter': 'var(--font-inter), Inter, system-ui, sans-serif',
        'Roboto': 'var(--font-roboto), Roboto, system-ui, sans-serif',
        'Open Sans': 'var(--font-open-sans), "Open Sans", system-ui, sans-serif',
        'Lato': 'var(--font-lato), Lato, system-ui, sans-serif',
        'Montserrat': 'var(--font-montserrat), Montserrat, system-ui, sans-serif',
        'Playfair Display': 'var(--font-playfair), "Playfair Display", Georgia, serif',
        'Georgia': 'Georgia, "Times New Roman", serif',
        'Times New Roman': '"Times New Roman", Times, serif',
        'Arial': 'Arial, Helvetica, sans-serif',
      };
      return fontStacks[fontFamily] || fontStacks['Inter'];
    };
    
    const fontStack = getFontStack(resume.metadata?.settings?.fontFamily || 'Inter');
    const fontSize = resume.metadata?.settings?.fontSize || 11;
    const lineHeight = resume.metadata?.settings?.lineHeight || 1.5;
    
    // Get typography settings with scaling
    const typography = resume.metadata?.settings?.typography || DEFAULT_TYPOGRAPHY;
    const fontScale = resume.metadata?.settings?.fontScale ?? 1.0;
    const scaledTypography = getScaledTypography(typography, fontScale);
    
    // Get visible sections sorted by order
    const visibleSections = resume.sections
      .filter(s => s.visible && s.type !== 'personal-info')
      .sort((a, b) => a.order - b.order);
    
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };
    const contactItems = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.website].filter(Boolean);

    // Measure content and calculate pages after render
    useEffect(() => {
      const measure = () => {
        if (contentRef.current) {
          const contentHeight = contentRef.current.scrollHeight;
          const pagesNeeded = Math.max(1, Math.ceil(contentHeight / pageSize.height));
          if (pagesNeeded !== numPages) {
            setNumPages(pagesNeeded);
          }
        }
      };
      
      // Measure after a short delay to ensure fonts are loaded
      const timeoutId = setTimeout(measure, 50);
      
      // Also measure on resize
      window.addEventListener('resize', measure);
      
      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('resize', measure);
      };
    }, [resume, pageSize.height, numPages, scaledTypography]);

    // Render header
    const renderHeader = () => (
      <header style={{ 
        padding: `${margins.top}px ${margins.right}px 20px ${margins.left}px`,
        borderBottom: `1px solid ${colors.divider}`,
      }}>
        <h1 style={{ fontSize: scaledTypography.name, fontWeight: '700', color: colors.primary, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
          {pi.fullName || 'Your Name'}
        </h1>
        {pi.professionalTitle && (
          <p style={{ fontSize: scaledTypography.title, color: colors.muted, marginTop: '4px', lineHeight: 1.4 }}>{pi.professionalTitle}</p>
        )}
        <div style={{ marginTop: '12px', fontSize: scaledTypography.small, color: colors.muted, lineHeight: 1.6 }}>
          {contactItems.map((item, idx) => (
            <span key={idx}>
              {item}
              {idx < contactItems.length - 1 && <span style={{ margin: '0 8px' }}>•</span>}
            </span>
          ))}
        </div>
      </header>
    );

    // Continuation header for pages 2+
    const renderContinuationHeader = () => (
      <div style={{ 
        padding: `20px ${margins.right}px 16px ${margins.left}px`,
        borderBottom: `1px solid ${colors.divider}`,
        backgroundColor: colors.bg,
      }}>
        <span style={{ fontSize: scaledTypography.small, color: colors.muted }}>
          {pi.fullName || 'Your Name'} — <em>continued</em>
        </span>
      </div>
    );

    // Render full content
    const renderContent = () => (
      <div style={{ backgroundColor: colors.bg, color: colors.text }}>
        {renderHeader()}
        <div style={{ padding: `20px ${margins.right}px ${margins.bottom}px ${margins.left}px` }}>
          {visibleSections.map((section) => (
            <section key={section.id} style={{ marginBottom: '20px' }}>
              <h2 style={{ 
                fontSize: scaledTypography.sectionHeading, 
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
              <SectionContent section={section} colors={colors} dateFormat={dateFormat} template={resume.template} typography={scaledTypography} />
            </section>
          ))}
        </div>
      </div>
    );

    // Height of continuation header overlay
    const continuationHeaderHeight = 56;

    return (
      <div 
        ref={ref}
        className={className}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        {/* Hidden measurement container */}
        <div
          ref={contentRef}
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 0,
            width: `${pageSize.width}px`,
            fontFamily: fontStack,
            fontSize: `${fontSize}px`,
            lineHeight,
            visibility: 'hidden',
          }}
          aria-hidden="true"
        >
          {renderContent()}
        </div>

        {/* Render pages */}
        {Array.from({ length: numPages }, (_, pageIndex) => (
          <div
            key={pageIndex}
            style={{
              width: `${pageSize.width}px`,
              height: `${pageSize.height}px`,
              backgroundColor: colors.bg,
              position: 'relative',
              overflow: 'hidden',
              boxSizing: 'border-box',
              fontFamily: fontStack,
              fontSize: `${fontSize}px`,
              lineHeight,
              flexShrink: 0,
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            }}
            className="resume-page"
          >
            {/* Content container that shifts up for each page */}
            <div
              style={{
                position: 'absolute',
                top: `-${pageIndex * pageSize.height}px`,
                left: 0,
                width: '100%',
              }}
            >
              {renderContent()}
            </div>
            
            {/* Continuation header overlay for pages 2+ */}
            {pageIndex > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: `${continuationHeaderHeight}px`,
                  backgroundColor: colors.bg,
                  zIndex: 1,
                }}
              >
                {renderContinuationHeader()}
              </div>
            )}
            
            {/* Page number */}
            {numPages > 1 && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  right: '24px',
                  fontSize: '10px',
                  color: colors.muted,
                  backgroundColor: colors.bg,
                  padding: '2px 6px',
                  zIndex: 2,
                }}
              >
                Page {pageIndex + 1} of {numPages}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);
ResumeRendererInner.displayName = 'ResumeRendererInner';

// Export memoized version for performance
export const ResumeRenderer = memo(ResumeRendererInner);

export default ResumeRenderer;