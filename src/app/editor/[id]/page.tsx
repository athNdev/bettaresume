'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ThemeToggle } from '@/components/theme-toggle';
import { ExportButtons } from '@/components/export/export-buttons';
import { VersionManager } from '@/components/version-manager';
import { VariationManager } from '@/components/variation-manager';
import { TemplateSelector } from '@/components/template-selector';
import { SettingsPanel } from '@/components/settings-panel';
import { ResumeRenderer } from '@/components/resume/resume-renderer';
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
  ReferencesForm
} from '@/components/sections';
import { RichTextEditor } from '@/components/editor/rich-text-editor';
import { 
  ArrowLeft, 
  Plus, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Trash2, 
  FileText,
  MoreVertical,
  PanelRightClose,
  PanelRightOpen,
  Check,
  Pencil,
  GitBranch,
  Copy,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import Link from 'next/link';
import type { 
  ResumeSection, 
  SectionType, 
  Experience, 
  Education, 
  PersonalInfo,
  SkillCategory,
  Project,
  Certification,
  Award,
  Language,
  Volunteer,
  Publication,
  Reference
} from '@/types/resume';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';

// Custom styled resize handle for panels
function ResizeHandle({ className = '' }: { className?: string }) {
  return (
    <PanelResizeHandle
      className={`
        w-2 bg-border hover:bg-primary/50 active:bg-primary
        transition-colors cursor-col-resize
        flex items-center justify-center
        ${className}
      `}
    >
      <div className="w-0.5 h-8 bg-muted-foreground/30 rounded-full" />
    </PanelResizeHandle>
  );
}

// Section icon mapping
const SECTION_ICONS: Record<SectionType, string> = {
  'personal-info': '👤',
  'summary': '📝',
  'experience': '💼',
  'education': '🎓',
  'skills': '⚡',
  'projects': '🚀',
  'certifications': '📜',
  'awards': '🏆',
  'languages': '🌍',
  'publications': '📚',
  'volunteer': '🤝',
  'references': '📇',
  'custom': '📄'
};

// Section labels
const SECTION_LABELS: Record<SectionType, string> = {
  'personal-info': 'Personal Info',
  'summary': 'Summary',
  'experience': 'Experience',
  'education': 'Education',
  'skills': 'Skills',
  'projects': 'Projects',
  'certifications': 'Certifications',
  'awards': 'Awards',
  'languages': 'Languages',
  'publications': 'Publications',
  'volunteer': 'Volunteer',
  'references': 'References',
  'custom': 'Custom'
};

interface SortableSectionProps {
  section: ResumeSection;
  isActive: boolean;
  onClick: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

function SortableSection({ section, isActive, onClick, onToggleVisibility, onDelete, onDuplicate }: SortableSectionProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  
  const style = { 
    transform: CSS.Transform.toString(transform), 
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`group flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-all ${
        isActive 
          ? 'bg-primary/10 border border-primary/30 text-primary' 
          : 'hover:bg-accent/50 border border-transparent'
      } ${!section.visible ? 'opacity-50' : ''}`}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <button onClick={onClick} className="flex-1 flex items-center gap-2 text-left min-w-0">
        <span className="flex-shrink-0">{SECTION_ICONS[section.type] || '📄'}</span>
        <span className="text-sm truncate">
          {section.content.title || SECTION_LABELS[section.type]}
        </span>
      </button>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6" 
                onClick={(e) => { e.stopPropagation(); onToggleVisibility(); }}
              >
                {section.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{section.visible ? 'Hide' : 'Show'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => e.stopPropagation()}>
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3 w-3 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {section.type !== 'personal-info' && (
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="h-3 w-3 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default function EditorPage() {
  const params = useParams();
  const resumeId = params.id as string;
  const { 
    activeResume, 
    setActiveResume, 
    updateSection, 
    deleteSection, 
    reorderSections, 
    addSection, 
    updateResume,
    duplicateSection
  } = useResumeStore();
  
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [previewDarkMode, setPreviewDarkMode] = useState(false);
  const [previewScale, setPreviewScale] = useState(70);
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { 
    if (resumeId) setActiveResume(resumeId); 
  }, [resumeId, setActiveResume]);
  
  useEffect(() => { 
    if (activeResume && !activeSectionId) {
      setActiveSectionId(activeResume.sections[0]?.id);
    }
  }, [activeResume, activeSectionId]);

  const activeResumeName = activeResume?.name;
  useEffect(() => {
    if (activeResumeName) {
      setEditedName(activeResumeName);
    }
  }, [activeResumeName]);

  // Auto-save indicator
  const activeResumeUpdatedAt = activeResume?.updatedAt;
  useEffect(() => {
    if (activeResumeUpdatedAt) {
      setAutoSaved(true);
      const timer = setTimeout(() => setAutoSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeResumeUpdatedAt]);

  if (!activeResume) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Resume not found</h1>
          <Link href="/dashboard">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const activeSection = activeResume.sections.find(s => s.id === activeSectionId);
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = activeResume.sections.findIndex(s => s.id === active.id);
      const newIndex = activeResume.sections.findIndex(s => s.id === over.id);
      const newOrder = arrayMove(activeResume.sections, oldIndex, newIndex);
      reorderSections(resumeId, newOrder.map(s => s.id));
    }
  };

  const handleAddSection = (type: SectionType) => {
    const defaultData = getDefaultSectionData(type);
    addSection(resumeId, { 
      type, 
      visible: true, 
      content: { 
        title: SECTION_LABELS[type], 
        data: defaultData as Record<string, unknown> 
      } 
    });
  };

  const getDefaultSectionData = (type: SectionType): unknown[] | Record<string, unknown> => {
    switch (type) {
      case 'experience':
      case 'education':
      case 'projects':
      case 'certifications':
      case 'awards':
      case 'languages':
      case 'publications':
      case 'volunteer':
      case 'references':
        return [];
      case 'skills':
        return [];
      default:
        return {};
    }
  };

  const handleUpdateSectionContent = (content: unknown) => {
    if (!activeSectionId || !activeSection) return;
    updateSection(resumeId, activeSectionId, { 
      content: { ...activeSection.content, data: content } as ResumeSection['content'] 
    });
  };

  const handleUpdatePersonalInfo = (data: PersonalInfo) => {
    updateResume(resumeId, { 
      metadata: { ...activeResume.metadata, personalInfo: data } 
    });
  };

  const handleUpdateName = () => {
    if (editedName.trim() && editedName !== activeResume.name) {
      updateResume(resumeId, { name: editedName.trim() });
    }
    setIsEditingName(false);
  };

  const confirmDeleteSection = (sectionId: string) => {
    setSectionToDelete(sectionId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSection = () => {
    if (sectionToDelete) {
      deleteSection(resumeId, sectionToDelete);
      if (activeSectionId === sectionToDelete) {
        setActiveSectionId(activeResume.sections[0]?.id || null);
      }
      setSectionToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleDuplicateSection = (sectionId: string) => {
    duplicateSection(resumeId, sectionId);
  };

  const renderSectionEditor = () => {
    if (!activeSection) return null;
    
    const sectionData = activeSection.content.data;
    
    switch (activeSection.type) {
      case 'personal-info': 
        return (
          <PersonalInfoForm 
            data={activeResume.metadata.personalInfo} 
            onChange={handleUpdatePersonalInfo} 
          />
        );
      
      case 'experience': 
        return (
          <ExperienceForm 
            data={Array.isArray(sectionData) ? sectionData as Experience[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'education': 
        return (
          <EducationForm 
            data={Array.isArray(sectionData) ? sectionData as Education[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'skills':
        return (
          <SkillsForm 
            data={Array.isArray(sectionData) ? sectionData as SkillCategory[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'projects':
        return (
          <ProjectsForm 
            data={Array.isArray(sectionData) ? sectionData as Project[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'certifications':
        return (
          <CertificationsForm 
            data={Array.isArray(sectionData) ? sectionData as Certification[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'awards':
        return (
          <AwardsForm 
            data={Array.isArray(sectionData) ? sectionData as Award[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'languages':
        return (
          <LanguagesForm 
            data={Array.isArray(sectionData) ? sectionData as Language[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'volunteer':
        return (
          <VolunteerForm 
            data={Array.isArray(sectionData) ? sectionData as Volunteer[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'publications':
        return (
          <PublicationsForm 
            data={Array.isArray(sectionData) ? sectionData as Publication[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'references':
        return (
          <ReferencesForm 
            data={Array.isArray(sectionData) ? sectionData as Reference[] : []} 
            onChange={handleUpdateSectionContent} 
          />
        );
      
      case 'summary':
      case 'custom': 
        return (
          <RichTextEditor 
            content={activeSection.content.html || ''} 
            onChange={(html) => updateSection(resumeId, activeSectionId!, { 
              content: { ...activeSection.content, html } 
            })} 
          />
        );
      
      default: 
        return (
          <div className="text-muted-foreground text-sm p-4 text-center">
            Editor for {activeSection.type} coming soon
          </div>
        );
    }
  };

  // Available sections to add
  const availableSections: SectionType[] = [
    'summary', 'experience', 'education', 'skills', 'projects', 
    'certifications', 'awards', 'languages', 'volunteer', 'publications', 'references', 'custom'
  ];

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {isEditingName ? (
                <div className="flex items-center gap-1">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onBlur={handleUpdateName}
                    onKeyDown={(e) => e.key === 'Enter' && handleUpdateName()}
                    className="h-7 w-48 text-sm"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUpdateName}>
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button 
                  className="flex items-center gap-1 hover:bg-accent px-2 py-1 rounded group"
                  onClick={() => setIsEditingName(true)}
                >
                  <span className="font-semibold">{activeResume.name}</span>
                  <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              
              {activeResume.variationType === 'variation' && (
                <Badge variant="secondary" className="text-xs">
                  <GitBranch className="h-3 w-3 mr-1" />
                  {activeResume.domain || 'Variation'}
                </Badge>
              )}
            </div>

            {autoSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Saved
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <VersionManager resumeId={resumeId} />
            <VariationManager resumeId={resumeId} />
            <TemplateSelector resumeId={resumeId} />
            <SettingsPanel resumeId={resumeId} />
            
            <Separator orientation="vertical" className="h-6" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showPreview ? 'Hide Preview' : 'Show Preview'}</TooltipContent>
            </Tooltip>
            
            <ExportButtons resumeId={resumeId} />
            <ThemeToggle />
          </div>
        </header>

        {/* Main Content with Resizable Panels */}
        <div className="flex-1 overflow-hidden">
          <PanelGroup direction="horizontal" className="h-full">
            {/* Left Sidebar - Sections */}
            <Panel id="sections" defaultSize={15} minSize={12} maxSize={25}>
              <aside className="h-full border-r bg-card flex flex-col">
                <div className="p-3 border-b">
                  <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Sections
                  </h2>
                </div>
                
                <ScrollArea className="flex-1">
                  <div className="p-2">
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                      <SortableContext items={activeResume.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                          {activeResume.sections.map((section) => (
                            <SortableSection 
                              key={section.id} 
                              section={section} 
                              isActive={section.id === activeSectionId} 
                              onClick={() => setActiveSectionId(section.id)}
                              onToggleVisibility={() => updateSection(resumeId, section.id, { visible: !section.visible })} 
                              onDelete={() => confirmDeleteSection(section.id)}
                              onDuplicate={() => handleDuplicateSection(section.id)}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                </ScrollArea>
                
                <div className="p-3 border-t">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Section
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      {availableSections.map(type => (
                        <DropdownMenuItem key={type} onClick={() => handleAddSection(type)}>
                          <span className="mr-2">{SECTION_ICONS[type]}</span>
                          {SECTION_LABELS[type]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </aside>
            </Panel>

            <ResizeHandle />

            {/* Main Editor */}
            <Panel id="editor" defaultSize={showPreview ? 45 : 85} minSize={30}>
              <main className="h-full overflow-hidden flex flex-col bg-muted/30">
                {activeSection && (
                  <div className="px-6 py-3 border-b bg-card flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{SECTION_ICONS[activeSection.type]}</span>
                      <h2 className="font-semibold">
                        {activeSection.content.title || SECTION_LABELS[activeSection.type]}
                      </h2>
                      {!activeSection.visible && (
                        <Badge variant="secondary" className="text-xs">Hidden</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => updateSection(resumeId, activeSection.id, { visible: !activeSection.visible })}
                      >
                        {activeSection.visible ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
                        {activeSection.visible ? 'Visible' : 'Hidden'}
                      </Button>
                    </div>
                  </div>
                )}
                
                <ScrollArea className="flex-1">
                  <div className="p-6">
                    <div className="max-w-4xl mx-auto">
                      {renderSectionEditor()}
                    </div>
                  </div>
                </ScrollArea>
              </main>
            </Panel>

            {/* Preview Panel */}
            {showPreview && (
              <>
                <ResizeHandle />
                <Panel id="preview" defaultSize={40} minSize={25} maxSize={60}>
                  <aside className="h-full bg-muted/20 flex flex-col">
                    {/* Preview Controls */}
                    <div className="p-2 border-b bg-card flex items-center justify-between gap-2 flex-shrink-0">
                      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Preview
                      </h2>
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => setPreviewScale(Math.max(30, previewScale - 10))}
                        >
                          <ZoomOut className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-10 text-center">{previewScale}%</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 w-7 p-0"
                          onClick={() => setPreviewScale(Math.min(150, previewScale + 10))}
                        >
                          <ZoomIn className="h-3.5 w-3.5" />
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant={previewDarkMode ? "secondary" : "ghost"} 
                              size="sm" 
                              className="h-7 w-7 p-0"
                              onClick={() => setPreviewDarkMode(!previewDarkMode)}
                            >
                              {previewDarkMode ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{previewDarkMode ? 'Light preview' : 'Dark preview (editing only)'}</p>
                          </TooltipContent>
                        </Tooltip>
                        <Badge variant="outline" className="text-xs capitalize ml-1">
                          {activeResume.template}
                        </Badge>
                      </div>
                    </div>
                    
                    {/* Preview Content */}
                    <ScrollArea className="flex-1">
                      <div 
                        className="p-4 flex justify-center"
                        style={{ backgroundColor: previewDarkMode ? '#1a1a1a' : '#f5f5f5' }}
                      >
                        <div 
                          className="shadow-lg rounded overflow-hidden"
                          style={{
                            transform: `scale(${previewScale / 100})`,
                            transformOrigin: 'top center',
                            width: '794px',
                            minHeight: '1123px',
                          }}
                        >
                          <ResumeRenderer 
                            resume={activeResume} 
                            darkMode={previewDarkMode}
                          />
                        </div>
                      </div>
                    </ScrollArea>
                  </aside>
                </Panel>
              </>
            )}
          </PanelGroup>
        </div>
      </div>

      {/* Delete Section Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Section</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this section? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
