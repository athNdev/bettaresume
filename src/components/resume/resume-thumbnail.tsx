'use client';

import { memo, useMemo } from 'react';
import type { Resume, TemplateType } from '@/types/resume';
import { TEMPLATE_CONFIGS } from '@/types/resume';

interface ResumeThumbnailProps {
  resume: Resume;
  className?: string;
}

/**
 * Lightweight thumbnail preview of a resume.
 * This is a simplified version that doesn't render the full ResumeRenderer,
 * instead showing a stylized preview with key information.
 */
export const ResumeThumbnail = memo(function ResumeThumbnail({ resume, className = '' }: ResumeThumbnailProps) {
  const templateConfig = TEMPLATE_CONFIGS[resume.template as TemplateType];
  const colors = templateConfig?.defaultColors || { primary: '#2563eb', secondary: '#64748b' };
  
  // Extract key data for preview
  const personalInfo = resume.metadata?.personalInfo;
  const name = personalInfo?.fullName || 'Your Name';
  const title = personalInfo?.professionalTitle || '';
  const email = personalInfo?.email || '';
  
  // Get visible sections for preview
  const visibleSections = useMemo(() => 
    resume.sections.filter(s => s.visible).sort((a, b) => a.order - b.order).slice(0, 5),
    [resume.sections]
  );

  // Summary text (truncated)
  const summarySection = resume.sections.find(s => s.type === 'summary' && s.visible);
  const summaryHtml = summarySection?.content?.html || '';
  const summaryText = summaryHtml.replace(/<[^>]*>/g, '').slice(0, 100);

  // Experience preview
  const experienceSection = resume.sections.find(s => s.type === 'experience' && s.visible);
  const experiences = (experienceSection?.content?.data as Array<{ company?: string; position?: string }>) || [];
  const firstExp = experiences[0];

  // Skills preview
  const skillsSection = resume.sections.find(s => s.type === 'skills' && s.visible);
  const skillCategories = (skillsSection?.content?.data as Array<{ skills?: Array<{ name?: string }> }>) || [];
  const allSkills = skillCategories.flatMap(c => c.skills || []).slice(0, 6);

  return (
    <div 
      className={`w-full h-full bg-white text-gray-900 overflow-hidden ${className}`}
      style={{ fontSize: '6px', lineHeight: 1.3, padding: '8px 10px' }}
    >
      {/* Header section based on template */}
      {resume.template === 'modern' || resume.template === 'creative' || resume.template === 'tech' ? (
        // Colored header templates
        <div 
          className="rounded-sm mb-1.5 px-1.5 py-1"
          style={{ background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primary}dd 100%)` }}
        >
          <div className="text-white font-bold" style={{ fontSize: '9px' }}>{name}</div>
          {title && <div className="text-white/80" style={{ fontSize: '5px' }}>{title}</div>}
          {email && <div className="text-white/60" style={{ fontSize: '4px', marginTop: '2px' }}>{email}</div>}
        </div>
      ) : (
        // Classic/minimal header templates
        <div className="border-b border-gray-200 pb-1.5 mb-1.5">
          <div className="font-bold" style={{ fontSize: '9px', color: colors.primary }}>{name}</div>
          {title && <div className="text-gray-500" style={{ fontSize: '5px' }}>{title}</div>}
          {email && <div className="text-gray-400" style={{ fontSize: '4px', marginTop: '2px' }}>{email}</div>}
        </div>
      )}

      {/* Summary preview */}
      {summaryText && (
        <div className="mb-1.5">
          <div className="font-semibold text-gray-400 uppercase mb-0.5" style={{ fontSize: '4px', letterSpacing: '0.5px' }}>Summary</div>
          <div className="text-gray-600 line-clamp-2" style={{ fontSize: '5px' }}>{summaryText}...</div>
        </div>
      )}

      {/* Experience preview */}
      {firstExp && (
        <div className="mb-1.5">
          <div className="font-semibold text-gray-400 uppercase mb-0.5" style={{ fontSize: '4px', letterSpacing: '0.5px' }}>Experience</div>
          <div className="font-medium" style={{ fontSize: '5px', color: colors.primary }}>{firstExp.position}</div>
          <div className="text-gray-500" style={{ fontSize: '4px' }}>{firstExp.company}</div>
          {experiences.length > 1 && (
            <div className="text-gray-400" style={{ fontSize: '4px' }}>+{experiences.length - 1} more</div>
          )}
        </div>
      )}

      {/* Skills preview */}
      {allSkills.length > 0 && (
        <div className="mb-1">
          <div className="font-semibold text-gray-400 uppercase mb-0.5" style={{ fontSize: '4px', letterSpacing: '0.5px' }}>Skills</div>
          <div className="flex flex-wrap gap-0.5">
            {allSkills.map((skill, i) => (
              <span 
                key={i} 
                className="px-1 py-0.5 rounded-sm text-white"
                style={{ fontSize: '4px', backgroundColor: colors.primary + '80' }}
              >
                {skill.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Section indicators */}
      <div className="flex gap-1 mt-auto pt-1 border-t border-gray-100">
        {visibleSections.map((section, i) => (
          <div 
            key={i}
            className="h-0.5 flex-1 rounded-full"
            style={{ backgroundColor: colors.primary + (i === 0 ? '' : '40') }}
          />
        ))}
      </div>
    </div>
  );
});
