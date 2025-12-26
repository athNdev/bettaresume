'use client';

import { useEffect, useState, lazy, Suspense, memo, useCallback, useMemo } from 'react';
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
import { ProtectedRoute, UserMenu } from '@/components/auth';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const ExportButtons = lazy(() => import('@/components/export/export-buttons').then(m => ({ default: m.ExportButtons })));
const VersionManager = lazy(() => import('@/components/version-manager').then(m => ({ default: m.VersionManager })));
const VariationManager = lazy(() => import('@/components/variation-manager').then(m => ({ default: m.VariationManager })));
const TemplateSelector = lazy(() => import('@/components/template-selector').then(m => ({ default: m.TemplateSelector })));
const InlineSettingsToolbar = lazy(() => import('@/components/inline-settings-toolbar').then(m => ({ default: m.InlineSettingsToolbar })));
const VersionFlowTree = lazy(() => import('@/components/version-flow-tree').then(m => ({ default: m.VersionFlowTree })));
const ResumeBreadcrumb = lazy(() => import('@/components/resume-breadcrumb').then(m => ({ default: m.ResumeBreadcrumb })));
const ResumeRenderer = lazy(() => import('@/components/resume/resume-renderer'));
const PageManager = lazy(() => import('@/components/page-manager').then(m => ({ default: m.PageManager })));
const AdvancedEditor = lazy(() => import('@/components/editor/advanced-editor').then(m => ({ default: m.AdvancedEditor })));

// Import section forms (lazy loaded)
const PersonalInfoForm = lazy(() => import('@/components/sections').then(m => ({ default: m.PersonalInfoForm })));
const ExperienceForm = lazy(() => import('@/components/sections').then(m => ({ default: m.ExperienceForm })));
const EducationForm = lazy(() => import('@/components/sections').then(m => ({ default: m.EducationForm })));
const SkillsForm = lazy(() => import('@/components/sections').then(m => ({ default: m.SkillsForm })));
const ProjectsForm = lazy(() => import('@/components/sections').then(m => ({ default: m.ProjectsForm })));
const CertificationsForm = lazy(() => import('@/components/sections').then(m => ({ default: m.CertificationsForm })));
const AwardsForm = lazy(() => import('@/components/sections').then(m => ({ default: m.AwardsForm })));
const LanguagesForm = lazy(() => import('@/components/sections').then(m => ({ default: m.LanguagesForm })));
const VolunteerForm = lazy(() => import('@/components/sections').then(m => ({ default: m.VolunteerForm })));
const PublicationsForm = lazy(() => import('@/components/sections').then(m => ({ default: m.PublicationsForm })));
const ReferencesForm = lazy(() => import('@/components/sections').then(m => ({ default: m.ReferencesForm })));

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
  Copy,
  Moon,
  Sun,
  ZoomIn,
  ZoomOut,
  User,
  Briefcase,
  GraduationCap,
  Zap,
  FolderKanban,
  Award as AwardIcon,
  Trophy,
  Globe,
  BookOpen,
  Heart,
  Users,
  FilePlus
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

// Loading fallback component
const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
});

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

// Section icon components mapping
const SECTION_ICON_COMPONENTS: Record<SectionType, React.ComponentType<{ className?: string }>> = {
  'personal-info': User,
  'summary': FileText,
  'experience': Briefcase,
  'education': GraduationCap,
  'skills': Zap,
  'projects': FolderKanban,
  'certifications': AwardIcon,
  'awards': Trophy,
  'languages': Globe,
  'publications': BookOpen,
  'volunteer': Heart,
  'references': Users,
  'custom': FilePlus
};

