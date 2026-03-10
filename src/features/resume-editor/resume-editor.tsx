"use client";

/**
 * Resume Editor Page (Hash Router Version)
 * Uses React Query (tRPC) for data fetching instead of localStorage.
 */

import {
	ArrowLeft,
	ChevronDown,
	Clock,
	Layers,
	Layout,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { TooltipProvider } from "@/components/ui/tooltip";
import type {
	ActivityLog,
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
import {
	ChangeLog,
	FormattingToolbar,
	SectionsManager,
	TemplateSelector,
	TypstPreview,
	VariationManager,
} from "./components";

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
				setDraftResume(activeResume as any as ResumeWithSections);
			}
		}
	}, [activeResume, draftResume]); // Remove draftResume from dependencies to avoid circular updates

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
			if (!prev || !prev.metadata) return prev;
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
			if (!prev || !prev.metadata) return prev;
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
			(r: any) => r.baseResumeId === baseId || r.id === baseId,
		);
	}, [activeResume, allResumes]);

	// Get base resume
	const baseResume = useMemo(() => {
		if (!activeResume) return null;
		if (activeResume.variationType === "base") return activeResume;
		return (
			allResumes.find((r: any) => r.id === activeResume.baseResumeId) || null
		);
	}, [activeResume, allResumes]);

	// Get selected section
	const selectedSection = useMemo(() => {
		if (!activeResume || !selectedSectionId) return null;
		return (
			activeResume.sections.find((s: any) => s.id === selectedSectionId) || null
		);
	}, [activeResume, selectedSectionId]);

	// Activity log - for now just empty (can be implemented later with backend)
	const currentActivityLog: ActivityLog[] = [];

	// Handlers
	const handleSectionChange = useCallback(
		async (sectionId: string, updates: Partial<ResumeSection>) => {
			if (!activeResume) return;
			try {
				await updateSection(sectionId, updates);
			} catch (err) {
				console.error("Failed to update section:", err);
			}
		},
		[activeResume, updateSection],
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
			if (!selectedSection || selectedSection.type !== "summary") return;
			handleSectionChange(selectedSection.id, {
				content: { ...selectedSection.content, html },
			});
		},
		[selectedSection, handleSectionChange],
	);

	const handlePersonalInfoChange = useCallback(
		async (info: PersonalInfo) => {
			if (!activeResume || !activeResume.metadata) return;
			try {
				await updateResume(activeResume.id, {
					metadata: {
						...(activeResume.metadata as ResumeMetadata),
						personalInfo: info,
					},
				});
			} catch (err) {
				console.error("Failed to update personal info:", err);
			}
		},
		[activeResume, updateResume],
	);

	const handleAddSection = useCallback(
		async (type: SectionType) => {
			if (!activeResume) return;
			const config = SECTION_CONFIGS[type];
			try {
				await createSection({
					type,
					visible: true,
					content: {
						title: config.defaultTitle,
						data: type === "summary" ? {} : [],
						html: type === "summary" ? "" : undefined,
					},
				});
			} catch (err) {
				console.error("Failed to add section:", err);
			}
		},
		[activeResume, createSection],
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
					console.error("Failed to delete section:", err);
				}
			}
		},
		[activeResume, deleteSectionMutation, selectedSectionId, confirm],
	);

	const handleSectionsReorder = useCallback(
		async (sections: ResumeSection[]) => {
			if (!activeResume) return;
			const sectionIds = sections.map((s) => s.id);
			try {
				await reorderSections(sectionIds);
			} catch (err) {
				console.error("Failed to reorder sections:", err);
			}
		},
		[activeResume, reorderSections],
	);

	const handleSettingsChange = useCallback(
		async (settings: PartialResumeSettings) => {
			if (!activeResume || !activeResume.metadata) return;
			try {
				setDraftResume((prev) => {
					if (!prev || !prev.metadata) return prev;
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
					if (!activeResume || !activeResume.metadata) return;
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
						console.error("Failed to save settings:", err);
					}
				}, 600);
			} catch (err) {
				console.error("Failed to update settings:", err);
			}
		},
		[activeResume, updateResume],
	);

	const handleCreateVariation = useCallback(
		async (name: string, domain?: string) => {
			if (!baseResume) return;
			// For now, use duplicate since createVariation needs to be added to backend
			// TODO: Add proper createVariation endpoint
			console.log("Create variation:", name, domain);
		},
		[baseResume],
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
				console.error("Failed to delete variation:", err);
			}
		},
		[deleteResume, baseResume, navigate],
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
					} as any);
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
				<div className="flex h-14 items-center justify-between px-4">
					{/* Left: Back + Resume Info */}
					<div className="flex items-center gap-4">
						<Button
							onClick={() => navigate("/dashboard")}
							size="icon"
							variant="ghost"
						>
							<ArrowLeft className="h-5 w-5" />
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
								onCreateVariation={handleCreateVariation}
								onDeleteVariation={handleDeleteVariation}
								onSelectVariation={handleSelectVariation}
								variations={variations}
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
			<div
				className="flex-1 overflow-hidden"
				style={{ height: "calc(100vh - 56px)" }}
			>
				<PanelGroup
					id="resume-editor-panels"
					orientation="horizontal"
					style={{ height: "100%" }}
				>
					{/* Left Panel - VS Code style collapsible sections */}
					<Panel defaultSize="20%" id="left-panel" maxSize="40%" minSize="15%">
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
												sections={activeResume.sections}
												selectedSectionId={selectedSectionId || undefined}
											/>
										</div>
									</CollapsibleContent>
								</Collapsible>

								{/* TEMPLATES Section */}
								<Collapsible onOpenChange={setDesignOpen} open={designOpen}>
									<CollapsibleTrigger className="flex w-full items-center justify-between border-t px-4 py-2 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-accent/50">
										<div className="flex items-center gap-2">
											<ChevronDown
												className={`h-4 w-4 transition-transform ${designOpen ? "" : "-rotate-90"}`}
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

								{/* ACTIVITY Section */}
								<Collapsible onOpenChange={setActivityOpen} open={activityOpen}>
									<CollapsibleTrigger className="flex w-full items-center justify-between border-t px-4 py-2 font-semibold text-xs uppercase tracking-wider transition-colors hover:bg-accent/50">
										<div className="flex items-center gap-2">
											<ChevronDown
												className={`h-4 w-4 transition-transform ${activityOpen ? "" : "-rotate-90"}`}
											/>
											<Clock className="h-4 w-4" />
											<span>Activity</span>
										</div>
									</CollapsibleTrigger>
									<CollapsibleContent>
										<div className="px-4 pb-4">
											<p className="mb-2 text-muted-foreground text-xs">
												{currentActivityLog.length} changes
											</p>
											{currentActivityLog.length === 0 ? (
												<p className="text-muted-foreground text-sm italic">
													No activity yet
												</p>
											) : (
												<ChangeLog logs={currentActivityLog} />
											)}
										</div>
									</CollapsibleContent>
								</Collapsible>
							</div>
						</ScrollArea>
					</Panel>

					<PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/50 active:bg-primary" />

					{/* Middle Panel - Form Editor */}
					<Panel defaultSize="30%" id="form-panel" maxSize="50%" minSize="20%">
						<div className="flex h-full flex-col border-r">
							<ScrollArea className="flex-1">
								<div className="p-4">
									{selectedSection ? (
										renderSectionForm()
									) : (
										<div className="py-12 text-center text-muted-foreground">
											<Layout className="mx-auto mb-4 h-12 w-12 opacity-50" />
											<p>Select a section to edit</p>
										</div>
									)}
								</div>
							</ScrollArea>
						</div>
					</Panel>

					<PanelResizeHandle className="w-1.5 bg-border transition-colors hover:bg-primary/50 active:bg-primary" />

					{/* Right Panel - Preview */}
					<Panel defaultSize="50%" id="right-panel" minSize="20%">
						<div className="flex h-full flex-col overflow-hidden bg-muted/30">
							{/* Formatting Toolbar with all settings */}
							{activeResume.metadata && (
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
							)}

							{/* Preview Area */}
							<div className="flex-1 overflow-auto">
								<div className="flex min-h-full items-start justify-center p-8">
									<TypstPreview
										resume={draftResume || activeResume}
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
