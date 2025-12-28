'use client';

import { useEffect, useState, lazy, Suspense, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from '@/components/theme-toggle';
import { ProtectedRoute, UserMenu } from '@/components/auth';
import { Loader2 } from 'lucide-react';

// Lazy load heavy components
const ExportButtons = lazy(() => import('@/components/export/export-buttons').then(m => ({ default: m.ExportButtons })));
const ChangeLog = lazy(() => import('@/components/change-log').then(m => ({ default: m.ChangeLog })));
const TemplateSelector = lazy(() => import('@/components/template-selector').then(m => ({ default: m.TemplateSelector })));
const InlineSettingsToolbar = lazy(() => import('@/components/inline-settings-toolbar').then(m => ({ default: m.InlineSettingsToolbar })));
const VersionDropdown = lazy(() => import('@/components/version-dropdown').then(m => ({ default: m.VersionDropdown })));
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
  FilePlus,
  Link as LinkIcon,
  Unlink,
  RefreshCw,
  GitBranch,
  ChevronDown,
  ChevronRight,
  History,
  Palette,
  Layers,
  X,
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

// Target roles for tailored copies
const TARGET_ROLES = [
  { value: 'software', label: 'Software Engineering' },
  { value: 'data', label: 'Data Science / Analytics' },
  { value: 'product', label: 'Product Management' },
  { value: 'design', label: 'Design / UX' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'startup', label: 'Startup' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'custom', label: 'Custom...' },
];

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
  linkStatus?: 'linked' | 'customized' | 'base';
  onCustomize?: () => void;
  onResetToBase?: () => void;
  onCreateTailoredCopy?: () => void;
}

