'use client';

import { forwardRef, memo, useRef, useState, useEffect, useCallback } from 'react';
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
  ResumeSection
} from '@/types/resume';
import { format, parseISO } from 'date-fns';

interface ResumeRendererProps {
  resume: Resume;
  darkMode?: boolean;
  scale?: number;
  className?: string;
  forExport?: boolean;
}

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
const MinimalTemplate = forwardRef<HTMLDivElement, { resume: Resume; darkMode: boolean; colors: ReturnType<typeof getTemplateStyles>; dateFormat: string }>(
  ({ resume, darkMode: _darkMode, colors, dateFormat }, ref) => {
    const sections = resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order);
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

    // Contact items with separator
    const contactItems = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.website].filter(Boolean);

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, padding: '40px 48px', minHeight: '100%', boxSizing: 'border-box' }}>
        {/* Header */}
        <header style={{ marginBottom: '24px', borderBottom: `1px solid ${colors.divider}`, paddingBottom: '16px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.primary, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: '14px', color: colors.muted, marginTop: '4px', lineHeight: 1.4 }}>{pi.professionalTitle}</p>
          )}
          {/* Use inline spans with separators instead of flex gap */}
          <div style={{ marginTop: '12px', fontSize: '12px', color: colors.muted, lineHeight: 1.6 }}>
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
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

    return (
      <div ref={ref} style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100%', boxSizing: 'border-box' }}>
        {/* Header with accent bar */}
        <header style={{ 
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
          color: '#ffffff',
          padding: '32px 48px'
        }}>
          <h1 style={{ fontSize: '32px', fontWeight: '700', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {pi.fullName || 'Your Name'}
          </h1>
          {pi.professionalTitle && (
            <p style={{ fontSize: '16px', opacity: 0.9, marginTop: '4px', lineHeight: 1.4 }}>{pi.professionalTitle}</p>
          )}
          {/* Contact info using margin spacing instead of gap */}
          <div style={{ marginTop: '16px', fontSize: '13px', opacity: 0.85, lineHeight: 1.8 }}>
            {pi.email && <span style={{ marginRight: '20px' }}>✉ {pi.email}</span>}
            {pi.phone && <span style={{ marginRight: '20px' }}>☎ {pi.phone}</span>}
            {pi.location && <span>📍 {pi.location}</span>}
          </div>
          {(pi.linkedin || pi.github || pi.website) && (
            <div style={{ marginTop: '8px', fontSize: '12px', opacity: 0.8, lineHeight: 1.6 }}>
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
                fontSize: '14px', 
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
    const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };

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
            <div style={{ marginTop: '12px', fontSize: '12px' }}>
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
                fontSize: '13px', 
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
                  <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: colors.text, lineHeight: 1.3 }}>{exp.position}</h3>
                  <p style={{ fontSize: smallFontSize, color: colors.muted, margin: '2px 0 0 0', lineHeight: 1.4 }}>
                    {exp.company}{exp.location ? ` • ${exp.location}` : ''}
                  </p>
                </div>
                <span style={{ fontSize: smallFontSize, color: colors.muted, whiteSpace: 'nowrap', lineHeight: 1.3 }}>
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
                <p style={{ fontSize: smallFontSize, color: colors.muted, margin: '6px 0 0 0', fontStyle: 'italic' }}>
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
                  <h4 style={{ fontSize: smallFontSize, fontWeight: '600', color: colors.text, marginBottom: '4px' }}>{cat.name}</h4>
                  <p style={{ fontSize: smallFontSize, color: colors.muted, margin: 0, lineHeight: 1.5 }}>
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
                <h3 style={{ fontSize: '13px', fontWeight: '600', margin: 0, color: colors.text, lineHeight: 1.3 }}>{proj.name}</h3>
                {proj.url && (
                  <span style={{ fontSize: '10px', color: colors.muted, lineHeight: 1.3 }}>{proj.url}</span>
                )}
              </div>
              {proj.description && (
                <p style={{ fontSize: smallFontSize, color: colors.text, margin: '4px 0 0 0', lineHeight: 1.5 }}>{proj.description}</p>
              )}
              {proj.technologies && proj.technologies.length > 0 && (
                <p style={{ fontSize: smallFontSize, color: colors.muted, margin: '4px 0 0 0', fontStyle: 'italic' }}>
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
        <div style={{ fontSize: smallFontSize }}>
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
      // Use table layout for references (better html2canvas support)
      return (
        <div style={{ display: 'table', width: '100%', borderSpacing: '16px 0', marginLeft: '-16px' }}>
          <div style={{ display: 'table-row' }}>
            {refs.slice(0, 2).map((ref) => (
              <div key={ref.id} style={{ display: 'table-cell', width: '50%', fontSize: smallFontSize, verticalAlign: 'top' }}>
                <div style={{ fontWeight: '600', color: colors.text }}>{ref.name}</div>
                {ref.title && <div style={{ color: colors.muted }}>{ref.title}</div>}
                {ref.company && <div style={{ color: colors.muted }}>{ref.company}</div>}
                {ref.email && <div style={{ color: colors.muted, marginTop: '4px' }}>{ref.email}</div>}
              </div>
            ))}
          </div>
          {refs.length > 2 && (
            <div style={{ display: 'table-row' }}>
              {refs.slice(2, 4).map((ref) => (
                <div key={ref.id} style={{ display: 'table-cell', width: '50%', fontSize: smallFontSize, verticalAlign: 'top', paddingTop: '16px' }}>
                  <div style={{ fontWeight: '600', color: colors.text }}>{ref.name}</div>
                  {ref.title && <div style={{ color: colors.muted }}>{ref.title}</div>}
                  {ref.company && <div style={{ color: colors.muted }}>{ref.company}</div>}
                  {ref.email && <div style={{ color: colors.muted, marginTop: '4px' }}>{ref.email}</div>}
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

// Page component for multi-page rendering
interface PageProps {
  pageNumber: number;
  totalPages: number;
  pageSize: { width: number; height: number };
  colors: ReturnType<typeof getTemplateStyles>;
  children: React.ReactNode;
  fontStack: string;
  fontSize: number;
  lineHeight: number;
}

function Page({ pageNumber, totalPages, pageSize, colors, children, fontStack, fontSize, lineHeight }: PageProps) {
  return (
    <div
      style={{
        width: `${pageSize.width}px`,
        minHeight: `${pageSize.height}px`,
        height: `${pageSize.height}px`,
        backgroundColor: colors.bg,
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
        fontFamily: fontStack,
        fontSize: `${fontSize}px`,
        lineHeight,
        pageBreakAfter: 'always',
        breakAfter: 'page',
      }}
      className="resume-page"
    >
      {children}
      {/* Page number indicator */}
      {totalPages > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '24px',
            fontSize: '10px',
            color: colors.muted,
          }}
        >
          Page {pageNumber} of {totalPages}
        </div>
      )}
    </div>
  );
}

// Multi-page Resume Renderer with automatic pagination
const ResumeRendererInner = forwardRef<HTMLDivElement, ResumeRendererProps>(
  ({ resume, darkMode = false, scale = 100, className = '', forExport = false }, ref) => {
    const measureRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<ResumeSection[][]>([]);
    const [measured, setMeasured] = useState(false);
    
    // Get page dimensions
    const pageSize = PAGE_SIZES[resume.metadata?.settings?.pageSize || 'A4'];
    const margins = resume.metadata?.settings?.margins || { top: 20, right: 20, bottom: 20, left: 20 };
    const contentHeight = pageSize.height - margins.top - margins.bottom - 40; // Extra padding for page number
    
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
    
    // Measure sections and distribute across pages
    const measureAndPaginate = useCallback(() => {
      if (!measureRef.current) return;
      
      const sectionElements = measureRef.current.querySelectorAll('[data-section-id]');
      const headerElement = measureRef.current.querySelector('[data-header]');
      
      let currentPage: ResumeSection[] = [];
      let currentHeight = headerElement ? headerElement.getBoundingClientRect().height : 0;
      const pageGroups: ResumeSection[][] = [];
      const visibleSections = resume.sections.filter(s => s.visible).sort((a, b) => a.order - b.order);
      
      sectionElements.forEach((el, index) => {
        const sectionHeight = el.getBoundingClientRect().height;
        const section = visibleSections[index];
        
        if (!section) return;
        
        // Check if adding this section would exceed page height
        if (currentHeight + sectionHeight > contentHeight && currentPage.length > 0) {
          // Start new page
          pageGroups.push(currentPage);
          currentPage = [section];
          currentHeight = sectionHeight;
        } else {
          currentPage.push(section);
          currentHeight += sectionHeight;
        }
      });
      
      // Add the last page
      if (currentPage.length > 0 || pageGroups.length === 0) {
        pageGroups.push(currentPage.length > 0 ? currentPage : visibleSections);
      }
      
      setPages(pageGroups);
      setMeasured(true);
    }, [resume.sections, contentHeight]);
    
    // Measure on mount and when sections change
    useEffect(() => {
      // Small delay to ensure DOM is rendered
      const timer = setTimeout(measureAndPaginate, 100);
      return () => clearTimeout(timer);
    }, [measureAndPaginate, resume.sections, resume.metadata?.settings]);
    
    // Remeasure when window resizes (for responsive behavior)
    useEffect(() => {
      const handleResize = () => {
        setMeasured(false);
        setTimeout(measureAndPaginate, 100);
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [measureAndPaginate]);

    const templateProps = { resume, darkMode: forExport ? false : darkMode, colors, dateFormat };

    // Render single template (for measurement and single-page mode)
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
    
    // Render paginated content for each page
    const renderPageContent = (pageSections: ResumeSection[], pageNum: number) => {
      const isFirstPage = pageNum === 0;
      const pi = resume.metadata?.personalInfo || { fullName: '', email: '' };
      
      // Render header only on first page (or a compact version on subsequent pages)
      const renderHeader = () => {
        if (!isFirstPage) {
          // Compact header for continuation pages
          return (
            <div style={{ 
              padding: '16px 48px',
              borderBottom: `1px solid ${colors.divider}`,
              marginBottom: '16px',
            }}>
              <span style={{ fontSize: '12px', color: colors.muted }}>
                {pi.fullName} - Continued
              </span>
            </div>
          );
        }
        
        // Full header based on template
        const contactItems = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.website].filter(Boolean);
        
        return (
          <header style={{ 
            padding: '40px 48px 24px',
            borderBottom: `1px solid ${colors.divider}`,
            marginBottom: '20px',
          }}>
            <h1 style={{ fontSize: '28px', fontWeight: '700', color: colors.primary, margin: 0, letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              {pi.fullName || 'Your Name'}
            </h1>
            {pi.professionalTitle && (
              <p style={{ fontSize: '14px', color: colors.muted, marginTop: '4px', lineHeight: 1.4 }}>{pi.professionalTitle}</p>
            )}
            <div style={{ marginTop: '12px', fontSize: '12px', color: colors.muted, lineHeight: 1.6 }}>
              {contactItems.map((item, idx) => (
                <span key={idx}>
                  {item}
                  {idx < contactItems.length - 1 && <span style={{ margin: '0 8px' }}>•</span>}
                </span>
              ))}
            </div>
          </header>
        );
      };
      
      return (
        <div style={{ backgroundColor: colors.bg, color: colors.text, minHeight: '100%' }}>
          {renderHeader()}
          <div style={{ padding: '0 48px 40px' }}>
            {pageSections.filter(s => s.type !== 'personal-info').map((section) => (
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
                <SectionContent section={section} colors={colors} dateFormat={dateFormat} template={resume.template} />
              </section>
            ))}
          </div>
        </div>
      );
    };

    // For single page or measurement phase, render regular template
    if (!measured || pages.length <= 1) {
      return (
        <div 
          ref={measureRef}
          className={className}
          style={{
            transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
            transformOrigin: 'top center',
            width: forExport ? `${pageSize.width}px` : '100%',
            minHeight: forExport ? `${pageSize.height}px` : 'auto',
            fontFamily: fontStack,
            fontSize: `${fontSize}px`,
            lineHeight,
          }}
        >
          {/* Hidden measurement container */}
          <div 
            style={{ position: 'absolute', visibility: 'hidden', width: `${pageSize.width}px` }}
            ref={measureRef}
          >
            {resume.sections.filter(s => s.visible && s.type !== 'personal-info').sort((a, b) => a.order - b.order).map(section => (
              <div key={section.id} data-section-id={section.id} style={{ padding: '0 48px', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '11px', fontWeight: '700', marginBottom: '12px' }}>
                  {section.content.title || SECTION_LABELS[section.type]}
                </h2>
                <SectionContent section={section} colors={colors} dateFormat={dateFormat} template={resume.template} />
              </div>
            ))}
          </div>
          {renderTemplate()}
        </div>
      );
    }

    // Render multi-page layout
    return (
      <div 
        ref={ref}
        className={className}
        style={{
          transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
          transformOrigin: 'top center',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
        }}
      >
        {pages.map((pageSections, pageIndex) => (
          <Page
            key={pageIndex}
            pageNumber={pageIndex + 1}
            totalPages={pages.length}
            pageSize={pageSize}
            colors={colors}
            fontStack={fontStack}
            fontSize={fontSize}
            lineHeight={lineHeight}
          >
            {renderPageContent(pageSections, pageIndex)}
          </Page>
        ))}
      </div>
    );
  }
);
ResumeRendererInner.displayName = 'ResumeRendererInner';

// Export memoized version for performance
export const ResumeRenderer = memo(ResumeRendererInner);

export default ResumeRenderer;
