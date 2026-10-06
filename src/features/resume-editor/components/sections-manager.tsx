"use client";

import {
	closestCenter,
	DndContext,
	type DragEndEvent,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
	Award,
	BookOpen,
	Briefcase,
	Eye,
	EyeOff,
	FileQuestion,
	FileText,
	Globe,
	GraduationCap,
	GripVertical,
	Heart,
	MoreVertical,
	Plus,
	Rocket,
	Trash2,
	Trophy,
	User,
	Users,
	Zap,
} from "lucide-react";
import { useId, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isSectionEmpty } from "@/features/resume-editor/section-state";
import type {
	ResumePage,
	ResumeSection,
	SectionType,
} from "@/features/resume-editor/types";
import { SECTION_CONFIGS } from "@/features/resume-editor/types";
import { cn } from "@/lib/utils";

interface SectionsManagerProps {
	sections: ResumeSection[];
	pages?: ResumePage[];
	onSectionsChange: (sections: ResumeSection[]) => void;
	onPagesChange?: (pages: ResumePage[]) => void;
	onAddSection: (type: SectionType) => void;
	onDeleteSection: (id: string) => void;
	onSelectSection: (id: string) => void;
	selectedSectionId?: string;
	isLoading?: boolean;
}

const SECTION_ICONS: Record<SectionType, React.ReactNode> = {
	"personal-info": <User className="h-4 w-4" />,
	summary: <FileText className="h-4 w-4" />,
	experience: <Briefcase className="h-4 w-4" />,
	education: <GraduationCap className="h-4 w-4" />,
	skills: <Zap className="h-4 w-4" />,
	projects: <Rocket className="h-4 w-4" />,
	certifications: <Award className="h-4 w-4" />,
	awards: <Trophy className="h-4 w-4" />,
	languages: <Globe className="h-4 w-4" />,
	publications: <BookOpen className="h-4 w-4" />,
	volunteer: <Heart className="h-4 w-4" />,
	references: <Users className="h-4 w-4" />,
	custom: <FileQuestion className="h-4 w-4" />,
};

/** The name used in every accessible label for a row. */
const titleOf = (section: ResumeSection) =>
	section.content.title || SECTION_CONFIGS[section.type].defaultTitle;

interface SortableSectionItemProps {
	section: ResumeSection;
	/** Id of the reorder instructions, wired to the drag handle. */
	describedById: string;
	isSelected: boolean;
	onToggleVisibility: (id: string) => void;
	onDelete: (id: string) => void;
	onSelect: (id: string) => void;
}

/**
 * One row of the outline.
 *
 * Three separate controls, each with its own accessible name, because the
 * previous version was one `div` with an `onClick` plus three icon-only buttons:
 *
 * - **Selection was mouse-only.** The row was a `div`, so it was not focusable and
 *   not keyboard operable. Everything else in the editor hangs off selecting a
 *   section, which made the whole surface unusable without a pointer.
 * - **The three icon buttons had no names.** A screen reader announced three
 *   "buttons" per section with nothing to distinguish them.
 * - **The actions were `opacity-0` until `group-hover`.** They stayed in the tab
 *   order while invisible, so keyboard users tabbed onto controls they could not
 *   see. They now also reveal on `focus-within`.
 */
/**
 * Exported for its render test.
 *
 * The empty-section marker is the part of this feature that cannot be checked by a
 * predicate test alone: `isSectionEmpty` being right does not prove the marker is
 * actually emitted, or that it is suppressed for a hidden section. Rendering the row
 * to static markup covers that wiring without needing a browser, which matters because
 * the editor route does not reliably load on a 4.9 GB node.
 */
