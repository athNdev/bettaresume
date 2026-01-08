'use client';

/**
 * Resume Editor Page (Hash Router Version)
 * Uses React Query (tRPC) for data fetching instead of localStorage.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useHashRouter } from '@/lib/hash-router';
import { useConfirm } from '@/hooks/use-confirm';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { 
  useResume, 
  useResumes, 
  useResumeMutations, 
  useSectionMutations,
  useActiveResumeStore 
} from '@/hooks';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  ArrowLeft,
  Palette,
  Layout,
  Layers,
  Clock,
  ChevronDown,
  Loader2,
} from 'lucide-react';

// Section Forms
import {
  PersonalInfoForm,
  ExperienceForm,
  EducationForm,
  SkillsForm,
  ProjectsForm,
  CertificationsForm,
  AwardsForm,
  LanguagesForm,
  VolunteerForm,
  PublicationsForm,
  ReferencesForm,
} from '@/components/sections-forms';

// Editor Components
import { RichTextEditor } from '@/components/rich-text-editor';
import { ExportButtons } from '@/components/export';
import {
  Preview,
  TemplateSelector,
  FormattingToolbar,
  ChangeLog,
  VariationManager,
  SectionsManager,
} from '@/components/resume-editor';

import type { ResumeSection, SectionType, PersonalInfo, Experience, Education, SkillCategory, Project, Certification, Award, Language, Volunteer, Publication, Reference, PartialResumeSettings, TemplateType, ResumeColors } from '@/types/resume';
import { SECTION_CONFIGS } from '@/types/resume';

interface ResumeEditorPageProps {
  id: string;
}

export default function ResumeEditor({ id: resumeId }: ResumeEditorPageProps) {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <ResumeEditorContent resumeId={resumeId} />
      </TooltipProvider>
    </ProtectedRoute>
  );
}

function ResumeEditorContent({ resumeId }: { resumeId: string }) {
  const { navigate } = useHashRouter();
  const setActiveResumeId = useActiveResumeStore((s) => s.setActiveResumeId);

  // Data fetching via tRPC
  const { data: activeResume, isLoading, isError } = useResume(resumeId);
  const { data: allResumes = [] } = useResumes({ includeArchived: true });
  const { updateResume, deleteResume } = useResumeMutations();
  const { 
    updateSection, 
    createSection, 
    deleteSection: deleteSectionMutation, 
    reorderSections,
    isUpdating: isSectionUpdating,
  } = useSectionMutations(resumeId);

  // Local state
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(0.7);
  const [contentOpen, setContentOpen] = useState(true);
  const [designOpen, setDesignOpen] = useState(true);
  const [activityOpen, setActivityOpen] = useState(true);

  // Set active resume ID when component mounts
  useEffect(() => {
    if (resumeId) {
      setActiveResumeId(resumeId);
    }
  }, [resumeId, setActiveResumeId]);

  // Auto-select first section
  useEffect(() => {
    if (activeResume && !selectedSectionId) {
      const sortedSections = [...(activeResume.sections || [])].sort((a, b) => a.order - b.order);
      const firstSection = sortedSections[0];
      if (firstSection) {
        setSelectedSectionId(firstSection.id);
      }
    }
  }, [activeResume, selectedSectionId]);

  // Get variations for this resume
  const variations = useMemo(() => {
    if (!activeResume) return [];
    const baseId = activeResume.variationType === 'base' ? activeResume.id : activeResume.baseResumeId;
    if (!baseId) return [];
    return allResumes.filter((r) => r.baseResumeId === baseId || r.id === baseId);
  }, [activeResume, allResumes]);

  // Get base resume
  const baseResume = useMemo(() => {
    if (!activeResume) return null;
    if (activeResume.variationType === 'base') return activeResume;
    return allResumes.find((r) => r.id === activeResume.baseResumeId) || null;
  }, [activeResume, allResumes]);

  // Get selected section
  const selectedSection = useMemo(() => {
    if (!activeResume || !selectedSectionId) return null;
    return activeResume.sections.find((s) => s.id === selectedSectionId) || null;
  }, [activeResume, selectedSectionId]);

  // Activity log - for now just empty (can be implemented later with backend)
  const currentActivityLog: Array<{ id: string; timestamp: Date; type: string; description: string }> = [];

  // Handlers
  const handleSectionChange = useCallback(async (sectionId: string, updates: Partial<ResumeSection>) => {
    if (!activeResume) return;
    try {
      await updateSection(sectionId, updates);
    } catch (err) {
      console.error('Failed to update section:', err);
    }
  }, [activeResume, updateSection]);

  const handleSectionDataChange = useCallback(async (sectionId: string, data: unknown) => {
    await handleSectionChange(sectionId, { content: { ...selectedSection?.content, data } } as Partial<ResumeSection>);
  }, [handleSectionChange, selectedSection]);

  const handleSummaryChange = useCallback((html: string) => {
    if (!selectedSection || selectedSection.type !== 'summary') return;
    handleSectionChange(selectedSection.id, { content: { ...selectedSection.content, html } });
  }, [selectedSection, handleSectionChange]);

  const handlePersonalInfoChange = useCallback(async (info: PersonalInfo) => {
    if (!activeResume || !activeResume.metadata) return;
    try {
      await updateResume(activeResume.id, {
        metadata: { ...activeResume.metadata, personalInfo: info },
      });
    } catch (err) {
      console.error('Failed to update personal info:', err);
    }
  }, [activeResume, updateResume]);

  const handleAddSection = useCallback(async (type: SectionType) => {
    if (!activeResume) return;
    const config = SECTION_CONFIGS[type];
    try {
      await createSection({
        type,
        visible: true,
        content: {
          title: config.defaultTitle,
          data: type === 'summary' ? {} : [],
          html: type === 'summary' ? '' : undefined,
        },
      });
    } catch (err) {
      console.error('Failed to add section:', err);
    }
  }, [activeResume, createSection]);

  const confirm = useConfirm();

  const handleDeleteSection = useCallback(async (sectionId: string) => {
    if (!activeResume) return;
    const confirmed = await confirm('Delete Section', 'Delete this section? This cannot be undone.');
    if (confirmed) {
      try {
        await deleteSectionMutation(sectionId);
        if (selectedSectionId === sectionId) {
          setSelectedSectionId(null);
        }
      } catch (err) {
        console.error('Failed to delete section:', err);
      }
    }
  }, [activeResume, deleteSectionMutation, selectedSectionId, confirm]);

  const handleSectionsReorder = useCallback(async (sections: ResumeSection[]) => {
    if (!activeResume) return;
    const sectionIds = sections.map((s) => s.id);
    try {
      await reorderSections(sectionIds);
    } catch (err) {
      console.error('Failed to reorder sections:', err);
    }
  }, [activeResume, reorderSections]);

  const handleSettingsChange = useCallback(async (settings: PartialResumeSettings) => {
    if (!activeResume || !activeResume.metadata) return;
    try {
      await updateResume(activeResume.id, {
        metadata: { ...activeResume.metadata, settings: { ...activeResume.metadata.settings, ...settings } },
      });
    } catch (err) {
      console.error('Failed to update settings:', err);
    }
  }, [activeResume, updateResume]);

  const handleTemplateChange = useCallback(async (template: TemplateType) => {
    if (!activeResume) return;
    try {
      await updateResume(activeResume.id, { template });
    } catch (err) {
      console.error('Failed to update template:', err);
    }
  }, [activeResume, updateResume]);

  const handleColorChange = useCallback(async (colors: ResumeColors) => {
    if (!activeResume || !activeResume.metadata) return;
    try {
      await updateResume(activeResume.id, {
        metadata: { ...activeResume.metadata, settings: { ...activeResume.metadata.settings, colors } },
      });
    } catch (err) {
      console.error('Failed to update colors:', err);
    }
  }, [activeResume, updateResume]);

  const handleCreateVariation = useCallback(async (name: string, domain?: string) => {
    if (!baseResume) return;
    // For now, use duplicate since createVariation needs to be added to backend
    // TODO: Add proper createVariation endpoint
    console.log('Create variation:', name, domain);
  }, [baseResume]);

  const handleSelectVariation = useCallback((id: string) => {
    navigate(`/resume-editor/${id}`);
  }, [navigate]);

  const handleDeleteVariation = useCallback(async (id: string) => {
    try {
      await deleteResume(id);
      if (baseResume) {
        navigate(`/resume-editor/${baseResume.id}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Failed to delete variation:', err);
    }
  }, [deleteResume, baseResume, navigate]);

  // Render section form based on type
  const renderSectionForm = () => {
    if (!selectedSection || !activeResume) return null;

    switch (selectedSection.type) {
      case 'personal-info':
        // Personal info requires metadata
        if (!activeResume.metadata) {
          return (
            <div className="p-4 text-center text-muted-foreground">
              Unable to load personal information. Please refresh the page.
            </div>
          );
        }
        return (
          <PersonalInfoForm
            data={activeResume.metadata.personalInfo}
            onChange={handlePersonalInfoChange}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'summary':
        return (
          <div className="space-y-4">
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 -mx-4 -mt-4 mb-4 flex items-center min-h-10">
              <h3 className="font-semibold">{selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}</h3>
            </div>
            <RichTextEditor
              content={selectedSection.content.html || ''}
              onChange={handleSummaryChange}
              placeholder="Write a compelling professional summary..."
              minHeight="200px"
            />
          </div>
        );
      case 'experience':
        return (
          <ExperienceForm
            data={(selectedSection.content.data as Experience[]) || []}
            onChange={(data: Experience[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'education':
        return (
          <EducationForm
            data={(selectedSection.content.data as Education[]) || []}
            onChange={(data: Education[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'skills':
        return (
          <SkillsForm
            data={(selectedSection.content.data as SkillCategory[]) || []}
            onChange={(data: SkillCategory[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'projects':
        return (
          <ProjectsForm
            data={(selectedSection.content.data as Project[]) || []}
            onChange={(data: Project[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'certifications':
        return (
          <CertificationsForm
            data={(selectedSection.content.data as Certification[]) || []}
            onChange={(data: Certification[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'awards':
        return (
          <AwardsForm
            data={(selectedSection.content.data as Award[]) || []}
            onChange={(data: Award[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'languages':
        return (
          <LanguagesForm
            data={(selectedSection.content.data as Language[]) || []}
            onChange={(data: Language[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'volunteer':
        return (
          <VolunteerForm
            data={(selectedSection.content.data as Volunteer[]) || []}
            onChange={(data: Volunteer[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'publications':
        return (
          <PublicationsForm
            data={(selectedSection.content.data as Publication[]) || []}
            onChange={(data: Publication[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      case 'references':
        return (
          <ReferencesForm
            data={(selectedSection.content.data as Reference[]) || []}
            onChange={(data: Reference[]) => handleSectionDataChange(selectedSection.id, data)}
            title={selectedSection.content.title || SECTION_CONFIGS[selectedSection.type].defaultTitle}
          />
        );
      default:
        return (
          <div className="p-4 text-center text-muted-foreground">
            Section type "{selectedSection.type}" is not yet supported.
          </div>
        );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold text-destructive">Error loading resume</h2>
          <p className="text-muted-foreground">Failed to load resume. Please try again.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Resume not found
  if (!activeResume) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Resume not found</h2>
          <p className="text-muted-foreground">The resume you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur z-50">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left: Back + Resume Info */}
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-sm font-semibold truncate">{activeResume.name}</h1>
              <p className="text-xs text-muted-foreground">
                {activeResume.domain || activeResume.template}
              </p>
            </div>
          </div>

          {/* Center: Variation Manager */}
          {baseResume && (
            <div className="hidden md:flex items-center">
              <VariationManager
                baseResume={baseResume}
                variations={variations}
                currentResumeId={activeResume.id}
                onCreateVariation={handleCreateVariation}
                onSelectVariation={handleSelectVariation}
                onDeleteVariation={handleDeleteVariation}
              />
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <ExportButtons resume={activeResume} variant="dropdown" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>
        <PanelGroup orientation="horizontal" id="resume-editor-panels" style={{ height: '100%' }}>
          {/* Left Panel - VS Code style collapsible sections */}
          <Panel 
            defaultSize="20%" 
            minSize="15%" 
            maxSize="40%"
            id="left-panel"
          >
            <ScrollArea className="h-full border-r">
              <div className="flex flex-col">
                {/* CONTENT Section */}
                <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 transition-transform ${contentOpen ? '' : '-rotate-90'}`} />
                      <Layers className="h-4 w-4" />
                      <span>Sections</span>
                    </div>
                    <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[10px]">
                      {activeResume.sections.length}
                    </span>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2">
                      <SectionsManager
                        sections={activeResume.sections}
                        onSectionsChange={handleSectionsReorder}
                        onAddSection={handleAddSection}
                        onDeleteSection={handleDeleteSection}
                        onSelectSection={setSelectedSectionId}
                        selectedSectionId={selectedSectionId || undefined}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* DESIGN Section */}
                <Collapsible open={designOpen} onOpenChange={setDesignOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/50 transition-colors border-t">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 transition-transform ${designOpen ? '' : '-rotate-90'}`} />
                      <Palette className="h-4 w-4" />
                      <span>Design</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-2 pb-2">
                      <p className="text-xs text-muted-foreground px-2 mb-2">Choose a template style</p>
                      <p className="text-xs px-2 mb-3">Current: <span className="font-medium">{activeResume.template}</span></p>
                      <TemplateSelector
                        currentTemplate={activeResume.template}
                        onSelect={handleTemplateChange}
                        onColorChange={handleColorChange}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* ACTIVITY Section */}
                <Collapsible open={activityOpen} onOpenChange={setActivityOpen}>
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider hover:bg-accent/50 transition-colors border-t">
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 transition-transform ${activityOpen ? '' : '-rotate-90'}`} />
                      <Clock className="h-4 w-4" />
                      <span>Activity</span>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <p className="text-xs text-muted-foreground mb-2">{currentActivityLog.length} changes</p>
                      {currentActivityLog.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No activity yet</p>
                      ) : (
                        <ChangeLog logs={currentActivityLog} />
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </ScrollArea>
          </Panel>
          
          <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/50 active:bg-primary transition-colors" />

          {/* Middle Panel - Form Editor */}
          <Panel 
            defaultSize="30%" 
            minSize="20%" 
            maxSize="50%"
            id="form-panel"
          >
            <div className="h-full flex flex-col border-r">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {selectedSection ? (
                    renderSectionForm()
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Layout className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a section to edit</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          </Panel>

          <PanelResizeHandle className="w-1.5 bg-border hover:bg-primary/50 active:bg-primary transition-colors" />

          {/* Right Panel - Preview */}
          <Panel defaultSize="50%" minSize="20%" id="right-panel">
            <div className="h-full flex flex-col bg-muted/30 overflow-hidden">
              {/* Formatting Toolbar with all settings */}
              {activeResume.metadata && (
                <FormattingToolbar
                  settings={activeResume.metadata.settings}
                  onSettingsChange={handleSettingsChange}
                  scale={previewScale}
                  onScaleChange={setPreviewScale}
                />
              )}

              {/* Preview Area */}
              <div className="flex-1 overflow-auto">
                <div className="min-h-full flex items-start justify-center p-8">
                  <Preview resume={activeResume} scale={previewScale} />
                </div>
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
}
