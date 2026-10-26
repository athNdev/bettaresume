"use client";

/**
 * Resume Editor Page (Hash Router Version)
 * Uses React Query (tRPC) for data fetching instead of localStorage.
 */

import { normalizeTemplateId } from "@bettaresume/types";
import {
	AlertTriangle,
	ArrowLeft,
	ChevronDown,
	Eye,
	Layers,
	Layout,
	Library,
	Link2,
	Loader2,
	PencilLine,
	Unlink2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
	Panel,
	Group as PanelGroup,
	Separator as PanelResizeHandle,
} from "react-resizable-panels";
import { ProtectedRoute } from "@/app/protected-route";
import { ExportButtons } from "@/components/export";
// Editor Components
import { RichTextEditor } from "@/components/rich-text-editor";
// Section Forms
import {
	AwardsForm,
	CertificationsForm,
	EducationForm,
	ExperienceForm,
	LanguagesForm,
	PersonalInfoForm,
	ProjectsForm,
	PublicationsForm,
	ReferencesForm,
	SkillsForm,
	VolunteerForm,
} from "@/components/sections-forms";
import { Button } from "@/components/ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	PanelEmpty,
	PanelError,
	PanelLoading,
} from "@/components/ui/panel-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	draftChangeCount,
	isDraftDirty,
} from "@/features/resume-editor/lib/draft-state";
import { usePreviewPages } from "@/features/resume-editor/lib/preview-pages";
import { withTemplateDefaults } from "@/features/resume-editor/lib/template-defaults";
import type {
	Award,
	Certification,
	Education,
	Experience,
	Language,
	PartialResumeSettings,
	PersonalInfo,
	Project,
	Publication,
	Reference,
	Resume,
	ResumeMetadata,
	ResumeSection,
	ResumeSettings,
	ResumeWithSections,
	SectionContent,
	SectionType,
	SkillCategory,
	TemplateType,
	Volunteer,
} from "@/features/resume-editor/types";
import {
	SECTION_CONFIGS,
	TEMPLATE_CONFIGS,
} from "@/features/resume-editor/types";
import {
	useActiveResumeStore,
	useResume,
	useResumeMutations,
	useResumes,
	useSectionMutations,
} from "@/hooks";
import { useConfirm } from "@/hooks/use-confirm";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useHashRouter } from "@/lib/hash-router";
import { isShowcase } from "@/lib/showcase";
import { resolvePersonalInfo } from "@/lib/typst/serialize";
import { flushPendingSaves } from "@/lib/ui/save-registry";
import { cn } from "@/lib/utils";
import {
	AddSectionMenu,
	FormattingToolbar,
	SaveState,
	SectionsManager,
	TemplateSelector,
	TypstPreview,
	VariationManager,
} from "./components";
import { ContentLibraryPanel } from "./components/content-library-panel";
import { FitMeter } from "./components/fit-meter";
import { ImportTrigger } from "./components/import-review-panel";
import { ReviewTrigger } from "./components/review-panel";
import { SectionBreakControls } from "./components/section-break-controls";

/*
 * The three destinations of the small-screen view.
 *
 * Order is left to right in the bottom bar and matches how often each is used while
 * authoring: the outline to pick what to edit, the form to edit it, the document to
 * check the result. Every pane of the three-zone layout has a mode here, which is the
 * property that matters: no feature exists only at a width the user is not at.
 */
const SMALL_SCREEN_MODES = [
	{ id: "sections", label: "Sections", Icon: Layers },
	{ id: "form", label: "Form", Icon: PencilLine },
	{ id: "preview", label: "Preview", Icon: Eye },
] as const;

type SmallScreenMode = (typeof SMALL_SCREEN_MODES)[number]["id"];

interface HeaderMetaProps {
	resume: Resume;
	pageCount: number | null;
}

/**
 * The one meta line under the document name.
 *
 * A resume's identity is the archetype, the density band and how many pages it makes —
 * one sentence, not a labelled grid. The name is printed once, above it, at 20/600;
 * this line is what stops the top bar repeating itself (the preview strip printed the
 * template name and the page count a second time, 40px below the same facts).
 *
 * The page count comes from the compiled preview, so it is absent until the first
 * compile lands rather than showing "0". Zoom and fit deliberately live on the preview's
 * own instruments (the toolbar stepper, the fit chip), where they can be changed.
 */