export function SortableSectionItem({
	section,
	describedById,
	isSelected,
	onToggleVisibility,
	onDelete,
	onSelect,
}: SortableSectionItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: section.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const title = titleOf(section);

	return (
		<div
			className={cn(
				"group flex items-center gap-1 rounded-md px-1 py-1 transition-colors",
				isSelected ? "bg-accent" : "hover:bg-accent/50",
				!section.visible && "opacity-60",
			)}
			ref={setNodeRef}
			style={style}
		>
			<button
				{...attributes}
				{...listeners}
				aria-describedby={describedById}
				aria-label={`Reorder ${title}`}
				className="shrink-0 cursor-grab touch-none rounded p-1 text-muted-foreground opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none"
				type="button"
			>
				<GripVertical aria-hidden className="h-4 w-4" />
			</button>

			{/*
			 * The selection control is a real button covering the label, not the row.
			 * It is a sibling of the two action buttons rather than their parent,
			 * because nesting a button inside a button is invalid HTML and hydrates
			 * badly.
			 */}
			<button
				aria-current={isSelected ? "true" : undefined}
				className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left focus-visible:outline-none"
				onClick={() => onSelect(section.id)}
				type="button"
			>
				<span className="shrink-0 text-muted-foreground">
					{SECTION_ICONS[section.type]}
				</span>
				<span className="flex-1 truncate text-sm">{title}</span>
				{/*
				 * Say which sections are actually empty.
				 *
				 * Without this, an empty section and one that failed to save are
				 * indistinguishable in the outline: both are just a row you click. Since a
				 * resume is mostly this list, "my Experience section disappeared" had no
				 * visible answer anywhere in the UI.
				 *
				 * Dotted outline = visible but empty. A hidden section already says so, and
				 * showing both would be noise, so the dot is suppressed there.
				 */}
				{!section.visible ? (
					<span className="shrink-0 text-[10px] text-muted-foreground uppercase">
						Hidden
					</span>
				) : isSectionEmpty(section) ? (
					<span
						aria-label="This section is empty"
						className="h-1.5 w-1.5 shrink-0 rounded-full border border-muted-foreground/70 border-dashed"
						role="img"
						title="This section is empty"
					/>
				) : null}
			</button>

			<div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
				<Button
					aria-label={`${section.visible ? "Hide" : "Show"} ${title}`}
					className="h-6 w-6"
					onClick={() => onToggleVisibility(section.id)}
					size="icon"
					variant="ghost"
				>
					{section.visible ? (
						<Eye aria-hidden className="h-3 w-3" />
					) : (
						<EyeOff aria-hidden className="h-3 w-3" />
					)}
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button
							aria-label={`More actions for ${title}`}
							className="h-6 w-6"
							size="icon"
							variant="ghost"
						>
							<MoreVertical aria-hidden className="h-3 w-3" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							className="text-destructive"
							onSelect={() => onDelete(section.id)}
						>
							<Trash2 aria-hidden className="mr-2 h-4 w-4" />
							Delete {SECTION_CONFIGS[section.type].label}
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
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	const instructionsId = useId();

	const sortedSections = useMemo(
		() => [...sections].sort((a, b) => a.order - b.order),
		[sections],
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
			sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)),
		);
	};

	// Get available section types that haven't been added yet (for unique sections like personal-info)
	const uniqueSections: SectionType[] = ["personal-info", "summary"];
	const existingSectionTypes = sections.map((s) => s.type);
	const availableSections = Object.keys(SECTION_CONFIGS).filter(
		(type) =>
			!uniqueSections.includes(type as SectionType) ||
			!existingSectionTypes.includes(type as SectionType),
	) as SectionType[];

	const byId = useMemo(
		() => new Map(sortedSections.map((s) => [s.id, s])),
		[sortedSections],
	);

	/**
	 * Screen-reader announcements for reordering.
	 *
	 * dnd-kit's defaults announce "Draggable item 3 was moved over droppable area 5",
	 * which is two lists of positions and no content — useless on a document outline
	 * where the position *is* the meaning. These name the section and its new
	 * position, and say how many there are, so the move is audible rather than
	 * merely inferable.
	 */
	const announcements = useMemo(
		() => ({
			onDragStart({ active }: { active: { id: string | number } }) {
				const section = byId.get(String(active.id));
				if (!section) return undefined;
				return `Picked up ${titleOf(section)}, position ${sortedSections.findIndex((s) => s.id === section.id) + 1} of ${sortedSections.length}.`;
			},
			onDragOver({
				active,
				over,
			}: {
				active: { id: string | number };
				over: { id: string | number } | null;
			}) {
				const section = byId.get(String(active.id));
				const target = over ? byId.get(String(over.id)) : undefined;
				if (!section || !target) return undefined;
				const position =
					sortedSections.findIndex((s) => s.id === target.id) + 1;
				return `${titleOf(section)} is now at position ${position} of ${sortedSections.length}.`;
			},
			onDragEnd({
				active,
				over,
			}: {
				active: { id: string | number };
				over: { id: string | number } | null;
			}) {
				const section = byId.get(String(active.id));
				if (!section) return undefined;
				const position = over
					? sortedSections.findIndex((s) => s.id === String(over.id)) + 1
					: 0;
				return `Dropped ${titleOf(section)}. Now at position ${position} of ${sortedSections.length}.`;
			},
			onDragCancel({ active }: { active: { id: string | number } }) {
				const section = byId.get(String(active.id));
				return section
					? `Reordering cancelled. ${titleOf(section)} returned to position ${sortedSections.findIndex((s) => s.id === section.id) + 1}.`
					: undefined;
			},
		}),
		[byId, sortedSections],
	);

	const screenReaderInstructions = {
		draggable:
			"Press Space to pick up this section. Use the arrow keys to move it up or down. Press Space again to drop it, or Escape to cancel.",
	};

	return (
		<div className="space-y-2">
			<p className="sr-only" id={instructionsId}>
				Press Space or Enter to pick up, the arrow keys to move, then Space or
				Enter to drop. Escape cancels.
			</p>

			<DndContext
				accessibility={{ announcements, screenReaderInstructions }}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
				sensors={sensors}
			>
				<SortableContext
					items={sortedSections.map((s) => s.id)}
					strategy={verticalListSortingStrategy}
				>
					<ul
						aria-label="Resume sections, in the order they will be exported"
						className="space-y-1"
					>
						{sortedSections.map((section) => (
							<li key={section.id}>
								<SortableSectionItem
									describedById={instructionsId}
									isSelected={section.id === selectedSectionId}
									onDelete={onDeleteSection}
									onSelect={onSelectSection}
									onToggleVisibility={toggleVisibility}
									section={section}
								/>
							</li>
						))}
					</ul>
				</SortableContext>
			</DndContext>

			{/*
			 * Empty state first, then the control that resolves it. The previous
			 * order put "Add Section" above "No sections yet", so the message read
			 * as a caption on the button rather than as the state of the document.
			 */}
			{sortedSections.length === 0 ? (
				<div className="rounded-md border border-dashed px-3 py-6 text-center text-muted-foreground">
					<p className="text-sm">No sections yet</p>
					<p className="mt-1 text-xs">
						Every section you add becomes a row here, in export order.
					</p>
				</div>
			) : null}

			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button className="w-full" size="sm" variant="outline">
						<Plus aria-hidden className="mr-2 h-4 w-4" />
						Add Section
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="center" className="w-48">
					{availableSections.map((type) => (
						<DropdownMenuItem key={type} onSelect={() => onAddSection(type)}>
							{SECTION_ICONS[type]}
							<span className="ml-2">{SECTION_CONFIGS[type].label}</span>
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}
