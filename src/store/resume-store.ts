import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Resume, ResumeSection, ResumeStore, ResumeVersion, ActivityLog, TemplateType, ResumeSettings, PartialResumeSettings, ActivityAction, ResumePage } from '@/types/resume';
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
    version: 1,
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
      versions: [],
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
          const versions = state.versions.filter((v) => v.resumeId !== id);
          return { resumes, activeResumeId, activeResume, versions, activityLog: [...state.activityLog, activity] };
        });
      },

      setActiveResume: (id: string) => {
        const resume = get().resumes.find((r) => r.id === id);
        if (resume) set({ activeResumeId: id, activeResume: resume });
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
          version: 1,
          createdAt: now,
          updatedAt: now,
        };
        duplicate.sections = duplicate.sections.map((s: ResumeSection) => ({ ...s, id: crypto.randomUUID() }));
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
            return { ...r, sections: [...r.sections, newSection], currentVersionId: undefined, updatedAt: new Date().toISOString() };
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
              currentVersionId: undefined, // Clear when content is edited
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
            const sections = r.sections.filter((s) => s.id !== sectionId).map((s, index) => ({ ...s, order: index }));
            return { ...r, sections, currentVersionId: undefined, updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          const activity = logActivity(resumeId, 'section_removed', `Removed section`);
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      reorderSections: (resumeId: string, sectionIds: string[]) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            const sectionMap = new Map(r.sections.map((s) => [s.id, s]));
            const sections = sectionIds.map((id) => sectionMap.get(id)).filter((s): s is ResumeSection => s !== undefined).map((s, index) => ({ ...s, order: index }));
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
            const original = r.sections.find((s) => s.id === sectionId);
            if (!original) return r;
            const duplicate: ResumeSection = {
              ...JSON.parse(JSON.stringify(original)),
              id: crypto.randomUUID(),
              order: r.sections.length,
              content: { ...original.content, title: `${original.content.title || original.type} (Copy)` },
            };
            return { ...r, sections: [...r.sections, duplicate], updatedAt: new Date().toISOString() };
          });
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { resumes, activeResume };
        });
      },

      createVersion: (resumeId: string, description?: string) => {
        const resume = get().resumes.find((r) => r.id === resumeId);
        if (!resume) return;
        const version: ResumeVersion = {
          id: crypto.randomUUID(),
          resumeId,
          version: resume.version,
          snapshot: JSON.parse(JSON.stringify(resume)),
          createdAt: new Date().toISOString(),
          changeDescription: description,
        };
        set((state) => {
          const resumes = state.resumes.map((r) => r.id === resumeId ? { ...r, version: r.version + 1, updatedAt: new Date().toISOString() } : r);
          const activeResume = state.activeResumeId === resumeId ? resumes.find((r) => r.id === resumeId) || null : state.activeResume;
          return { versions: [...state.versions, version], resumes, activeResume };
        });
      },

      getVersions: (resumeId: string) => {
        return get().versions.filter((v) => v.resumeId === resumeId).sort((a, b) => b.version - a.version);
      },

      restoreVersion: (resumeId: string, versionId: string) => {
        const version = get().versions.find((v) => v.id === versionId);
        if (!version) return;
        const activity = logActivity(resumeId, 'version_restored', `Restored to version ${version.version}`);
        set((state) => {
          const restored = { ...version.snapshot, id: resumeId, updatedAt: new Date().toISOString() };
          const resumes = state.resumes.map((r) => r.id === resumeId ? restored : r);
          const activeResume = state.activeResumeId === resumeId ? restored : state.activeResume;
          return { resumes, activeResume, activityLog: [...state.activityLog, activity] };
        });
      },

      switchToVersion: (resumeId: string, versionId: string) => {
        const version = get().versions.find((v) => v.id === versionId);
        if (!version || !version.snapshot) return null;
        
        // Check if snapshot has actual data (not just empty object)
        const snapshotCopy = JSON.parse(JSON.stringify(version.snapshot));
        if (!snapshotCopy.sections || snapshotCopy.sections.length === 0) {
          console.warn('Version snapshot is empty or has no sections');
          return null;
        }
        
        // Restore this version's content to the BASE resume (keeps all history)
        const baseResumeId = version.resumeId;
        const baseResume = get().resumes.find((r) => r.id === baseResumeId);
        if (!baseResume) return null;
        
        const now = new Date().toISOString();
        
        // Use snapshot sections directly (they already have IDs)
        const sections = snapshotCopy.sections;
        
        // Ensure metadata and settings exist
        const template = snapshotCopy.template || baseResume.template || 'modern';
        const defaultSettings = createDefaultSettings(template as TemplateType);
        const metadata = {
          personalInfo: snapshotCopy.metadata?.personalInfo || baseResume.metadata?.personalInfo || { fullName: '', email: '' },
          settings: snapshotCopy.metadata?.settings 
            ? { ...defaultSettings, ...snapshotCopy.metadata.settings }
            : baseResume.metadata?.settings || defaultSettings,
        };
        
        // Restore version content to the existing resume (preserves history!)
        // Set currentVersionId to track which saved version we're viewing
        const restoredResume: Resume = {
          ...baseResume, // Keep the base resume's identity (id, name, version number, etc.)
          sections,
          metadata,
          template,
          currentVersionId: versionId, // Track which saved version is being viewed
          updatedAt: now,
        };
        
        const activity = logActivity(baseResumeId, 'version_restored', `Switched to version ${version.version}`);
        set((state) => ({
          resumes: state.resumes.map((r) => r.id === baseResumeId ? restoredResume : r),
          activeResumeId: baseResumeId,
          activeResume: restoredResume,
          activityLog: [...state.activityLog, activity],
        }));
        
        return baseResumeId;
      },

      deleteVersion: (versionId: string) => {
        set((state) => ({ versions: state.versions.filter((v) => v.id !== versionId) }));
      },

      deleteVersionWithVariations: (versionId: string) => {
        const version = get().versions.find((v) => v.id === versionId);
        if (!version) return;
        
        // Find and delete all variations created from this version
        const variationsToDelete = get().resumes.filter(
          r => r.baseResumeId === version.resumeId && r.createdFromVersion === version.version
        );
        
        const activity = logActivity(version.resumeId, 'version_deleted', 
          `Deleted version ${version.version}${variationsToDelete.length > 0 ? ` and ${variationsToDelete.length} variation(s)` : ''}`
        );
        
        set((state) => ({
          versions: state.versions.filter((v) => v.id !== versionId),
          resumes: state.resumes.filter((r) => !variationsToDelete.some(v => v.id === r.id)),
          activityLog: [...state.activityLog, activity],
        }));
      },

      createVariation: (baseResumeId: string, domain: string, name: string) => {
        const baseResume = get().resumes.find((r) => r.id === baseResumeId);
        if (!baseResume) return '';
        const now = new Date().toISOString();
        const variation: Resume = {
          ...JSON.parse(JSON.stringify(baseResume)),
          id: crypto.randomUUID(),
          name,
          baseResumeId,
          variationType: 'variation',
          domain,
          version: 1,
          createdAt: now,
          updatedAt: now,
          createdFromVersion: baseResume.version, // Track which version this variation was created from
          tags: [...(baseResume.tags || []), domain],
        };
        variation.sections = variation.sections.map((s: ResumeSection) => ({ ...s, id: crypto.randomUUID() }));
        const activity = logActivity(variation.id, 'variation_created', `Created variation "${name}" for ${domain}`);
        set((state) => ({
          resumes: [...state.resumes, variation],
          activityLog: [...state.activityLog, activity],
        }));
        return variation.id;
      },

      getVariations: (baseResumeId: string) => {
        return get().resumes.filter((r) => r.baseResumeId === baseResumeId);
      },

      syncWithBase: (variationId: string) => {
        const variation = get().resumes.find((r) => r.id === variationId);
        if (!variation || !variation.baseResumeId) return;
        const base = get().resumes.find((r) => r.id === variation.baseResumeId);
        if (!base) return;
        set((state) => {
          const synced: Resume = {
            ...variation,
            metadata: { ...base.metadata, ...variation.metadata },
            template: base.template,
            updatedAt: new Date().toISOString(),
          };
          const resumes = state.resumes.map((r) => r.id === variationId ? synced : r);
          const activeResume = state.activeResumeId === variationId ? synced : state.activeResume;
          return { resumes, activeResume };
        });
      },

      updateSettings: (resumeId: string, settings: PartialResumeSettings) => {
        set((state) => {
          const resumes = state.resumes.map((r) => {
            if (r.id !== resumeId) return r;
            // Ensure metadata and settings exist with defaults
            const currentSettings = r.metadata?.settings || createDefaultSettings(r.template || 'modern');
            // Deep merge colors and margins if provided
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
          return { resumes, activeResume };
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

      // Page management
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
            // Move sections from deleted page to no page (main)
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
          imported.sections = imported.sections.map((s) => ({ ...s, id: crypto.randomUUID() }));
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
        const { resumes, versions } = get();
        return JSON.stringify({ resumes, versions, exportedAt: new Date().toISOString() }, null, 2);
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
        // Only persist these fields (not _hasHydrated, activeResume)
        resumes: state.resumes,
        activeResumeId: state.activeResumeId,
        versions: state.versions,
        activityLog: state.activityLog,
      }),
    }
  )
);

// Hydration handling - must happen after store is created
// Using setTimeout to ensure this runs after the persist middleware rehydrates
if (typeof window !== 'undefined') {
  const unsubFinishHydration = useResumeStore.persist.onFinishHydration(() => {
    useResumeStore.setState({ _hasHydrated: true });
  });
  
  // Also set hydrated immediately if rehydration already happened
  if (useResumeStore.persist.hasHydrated()) {
    useResumeStore.setState({ _hasHydrated: true });
  }
}