// Helper to render section icon
function SectionIcon({ type, className = 'h-4 w-4' }: { type: SectionType; className?: string }) {
  const IconComponent = SECTION_ICON_COMPONENTS[type] || FilePlus;
  return <IconComponent className={className} />;
}

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
        <SectionIcon type={section.type} className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
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
            data={activeResume.metadata?.personalInfo || { fullName: '', email: '' }} 
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
          <AdvancedEditor 
            content={activeSection.content.html || ''} 
            onChange={(html) => updateSection(resumeId, activeSectionId!, { 
              content: { ...activeSection.content, html } 
            })}
            placeholder="Write your professional summary here..."
            minHeight="250px"
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
    <ProtectedRoute>
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
            
            {/* Resume Breadcrumb - shows base/variation state */}
            <Suspense fallback={<LoadingFallback />}>
              <ResumeBreadcrumb resumeId={resumeId} />
            </Suspense>

            <Separator orientation="vertical" className="h-6" />

            {/* Editable Name */}
            <div className="flex items-center gap-2">
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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      className="flex items-center gap-1 hover:bg-accent px-2 py-1 rounded group text-muted-foreground hover:text-foreground"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="text-xs">Rename</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Click to rename</TooltipContent>
                </Tooltip>
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
            <Suspense fallback={<LoadingFallback />}>
              <VersionManager resumeId={resumeId} />
              <VariationManager resumeId={resumeId} />
              <VersionFlowTree resumeId={resumeId} />
              <TemplateSelector resumeId={resumeId} />
            </Suspense>
            
            <Separator orientation="vertical" className="h-6" />
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={() => setShowPreview(!showPreview)}>
                  {showPreview ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showPreview ? 'Hide Preview' : 'Show Preview'}</TooltipContent>
            </Tooltip>
            
            <Suspense fallback={<LoadingFallback />}>
              <ExportButtons resumeId={resumeId} />
            </Suspense>
            <ThemeToggle />
            <div className="ml-1 pl-2 border-l">
              <UserMenu />
            </div>
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
                
                <div className="p-3 border-t space-y-2">
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
                          <SectionIcon type={type} className="h-4 w-4 mr-2 text-muted-foreground" />
                          {SECTION_LABELS[type]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <PageManager resumeId={resumeId} variant="panel" />
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
                      <SectionIcon type={activeSection.type} className="h-5 w-5 text-muted-foreground" />
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
                      <Suspense fallback={<div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                        {renderSectionEditor()}
                      </Suspense>
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
                    {/* Inline Settings Toolbar */}
                    <div className="p-2 border-b bg-card flex-shrink-0 space-y-2">
                      {/* Row 1: Template and Settings */}
                      <div className="flex items-center gap-2">
                        <Suspense fallback={<LoadingFallback />}>
                          <TemplateSelector resumeId={resumeId} compact />
                        </Suspense>
                        <Separator orientation="vertical" className="h-5" />
                        <Suspense fallback={<LoadingFallback />}>
                          <InlineSettingsToolbar resumeId={resumeId} />
                        </Suspense>
                      </div>
                      {/* Row 2: Zoom and Preview Controls */}
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => setPreviewScale(Math.max(30, previewScale - 10))}
                        >
                          <ZoomOut className="h-3 w-3" />
                        </Button>
                        <span className="text-xs text-muted-foreground w-8 text-center">{previewScale}%</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => setPreviewScale(Math.min(150, previewScale + 10))}
                        >
                          <ZoomIn className="h-3 w-3" />
                        </Button>
                        <Separator orientation="vertical" className="h-4 mx-1" />
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant={previewDarkMode ? "secondary" : "ghost"} 
                              size="sm" 
                              className="h-6 w-6 p-0"
                              onClick={() => setPreviewDarkMode(!previewDarkMode)}
                            >
                              {previewDarkMode ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{previewDarkMode ? 'Light preview' : 'Dark preview'}</p>
                          </TooltipContent>
                        </Tooltip>
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
                          <Suspense fallback={<div className="w-[794px] min-h-[1123px] bg-white flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
                            <ResumeRenderer 
                              resume={activeResume} 
                              darkMode={previewDarkMode}
                            />
                          </Suspense>
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
    </ProtectedRoute>
  );
}
