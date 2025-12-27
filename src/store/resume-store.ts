import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Resume, ResumeSection, ResumeStore, ActivityLog, TemplateType, ResumeSettings, PartialResumeSettings, ActivityAction, ResumePage } from '@/types/resume';
import { TEMPLATE_CONFIGS, SECTION_CONFIGS } from '@/types/resume';

const createDefaultSettings = (template: TemplateType): ResumeSettings => ({
  pageSize: 'A4',
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  fontSize: 11,
  lineHeight: 1.5,
  fontFamily: 'Inter',
  colors: TEMPLATE_CONFIGS[template].defaultColors,
  sectionSpacing: 'normal',
  showIcons: true,
  dateFormat: 'MMM YYYY',
  accentStyle: 'underline',
});

const createDefaultResume = (name: string, template: TemplateType, domain?: string): Resume => {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name,
    variationType: 'base',
    domain,
    createdAt: now,
    updatedAt: now,
    template,
    sections: [
      { id: crypto.randomUUID(), type: 'personal-info', order: 0, visible: true, content: { title: SECTION_CONFIGS['personal-info'].defaultTitle, data: {} } },
      { id: crypto.randomUUID(), type: 'summary', order: 1, visible: true, content: { title: SECTION_CONFIGS['summary'].defaultTitle, data: {}, html: '' } },
      { id: crypto.randomUUID(), type: 'experience', order: 2, visible: true, content: { title: SECTION_CONFIGS['experience'].defaultTitle, data: [] } },
      { id: crypto.randomUUID(), type: 'education', order: 3, visible: true, content: { title: SECTION_CONFIGS['education'].defaultTitle, data: [] } },
      { id: crypto.randomUUID(), type: 'skills', order: 4, visible: true, content: { title: SECTION_CONFIGS['skills'].defaultTitle, data: [] } },
    ],
    metadata: {
      personalInfo: { fullName: '', email: '' },
      settings: createDefaultSettings(template),
    },
    tags: domain ? [domain] : [],
    isArchived: false,
  };
};

const logActivity = (resumeId: string, action: ActivityAction, description: string, metadata?: Record<string, unknown>): ActivityLog => ({
  id: crypto.randomUUID(),
  resumeId,
  action,
  description,
  timestamp: new Date().toISOString(),
  metadata,
});

