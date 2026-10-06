"use client";

/**
 * Resume Editor Page (Hash Router Version)
 * Uses React Query (tRPC) for data fetching instead of localStorage.
 */

import {
	AlertTriangle,
	ArrowLeft,
	ChevronDown,
	Layers,
	Layout,
	Library,
	Loader2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { PanelEmpty } from "@/components/ui/panel-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
	draftChangeCount,
	isDraftDirty,
} from "@/features/resume-editor/lib/draft-state";
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
import { useHashRouter } from "@/lib/hash-router";
import { cn } from "@/lib/utils";
import {
	FormattingToolbar,
	SaveState,
	SectionsManager,
	TemplateSelector,
	TypstPreview,
	VariationManager,
} from "./components";
import { ContentLibraryPanel } from "./components/content-library-panel";
import { ImportTrigger } from "./components/import-review-panel";
import { ReviewTrigger } from "./components/review-panel";

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
		(sectionId: string, html: string) => {
			setDraftResume((prev) => {
				if (!prev) return prev;
				const section = prev.sections.find((s) => s.id === sectionId);
				if (section && section.content.html === html) {
					return prev;
				}

				return {
					...prev,
					sections: prev.sections.map((s) =>
						s.id === sectionId
							? { ...s, content: { ...s.content, html }, updatedAt: new Date() }
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
		(html: string) => {
			if (selectedSectionIdRef.current) {
				handleDraftSummaryUpdate(selectedSectionIdRef.current, html);
			}
		},
		[handleDraftSummaryUpdate],
	);
	const [previewScale, setPreviewScale] = useState(0.7);
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

		const config = TEMPLATE_CONFIGS[templateId];
		const metadata = activeResume.metadata as ResumeMetadata;

		// Apply the template's default colors while preserving all other settings
		const newSettings: PartialResumeSettings = {
			...metadata.settings,
			colors: {
				...metadata.settings.colors,
				...config.defaultColors,
			},
		};

		setDraftResume((prev) => {
			if (!prev?.metadata) return prev;
			const baseSettings = prev.metadata.settings;
			return {
				...prev,
				template: templateId,
				metadata: {
					...prev.metadata,
					settings: {
						...baseSettings,
						colors: { ...baseSettings.colors, ...config.defaultColors },
					},
				},
				updatedAt: new Date(),
			};
		});

		updateResume(resumeId, {
			template: templateId,
			metadata: {
				...metadata,
				settings: newSettings,
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
		(html: string) => {
			if (selectedSection?.type !== "summary") return;
			handleSectionChange(selectedSection.id, {
				content: { ...selectedSection.content, html },
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
		(html: string) => {
			if (selectedSection?.type !== "custom") return;
			handleSectionChange(selectedSection.id, {
				content: { ...selectedSection?.content, html },
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
	 * No `onCreateVariation` is passed to `VariationManager`.
	 *
	 * This used to be a `console.log` behind a complete, working-looking Create
	 * Variation dialog: fill in a name and a domain, press the button, the dialog
	 * closed and nothing happened — no error, no new variation, no explanation. A
	 * control that silently does nothing is worse than an absent one, because the
	 * user concludes the feature is broken rather than unbuilt.
	 *
	 * So the prop is optional and the control hides itself. Wiring this up properly
	 * needs a `resume.createVariation` procedure that does not exist yet; the
	 * roadmap's sequencing puts it behind the content-library work, and inventing a
	 * mutation contract here would be worse than leaving the control out.
	 */

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
				const personalInfo =
					activeResume.metadata.personalInfo ??
					({
						fullName: "",
						email: "",
						phone: "",
						location: "",
						linkedin: "",
						github: "",
						website: "",
						portfolio: "",
						professionalTitle: "",
						photoUrl: "",
					} as PersonalInfo);
				return (
					<PersonalInfoForm
						data={personalInfo}
						key={selectedSection.id}
						onChange={handlePersonalInfoChange}
						onLocalUpdate={handleDraftPersonalInfoUpdate}
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
					/>
				);
			}
			case "summary":
				return (
					<div className="space-y-4">
						<div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex min-h-10 items-center border-b bg-background/95 px-4 py-2 backdrop-blur">
							<h3 className="font-semibold">
								{content.title ||
									SECTION_CONFIGS[selectedSection.type].defaultTitle}
							</h3>
						</div>
						<RichTextEditor
							content={content.html || ""}
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
				 * section the product does not model.
				 */
				return (
					<div className="space-y-4">
						<div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 flex min-h-10 items-center border-b bg-background/95 px-4 py-2 backdrop-blur">
							<h3 className="font-semibold">
								{content.title ||
									SECTION_CONFIGS[selectedSection.type].defaultTitle}
							</h3>
						</div>
						<RichTextEditor
							content={content.html || ""}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
						title={
							content.title ||
							SECTION_CONFIGS[selectedSection.type as SectionType].defaultTitle
						}
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
			<div className="flex h-screen items-center justify-center">
				<div className="space-y-4 text-center">
					<Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading resume...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (isError) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="space-y-4 text-center">
					<h2 className="font-semibold text-destructive text-xl">
						Error loading resume
					</h2>
					<p className="text-muted-foreground">
						Failed to load resume. Please try again.
					</p>
					<Button onClick={() => navigate("/dashboard")}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	// Resume not found
	if (!activeResume) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="space-y-4 text-center">
					<h2 className="font-semibold text-xl">Resume not found</h2>
					<p className="text-muted-foreground">
						The resume you're looking for doesn't exist.
					</p>
					<Button onClick={() => navigate("/dashboard")}>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col bg-background">
			{/* Header */}
			<header className="z-50 border-b bg-background/95 backdrop-blur">
				{/*
				 * `min-h-14` + wrap, for the same reason as the dashboard header and worse:
				 * at 390px this row measured Back, the resume identity, Import, Review and
				 * Export — 558px of content in a 390px viewport, so the page scrolled
				 * sideways and Export sat 168px off the edge where it could not be reached
				 * without scrolling the whole document.
				 *
				 * Wrapping is containment, not design: the row now stays inside the viewport
				 * at any width. Collapsing these three actions to icons on small screens is
				 * still worth doing, and is deliberately left as a separate change rather than
				 * folded in here.
				 */}
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
						<div className="min-w-0">
							<h1 className="truncate font-semibold text-sm">
								{activeResume.name}
							</h1>
							<p className="text-muted-foreground text-xs">
								{activeResume.domain || activeResume.template}
							</p>
						</div>
					</div>

					{/* Center: Variation Manager */}
					{baseResume && (
						<div className="hidden items-center md:flex">
							<VariationManager
								baseResume={baseResume}
								currentResumeId={activeResume.id}
								onDeleteVariation={handleDeleteVariation}
								onSelectVariation={handleSelectVariation}
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
					<div aria-live="polite" className="mr-2 ml-auto hidden lg:block">
						<SaveState
							changeCount={changeCount}
							isDirty={isDirty}
							isSaving={isAnyPending}
						/>
					</div>

					{/* Right: Actions */}
					<div className="flex flex-wrap items-center justify-end gap-2">
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
					className="flex items-start gap-3 border-destructive/30 border-b bg-destructive/10 px-4 py-2.5 text-sm"
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
				<PanelGroup
					id="resume-editor-panels"
					orientation="horizontal"
					style={{ height: "100%" }}
				>
					{/* Left Panel - VS Code style collapsible sections */}
					<Panel defaultSize="18%" id="left-panel" maxSize="32%" minSize="13%">
						<ScrollArea className="h-full border-r">
							<div className="flex flex-col">
								{/* CONTENT Section */}
								<Collapsible onOpenChange={setContentOpen} open={contentOpen}>
									<CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-2 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-accent/50">
										<div className="flex items-center gap-2">
											<ChevronDown
												className={`h-4 w-4 transition-transform ${contentOpen ? "" : "-rotate-90"}`}
											/>
											<Layers className="h-4 w-4" />
											<span>Sections</span>
											{isAnyPending && (
												<Loader2 className="h-3 w-3 animate-spin" />
											)}
										</div>
										<span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
											{activeResume.sections.length}
										</span>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="px-2 pb-2">
											<SectionsManager
												isLoading={isAnyPending}
												onAddSection={handleAddSection}
												onDeleteSection={handleDeleteSection}
												onSectionsChange={handleSectionsReorder}
												onSelectSection={setSelectedSectionId}
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
									<CollapsibleTrigger className="flex w-full items-center justify-between border-t px-4 py-2 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-accent/50">
										<div className="flex items-center gap-2">
											<ChevronDown
												className={`h-4 w-4 transition-transform ${typeOpen ? "" : "-rotate-90"}`}
											/>
											<Layout className="h-4 w-4" />
											<span>Templates</span>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="px-2 pb-2">
											<TemplateSelector
												currentTemplate={
													(draftResume?.template ||
														activeResume.template ||
														"minimal") as TemplateType
												}
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
									<CollapsibleTrigger className="flex w-full items-center justify-between border-t px-4 py-2 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-accent/50">
										<div className="flex items-center gap-2">
											<ChevronDown
												className={`h-4 w-4 transition-transform ${libraryOpen ? "" : "-rotate-90"}`}
											/>
											<Library className="h-4 w-4" />
											<span>Library</span>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="px-2 pb-2">
											<ContentLibraryPanel
												resume={draftResume ?? activeResume}
											/>
										</div>
									</CollapsibleContent>
								</Collapsible>
							</div>
						</ScrollArea>
					</Panel>

					<PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/50 active:bg-primary" />

					{/* Middle Panel - Form Editor */}
					<Panel defaultSize="38%" id="form-panel" maxSize="60%" minSize="24%">
						<div className="flex h-full flex-col border-r">
							<ScrollArea className="flex-1">
								<div className="p-4">
									{selectedSection ? (
										renderSectionForm()
									) : (
										<PanelEmpty
											action={
												activeResume.sections.length > 0 ? (
													<p className="text-xs">
														Or pick one from the list on the left.
													</p>
												) : null
											}
											hint="Your form appears here, beside a live preview of the document."
											icon={
												<Layout aria-hidden className="h-8 w-8 opacity-40" />
											}
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
					</Panel>

					<PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/50 active:bg-primary" />

					{/* Right Panel - Preview */}
					<Panel defaultSize="44%" id="right-panel" minSize="24%">
						<div className="flex h-full flex-col overflow-hidden bg-muted/30">
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
								<Collapsible
									onOpenChange={setTypeControlsOpen}
									open={typeControlsOpen}
								>
									<div className="flex items-center gap-2 border-b bg-background px-3 py-1.5">
										<CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left text-xs transition-colors hover:bg-accent/50">
											<ChevronDown
												aria-hidden
												className={cn(
													"h-3.5 w-3.5 shrink-0 transition-transform",
													!typeControlsOpen && "-rotate-90",
												)}
											/>
											<span className="font-medium">
												Typography &amp; layout
											</span>
											<span className="truncate text-muted-foreground">
												{TEMPLATE_CONFIGS[
													(draftResume?.template ??
														activeResume.template ??
														"minimal") as TemplateType
												]?.name ?? "Minimal"}
												· {Math.round(previewScale * 100)}%
											</span>
										</CollapsibleTrigger>
									</div>
									<CollapsibleContent>
										<FormattingToolbar
											onScaleChange={setPreviewScale}
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
							<div className="flex-1 overflow-auto">
								<div className="flex min-h-full items-start justify-center p-6">
									<TypstPreview
										resume={draftResume ?? activeResume}
										scale={previewScale}
									/>
								</div>
							</div>
						</div>
					</Panel>
				</PanelGroup>
			</div>
		</div>
	);
}
