'use client';

import { useMemo } from 'react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { GripVertical, Plus, Trash2, Eye, EyeOff, MoreVertical, User, FileText, Briefcase, GraduationCap, Zap, Rocket, Award, Trophy, Globe, BookOpen, Heart, Users, FileQuestion } from 'lucide-react';
import type { ResumeSection, SectionType, ResumePage } from '@/types/resume';
import { SECTION_CONFIGS } from '@/types/resume';
import { cn } from '@/lib/utils';

interface SectionsManagerProps {
  sections: ResumeSection[];
  pages?: ResumePage[];
  onSectionsChange: (sections: ResumeSection[]) => void;
  onPagesChange?: (pages: ResumePage[]) => void;
  onAddSection: (type: SectionType) => void;
  onDeleteSection: (id: string) => void;
  onSelectSection: (id: string) => void;
  selectedSectionId?: string;
}

const SECTION_ICONS: Record<SectionType, React.ReactNode> = {
  'personal-info': <User className="h-4 w-4" />,
  'summary': <FileText className="h-4 w-4" />,
  'experience': <Briefcase className="h-4 w-4" />,
  'education': <GraduationCap className="h-4 w-4" />,
  'skills': <Zap className="h-4 w-4" />,
  'projects': <Rocket className="h-4 w-4" />,
  'certifications': <Award className="h-4 w-4" />,
  'awards': <Trophy className="h-4 w-4" />,
  'languages': <Globe className="h-4 w-4" />,
  'publications': <BookOpen className="h-4 w-4" />,
  'volunteer': <Heart className="h-4 w-4" />,
  'references': <Users className="h-4 w-4" />,
  'custom': <FileQuestion className="h-4 w-4" />,
};

interface SortableSectionItemProps {
  section: ResumeSection;
  isSelected: boolean;
  onToggleVisibility: (id: string) => void;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

function SortableSectionItem({ section, isSelected, onToggleVisibility, onDelete, onSelect }: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const config = SECTION_CONFIGS[section.type];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors group',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
        !section.visible && 'opacity-50'
      )}
      onClick={() => onSelect(section.id)}
    >
      <button {...attributes} {...listeners} className="cursor-grab touch-none opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <span className="text-muted-foreground shrink-0">
        {SECTION_ICONS[section.type]}
      </span>
      <span className="text-sm flex-1 truncate">
        {section.content.title || config.defaultTitle}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={(e) => { e.stopPropagation(); onToggleVisibility(section.id); }}
        >
          {section.visible ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3 text-muted-foreground" />
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function SectionsManager({
  sections,
  onSectionsChange,
  onAddSection,
  onDeleteSection,
  onSelectSection,
  selectedSectionId,
}: SectionsManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const sortedSections = useMemo(
    () => [...sections].sort((a, b) => a.order - b.order),
    [sections]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedSections.findIndex((s) => s.id === active.id);
    const newIndex = sortedSections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sortedSections, oldIndex, newIndex);
    
    // Update order values
    const updatedSections = reordered.map((section, index) => ({
      ...section,
      order: index,
    }));
    
    onSectionsChange(updatedSections);
  };

  const toggleVisibility = (id: string) => {
    onSectionsChange(
      sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s))
    );
  };

  // Get available section types that haven't been added yet (for unique sections like personal-info)
  const uniqueSections: SectionType[] = ['personal-info', 'summary'];
  const existingSectionTypes = sections.map((s) => s.type);
  const availableSections = Object.keys(SECTION_CONFIGS).filter(
    (type) => !uniqueSections.includes(type as SectionType) || !existingSectionTypes.includes(type as SectionType)
  ) as SectionType[];

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortedSections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-1">
            {sortedSections.map((section) => (
              <SortableSectionItem
                key={section.id}
                section={section}
                isSelected={section.id === selectedSectionId}
                onToggleVisibility={toggleVisibility}
                onDelete={onDeleteSection}
                onSelect={onSelectSection}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add Section Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Section
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-48">
          {availableSections.map((type) => (
            <DropdownMenuItem key={type} onClick={() => onAddSection(type)}>
              {SECTION_ICONS[type]}
              <span className="ml-2">{SECTION_CONFIGS[type].label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {sortedSections.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">No sections yet</p>
          <p className="text-xs">Add sections to build your resume</p>
        </div>
      )}
    </div>
  );
}