export const useResumeStore = create<ResumeStore>()(
  persist(
    (set, get) => ({
      resumes: [],
      activeResumeId: null,
      activeResume: null,
      activityLog: [],
      _hasHydrated: false,
      
      setHasHydrated: (state: boolean) => {
        set({ _hasHydrated: state });
      },

      createResume: (name: string, template: TemplateType, domain?: string) => {
        const newResume = createDefaultResume(name, template, domain);
        const activity = logActivity(newResume.id, 'created', `Created resume "${name}"`);
        set((state) => ({
          resumes: [...state.resumes, newResume],
          activeResumeId: newResume.id,
          activeResume: newResume,
          activityLog: [...state.activityLog, activity],
        }));
        return newResume.id;
      },

      deleteResume: (id: string) => {
        const resume = get().resumes.find((r) => r.id === id);
        if (!resume) return;
        const activity = logActivity(id, 'deleted', `Deleted resume "${resume.name}"`);
        set((state) => {
          const resumes = state.resumes.filter((r) => r.id !== id);
          const activeResumeId = state.activeResumeId === id ? null : state.activeResumeId;
          const activeResume = activeResumeId ? resumes.find((r) => r.id === activeResumeId) || null : null;
          return { resumes, activeResumeId, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      setActiveResume: (id: string) => {
        const resume = get().resumes.find((r) => r.id === id);
        if (resume) {
          // Auto-sync linked sections when opening a tailored copy
          if (resume.variationType === 'variation' && resume.baseResumeId) {
            const baseResume = get().resumes.find((r) => r.id === resume.baseResumeId);
            if (baseResume) {
              // Sync linked sections silently
              const syncedSections = resume.sections.map(section => {
                if (section.linkedToBase !== false) {
                  const baseSection = baseResume.sections.find(s => s.type === section.type);
                  if (baseSection) {
                    return {
                      ...section,
                      content: JSON.parse(JSON.stringify(baseSection.content)),
                      visible: baseSection.visible,
                      linkedToBase: true,
                    };
                  }
                }
                return section;
              });
              
              // Add any new sections from base
              const variationTypes = new Set(resume.sections.map(s => s.type));
              baseResume.sections.forEach(baseSection => {
                if (!variationTypes.has(baseSection.type)) {
                  syncedSections.push({
                    ...JSON.parse(JSON.stringify(baseSection)),
                    id: crypto.randomUUID(),
                    order: syncedSections.length,
                    linkedToBase: true,
                  });
                }
              });
              
              const syncedResume = {
                ...resume,
                sections: syncedSections,
                lastSyncedAt: new Date().toISOString(),
              };
              
              set((state) => ({
                activeResumeId: id,
                activeResume: syncedResume,
                resumes: state.resumes.map(r => r.id === id ? syncedResume : r),
              }));
              return;
            }
          }
          set({ activeResumeId: id, activeResume: resume });
        }
      },

      updateResume: (id: string, updates: Partial<Resume>) => {
        set((state) => {
          const resumes = state.resumes.map((r) =>
            r.id === id ? { ...r, ...updates, updatedAt: new Date().toISOString() } : r
          );
          const activeResume = state.activeResumeId === id ? resumes.find((r) => r.id === id) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      duplicateResume: (id: string, newName: string) => {
        const original = get().resumes.find((r) => r.id === id);
        if (!original) return '';
        const now = new Date().toISOString();
        const duplicate: Resume = {
          ...JSON.parse(JSON.stringify(original)),
          id: crypto.randomUUID(),
          name: newName,
          baseResumeId: undefined,
          variationType: 'base',
          createdAt: now,
          updatedAt: now,
        };
        duplicate.sections = duplicate.sections.map((s: ResumeSection) => ({ 
          ...s, 
          id: crypto.randomUUID(),
          linkedToBase: undefined,
        }));
        const activity = logActivity(duplicate.id, 'duplicated', `Duplicated from "${original.name}"`);
        set((state) => ({
          resumes: [...state.resumes, duplicate],
          activityLog: [...state.activityLog, activity],
        }));
        return duplicate.id;
      },

      archiveResume: (id: string) => {
        set((state) => ({
          resumes: state.resumes.map((r) => r.id === id ? { ...r, isArchived: true, updatedAt: new Date().toISOString() } : r),
        }));
      },

      restoreResume: (id: string) => {
        set((state) => ({
          resumes: state.resumes.map((r) => r.id === id ? { ...r, isArchived: false, updatedAt: new Date().toISOString() } : r),
        }));
      },

      addSection: (resumeId: string, section: Omit<ResumeSection, 'id' | 'order'>) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const newSection: ResumeSection = { ...section, id: crypto.randomUUID(), order: r.sections.length };
            return { ...r, sections: [...r.sections, newSection], updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          const activity = logActivity(resumeId, 'section_added', `Added ${section.type} section`);
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      updateSection: (resumeId: string, sectionId: string, updates: Partial<ResumeSection>) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            return {
              ...r,
              sections: r.sections.map((s) => s.id === sectionId ? { ...s, ...updates } : s),
              updatedAt: new Date().toISOString(),
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      deleteSection: (resumeId: string, sectionId: string) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const sections = r.sections.filter((s) => s.id !== sectionId);
            return {
              ...r,
              sections: sections.map((s, i) => ({ ...s, order: i })),
              updatedAt: new Date().toISOString(),
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          const activity = logActivity(resumeId, 'section_removed', 'Removed section');
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      reorderSections: (resumeId: string, sectionIds: string[]) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const sections = sectionIds.map((id, index) => {
              const section = r.sections.find((s) => s.id === id);
              return section ? { ...section, order: index } : null;
            }).filter(Boolean) as ResumeSection[];
            return { ...r, sections, updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      duplicateSection: (resumeId: string, sectionId: string) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const section = r.sections.find((s) => s.id === sectionId);
            if (!section) return r;
            const newSection: ResumeSection = {
              ...JSON.parse(JSON.stringify(section)),
              id: crypto.randomUUID(),
              order: r.sections.length,
              linkedToBase: false,
            };
            return { ...r, sections: [...r.sections, newSection], updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      // ============== TAILORED COPY MANAGEMENT ==============

      createVariation: (baseResumeId: string, domain: string, name: string) => {
        const baseResume = get().resumes.find((r) => r.id === baseResumeId);
        if (!baseResume) return '';
        
        // Cannot create tailored copy from another tailored copy
        if (baseResume.variationType === 'variation') {
          console.warn('Cannot create tailored copy from another tailored copy. Use duplicateVariation instead.');
          return '';
        }
        
        const now = new Date().toISOString();
        const variation: Resume = {
          ...JSON.parse(JSON.stringify(baseResume)),
          id: crypto.randomUUID(),
          name,
          baseResumeId,
          variationType: 'variation',
          domain,
          createdAt: now,
          updatedAt: now,
          lastSyncedAt: now,
          tags: [...(baseResume.tags || []), domain],
        };
        // All sections start linked to base
        variation.sections = variation.sections.map((s: ResumeSection) => ({ 
          ...s, 
          id: crypto.randomUUID(),
          linkedToBase: true,
        }));
        
        const activity = logActivity(variation.id, 'variation_created', `Created tailored copy "${name}" for ${domain}`);
        set((state) => ({
          resumes: [...state.resumes, variation],
          activeResumeId: variation.id,
          activeResume: variation,
          activityLog: [...state.activityLog, activity],
        }));
        return variation.id;
      },

      createVariationFromSection: (baseResumeId: string, sectionId: string, domain: string, name: string, customizedContent: Partial<ResumeSection>) => {
        const baseResume = get().resumes.find((r) => r.id === baseResumeId);
        if (!baseResume) return '';
        
        // Cannot create tailored copy from another tailored copy
        if (baseResume.variationType === 'variation') {
          console.warn('Cannot create tailored copy from another tailored copy. Use duplicateVariation instead.');
          return '';
        }
        
        const now = new Date().toISOString();
        const variation: Resume = {
          ...JSON.parse(JSON.stringify(baseResume)),
          id: crypto.randomUUID(),
          name,
          baseResumeId,
          variationType: 'variation',
          domain,
          createdAt: now,
          updatedAt: now,
          lastSyncedAt: now,
          tags: [...(baseResume.tags || []), domain],
        };
        
        // Find the section being customized
        const originalSection = baseResume.sections.find(s => s.id === sectionId);
        
        // All sections start linked to base, except the one being customized
        variation.sections = variation.sections.map((s: ResumeSection) => {
          const newId = crypto.randomUUID();
          if (originalSection && s.type === originalSection.type) {
            return { 
              ...s, 
              ...customizedContent,
              id: newId,
              linkedToBase: false,
            };
          }
          return { 
            ...s, 
            id: newId,
            linkedToBase: true,
          };
        });
        
        const sectionLabel = originalSection ? SECTION_CONFIGS[originalSection.type]?.label || originalSection.type : 'section';
        const activity = logActivity(variation.id, 'variation_created', `Created tailored copy "${name}" for ${domain} (customized ${sectionLabel})`);
        
        set((state) => ({
          resumes: [...state.resumes, variation],
          activeResumeId: variation.id,
          activeResume: variation,
          activityLog: [...state.activityLog, activity],
        }));
        return variation.id;
      },

      getVariations: (baseResumeId: string) => {
        return get().resumes.filter((r) => r.baseResumeId === baseResumeId);
      },

      duplicateVariation: (variationId: string, newName: string) => {
        const original = get().resumes.find((r) => r.id === variationId);
        if (!original || original.variationType !== 'variation') return '';
        
        const now = new Date().toISOString();
        const duplicate: Resume = {
          ...JSON.parse(JSON.stringify(original)),
          id: crypto.randomUUID(),
          name: newName,
          createdAt: now,
          updatedAt: now,
          lastSyncedAt: now,
        };
        duplicate.sections = duplicate.sections.map((s: ResumeSection) => ({ 
          ...s, 
          id: crypto.randomUUID(),
        }));
        
        const activity = logActivity(duplicate.id, 'duplicated', `Copied tailored copy from "${original.name}"`);
        set((state) => ({
          resumes: [...state.resumes, duplicate],
          activeResumeId: duplicate.id,
          activeResume: duplicate,
          activityLog: [...state.activityLog, activity],
        }));
        return duplicate.id;
      },

      // ============== SECTION LINKING ==============

      customizeSection: (resumeId: string, sectionId: string) => {
        const resume = get().resumes.find(r => r.id === resumeId);
        if (!resume || resume.variationType !== 'variation') return;
        
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            return {
              ...r,
              sections: r.sections.map((s) => 
                s.id === sectionId ? { ...s, linkedToBase: false } : s
              ),
              updatedAt: new Date().toISOString(),
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      resetSectionToBase: (resumeId: string, sectionId: string) => {
        const resume = get().resumes.find(r => r.id === resumeId);
        if (!resume || resume.variationType !== 'variation' || !resume.baseResumeId) return;
        
        const baseResume = get().resumes.find(r => r.id === resume.baseResumeId);
        if (!baseResume) return;
        
        const section = resume.sections.find(s => s.id === sectionId);
        if (!section) return;
        
        const baseSection = baseResume.sections.find(s => s.type === section.type);
        if (!baseSection) return;
        
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            return {
              ...r,
              sections: r.sections.map((s) => 
                s.id === sectionId 
                  ? { 
                      ...s, 
                      content: JSON.parse(JSON.stringify(baseSection.content)),
                      visible: baseSection.visible,
                      linkedToBase: true,
                    } 
                  : s
              ),
              updatedAt: new Date().toISOString(),
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          const activity = logActivity(resumeId, 'updated', `Reset ${SECTION_CONFIGS[section.type]?.label || section.type} to base version`);
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      syncLinkedSections: (variationId: string) => {
        const variation = get().resumes.find(r => r.id === variationId);
        if (!variation || variation.variationType !== 'variation' || !variation.baseResumeId) return;
        
        const baseResume = get().resumes.find(r => r.id === variation.baseResumeId);
        if (!baseResume) return;
        
        const now = new Date().toISOString();
        const syncedSections = variation.sections.map(section => {
          if (section.linkedToBase !== false) {
            const baseSection = baseResume.sections.find(s => s.type === section.type);
            if (baseSection) {
              return {
                ...section,
                content: JSON.parse(JSON.stringify(baseSection.content)),
                visible: baseSection.visible,
                linkedToBase: true,
              };
            }
          }
          return section;
        });
        
        // Add new sections from base
        const variationTypes = new Set(variation.sections.map(s => s.type));
        baseResume.sections.forEach(baseSection => {
          if (!variationTypes.has(baseSection.type)) {
            syncedSections.push({
              ...JSON.parse(JSON.stringify(baseSection)),
              id: crypto.randomUUID(),
              order: syncedSections.length,
              linkedToBase: true,
            });
          }
        });
        
        set((state) => {
          const resumes = state.resumes.map((r) => 
            r.id === variationId 
              ? { ...r, sections: syncedSections, lastSyncedAt: now, updatedAt: now } 
              : r
          );
          const activeResume = state.activeResumeId === variationId ? resumes.find((r) => r.id === variationId) || null : state.activeResume;
          const activity = logActivity(variationId, 'synced_with_base', `Updated linked sections from base resume`);
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      getSectionLinkStatus: (resumeId: string, sectionId: string) => {
        const resume = get().resumes.find(r => r.id === resumeId);
        if (!resume) return 'base';
        if (resume.variationType !== 'variation') return 'base';
        
        const section = resume.sections.find(s => s.id === sectionId);
        if (!section) return 'base';
        
        return section.linkedToBase === false ? 'customized' : 'linked';
      },

      // ============== SETTINGS & TEMPLATES ==============

      updateSettings: (resumeId: string, settings: PartialResumeSettings) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const currentSettings = r.metadata?.settings || createDefaultSettings(r.template || 'modern');
            const mergedColors = settings.colors 
              ? { ...currentSettings.colors, ...settings.colors }
              : currentSettings.colors;
            const mergedMargins = settings.margins
              ? { ...currentSettings.margins, ...settings.margins }
              : currentSettings.margins;
            const newSettings = { 
              ...currentSettings, 
              ...settings, 
              colors: mergedColors,
              margins: mergedMargins
            };
            const metadata = {
              personalInfo: r.metadata?.personalInfo || { fullName: '', email: '' },
              settings: newSettings as ResumeSettings,
            };
            return { ...r, metadata, updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          const activity = logActivity(resumeId, 'settings_changed', 'Updated resume settings');
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      updateTemplate: (resumeId: string, template: TemplateType) => {
        const activity = logActivity(resumeId, 'template_changed', `Changed template to ${template}`);
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const currentSettings = r.metadata?.settings || createDefaultSettings(template);
            const metadata = {
              personalInfo: r.metadata?.personalInfo || { fullName: '', email: '' },
              settings: { ...currentSettings, colors: TEMPLATE_CONFIGS[template].defaultColors },
            };
            return {
              ...r,
              template,
              metadata,
              updatedAt: new Date().toISOString(),
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      // ============== PAGE MANAGEMENT ==============

      addPage: (resumeId: string, name?: string) => {
        const pageId = crypto.randomUUID();
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const existingPages = r.pages || [];
            const newPage: ResumePage = {
              id: pageId,
              name: name || `Page ${existingPages.length + 1}`,
              order: existingPages.length,
              sectionIds: [],
            };
            return { 
              ...r, 
              pages: [...existingPages, newPage],
              updatedAt: new Date().toISOString() 
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
        return pageId;
      },

      deletePage: (resumeId: string, pageId: string) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const pages = (r.pages || []).filter(p => p.id !== pageId);
            const sections = r.sections.map(s => 
              s.pageId === pageId ? { ...s, pageId: undefined } : s
            );
            return { 
              ...r, 
              pages: pages.map((p, i) => ({ ...p, order: i })),
              sections,
              updatedAt: new Date().toISOString() 
            };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      reorderPages: (resumeId: string, pageIds: string[]) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const pages = pageIds.map((id, index) => {
              const page = (r.pages || []).find(p => p.id === id);
              return page ? { ...page, order: index } : null;
            }).filter(Boolean) as ResumePage[];
            return { ...r, pages, updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      updatePage: (resumeId: string, pageId: string, updates: Partial<ResumePage>) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const pages = (r.pages || []).map(p => 
              p.id === pageId ? { ...p, ...updates } : p
            );
            return { ...r, pages, updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      moveSectionToPage: (resumeId: string, sectionId: string, pageId: string) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const sections = r.sections.map(s => 
              s.id === sectionId ? { ...s, pageId: pageId || undefined } : s
            );
            return { ...r, sections, updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      // ============== IMPORT/EXPORT ==============

      exportToJSON: (resumeId: string) => {
        const resume = get().resumes.find((r) => r.id === resumeId);
        if (!resume) return '';
        const activity = logActivity(resumeId, 'exported', 'Exported to JSON');
        set((state) => ({
          resumes: state.resumes.map((r) => r.id === resumeId ? { ...r, lastExportedAt: new Date().toISOString() } : r),
          activityLog: [...state.activityLog, activity],
        }));
        return JSON.stringify(resume, null, 2);
      },

      importFromJSON: (json: string) => {
        try {
          const resume: Resume = JSON.parse(json);
          const now = new Date().toISOString();
          const imported: Resume = {
            ...resume,
            id: crypto.randomUUID(),
            name: `${resume.name} (imported)`,
            baseResumeId: undefined,
            variationType: 'base',
            createdAt: now,
            updatedAt: now,
          };
          imported.sections = imported.sections.map((s) => ({ 
            ...s, 
            id: crypto.randomUUID(),
            linkedToBase: undefined,
          }));
          const activity = logActivity(imported.id, 'imported', `Imported resume "${resume.name}"`);
          set((state) => ({
            resumes: [...state.resumes, imported],
            activityLog: [...state.activityLog, activity],
          }));
          return imported.id;
        } catch (error) {
          console.error('Failed to import resume:', error);
          return null;
        }
      },

      exportAllToJSON: () => {
        const { resumes } = get();
        return JSON.stringify({ resumes, exportedAt: new Date().toISOString() }, null, 2);
      },

      importAllFromJSON: (json: string) => {
        try {
          const data = JSON.parse(json);
          if (data.resumes && Array.isArray(data.resumes)) {
            const now = new Date().toISOString();
            const importedResumes = data.resumes.map((r: Resume) => ({
              ...r,
              id: crypto.randomUUID(),
              name: `${r.name} (imported)`,
              createdAt: now,
              updatedAt: now,
              sections: r.sections.map((s: ResumeSection) => ({ ...s, id: crypto.randomUUID() })),
            }));
            set((state) => ({ resumes: [...state.resumes, ...importedResumes] }));
          }
        } catch (error) {
          console.error('Failed to import all resumes:', error);
        }
      },

      // ============== ACTIVITY & SEARCH ==============

      getActivityLog: (resumeId?: string) => {
        const log = get().activityLog;
        return resumeId ? log.filter((a) => a.resumeId === resumeId) : log;
      },

      clearActivityLog: () => set({ activityLog: [] }),

      searchResumes: (query: string) => {
        const q = query.toLowerCase();
        return get().resumes.filter((r) =>
          !r.isArchived && (
            r.name.toLowerCase().includes(q) ||
            r.domain?.toLowerCase().includes(q) ||
            r.metadata?.personalInfo?.fullName?.toLowerCase().includes(q) ||
            r.tags?.some((t) => t.toLowerCase().includes(q))
          )
        );
      },

      filterByTag: (tag: string) => get().resumes.filter((r) => !r.isArchived && r.tags?.includes(tag)),
      filterByDomain: (domain: string) => get().resumes.filter((r) => !r.isArchived && r.domain === domain),

      loadFromLocalStorage: () => {},
      saveToLocalStorage: () => {},
    }),
    { 
      name: 'betta-resume-storage',
      partialize: (state) => ({
        resumes: state.resumes,
        activeResumeId: state.activeResumeId,
        activityLog: state.activityLog,
      }),
    }
  )
);

// Hydration handling
if (typeof window !== 'undefined') {
  useResumeStore.persist.onFinishHydration(() => {
    useResumeStore.setState({ _hasHydrated: true });
  });
  
  if (useResumeStore.persist.hasHydrated()) {
    useResumeStore.setState({ _hasHydrated: true });
  }
}