function SortableSection({ 
  section, 
  isActive, 
  onClick, 
  onToggleVisibility, 
  onDelete, 
  onDuplicate,
  linkStatus,
  onCustomize,
  onResetToBase,
  onCreateTailoredCopy,
}: SortableSectionProps) {
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
        {/* Link status indicator */}
        {linkStatus === 'linked' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <LinkIcon className="h-3 w-3 flex-shrink-0 text-blue-500" />
            </TooltipTrigger>
            <TooltipContent side="top">Linked to base - auto-syncs</TooltipContent>
          </Tooltip>
        )}
        {linkStatus === 'customized' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Pencil className="h-3 w-3 flex-shrink-0 text-orange-500" />
            </TooltipTrigger>
            <TooltipContent side="top">Customized - independent from base</TooltipContent>
          </Tooltip>
        )}
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
          <DropdownMenuContent align="end" className="w-48">
            {/* Create Tailored Copy option - only for base resumes */}
            {linkStatus === 'base' && onCreateTailoredCopy && (
              <>
                <DropdownMenuItem onClick={onCreateTailoredCopy}>
                  <GitBranch className="h-3 w-3 mr-2" />
                  Save as Tailored Copy
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            
            {/* Customize option - for linked sections in variations */}
            {linkStatus === 'linked' && onCustomize && (
              <DropdownMenuItem onClick={onCustomize}>
                <Unlink className="h-3 w-3 mr-2" />
                Customize (Unlink)
              </DropdownMenuItem>
            )}
            
            {/* Reset to Base option - for customized sections in variations */}
            {linkStatus === 'customized' && onResetToBase && (
              <DropdownMenuItem onClick={onResetToBase}>
                <RefreshCw className="h-3 w-3 mr-2" />
                Reset to Base
              </DropdownMenuItem>
            )}
            
            {(linkStatus === 'linked' || linkStatus === 'customized') && <DropdownMenuSeparator />}
            
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
  const router = useRouter();
  const resumeId = params.id as string;
  const { 
    activeResume, 
    setActiveResume, 
    updateSection, 
    deleteSection, 
    reorderSections, 
    addSection, 
    updateResume,
    duplicateSection,
    _hasHydrated,
    getSectionLinkStatus,
    customizeSection,
    resetSectionToBase,
    createVariationFromSection,
  } = useResumeStore();
  
  const { logSectionChange } = useResumeStore();
  
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [autoSaved, setAutoSaved] = useState(false);
  const [previewDarkMode, setPreviewDarkMode] = useState(false);
  const [previewScale, setPreviewScale] = useState(70);
  
  // State for pending changes - tracks unsaved changes per section
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({});
  const [originalData, setOriginalData] = useState<Record<string, unknown>>({});
  
  // State for "Save as Tailored Copy" dialog
  const [tailoredCopyDialogOpen, setTailoredCopyDialogOpen] = useState(false);
  const [tailoredCopySectionId, setTailoredCopySectionId] = useState<string | null>(null);
  const [tailoredCopyName, setTailoredCopyName] = useState('');
  const [tailoredCopyTargetRole, setTailoredCopyTargetRole] = useState('');
  const [tailoredCopyCustomRole, setTailoredCopyCustomRole] = useState('');
  
  // State for collapsible left panel groups - persisted to localStorage
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('editor-expanded-groups');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore parse errors
        }
      }
    }
    return {
      sections: true,
      tailored: false,
      template: false,
      history: false,
    };
  });
  
  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const newState = { ...prev, [group]: !prev[group] };
      localStorage.setItem('editor-expanded-groups', JSON.stringify(newState));
      return newState;
    });
  };
  
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Failsafe: force hydrated state after timeout to prevent indefinite loading
  const [forceHydrated, setForceHydrated] = useState(false);
  useEffect(() => {
    if (!_hasHydrated && !forceHydrated) {
      const timer = setTimeout(() => {
        console.warn('Hydration timeout - forcing hydrated state');
        setForceHydrated(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [_hasHydrated, forceHydrated]);

  // Track the previous resume ID to detect when we switch to a different resume
  const [prevResumeId, setPrevResumeId] = useState<string | null>(null);

  useEffect(() => { 
    if (resumeId) {
      setActiveResume(resumeId);
      
      // Reset active section when switching to a different resume
      if (prevResumeId && prevResumeId !== resumeId) {
        setActiveSectionId(null);
      }
      setPrevResumeId(resumeId);
    }
  }, [resumeId, setActiveResume, prevResumeId]);
  
  useEffect(() => { 
    // Set the first section as active when:
    // - We have a resume loaded
    // - AND either no section is selected OR the selected section doesn't exist in current resume
    if (activeResume) {
      const sectionExists = activeSectionId && activeResume.sections.some(s => s.id === activeSectionId);
      if (!sectionExists && activeResume.sections.length > 0) {
        setActiveSectionId(activeResume.sections[0]?.id);
      }
    }
  }, [activeResume, activeSectionId]);

  // Auto-save indicator
  const activeResumeUpdatedAt = activeResume?.updatedAt;
  useEffect(() => {
    if (activeResumeUpdatedAt) {
      setAutoSaved(true);
      const timer = setTimeout(() => setAutoSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [activeResumeUpdatedAt]);

  // Show loading while Zustand is hydrating from localStorage
  if (!_hasHydrated && !forceHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading resume...</p>
        </div>
      </div>
    );
  }

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

  // Auto-detach section when editing in tailored copy mode
  const autoDetachIfNeeded = (sectionId: string) => {
    if (activeResume.variationType === 'variation') {
      const linkStatus = getSectionLinkStatus(resumeId, sectionId);
      if (linkStatus === 'linked') {
        customizeSection(resumeId, sectionId);
      }
    }
  };

  // Check if a section has pending changes
  const hasPendingChanges = (sectionId: string) => {
    return pendingChanges[sectionId] !== undefined;
  };
  
  // Track changes without saving (buffer them)
  const handleBufferSectionContent = (content: unknown) => {
    if (!activeSectionId || !activeSection) return;
    
    // Store original data on first change
    if (originalData[activeSectionId] === undefined) {
      setOriginalData(prev => ({ ...prev, [activeSectionId]: activeSection.content.data }));
    }
    
    setPendingChanges(prev => ({ ...prev, [activeSectionId]: content }));
  };
  
  // Track personal info changes
  const handleBufferPersonalInfo = (data: PersonalInfo) => {
    if (!activeSectionId || !activeSection) return;
    
    // Store original data on first change
    if (originalData[activeSectionId] === undefined) {
      setOriginalData(prev => ({ ...prev, [activeSectionId]: activeResume.metadata?.personalInfo }));
    }
    
    setPendingChanges(prev => ({ ...prev, [activeSectionId]: data }));
  };
  
  // Track rich text changes (summary/custom)
  const handleBufferRichText = (html: string) => {
    if (!activeSectionId || !activeSection) return;
    
    // Store original data on first change
    if (originalData[activeSectionId] === undefined) {
      setOriginalData(prev => ({ ...prev, [activeSectionId]: { html: activeSection.content.html } }));
    }
    
    setPendingChanges(prev => ({ ...prev, [activeSectionId]: { html } }));
  };
  
  // Save pending changes and log them
  const handleSaveChanges = () => {
    if (!activeSectionId || !activeSection) return;
    
    const pendingData = pendingChanges[activeSectionId];
    if (pendingData === undefined) return;
    
    // Auto-detach this section if it's linked in a tailored copy
    autoDetachIfNeeded(activeSectionId);
    
    // Determine the change description based on section type
    let changeDescription = 'Saved changes';
    const originalSectionData = originalData[activeSectionId];
    
    if (activeSection.type === 'personal-info') {
      const data = pendingData as PersonalInfo;
      const oldData = originalSectionData as PersonalInfo | undefined;
      
      // Find which fields actually changed
      const changedFields: string[] = [];
      const fieldLabels: Record<string, string> = {
        fullName: 'name',
        email: 'email',
        phone: 'phone',
        location: 'location',
        linkedin: 'LinkedIn',
        github: 'GitHub',
        website: 'website',
        portfolio: 'portfolio',
        professionalTitle: 'title',
      };
      
      if (oldData) {
        for (const key of Object.keys(fieldLabels)) {
          const k = key as keyof PersonalInfo;
          if ((data[k] || '') !== (oldData[k] || '')) {
            changedFields.push(fieldLabels[key]);
          }
        }
      }
      
      if (changedFields.length === 1) {
        changeDescription = `Changed ${changedFields[0]}`;
      } else if (changedFields.length > 1) {
        changeDescription = `Changed ${changedFields.length} fields`;
      } else {
        changeDescription = 'Saved changes';
      }
      
      updateResume(resumeId, { 
        metadata: { ...activeResume.metadata, personalInfo: data } 
      });
    } else if (activeSection.type === 'summary' || activeSection.type === 'custom') {
      changeDescription = 'Updated content';
      const richTextData = pendingData as { html: string };
      updateSection(resumeId, activeSectionId, { 
        content: { ...activeSection.content, html: richTextData.html } 
      });
    } else if (Array.isArray(pendingData) && Array.isArray(originalSectionData)) {
      // Compare arrays to determine what changed
      const oldCount = originalSectionData.length;
      const newCount = pendingData.length;
      
      if (newCount > oldCount) {
        const diff = newCount - oldCount;
        changeDescription = `Added ${diff} ${diff === 1 ? 'entry' : 'entries'}`;
      } else if (newCount < oldCount) {
        const diff = oldCount - newCount;
        changeDescription = `Removed ${diff} ${diff === 1 ? 'entry' : 'entries'}`;
      } else {
        changeDescription = 'Edited content';
      }
      
      updateSection(resumeId, activeSectionId, { 
        content: { ...activeSection.content, data: pendingData } as ResumeSection['content'] 
      });
    } else if (Array.isArray(pendingData)) {
      changeDescription = 'Saved changes';
      updateSection(resumeId, activeSectionId, { 
        content: { ...activeSection.content, data: pendingData } as ResumeSection['content'] 
      });
    } else {
      updateSection(resumeId, activeSectionId, { 
        content: { ...activeSection.content, data: pendingData } as ResumeSection['content'] 
      });
    }
    
    // Log the change
    logSectionChange(resumeId, activeSection.type, changeDescription);
    
    // Clear pending changes for this section
    setPendingChanges(prev => {
      const newPending = { ...prev };
      delete newPending[activeSectionId];
      return newPending;
    });
    setOriginalData(prev => {
      const newOriginal = { ...prev };
      delete newOriginal[activeSectionId];
      return newOriginal;
    });
  };
  
  // Discard pending changes
  const handleDiscardChanges = () => {
    if (!activeSectionId) return;
    
    setPendingChanges(prev => {
      const newPending = { ...prev };
      delete newPending[activeSectionId];
      return newPending;
    });
    setOriginalData(prev => {
      const newOriginal = { ...prev };
      delete newOriginal[activeSectionId];
      return newOriginal;
    });
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
    const sectionId = activeSection.id;
    
    // Get data to display (pending changes if any, otherwise saved data)
    const getDisplayData = <T,>(savedData: T): T => {
      const pending = pendingChanges[sectionId];
      return pending !== undefined ? pending as T : savedData;
    };
    
    switch (activeSection.type) {
      case 'personal-info': {
        const displayData = getDisplayData(activeResume.metadata?.personalInfo || { fullName: '', email: '' });
        return (
          <PersonalInfoForm 
            data={displayData as PersonalInfo} 
            onChange={handleBufferPersonalInfo} 
          />
        );
      }
      
      case 'experience': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Experience[] : []);
        return (
          <ExperienceForm 
            data={displayData as Experience[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'education': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Education[] : []);
        return (
          <EducationForm 
            data={displayData as Education[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'skills': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as SkillCategory[] : []);
        return (
          <SkillsForm 
            data={displayData as SkillCategory[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'projects': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Project[] : []);
        return (
          <ProjectsForm 
            data={displayData as Project[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'certifications': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Certification[] : []);
        return (
          <CertificationsForm 
            data={displayData as Certification[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'awards': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Award[] : []);
        return (
          <AwardsForm 
            data={displayData as Award[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'languages': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Language[] : []);
        return (
          <LanguagesForm 
            data={displayData as Language[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'volunteer': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Volunteer[] : []);
        return (
          <VolunteerForm 
            data={displayData as Volunteer[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'publications': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Publication[] : []);
        return (
          <PublicationsForm 
            data={displayData as Publication[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'references': {
        const displayData = getDisplayData(Array.isArray(sectionData) ? sectionData as Reference[] : []);
        return (
          <ReferencesForm 
            data={displayData as Reference[]} 
            onChange={handleBufferSectionContent} 
          />
        );
      }
      
      case 'summary':
      case 'custom': {
        // For rich text, get pending HTML if any
        const pendingRichText = pendingChanges[sectionId] as { html?: string } | undefined;
        const displayHtml = pendingRichText?.html ?? activeSection.content.html ?? '';
        return (
          <AdvancedEditor 
            content={displayHtml} 
            onChange={handleBufferRichText}
            placeholder="Write your professional summary here..."
            minHeight="250px"
          />
        );
      }
      
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
            
            {/* Version Dropdown - primary way to switch versions */}
            <Suspense fallback={<LoadingFallback />}>
              <VersionDropdown resumeId={resumeId} />
            </Suspense>

            {autoSaved && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Check className="h-3 w-3 text-green-500" />
                Saved
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
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
            {/* Left Sidebar - VSCode-style collapsible groups */}
            <Panel id="sections" defaultSize={18} minSize={14} maxSize={28}>
              <aside className="h-full border-r bg-card flex flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  {/* SECTIONS Group */}
                  <div className="border-b">
                    <button
                      onClick={() => toggleGroup('sections')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left"
                    >
                      {expandedGroups.sections ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Layers className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider flex-1">Content</span>
                      <Badge variant="secondary" className="text-[10px] h-5">{activeResume.sections.length}</Badge>
                    </button>
                    {expandedGroups.sections && (
                      <div className="pb-2">
                        {/* Link status summary for tailored copies */}
                        {activeResume.variationType === 'variation' && (
                          <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/30 mx-2 mb-1 rounded">
                            <span className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <LinkIcon className="h-3 w-3 text-blue-500" />
                                {activeResume.sections.filter(s => s.linkedToBase !== false).length} synced
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span className="flex items-center gap-1">
                                <Pencil className="h-3 w-3 text-orange-500" />
                                {activeResume.sections.filter(s => s.linkedToBase === false).length} custom
                              </span>
                            </span>
                          </div>
                        )}
                        <div className="px-2">
                          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={activeResume.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                              <div className="space-y-0.5">
                                {activeResume.sections.map((section) => (
                                  <SortableSection 
                                    key={section.id} 
                                    section={section} 
                                    isActive={section.id === activeSectionId} 
                                    onClick={() => setActiveSectionId(section.id)}
                                    onToggleVisibility={() => updateSection(resumeId, section.id, { visible: !section.visible })} 
                                    onDelete={() => confirmDeleteSection(section.id)}
                                    onDuplicate={() => handleDuplicateSection(section.id)}
                                    linkStatus={getSectionLinkStatus(resumeId, section.id)}
                                    onCustomize={() => customizeSection(resumeId, section.id)}
                                    onResetToBase={() => resetSectionToBase(resumeId, section.id)}
                                    onCreateTailoredCopy={() => {
                                      setTailoredCopySectionId(section.id);
                                      setTailoredCopyName(`${activeResume.name} - Tailored`);
                                      setTailoredCopyDialogOpen(true);
                                    }}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                        <div className="px-2 pt-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full h-7 text-xs">
                                <Plus className="h-3 w-3 mr-1" />
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
                        </div>
                      </div>
                    )}
                  </div>

                  {/* TEMPLATE Group */}
                  <div className="border-b">
                    <button
                      onClick={() => toggleGroup('template')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left"
                    >
                      {expandedGroups.template ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <Palette className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider flex-1">Design</span>
                    </button>
                    {expandedGroups.template && (
                      <div className="px-2 pb-2">
                        <p className="text-[10px] text-muted-foreground px-1 mb-2">Choose a template style</p>
                        <Suspense fallback={<LoadingFallback />}>
                          <TemplateSelector resumeId={resumeId} variant="panel" />
                        </Suspense>
                      </div>
                    )}
                  </div>

                  {/* HISTORY Group */}
                  <div className="border-b">
                    <button
                      onClick={() => toggleGroup('history')}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent/50 text-left"
                    >
                      {expandedGroups.history ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <History className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-semibold uppercase tracking-wider flex-1">Activity</span>
                    </button>
                    {expandedGroups.history && (
                      <div className="px-2 pb-2">
                        <Suspense fallback={<LoadingFallback />}>
                          <ChangeLog resumeId={resumeId} variant="panel" />
                        </Suspense>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                
                {/* Bottom: Page Manager */}
                <div className="p-2 border-t">
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
                      {/* Link status badge for tailored copies */}
                      {activeResume.variationType === 'variation' && (
                        getSectionLinkStatus(resumeId, activeSection.id) === 'linked' ? (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                            <LinkIcon className="h-3 w-3 mr-1" />
                            Synced
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/30">
                            <Pencil className="h-3 w-3 mr-1" />
                            Custom
                          </Badge>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Quick link/customize buttons for tailored copies */}
                      {activeResume.variationType === 'variation' && (
                        getSectionLinkStatus(resumeId, activeSection.id) === 'linked' ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => customizeSection(resumeId, activeSection.id)}
                                className="text-xs"
                              >
                                <Unlink className="h-3 w-3 mr-1" />
                                Edit Here
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Make changes specific to this version</TooltipContent>
                          </Tooltip>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => resetSectionToBase(resumeId, activeSection.id)}
                                className="text-xs"
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Restore
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restore to match the main resume</TooltipContent>
                          </Tooltip>
                        )
                      )}
                      
                      {/* Save as Tailored Copy button for base resumes */}
                      {activeResume.variationType === 'base' && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setTailoredCopySectionId(activeSection.id);
                                setTailoredCopyName(`${activeResume.name} - Tailored`);
                                setTailoredCopyDialogOpen(true);
                              }}
                              className="text-xs"
                            >
                              <GitBranch className="h-3 w-3 mr-1" />
                              Save as Tailored Copy
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create a tailored copy starting with this section customized</TooltipContent>
                        </Tooltip>
                      )}
                      
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
                
                {/* Save Changes Bar - shows when there are pending changes */}
                {activeSection && hasPendingChanges(activeSection.id) && (
                  <div className="px-4 py-2.5 border-b bg-primary/5 border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-primary">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-sm">Unsaved changes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleDiscardChanges}
                        className="text-xs h-7"
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleSaveChanges}
                        className="text-xs h-7"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Save
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
                    {/* Inline Settings Toolbar - Single Row */}
                    <div className="px-2 py-1.5 border-b bg-card flex-shrink-0 flex items-center gap-2">
                      <Suspense fallback={<LoadingFallback />}>
                        <InlineSettingsToolbar resumeId={resumeId} />
                      </Suspense>
                      <div className="flex-1" />
                      {/* Zoom Controls */}
                      <div className="flex items-center gap-0.5">
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
                      </div>
                      <Separator orientation="vertical" className="h-4" />
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
                    
                    {/* Preview Content */}
                    <ScrollArea className="flex-1">
                      <div 
                        className="p-4 flex justify-center"
                        style={{ backgroundColor: previewDarkMode ? '#1a1a1a' : '#f5f5f5' }}
                      >
                        <div 
                          className="shadow-lg rounded"
                          style={{
                            transform: `scale(${previewScale / 100})`,
                            transformOrigin: 'top center',
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

      {/* Create Tailored Copy Dialog */}
      <AlertDialog open={tailoredCopyDialogOpen} onOpenChange={setTailoredCopyDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Create Tailored Copy
            </AlertDialogTitle>
            <AlertDialogDescription>
              Create a new tailored copy starting with this section customized. All other sections will stay linked to the base and auto-update.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Copy Name</label>
              <Input
                value={tailoredCopyName}
                onChange={(e) => setTailoredCopyName(e.target.value)}
                placeholder="e.g., Google Software Engineer Application"
              />
              <p className="text-xs text-muted-foreground">
                Give this copy a memorable name to help you identify it later
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Target Role / Industry</label>
              <Select value={tailoredCopyTargetRole} onValueChange={setTailoredCopyTargetRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a target" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tailoredCopyTargetRole === 'custom' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Custom Target</label>
                <Input
                  value={tailoredCopyCustomRole}
                  onChange={(e) => setTailoredCopyCustomRole(e.target.value)}
                  placeholder="Enter your target role or industry"
                />
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setTailoredCopyName('');
              setTailoredCopyTargetRole('');
              setTailoredCopyCustomRole('');
              setTailoredCopySectionId(null);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                const finalDomain = tailoredCopyTargetRole === 'custom' ? tailoredCopyCustomRole : tailoredCopyTargetRole;
                if (tailoredCopySectionId && tailoredCopyName.trim() && finalDomain) {
                  // Get the current section content
                  const section = activeResume?.sections.find(s => s.id === tailoredCopySectionId);
                  if (section) {
                    const newVariationId = createVariationFromSection(
                      resumeId,
                      tailoredCopySectionId,
                      finalDomain,
                      tailoredCopyName.trim(),
                      { content: section.content }
                    );
                    // Navigate to the new tailored copy
                    if (newVariationId) {
                      router.push(`/editor/${newVariationId}`);
                    }
                  }
                }
                setTailoredCopyName('');
                setTailoredCopyTargetRole('');
                setTailoredCopyCustomRole('');
                setTailoredCopySectionId(null);
                setTailoredCopyDialogOpen(false);
              }}
              disabled={!tailoredCopyName.trim() || !tailoredCopyTargetRole || (tailoredCopyTargetRole === 'custom' && !tailoredCopyCustomRole)}
            >
              Create Tailored Copy
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
    </ProtectedRoute>
  );
}