function metaLine({ resume, pageCount }: HeaderMetaProps): string {
	const settings = resume.metadata?.settings;
	const templateName =
		TEMPLATE_CONFIGS[normalizeTemplateId(resume.template)]?.name ?? null;
	const density =
		settings?.sectionSpacing === "compact"
			? "Compact"
			: settings?.sectionSpacing === "spacious"
				? "Spacious"
				: settings
					? "Balanced"
					: null;
	const pages =
		pageCount === null
			? null
			: `${pageCount} ${pageCount === 1 ? "page" : "pages"}`;
	return [resume.domain ?? null, templateName, density, pages]
		.filter((part): part is string => Boolean(part))
		.join(" · ");
}

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
	const {
		data: activeResume,
		isLoading,
		isError,
		refetch,
	} = useResume(resumeId);
	const { data: allResumes = [] } = useResumes({ includeArchived: true });
	const {
		updateResume,
		deleteResume,
		createResumeVariation,
		syncVariationWithBase,
		isCreatingVariation,
	} = useResumeMutations();
	const {
		updateSection,
		createSection,
		deleteSection: deleteSectionMutation,
		reorderSections,
		setSectionLink,
		isAnyPending,
	} = useSectionMutations(resumeId);

	// Draft state for real-time preview
	const [draftResume, setDraftResume] = useState<ResumeWithSections | null>(
		null,
	);

	// Sync activeResume to draftResume when it changes or when section structure changes
	useEffect(() => {
		if (activeResume) {
			// Sync draft when it doesn't exist OR when section structure changes
			// (e.g., after reordering, adding, or deleting sections)
			const currentSectionIds =
				draftResume?.sections.map((s) => ({ id: s.id, order: s.order })) || [];
			const newSectionIds = activeResume.sections.map((s) => ({
				id: s.id,
				order: s.order,
			}));

			const structureChanged =
				JSON.stringify(currentSectionIds) !== JSON.stringify(newSectionIds);

			if (!draftResume || structureChanged) {
				setDraftResume(activeResume as ResumeWithSections);
			}
		}
	}, [activeResume, draftResume]); // Remove draftResume from dependencies to avoid circular updates

	/**
	 * Does the draft hold anything the server does not?
	 *
	 * Drives three things that were previously disconnected: the save indicator, the
	 * warning on the export menu, and the choice of which resume the exporter reads.
	 */
	const isDirty = useMemo(
		() => isDraftDirty(draftResume, activeResume),
		[activeResume, draftResume],
	);
	const changeCount = useMemo(
		() => draftChangeCount(draftResume, activeResume),
		[activeResume, draftResume],
	);

	/**
	 * Failures the user has to be told about.
	 *
	 * Every write handler in this file used to `console.error` and return, so a
	 * rejected mutation was invisible: the form said "Unsaved changes" forever, or
	 * worse, a control appeared to do nothing. One surface, cleared on the next
	 * successful write, so an error cannot sit there pretending to be current.
	 */
	const [editorError, setEditorError] = useState<string | null>(null);
	const reportError = useCallback((what: string, err: unknown) => {
		const detail = err instanceof Error ? err.message : String(err);
		setEditorError(`${what}: ${detail}`);
	}, []);

	/*
	 * ⌘/Ctrl+S saves.
	 *
	 * Each section form owns its own save trigger, so the shortcut cannot reach them
	 * directly; `useAutoSave` registers every form's save and this flushes the dirty
	 * ones. It runs even though autosave exists, because "did that save?" is the
	 * question a user is asking when they press it, and a shortcut that answers it
	 * immediately is worth more than the debounce it bypasses.
	 */
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) return;
			if (event.key.toLowerCase() !== "s") return;
			event.preventDefault();
			void flushPendingSaves().then((ran) => {
				if (ran > 0) toast.success("Saved");
			});
		};
		window.addEventListener("keydown", onKeyDown);
		return () => window.removeEventListener("keydown", onKeyDown);
	}, []);

	// Live updates for draft (instant, no server call)
	const handleDraftSectionDataUpdate = useCallback(
		(
			sectionId: string,
			data: Record<string, unknown> | unknown[] | undefined,
		) => {
			setDraftResume((prev) => {
				if (!prev) return prev;
				// Only update if data actually changed to avoid re-render loops
				// We do a deep check via JSON stringify for simple data structures
				const section = prev.sections.find((s) => s.id === sectionId);
				if (
					section &&
					JSON.stringify(section.content.data) === JSON.stringify(data)
				) {
					return prev;
				}

				return {
					...prev,
					sections: prev.sections.map((s) =>
						s.id === sectionId
							? { ...s, content: { ...s.content, data }, updatedAt: new Date() }
							: s,
					),
				};
			});
		},
		[],
	);

	const handleDraftSummaryUpdate = useCallback(
		(sectionId: string, html: string, json?: unknown) => {
			setDraftResume((prev) => {
				if (!prev) return prev;
				const section = prev.sections.find((s) => s.id === sectionId);
				// `json` is part of the comparison, not just `html`: the editor can
				// produce the same markup from a different document, and treating that
				// as "no change" would drop the structural edit.
				if (
					section &&
					section.content.html === html &&
					section.content.json === json
				) {
					return prev;
				}

				return {
					...prev,
					sections: prev.sections.map((s) =>
						s.id === sectionId
							? {
									...s,
									content: { ...s.content, html, json },
									updatedAt: new Date(),
								}
							: s,
					),
				};
			});
		},
		[],
	);

	const handleDraftPersonalInfoUpdate = useCallback((info: PersonalInfo) => {
		setDraftResume((prev) => {
			if (!prev?.metadata) return prev;
			if (JSON.stringify(prev.metadata.personalInfo) === JSON.stringify(info)) {
				return prev;
			}
			return {
				...prev,
				metadata: { ...prev.metadata, personalInfo: info },
				updatedAt: new Date(),
			};
		});
	}, []);

	// Local state
	const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
		null,
	);

	// Stable wrappers for draft updates to prevent infinite loops
	const selectedSectionIdRef = useRef(selectedSectionId);
	// Debounce settings saves so rapid slider drags don't flood the API.
	const settingsSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);
	useEffect(() => {
		selectedSectionIdRef.current = selectedSectionId;
	}, [selectedSectionId]);

	const stableDraftSectionDataUpdate = useCallback(
		(data: Record<string, unknown> | unknown[] | undefined) => {
			if (selectedSectionIdRef.current) {
				handleDraftSectionDataUpdate(selectedSectionIdRef.current, data);
			}
		},
		[handleDraftSectionDataUpdate],
	);

	const stableDraftSummaryUpdate = useCallback(
		(html: string, json?: unknown) => {
			if (selectedSectionIdRef.current) {
				handleDraftSummaryUpdate(selectedSectionIdRef.current, html, json);
			}
		},
		[handleDraftSummaryUpdate],
	);
	/*
	 * The layout axis: three zones at `lg`+, one column below it.
	 *
	 * Declared up here because the preview's fit effect reads it (the gutter is smaller
	 * on the one-column view), and a value read by an effect should not be declared
	 * after the effect that closes over it.
	 */
	const isWideEditor = useMediaQuery("(min-width: 1024px)");
	const [previewScale, setPreviewScale] = useState(1);
	/*
	 * Zoom the document to the panel on first paint.
	 *
	 * At 100% a Letter page is 612pt x 96/72 = 816px, so in a ~650px preview panel
	 * most of the document was outside the viewport — and because the scroll wrapper
	 * centres its child, the overflow to the LEFT was unreachable. A browser pass
	 * caught the document cut in half: headings read "tion", "r of Science".
	 *
	 * The rule here is "fit until the user says otherwise": the first measurement sets
	 * the scale, and any explicit zoom from the toolbar wins from then on.
	 */
	const [previewPane, setPreviewPane] = useState<HTMLDivElement | null>(null);
	const userZoomedRef = useRef(false);
	/*
	 * The last computed fit, so double-click can toggle 100% <-> fit without measuring
	 * again. Measuring on every toggle would be wrong anyway: the "fit until the user
	 * says otherwise" rule means the fit value is the one from before they zoomed.
	 */
	const fitScaleRef = useRef(1);
	/*
	 * Page width in **points**, which is what the Typst page is measured in: Letter is
	 * 8.5in = 612pt and A4 is 210mm ≈ 595pt. (`getPageWidthPx` in resume-thumbnail.tsx
	 * uses 816/794 because it works in CSS pixels.) Multiply by 96/72 for the on-screen
	 * size at 100%.
	 */
	const pageWidthPt =
		(
			(draftResume ?? activeResume)?.metadata?.settings as
				| ResumeSettings
				| undefined
		)?.pageSize === "A4"
			? 595
			: 612;

	useEffect(() => {
		// The pane is inside a collapsible, so it mounts after the first effect run. Watching
		// the node itself means the measurement happens whenever it appears, not once before
		// it exists.
		if (!previewPane) return;

		const fitToPane = () => {
			if (userZoomedRef.current) return;
			const pageWidthPx = pageWidthPt * (96 / 72);
			/*
			 * The gutter is `p-6` at `md`+ and `p-3` below it (the phone needs the page
			 * width more than it needs the margin), plus room for the page shadow.
			 */
			const gutter = isWideEditor ? 48 : 24;
			const available = previewPane.clientWidth - gutter - 8;
			if (available <= 0) return;
			const next = Math.min(1, Math.max(0.25, available / pageWidthPx));
			fitScaleRef.current = Number(next.toFixed(2));
			setPreviewScale(fitScaleRef.current);
		};

		fitToPane();
		if (typeof ResizeObserver === "undefined") return;
		const ro = new ResizeObserver(fitToPane);
		ro.observe(previewPane);
		return () => ro.disconnect();
	}, [previewPane, pageWidthPt, isWideEditor]);

	/**
	 * Double-click toggles between fit-width and 100%.
	 *
	 * Fit-width is the right default on a phone (a Letter page at fit-page in 360px is
	 * ~4pt type, which is not reading, it is squinting) and 100% is the right thing to
	 * jump to when checking a detail. Pinch is left to the browser: `touch-action` on
	 * the page keeps `pinch-zoom`, so this never fights the system gesture.
	 */
	const togglePreviewZoom = useCallback(() => {
		userZoomedRef.current = true;
		setPreviewScale((current) => (current < 0.99 ? 1 : fitScaleRef.current));
	}, []);
	/* Page count and measured fit are published by the preview; the meter reads them directly. */
	const pageCount = usePreviewPages((s) => s.pageCount);
	const [contentOpen, setContentOpen] = useState(true);
	/*
	 * The typography controls default to collapsed so the document gets the space.
	 * The rail's Templates disclosure keeps its own flag -- one flag driving two
	 * disclosures on opposite sides of the screen meant opening the rail's template
	 * list also shoved the preview's toolbar open.
	 *
	 * It previously had two: `designOpen` drove this disclosure and its chevron, then
	 * `typeOpen` was introduced and the disclosure was moved onto it while the chevron
	 * was left reading `designOpen`. Nothing ever called `setDesignOpen`, so `designOpen`
	 * was pinned `true` for the life of the component and the chevron never rotated --
	 * it pointed down whether the panel was open or shut. Every sibling chevron here
	 * reads the flag that drives its own `Collapsible`; this one was the exception.
	 */
	const [typeOpen, setTypeOpen] = useState(false);
	const [typeControlsOpen, setTypeControlsOpen] = useState(false);
	/*
	 * The library is collapsed by default. It is a full panel with three queries
	 * behind it and it competes for vertical space with the Sections list, which is
	 * the thing you reach for constantly. Opening it is a deliberate act.
	 */
	const [libraryOpen, setLibraryOpen] = useState(false);
	/*
	 * Small-screen presentation.
	 *
	 * Below `lg` the three-zone layout is replaced by one column and a three-way
	 * switcher. `lg`, not `md`: the pane floors alone (200 + 280 + 300 + handles) are
	 * ~796px, so at 768px three panes cannot all be usable — the switcher would have to
	 * start somewhere, and 1024 is the first width that fits the design.
	 *
	 * The default is `form` because that is what the editor is for; a section is
	 * auto-selected on load, so the mode is never empty.
	 */
	const [smallScreenMode, setSmallScreenMode] =
		useState<SmallScreenMode>("form");

	// Set active resume ID when component mounts
	useEffect(() => {
		if (resumeId) {
			setActiveResumeId(resumeId);
		}
	}, [resumeId, setActiveResumeId]);

	// Auto-select first section
	useEffect(() => {
		if (activeResume && !selectedSectionId) {
			const sortedSections = [...(activeResume.sections || [])].sort(
				(a, b) => a.order - b.order,
			);
			const firstSection = sortedSections[0];
			if (firstSection) {
				setSelectedSectionId(firstSection.id);
			}
		}
	}, [activeResume, selectedSectionId]);

	// Handle template selection
	const handleTemplateSelect = (templateId: TemplateType) => {
		if (!activeResume?.metadata) return;

		const metadata = activeResume.metadata as ResumeMetadata;
		// An archetype is a layout, not a skin: selecting one applies its density and its
		// palette together, in one settings write (and therefore one revision snapshot).
		// A user's later tweak to a margin or the leading still wins, because these are
		// defaults applied at selection time, not values read at render time.
		const settings = withTemplateDefaults(templateId, metadata.settings);

		setDraftResume((prev) => {
			if (!prev?.metadata) return prev;
			return {
				...prev,
				template: templateId,
				metadata: {
					...prev.metadata,
					settings,
				},
				updatedAt: new Date(),
			};
		});

		updateResume(resumeId, {
			template: templateId,
			metadata: {
				...metadata,
				settings,
			},
		});
	};

	// Get variations for this resume
	const variations = useMemo(() => {
		if (!activeResume) return [];
		const baseId =
			activeResume.variationType === "base"
				? activeResume.id
				: activeResume.baseResumeId;
		if (!baseId) return [];
		return allResumes.filter(
			(r: Resume) => r.baseResumeId === baseId || r.id === baseId,
		);
	}, [activeResume, allResumes]);

	// Get base resume
	const baseResume = useMemo(() => {
		if (!activeResume) return null;
		if (activeResume.variationType === "base") return activeResume;
		return (
			allResumes.find((r: Resume) => r.id === activeResume.baseResumeId) || null
		);
	}, [activeResume, allResumes]);

	// Get selected section
	const selectedSection = useMemo(() => {
		if (!activeResume || !selectedSectionId) return null;
		return (
			activeResume.sections.find(
				(s: ResumeSection) => s.id === selectedSectionId,
			) || null
		);
	}, [activeResume, selectedSectionId]);

	/**
	 * Where this section sits in the outline, 1-based.
	 *
	 * The form header used to print the section's *type* under its title, which was "Personal
	 * Info" under "Contact Information" — the audit's repeated-label defect in miniature, and
	 * the second time the pane had said the same thing. Position is information the header did
	 * not already carry, and it answers "how far through this resume am I?".
	 */
	const sectionPosition = useMemo(() => {
		if (!activeResume || !selectedSection) return 0;
		return (
			activeResume.sections.findIndex((s) => s.id === selectedSection.id) + 1
		);
	}, [activeResume, selectedSection]);

	// Handlers
	/**
	 * Persist the pasted job description onto the resume.
	 *
	 * `resume.update` already writes `metadata.jobTarget`, so this needs no new
	 * procedure and no schema change. The draft is preferred over the saved resume so
	 * the panel reflects unsaved edits.
	 */
	const handleJobTargetChange = useCallback(
		async (next: {
			title?: string;
			company?: string;
			description?: string;
		}) => {
			if (!activeResume) return;
			try {
				// `jobTargetSchema` requires a title. The panel only collects a
				// description, and a pasted job description almost always opens with
				// the role, so derive it rather than inventing a field the user then
				// has to fill in separately.
				const firstLine = (next.description ?? "")
					.split("\n")
					.map((l) => l.replace(/^[-*–—\s]+/, "").trim())
					.find(Boolean);
				await updateResume(activeResume.id, {
					metadata: {
						jobTarget: {
							...next,
							title: (firstLine || "Untitled role").slice(0, 120),
							addedAt: new Date().toISOString(),
						},
					},
				});
			} catch (err) {
				reportError("Could not save the job description", err);
			}
		},
		[activeResume, reportError, updateResume],
	);

	const handleSectionChange = useCallback(
		async (sectionId: string, updates: Partial<ResumeSection>) => {
			if (!activeResume) return;
			try {
				await updateSection(sectionId, updates);
				/*
				 * Keep the draft in step with the write.
				 *
				 * The preview renders `draftResume`, and the draft only re-syncs from the server
				 * when the section *structure* changes (ids and order). A break-flag change is
				 * neither, so the optimistic tRPC cache update never reached the document and
				 * "Start this section on a new page" toggled the switch without moving the page.
				 * Applying the same patch to the draft is what makes the two agree.
				 */
				setDraftResume((prev) =>
					prev
						? {
								...prev,
								sections: prev.sections.map((s) =>
									s.id === sectionId ? { ...s, ...updates } : s,
								),
							}
						: prev,
				);
			} catch (err) {
				reportError("Could not save this section", err);
			}
		},
		[activeResume, reportError, updateSection],
	);

	const handleSectionDataChange = useCallback(
		async (
			sectionId: string,
			data: Record<string, unknown> | unknown[] | undefined,
		) => {
			await handleSectionChange(sectionId, {
				content: { ...selectedSection?.content, data },
			} as Partial<ResumeSection>);
		},
		[handleSectionChange, selectedSection],
	);

	const handleSummaryChange = useCallback(
		(html: string, json?: unknown) => {
			if (selectedSection?.type !== "summary") return;
			handleSectionChange(selectedSection.id, {
				// Both forms, from the editor's own transaction. `json` is the
				// document; `html` is what the exporters read. See
				// `components/rich-text-editor/stored-content.ts`.
				content: { ...selectedSection.content, html, json },
			});
		},
		[selectedSection, handleSectionChange],
	);

	/**
	 * `custom` and `summary` both store rich text under `content.html`.
	 *
	 * Separate from `handleSummaryChange` because that one asserts the selected section
	 * is a summary, which would silently do nothing here.
	 */
	const handleCustomChange = useCallback(
		(html: string, json?: unknown) => {
			if (selectedSection?.type !== "custom") return;
			handleSectionChange(selectedSection.id, {
				content: { ...selectedSection?.content, html, json },
			});
		},
		[selectedSection, handleSectionChange],
	);

	const handlePersonalInfoChange = useCallback(
		async (info: PersonalInfo) => {
			if (!activeResume?.metadata) return;
			try {
				await updateResume(activeResume.id, {
					metadata: {
						...(activeResume.metadata as ResumeMetadata),
						personalInfo: info,
					},
				});
			} catch (err) {
				reportError("Could not save your contact details", err);
			}
		},
		[activeResume, reportError, updateResume],
	);

	const handleAddSection = useCallback(
		async (type: SectionType) => {
			if (!activeResume) return;
			const config = SECTION_CONFIGS[type];
			try {
				await createSection({
					type,
					visible: true,
					content:
						type === "summary" || type === "custom"
							? { title: config.defaultTitle, html: "" }
							: { title: config.defaultTitle, data: [] },
				});
			} catch (err) {
				reportError("Could not add that section", err);
			}
		},
		[activeResume, createSection, reportError],
	);

	const confirm = useConfirm();

	const handleDeleteSection = useCallback(
		async (sectionId: string) => {
			if (!activeResume) return;
			const confirmed = await confirm(
				"Delete Section",
				"Delete this section? This cannot be undone.",
			);
			if (confirmed) {
				try {
					await deleteSectionMutation(sectionId);
					if (selectedSectionId === sectionId) {
						setSelectedSectionId(null);
					}
				} catch (err) {
					reportError("Could not delete that section", err);
				}
			}
		},
		[
			activeResume,
			confirm,
			deleteSectionMutation,
			reportError,
			selectedSectionId,
		],
	);

	const handleSectionsReorder = useCallback(
		async (sections: ResumeSection[]) => {
			if (!activeResume) return;
			const sectionIds = sections.map((s) => s.id);
			try {
				await reorderSections(sectionIds);
			} catch (err) {
				reportError("Could not save the new section order", err);
			}
		},
		[activeResume, reorderSections, reportError],
	);

	const handleSettingsChange = useCallback(
		async (settings: PartialResumeSettings) => {
			if (!activeResume?.metadata) return;
			try {
				setDraftResume((prev) => {
					if (!prev?.metadata) return prev;
					const baseSettings = prev.metadata.settings;
					const mergedSettings: ResumeSettings = {
						...baseSettings,
						...settings,
						margins: {
							...baseSettings.margins,
							...(settings.margins ?? {}),
						},
						typography: {
							...baseSettings.typography,
							...(settings.typography ?? {}),
						},
						colors: {
							...baseSettings.colors,
							...(settings.colors ?? {}),
						},
					};
					return {
						...prev,
						metadata: {
							...prev.metadata,
							settings: mergedSettings,
						},
						updatedAt: new Date(),
					};
				});

				if (settingsSaveTimerRef.current) {
					// Debounce the network call: only persist 600 ms after the last change.
					clearTimeout(settingsSaveTimerRef.current);
				}
				settingsSaveTimerRef.current = setTimeout(async () => {
					if (!activeResume?.metadata) return;
					const mergedServerSettings: ResumeSettings = {
						...(activeResume.metadata as ResumeMetadata).settings,
						...settings,
						margins: {
							...(activeResume.metadata as ResumeMetadata).settings.margins,
							...(settings.margins ?? {}),
						},
						typography: {
							...(activeResume.metadata as ResumeMetadata).settings.typography,
							...(settings.typography ?? {}),
						},
						colors: {
							...(activeResume.metadata as ResumeMetadata).settings.colors,
							...(settings.colors ?? {}),
						},
					};
					try {
						await updateResume(activeResume.id, {
							metadata: {
								...(activeResume.metadata as ResumeMetadata),
								settings: mergedServerSettings,
							},
						});
					} catch (err) {
						reportError("Could not save your formatting settings", err);
					}
				}, 600);
			} catch (err) {
				reportError("Could not update your formatting settings", err);
			}
		},
		[activeResume, reportError, updateResume],
	);

	/*
	 * Variation creation and sync.
	 *
	 * These were previously absent, and the UI compensated by hiding the controls --
	 * after an earlier version shipped a complete-looking Create Variation dialog wired
	 * to a `console.log`. The API now does the work, so the controls are shown again and
	 * can be held to their promises.
	 */
	const handleCreateVariation = useCallback(
		async (name: string, domain?: string) => {
			if (!baseResume) return;
			try {
				const created = await createResumeVariation({
					baseResumeId: baseResume.id,
					name,
					...(domain ? { domain } : {}),
				});
				if (created?.id) {
					setActiveResumeId(created.id);
					navigate(`/resume-editor/${created.id}`);
				}
			} catch (err) {
				reportError("Could not create the variation", err);
			}
		},
		[
			baseResume,
			createResumeVariation,
			navigate,
			reportError,
			setActiveResumeId,
		],
	);

	const handleSyncWithBase = useCallback(
		async (variationId: string) => {
			try {
				const result = await syncVariationWithBase(variationId);
				// `updated: 0` is a real answer -- every section is detached -- and saying so
				// is the difference between a control that worked and a control that did
				// nothing visible.
				toast.success(
					result.updated === 0
						? "Nothing to sync — every section is detached from the base."
						: `Updated ${result.updated} linked section${result.updated === 1 ? "" : "s"}.`,
				);
			} catch (err) {
				reportError("Could not sync with the base resume", err);
			}
		},
		[reportError, syncVariationWithBase],
	);

	const handleSetSectionLink = useCallback(
		async (sectionId: string, linked: boolean) => {
			try {
				await setSectionLink(sectionId, linked);
			} catch (err) {
				reportError(
					linked
						? "Could not re-link this section to the base"
						: "Could not detach this section from the base",
					err,
				);
			}
		},
		[reportError, setSectionLink],
	);

	const handleSelectVariation = useCallback(
		(id: string) => {
			navigate(`/resume-editor/${id}`);
		},
		[navigate],
	);

	const handleDeleteVariation = useCallback(
		async (id: string) => {
			try {
				await deleteResume(id);
				if (baseResume) {
					navigate(`/resume-editor/${baseResume.id}`);
				} else {
					navigate("/dashboard");
				}
			} catch (err) {
				reportError("Could not delete that variation", err);
			}
		},
		[baseResume, deleteResume, navigate, reportError],
	);

	// Render section form based on type
	const renderSectionForm = () => {
		if (!selectedSection || !activeResume) return null;

		const content = selectedSection.content as SectionContent;

		switch (selectedSection.type) {
			case "personal-info": {
				// Personal info requires metadata
				if (!activeResume.metadata) {
					return (
						<div className="p-4 text-center text-muted-foreground">
							Unable to load personal information. Please refresh the page.
						</div>
					);
				}
				const personalInfoSectionData = ((
					selectedSection.content as SectionContent | undefined
				)?.data ?? {}) as Record<string, unknown>;
				/*
				 * Resolve through the same function the exporter uses.
				 *
				 * The form used to read `metadata.personalInfo` and nothing else, while
				 * `resolvePersonalInfo` prefers metadata but falls through to the
				 * personal-info section per field. The two therefore disagreed: a resume
				 * whose name lived only in the section displayed an empty name field while
				 * the exported PDF carried the real one. The user could not see, or edit,
				 * what was actually in their resume. One resolver, one answer.
				 */
				const personalInfo = resolvePersonalInfo(
					activeResume.metadata.personalInfo,
					personalInfoSectionData,
				);
				return (
					<PersonalInfoForm
						data={personalInfo}
						key={selectedSection.id}
						onChange={handlePersonalInfoChange}
						onLocalUpdate={handleDraftPersonalInfoUpdate}
					/>
				);
			}
			case "summary":
				/*
				 * No title block here: the form column's header already names the
				 * section, and the audit found this title printed twice more below it.
				 */
				return (
					<div className="space-y-4">
						<RichTextEditor
							content={content.html || ""}
							json={content.json}
							key={selectedSection.id}
							minHeight="200px"
							onChange={handleSummaryChange}
							onLocalUpdate={stableDraftSummaryUpdate}
							placeholder="Write a compelling professional summary..."
						/>
					</div>
				);
			case "custom":
				/*
				 * `custom` was offered in the Add Section menu — `availableSections` is
				 * built from `Object.keys(SECTION_CONFIGS)` — but had no case here, so it
				 * fell through to the default branch and rendered:
				 *
				 *     Section type "custom" is not yet supported.
				 *
				 * A dead end the UI offered and then refused. It now mirrors `summary`:
				 * free-form rich text under a title, which is the honest shape for a
				 * a section the product does not model.
				 */
				return (
					<div className="space-y-4">
						<RichTextEditor
							content={content.html || ""}
							json={content.json}
							key={selectedSection.id}
							minHeight="200px"
							onChange={handleCustomChange}
							onLocalUpdate={stableDraftSummaryUpdate}
							placeholder="Add any section this resume needs — headings, notes, anything a fixed section type does not cover."
						/>
					</div>
				);
			case "experience":
				return (
					<ExperienceForm
						data={(content.data as Experience[]) || []}
						key={selectedSection.id}
						onChange={(data: Experience[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "education":
				return (
					<EducationForm
						data={(content.data as Education[]) || []}
						key={selectedSection.id}
						onChange={(data: Education[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "skills":
				return (
					<SkillsForm
						data={(content.data as SkillCategory[]) || []}
						key={selectedSection.id}
						onChange={(data: SkillCategory[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "projects":
				return (
					<ProjectsForm
						data={(content.data as Project[]) || []}
						key={selectedSection.id}
						onChange={(data: Project[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "certifications":
				return (
					<CertificationsForm
						data={(content.data as Certification[]) || []}
						key={selectedSection.id}
						onChange={(data: Certification[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "awards":
				return (
					<AwardsForm
						data={(content.data as Award[]) || []}
						key={selectedSection.id}
						onChange={(data: Award[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "languages":
				return (
					<LanguagesForm
						data={(content.data as Language[]) || []}
						key={selectedSection.id}
						onChange={(data: Language[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "volunteer":
				return (
					<VolunteerForm
						data={(content.data as Volunteer[]) || []}
						key={selectedSection.id}
						onChange={(data: Volunteer[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "publications":
				return (
					<PublicationsForm
						data={(content.data as Publication[]) || []}
						key={selectedSection.id}
						onChange={(data: Publication[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
					/>
				);
			case "references":
				return (
					<ReferencesForm
						data={(content.data as Reference[]) || []}
						key={selectedSection.id}
						onChange={(data: Reference[]) =>
							handleSectionDataChange(selectedSection.id, data)
						}
						onLocalUpdate={stableDraftSectionDataUpdate}
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
			<div className="flex h-dvh items-center justify-center bg-background">
				<PanelLoading label="Loading resume..." />
			</div>
		);
	}

	// Error state — a live alert with the one action that fixes it (retry), plus
	// the escape hatch back to the dashboard.
	if (isError) {
		return (
			<div className="flex h-dvh flex-col items-center justify-center gap-4 bg-background">
				<PanelError
					className="max-w-sm"
					message="Failed to load resume. Please try again."
					onRetry={() => refetch()}
				/>
				<Button onClick={() => navigate("/dashboard")} variant="ghost">
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back to Dashboard
				</Button>
			</div>
		);
	}

	// Resume not found — never a dead end: say what happened and offer the way out.
	if (!activeResume) {
		return (
			<div className="flex h-dvh items-center justify-center bg-background">
				<PanelEmpty
					action={
						<Button onClick={() => navigate("/dashboard")} variant="outline">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Dashboard
						</Button>
					}
					className="max-w-sm"
					hint="The resume you're looking for doesn't exist."
					title="Resume not found"
				/>
			</div>
		);
	}

	/*
	 * Each pane's contents, defined once and mounted in exactly one of two places.
	 *
	 * The three-zone layout is the product's primary design and stays at `lg`+. Below
	 * it there is no width at which three panes are usable — the pixel floors alone
	 * (rail 200 + form 280 + preview 300 + two handles) are 796px — so the same three
	 * subtrees become the three modes of a one-column view. Defining them once is the
	 * reason the small-screen mode cannot drift from the desktop one: there is no
	 * second copy of the form, the outline or the preview to forget to update.
	 */
	const sectionsPane = (
		/*
		 * The rail is a *region*: page tone, one hairline seam, no radius and no shadow.
		 * Its three group headers are micro rows (12/600 uppercase, muted) because they
		 * are the quietest thing in the pane — the section titles under them carry the
		 * weight. The old headers were 12/600 sentence-case with pill count chips, which
		 * made the chrome as loud as the content it framed.
		 */
		<ScrollArea className="h-full border-r bg-background">
			<div className="flex flex-col">
				<Collapsible onOpenChange={setContentOpen} open={contentOpen}>
					<CollapsibleTrigger className="br-micro flex h-10 w-full items-center justify-between gap-2 px-3 transition-colors hover:bg-accent/60">
						<div className="flex min-w-0 items-center gap-2">
							<ChevronDown
								className={`h-3.5 w-3.5 shrink-0 transition-transform ${contentOpen ? "" : "-rotate-90"}`}
							/>
							<Layers aria-hidden className="h-3.5 w-3.5 shrink-0" />
							<span>Sections</span>
							{isAnyPending && (
								<Loader2 className="h-3 w-3 shrink-0 animate-spin" />
							)}
						</div>
						<span className="tabular-nums">{activeResume.sections.length}</span>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="px-2 pt-1 pb-3">
							<SectionsManager
								isLoading={isAnyPending}
								onAddSection={handleAddSection}
								onDeleteSection={handleDeleteSection}
								onSectionsChange={handleSectionsReorder}
								onSelectSection={setSelectedSectionId}
								onSetLink={
									baseResume && activeResume.baseResumeId
										? handleSetSectionLink
										: undefined
								}
								personalInfo={activeResume.metadata?.personalInfo}
								sections={activeResume.sections}
								selectedSectionId={selectedSectionId || undefined}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>

				{/*
				 * Templates. Collapsed by default: it is a one-click choice
				 * made occasionally, and the Sections list above it is what you
				 * reach for constantly. It was previously open by default and
				 * shared its open flag with the preview's toolbar.
				 */}
				<Collapsible onOpenChange={setTypeOpen} open={typeOpen}>
					<CollapsibleTrigger className="br-micro flex h-10 w-full items-center justify-between gap-2 border-t px-3 transition-colors hover:bg-accent/60">
						<div className="flex min-w-0 items-center gap-2">
							<ChevronDown
								className={`h-3.5 w-3.5 shrink-0 transition-transform ${typeOpen ? "" : "-rotate-90"}`}
							/>
							<Layout aria-hidden className="h-3.5 w-3.5 shrink-0" />
							<span>Templates</span>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="px-2 pt-1 pb-3">
							<TemplateSelector
								currentTemplate={normalizeTemplateId(
									draftResume?.template ?? activeResume.template,
								)}
								onSelect={handleTemplateSelect}
							/>
						</div>
					</CollapsibleContent>
				</Collapsible>

				{/*
				 * Library lives here, not in the Review sheet.
				 *
				 * It used to be the fifth tab in a sheet next to Parser fit, Job target,
				 * History and Bullets. Those four are checks *on the document you are
				 * looking at*; the library is the pool of content the document is
				 * assembled from. Putting them in one flat list of five gave the
				 * sheet no structure, and `research`/`thrust` — the thing you reach
				 * for when writing — was as far from the Sections list as the
				 * keyboard could put it. It is content, so it sits with content.
				 */}
				<Collapsible onOpenChange={setLibraryOpen} open={libraryOpen}>
					<CollapsibleTrigger className="br-micro flex h-10 w-full items-center justify-between gap-2 border-t px-3 transition-colors hover:bg-accent/60">
						<div className="flex min-w-0 items-center gap-2">
							<ChevronDown
								className={`h-3.5 w-3.5 shrink-0 transition-transform ${libraryOpen ? "" : "-rotate-90"}`}
							/>
							<Library aria-hidden className="h-3.5 w-3.5 shrink-0" />
							<span>Library</span>
						</div>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<div className="px-2 pt-1 pb-3">
							<ContentLibraryPanel resume={draftResume ?? activeResume} />
						</div>
					</CollapsibleContent>
				</Collapsible>
			</div>
		</ScrollArea>
	);

	/*
	 * The form column is the one *floating* surface in the workbench: L1 tone, hairline
	 * seam, no radius (it is a column, not a card). That single tonal step is what
	 * separates "where I type" from "where I look" — before this pass all three panes
	 * were `--background`, so the editor read as one flat field with two dividers.
	 *
	 * The body is capped at the 640px measure the system specifies and centred in the
	 * pane, so a dragged-wide column does not stretch every input into a survey row.
	 */
	const formPane = (
		<div className="@container flex h-full min-h-0 flex-col border-r bg-surface">
			{selectedSection ? (
				<div className="flex h-11 shrink-0 items-center border-b px-4">
					<div className="mx-auto flex w-full max-w-[40rem] items-center justify-between gap-3">
						<div className="min-w-0">
							<p className="br-micro" data-form-position="">
								Section {sectionPosition} of {activeResume.sections.length}
							</p>
							<h2 className="truncate font-semibold text-base tracking-title">
								{/*
								 * For the personal-info block the stored `content.title` is a *contact
								 * block* heading ("Contact Information"), which the form then prints
								 * again as a group overline 200px below. The section's own name is the
								 * honest label for the pane, so that is what it uses.
								 */}
								{selectedSection.type === "personal-info"
									? SECTION_CONFIGS[selectedSection.type].defaultTitle
									: String(selectedSection.content.title ?? "") ||
										SECTION_CONFIGS[selectedSection.type].defaultTitle}
							</h2>
						</div>

						{/*
						 * The link control, beside the fields it affects. It was a bordered 28px
						 * button reading "Linked — click to take over" — the second-loudest thing
						 * in the column. The sentence survives as the accessible name; the row
						 * shows its state and the icon carries the rest.
						 */}
						{selectedSection.baseSectionId && handleSetSectionLink ? (
							<Button
								aria-label={
									selectedSection.linkedToBase
										? "Linked — click to take over"
										: "Detached — click to re-link"
								}
								className="shrink-0 text-fg-muted"
								onClick={() =>
									handleSetSectionLink(
										selectedSection.id,
										!selectedSection.linkedToBase,
									)
								}
								size="sm"
								static
								variant="ghost"
							>
								{selectedSection.linkedToBase ? (
									<Unlink2 aria-hidden className="h-3.5 w-3.5" />
								) : (
									<Link2 aria-hidden className="h-3.5 w-3.5" />
								)}
								<span className="@[28rem]:inline hidden">
									{selectedSection.linkedToBase ? "Linked" : "Detached"}
								</span>
							</Button>
						) : null}
					</div>
				</div>
			) : null}

			<ScrollArea className="flex-1">
				<div className="mx-auto w-full max-w-[40rem] px-4 py-6">
					{selectedSection ? (
						<>
							{/*
							 * Break semantics per section. Layout, not content: everything here is
							 * stored on `section.layout` and survives a variant copy.
							 */}
							{selectedSection.type !== "personal-info" ? (
								<SectionBreakControls
									onChange={(layout) =>
										handleSectionChange(selectedSection.id, { layout })
									}
									section={selectedSection}
								/>
							) : null}

							{renderSectionForm()}
						</>
					) : (
						<PanelEmpty
							action={
								activeResume.sections.length > 0 ? (
									<p className="text-xs">
										Or pick one from the list on the left.
									</p>
								) : (
									/*
									 * The one action that fixes the emptiness. A state that
									 * only describes itself is a dead end.
									 */
									<AddSectionMenu
										onAddSection={handleAddSection}
										sections={activeResume.sections}
									/>
								)
							}
							hint="Your form appears here, beside a live preview of the document."
							icon={<Layout aria-hidden className="h-5 w-5" />}
							title={
								activeResume.sections.length > 0
									? "Nothing selected"
									: "This resume has no sections yet"
							}
						/>
					)}
				</div>
			</ScrollArea>
		</div>
	);

	const previewView = (
		<div className="br-stage flex h-full flex-col overflow-hidden">
			{/*
			 * Formatting controls, collapsed by default.
			 *
			 * `FormattingToolbar` is a 692-line control surface -- typography,
			 * margins, colours, scale -- and it used to sit permanently above
			 * the document, inside the same column. So on a laptop the thing
			 * you open the editor to look at was permanently smaller than the
			 * controls that shape it, and both had to be scrolled past
			 * each other. Typography is something you set once and then look
			 * at the result of; it does not need permanent screen space.
			 *
			 * The header stays put and names what the controls currently are, so
			 * the collapsed state is still informative and reopening is one
			 * click rather than a hunt.
			 */}
			{activeResume.metadata ? (
				<Collapsible onOpenChange={setTypeControlsOpen} open={typeControlsOpen}>
					{/*
					 * A 40px sunken strip: the preview pane's toolbar, not a second header.
					 * It names only what the disclosure *is* — the archetype, page count and
					 * zoom now live in the top bar's one meta line, and saying them twice in
					 * 40px was the top bar's main source of noise.
					 */}
					<div className="flex h-10 shrink-0 items-center gap-2 border-b bg-sunken-static px-3">
						<CollapsibleTrigger className="flex h-7 min-w-0 flex-1 items-center gap-2 rounded-sm px-1 text-left text-xs transition-colors hover:text-foreground">
							<ChevronDown
								aria-hidden
								className={cn(
									"h-3.5 w-3.5 shrink-0 transition-transform",
									!typeControlsOpen && "-rotate-90",
								)}
							/>
							<span className="br-micro truncate">Typography &amp; layout</span>
						</CollapsibleTrigger>
						{/*
						 * The fit meter sits outside the trigger, not inside it: a button inside a
						 * button is the hydration error this file has already been bitten by, and the
						 * meter is the one interactive thing in the header.
						 */}
						<FitMeter
							onSelectSection={(id) => setSelectedSectionId(id)}
							onSettingsChange={handleSettingsChange}
							resume={draftResume ?? activeResume}
							settings={
								(draftResume?.metadata?.settings ??
									activeResume.metadata.settings) as ResumeSettings
							}
						/>
					</div>
					<CollapsibleContent>
						<FormattingToolbar
							onScaleChange={(next) => {
								userZoomedRef.current = true;
								setPreviewScale(next);
							}}
							onSettingsChange={handleSettingsChange}
							scale={previewScale}
							settings={
								(draftResume?.metadata?.settings as
									| ResumeSettings
									| undefined) ?? activeResume.metadata.settings
							}
						/>
					</CollapsibleContent>
				</Collapsible>
			) : null}

			{/* Preview Area */}
			{/*
			 * `min-w-max` on the inner wrapper, not just `justify-center`.
			 *
			 * A centred flex child that is wider than its scroll container overflows
			 * equally in both directions, and the left half cannot be scrolled to —
			 * the classic "my document is cut off" bug. Letting the wrapper size to
			 * its content keeps the whole page reachable at any zoom.
			 *
			 * Page snapping is small-screen only (`max-lg`): on a phone the document is
			 * the whole view, pages are already discrete fixed-size boxes, and stopping
			 * at a page boundary is the difference between "reading a document" and
			 * "scrolling a canvas". On a desktop the pane can be 400px tall and snapping
			 * would fight the scrollbar someone is dragging.
			 *
			 * Double-click toggles fit-width and 100%. Pinch is the browser's gesture and
			 * is left alone (`touch-action` on the page keeps `pinch-zoom`), so the app
			 * never fights the system zoom.
			 */}
			{/* biome-ignore lint/a11y/noStaticElementInteractions: double-click is a pointer-only shortcut; the same zoom is a labelled control in the toolbar, and the page must not become a tab stop. */}
			<div
				className="flex-1 overflow-auto max-lg:snap-y max-lg:snap-proximity"
				onDoubleClick={togglePreviewZoom}
				ref={setPreviewPane}
			>
				<div className="flex min-h-full min-w-max items-start justify-center p-3 lg:p-6">
					<TypstPreview
						resume={draftResume ?? activeResume}
						scale={previewScale}
					/>
				</div>
			</div>
		</div>
	);

	return (
		/*
		 * `data-editor-shell` is the readiness marker the browser harness waits for.
		 *
		 * It used to wait for the word "SECTIONS" in body text, which stopped existing
		 * below `lg` when the outline moved into a mode that starts hidden — a probe
		 * failure that looked like a mount failure. The shell is the honest signal: the
		 * editor is on screen, whichever mode is showing.
		 */
		<div className="flex h-dvh flex-col bg-background" data-editor-shell="">
			{/*
			 * Top bar. One line, 56px, a hairline under it: the instrument's nameplate.
			 *
			 * No `backdrop-blur` and no translucent fill — there is nothing to see through
			 * a header that sits on an opaque page, and the design system bans blur on work
			 * surfaces. The name is the loudest thing in the chrome (20/600) and appears
			 * once; everything under it is one muted meta sentence (archetype · density ·
			 * pages). The old bar printed the template name and page count in the preview
			 * strip as well, so the screen said the same facts twice.
			 */}
			<header className="z-(--br-z-sticky) shrink-0 border-b bg-background">
				<div className="flex min-h-14 flex-wrap items-center justify-between gap-2 px-4 py-2">
					{/* Left: Back + Resume Info */}
					<div className="flex min-w-0 items-center gap-4">
						<Button
							aria-label="Back to dashboard"
							onClick={() => navigate("/dashboard")}
							size="icon"
							variant="ghost"
						>
							<ArrowLeft aria-hidden="true" className="h-5 w-5" />
						</Button>
						{/*
						 * The document name is the largest thing in the chrome (20px): it is
						 * the thing being edited. The meta line beneath it carries the four
						 * facts that used to be scattered across the bar and the preview strip.
						 */}
						<div className="min-w-0">
							<h1 className="truncate font-semibold text-lg">
								{activeResume.name}
							</h1>
							<p className="truncate text-fg-muted text-xs" data-editor-meta="">
								{isShowcase(activeResume) ? "Showcase · " : ""}
								{metaLine({
									pageCount,
									resume: draftResume ?? activeResume,
								})}
							</p>
						</div>

						{/*
						 * Save state, compact below `lg`.
						 *
						 * It used to be `hidden lg:block`, so on a tablet or a phone the
						 * question "have I lost work?" had no answer anywhere on screen —
						 * the surface that exists to be honest about saving was the one
						 * that disappeared. The dot carries the icon and the same words
						 * for assistive tech; the sentence returns at `lg`.
						 */}
						<div className="lg:hidden">
							<SaveState
								changeCount={changeCount}
								compact
								isDirty={isDirty}
								isSaving={isAnyPending}
							/>
						</div>
					</div>

					{/*
					 * Variation Manager.
					 *
					 * Was `hidden md:flex`, which made variants completely unreachable
					 * below 768px. Its trigger is now icon-only below `md` (the label is
					 * `data-collapse-label`), so the feature is one tap away at any width
					 * instead of absent.
					 *
					 * It sits beside the document identity, not with the actions, and it is
					 * quiet: a ghost control naming the current kind. It used to be a solid
					 * accent badge plus a second bordered button, so the top bar carried four
					 * button styles and the loudest two were about *which file you are in*
					 * rather than about the document itself.
					 */}
					{baseResume && (
						<div className="flex items-center">
							<VariationManager
								baseResume={baseResume}
								currentResumeId={activeResume.id}
								isCreating={isCreatingVariation}
								onCreateVariation={handleCreateVariation}
								onDeleteVariation={handleDeleteVariation}
								onSelectVariation={handleSelectVariation}
								onSyncWithBase={handleSyncWithBase}
								variations={variations}
							/>
						</div>
					)}

					{/*
					 * Save state, between the document identity and the actions.
					 *
					 * The preview renders the draft and the server holds the saved
					 * resume, so "have I lost work?" had no answer anywhere on screen.
					 * `isAnyPending` only ever surfaced as a spinner inside the Sections
					 * collapsible header. This says which of the three true things is
					 * happening: in flight, unsaved, or saved.
					 */}
					<div
						aria-live="polite"
						className="mr-2 ml-auto hidden lg:block"
						data-responsive-duplicate="compact save state above lg"
					>
						<SaveState
							changeCount={changeCount}
							isDirty={isDirty}
							isSaving={isAnyPending}
						/>
					</div>

					{/* Right: Actions */}
					<div className="ml-auto flex flex-wrap items-center justify-end gap-2">
						{/*
						 * Import sits in the editor header, beside Review and Export, and not
						 * inside the left rail with the Library.
						 *
						 * The rail is where content lives once it is yours. Import is the
						 * moment before that -- a file someone else wrote, arriving as a
						 * proposal -- and burying it in the rail hides the only feature that
						 * takes a document as input. It is also the one trigger here that can
						 * create work from outside the editor, so it belongs next to the other
						 * top-level actions where its absence is obvious.
						 *
						 * It is a trigger and not a panel for the same reason `ReviewTrigger` is:
						 * the sheet, the file picker and both parsers must not mount until
						 * somebody actually opens them.
						 */}
						<ImportTrigger />
						<ReviewTrigger
							jobTarget={(draftResume ?? activeResume).metadata?.jobTarget}
							onJobTargetChange={handleJobTargetChange}
							resume={draftResume ?? activeResume}
						/>
						{/*
						 * The DRAFT, not `activeResume`.
						 *
						 * This was the single worst defect in the surface: the preview was
						 * handed `draftResume` and the exporter was handed `activeResume`.
						 * Type an edit, do not press Save, export — and the file you send
						 * silently omits the edit you are looking at. A preview that does not
						 * match the artefact teaches the user to distrust the one surface
						 * meant to be WYSIWYG, and there is no way to notice from the outside.
						 *
						 * Exporting the draft makes "what you see is what you send" literally
						 * true. The Save indicator above carries the remaining honesty: the
						 * file is correct, but the server does not have it yet.
						 */}
						<ExportButtons
							hasUnsavedChanges={isDirty}
							resume={draftResume ?? activeResume}
							variant="dropdown"
						/>
					</div>
				</div>
			</header>

			{/*
			 * Write failures, surfaced.
			 *
			 * Every mutation handler here used to `console.error` and return, so a
			 * rejected write was invisible in the product: the form kept saying
			 * "Unsaved changes" with no way to tell a slow network from a refusal,
			 * and a section that failed to add simply never appeared. A console is not
			 * an error state. `role="alert"` so it is announced, and it sits above the
			 * panes rather than inside one, because a failed section write is not
			 * scoped to whichever panel happens to be open.
			 */}
			{editorError ? (
				<div
					className="flex items-start gap-3 border-destructive/30 border-b bg-destructive/10 px-4 py-2 text-sm"
					role="alert"
				>
					<AlertTriangle
						aria-hidden
						className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
					/>
					<p className="min-w-0 flex-1 text-destructive">{editorError}</p>
					<Button
						aria-label="Dismiss this error"
						className="h-6 shrink-0 px-2"
						onClick={() => setEditorError(null)}
						size="sm"
						variant="ghost"
					>
						Dismiss
					</Button>
				</div>
			) : null}

			{/* Main Content */}
			<div className="min-h-0 flex-1 overflow-hidden">
				{isWideEditor ? (
					<PanelGroup
						id="resume-editor-panels"
						orientation="horizontal"
						style={{ height: "100%" }}
					>
						{/*
						 * Pixel floors, not percentages.
						 *
						 * `minSize="12%"` was 92px at 768px and ~123px at 1024px: drag the
						 * rail that narrow and the outline is a column of clipped words.
						 * `react-resizable-panels` reads a number as pixels, so these are
						 * the smallest sizes at which each pane still does its job.
						 */}
						<Panel
							defaultSize="22%"
							id="left-panel"
							maxSize="28%"
							minSize={200}
						>
							{sectionsPane}
						</Panel>

						<PanelResizeHandle
							/*
							 * A persistent grip, not a hover-only target.
							 *
							 * The handle used to be a 6px `bg-border` strip: a hairline tone at
							 * 1.3:1, invisible until it was hovered, which meant the one control
							 * that resizes the editor had no rest state at all. The hit area stays
							 * 8px; the drawn grip is a 2px `--border-control` line (≥3:1) that steps
							 * up to the accent on hover and while dragging.
							 */
							className="relative w-2 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-control after:transition-colors after:duration-(--br-duration-fast) hover:after:bg-border-selected active:after:bg-border-selected"
						/>

						{/* Middle Panel - Form Editor */}
						<Panel
							defaultSize="40%"
							id="form-panel"
							maxSize="58%"
							minSize={280}
						>
							{formPane}
						</Panel>

						<PanelResizeHandle className="relative w-2 bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-control after:transition-colors after:duration-(--br-duration-fast) hover:after:bg-border-selected active:after:bg-border-selected" />

						{/* Right Panel - Preview */}
						<Panel defaultSize="38%" id="right-panel" minSize={300}>
							{previewView}
						</Panel>
					</PanelGroup>
				) : (
					/*
					 * One column, three modes.
					 *
					 * The panes stay mounted and swap visibility rather than unmounting, so
					 * each mode keeps its own scroll position — switching to the preview and
					 * back does not throw away where you were in a long form. The preview's
					 * `ResizeObserver` correctly reports 0 while it is `display: none` and
					 * re-fits the moment it becomes visible, which is why fit-to-pane still
					 * works the first time Preview is opened.
					 */
					<div className="small-screen-editor flex h-full min-h-0 flex-col">
						<div
							className={cn(
								"min-h-0 flex-1 overflow-hidden",
								smallScreenMode !== "sections" && "hidden",
							)}
						>
							{sectionsPane}
						</div>
						<div
							className={cn(
								"min-h-0 flex-1 overflow-hidden",
								smallScreenMode !== "form" && "hidden",
							)}
						>
							{formPane}
						</div>
						<div
							className={cn(
								"min-h-0 flex-1 overflow-hidden",
								smallScreenMode !== "preview" && "hidden",
							)}
						>
							{previewView}
						</div>

						<nav
							aria-label="Editor view"
							className="small-screen-nav shrink-0 border-t bg-background"
							style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
						>
							{/*
							 * A segmented control, not three tinted tabs: a sunken track with the
							 * active mode on a raised surface thumb. The old active state was a flat
							 * `bg-accent` fill that read as a pressed button rather than as the
							 * selected segment of an instrument.
							 */}
							<div className="small-screen-nav-list grid grid-cols-3 gap-1 rounded-md bg-sunken-static p-1">
								{SMALL_SCREEN_MODES.map((mode) => {
									const active = smallScreenMode === mode.id;
									return (
										<button
											aria-current={active ? "true" : undefined}
											className={cn(
												"flex min-h-14 flex-col items-center justify-center gap-1 rounded-sm text-xs transition-[color,background-color,box-shadow] duration-(--br-duration-fast) ease-enter",
												active
													? "bg-surface font-medium text-foreground shadow-elev-1"
													: "text-fg-muted hover:text-foreground",
											)}
											data-touch-primary=""
											key={mode.id}
											onClick={() => setSmallScreenMode(mode.id)}
											type="button"
										>
											<mode.Icon aria-hidden className="h-4 w-4" />
											<span className="small-screen-nav-label">
												{mode.label}
											</span>
										</button>
									);
								})}
							</div>
						</nav>
					</div>
				)}
			</div>
		</div>
	);
}
