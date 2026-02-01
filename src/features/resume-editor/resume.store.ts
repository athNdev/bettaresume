/**
 * Resume Store
 *
 * Manages resume state using Zustand with sync support.
 */

import { create } from "zustand";
import type {
	ActivityAction,
	ActivityLog,
	PartialResumeSettings,
	Resume,
	ResumePage,
	ResumeSection,
	ResumeSettings,
	SectionType,
	TemplateType,
} from "@/features/resume-editor/types";
import {
	DEFAULT_TYPOGRAPHY,
	SECTION_CONFIGS,
	TEMPLATE_CONFIGS,
} from "@/features/resume-editor/types";
import { type BackendStatus, syncManager } from "@/lib/api";

const createDefaultSettings = (template: TemplateType): ResumeSettings => ({
	pageSize: "A4",
	margins: { top: 20, right: 20, bottom: 20, left: 20 },
	fontSize: 11,
	fontScale: 1.0,
	typography: { ...DEFAULT_TYPOGRAPHY },
	lineHeight: 1.5,
	fontFamily: "Inter",
	colors: TEMPLATE_CONFIGS[template].defaultColors,
	layout: TEMPLATE_CONFIGS[template].layout,
	sectionSpacing: "normal",
	showIcons: true,
	dateFormat: "MMM YYYY",
	accentStyle: "underline",
});

const createDefaultResume = (
	name: string,
	template: TemplateType,
	domain?: string,
): Resume => {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		userId: "", // Will be set when syncing to backend
		name,
		variationType: "base",
		baseResumeId: null,
		domain: domain ?? null,
		createdAt: now,
		updatedAt: now,
		template,
		sections: [
			{
				id: crypto.randomUUID(),
				type: "personal-info",
				order: 0,
				visible: true,
				content: {
					title: SECTION_CONFIGS["personal-info"].defaultTitle,
					data: {},
				},
			},
			{
				id: crypto.randomUUID(),
				type: "summary",
				order: 1,
				visible: true,
				content: {
					title: SECTION_CONFIGS.summary.defaultTitle,
					data: {},
					html: "",
				},
			},
			{
				id: crypto.randomUUID(),
				type: "experience",
				order: 2,
				visible: true,
				content: {
					title: SECTION_CONFIGS.experience.defaultTitle,
					data: [],
				},
			},
			{
				id: crypto.randomUUID(),
				type: "education",
				order: 3,
				visible: true,
				content: { title: SECTION_CONFIGS.education.defaultTitle, data: [] },
			},
			{
				id: crypto.randomUUID(),
				type: "skills",
				order: 4,
				visible: true,
				content: { title: SECTION_CONFIGS.skills.defaultTitle, data: [] },
			},
		],
		metadata: {
			personalInfo: { fullName: "", email: "" },
			settings: createDefaultSettings(template),
		},
		tags: domain ? [domain] : [],
		isArchived: false,
	};
};

const logActivity = (
	resumeId: string,
	action: ActivityAction,
	description: string,
	metadata?: Record<string, unknown>,
): ActivityLog => ({
	id: crypto.randomUUID(),
	resumeId,
	action,
	description,
	timestamp: new Date().toISOString(),
	metadata,
});

interface ResumeStore {
	resumes: Resume[];
	activeResumeId: string | null;
	activeResume: Resume | null;
	activityLog: ActivityLog[];
	_hasHydrated: boolean;
	_backendStatus: BackendStatus;
	_isInitialized: boolean;

	// Sync methods
	initializeSync: () => Promise<void>;
	getBackendStatus: () => BackendStatus;
	_syncResume: (resume: Resume) => void;
	_syncDelete: (id: string) => void;
	setHasHydrated: (state: boolean) => void;

	// CRUD operations
	createResume: (
		name: string,
		template: TemplateType,
		domain?: string,
	) => string;
	deleteResume: (id: string) => void;
	setActiveResume: (id: string) => void;
	updateResume: (id: string, updates: Partial<Resume>) => void;
	duplicateResume: (id: string, newName: string) => string;
	archiveResume: (id: string) => void;
	restoreResume: (id: string) => void;

	// Section operations
	addSection: (
		resumeId: string,
		section: Omit<ResumeSection, "id" | "order">,
	) => void;
	updateSection: (
		resumeId: string,
		sectionId: string,
		updates: Partial<ResumeSection>,
	) => void;
	deleteSection: (resumeId: string, sectionId: string) => void;
	reorderSections: (resumeId: string, sectionIds: string[]) => void;
	duplicateSection: (resumeId: string, sectionId: string) => void;

	// Variation management
	createVariation: (
		baseResumeId: string,
		domain: string,
		name: string,
	) => string;
	getVariations: (baseResumeId: string) => Resume[];
	duplicateVariation: (variationId: string, newName: string) => string;

	// Section linking
	customizeSection: (resumeId: string, sectionId: string) => void;
	resetSectionToBase: (resumeId: string, sectionId: string) => void;
	syncLinkedSections: (variationId: string) => void;
	getSectionLinkStatus: (
		resumeId: string,
		sectionId: string,
	) => "linked" | "customized" | "base";
	logSectionChange: (
		resumeId: string,
		sectionType: SectionType,
		changeDescription: string,
	) => void;

	// Settings & Templates
	updateSettings: (resumeId: string, settings: PartialResumeSettings) => void;
	updateTemplate: (resumeId: string, template: TemplateType) => void;

	// Page management
	addPage: (resumeId: string, name?: string) => string;
	deletePage: (resumeId: string, pageId: string) => void;
	reorderPages: (resumeId: string, pageIds: string[]) => void;
	updatePage: (
		resumeId: string,
		pageId: string,
		updates: Partial<ResumePage>,
	) => void;
	moveSectionToPage: (
		resumeId: string,
		sectionId: string,
		pageId: string,
	) => void;

	// Import/Export
	exportToJSON: (resumeId: string) => string;
	importFromJSON: (json: string) => string | null;
	exportAllToJSON: () => string;
	importAllFromJSON: (json: string) => void;

	// Activity & Search
	getActivityLog: (resumeId?: string) => ActivityLog[];
	clearActivityLog: () => void;
	searchResumes: (query: string) => Resume[];
	filterByTag: (tag: string) => Resume[];
	filterByDomain: (domain: string) => Resume[];

	// Cloud sync
	cloudSync: {
		isEnabled: boolean;
		isSyncing: boolean;
		lastSyncedAt: string | null;
		error: string | null;
	};
	enableCloudSync: (userId: string) => void;
	disableCloudSync: () => void;
	syncToCloud: () => Promise<void>;
	fetchFromCloud: () => Promise<void>;
	setCloudUserId: (userId: string | null) => void;
}

export const useResumeStore = create<ResumeStore>()((set, get) => ({
	resumes: [],
	activeResumeId: null,
	activeResume: null,
	activityLog: [],
	_hasHydrated: false,
	_backendStatus: "unknown" as BackendStatus,
	_isInitialized: false,

	// Initialize sync and load data
	initializeSync: async () => {
		if (get()._isInitialized) return;

		try {
			const { resumes, backendStatus } = await syncManager.initialize();
			set({
				resumes,
				_backendStatus: backendStatus,
				_hasHydrated: true,
				_isInitialized: true,
			});
		} catch (error) {
			console.error("Failed to initialize sync:", error);
			set({
				_hasHydrated: true,
				_isInitialized: true,
				_backendStatus: "offline",
			});
		}
	},

	getBackendStatus: () => get()._backendStatus,

	_syncResume: (resume: Resume) => {
		syncManager.queueSave(resume);
	},

	_syncDelete: (id: string) => {
		syncManager.deleteResume(id);
	},

	setHasHydrated: (state: boolean) => {
		set({ _hasHydrated: state });
	},

	createResume: (name: string, template: TemplateType, domain?: string) => {
		const newResume = createDefaultResume(name, template, domain);
		const activity = logActivity(
			newResume.id,
			"created",
			`Created resume "${name}"`,
		);
		set((state) => ({
			resumes: [...state.resumes, newResume],
			activeResumeId: newResume.id,
			activeResume: newResume,
			activityLog: [...state.activityLog, activity],
		}));
		syncManager.queueSave(newResume);
		return newResume.id;
	},

	deleteResume: (id: string) => {
		const resume = get().resumes.find((r) => r.id === id);
		if (!resume) return;
		const activity = logActivity(
			id,
			"deleted",
			`Deleted resume "${resume.name}"`,
		);
		set((state) => {
			const resumes = state.resumes.filter((r) => r.id !== id);
			const activeResumeId =
				state.activeResumeId === id ? null : state.activeResumeId;
			const activeResume = activeResumeId
				? resumes.find((r) => r.id === activeResumeId) || null
				: null;
			return {
				resumes,
				activeResumeId,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		syncManager.deleteResume(id);
	},

	setActiveResume: (id: string) => {
		// Skip if already active to prevent unnecessary re-renders
		if (get().activeResumeId === id) {
			return;
		}

		const resume = get().resumes.find((r) => r.id === id);
		if (resume) {
			// Auto-sync linked sections when opening a variation
			if (resume.variationType === "variation" && resume.baseResumeId) {
				const baseResume = get().resumes.find(
					(r) => r.id === resume.baseResumeId,
				);
				if (baseResume) {
					const syncedSections = resume.sections.map((section) => {
						if (section.linkedToBase !== false) {
							const baseSection = baseResume.sections.find(
								(s) => s.type === section.type,
							);
							if (baseSection) {
								return {
									...section,
									content: JSON.parse(JSON.stringify(baseSection.content)),
									visible: baseSection.visible,
									linkedToBase: true,
								};
							}
						}
						return section;
					});

					const variationTypes = new Set(resume.sections.map((s) => s.type));
					baseResume.sections.forEach((baseSection) => {
						if (!variationTypes.has(baseSection.type)) {
							syncedSections.push({
								...JSON.parse(JSON.stringify(baseSection)),
								id: crypto.randomUUID(),
								order: syncedSections.length,
								linkedToBase: true,
							});
						}
					});

					const syncedResume = {
						...resume,
						sections: syncedSections,
						lastSyncedAt: new Date().toISOString(),
					};

					set((state) => ({
						activeResumeId: id,
						activeResume: syncedResume,
						resumes: state.resumes.map((r) => (r.id === id ? syncedResume : r)),
					}));
					return;
				}
			}
			set({ activeResumeId: id, activeResume: resume });
		}
	},

	updateResume: (id: string, updates: Partial<Resume>) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id === id) {
					updatedResume = {
						...r,
						...updates,
						updatedAt: new Date().toISOString(),
					};
					return updatedResume;
				}
				return r;
			});
			const activeResume =
				state.activeResumeId === id
					? resumes.find((r) => r.id === id) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) {
			syncManager.queueSave(updatedResume);
		}
	},

	duplicateResume: (id: string, newName: string) => {
		const original = get().resumes.find((r) => r.id === id);
		if (!original) return "";
		const now = new Date().toISOString();
		const duplicate: Resume = {
			...JSON.parse(JSON.stringify(original)),
			id: crypto.randomUUID(),
			name: newName,
			baseResumeId: undefined,
			variationType: "base",
			createdAt: now,
			updatedAt: now,
		};
		duplicate.sections = duplicate.sections.map((s: ResumeSection) => ({
			...s,
			id: crypto.randomUUID(),
			linkedToBase: undefined,
		}));
		const activity = logActivity(
			duplicate.id,
			"duplicated",
			`Duplicated from "${original.name}"`,
		);
		set((state) => ({
			resumes: [...state.resumes, duplicate],
			activityLog: [...state.activityLog, activity],
		}));
		syncManager.queueSave(duplicate);
		return duplicate.id;
	},

	archiveResume: (id: string) => {
		let archivedResume: Resume | null = null;
		set((state) => ({
			resumes: state.resumes.map((r) => {
				if (r.id === id) {
					archivedResume = {
						...r,
						isArchived: true,
						updatedAt: new Date().toISOString(),
					};
					return archivedResume;
				}
				return r;
			}),
		}));
		if (archivedResume) syncManager.queueSave(archivedResume);
	},

	restoreResume: (id: string) => {
		let restoredResume: Resume | null = null;
		set((state) => ({
			resumes: state.resumes.map((r) => {
				if (r.id === id) {
					restoredResume = {
						...r,
						isArchived: false,
						updatedAt: new Date().toISOString(),
					};
					return restoredResume;
				}
				return r;
			}),
		}));
		if (restoredResume) syncManager.queueSave(restoredResume);
	},

	addSection: (
		resumeId: string,
		section: Omit<ResumeSection, "id" | "order">,
	) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const newSection: ResumeSection = {
					...section,
					id: crypto.randomUUID(),
					order: r.sections.length,
				};
				updatedResume = {
					...r,
					sections: [...r.sections, newSection],
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			const activity = logActivity(
				resumeId,
				"section_added",
				`Added ${section.type} section`,
			);
			return {
				resumes,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	updateSection: (
		resumeId: string,
		sectionId: string,
		updates: Partial<ResumeSection>,
	) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				updatedResume = {
					...r,
					sections: r.sections.map((s) =>
						s.id === sectionId ? { ...s, ...updates } : s,
					),
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	deleteSection: (resumeId: string, sectionId: string) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const sections = r.sections.filter((s) => s.id !== sectionId);
				updatedResume = {
					...r,
					sections: sections.map((s, i) => ({ ...s, order: i })),
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			const activity = logActivity(
				resumeId,
				"section_removed",
				"Removed section",
			);
			return {
				resumes,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	reorderSections: (resumeId: string, sectionIds: string[]) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const sections = sectionIds
					.map((id, index) => {
						const section = r.sections.find((s) => s.id === id);
						return section ? { ...section, order: index } : null;
					})
					.filter(Boolean) as ResumeSection[];
				updatedResume = { ...r, sections, updatedAt: new Date().toISOString() };
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	duplicateSection: (resumeId: string, sectionId: string) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const section = r.sections.find((s) => s.id === sectionId);
				if (!section) return r;
				const newSection: ResumeSection = {
					...JSON.parse(JSON.stringify(section)),
					id: crypto.randomUUID(),
					order: r.sections.length,
					linkedToBase: false,
				};
				updatedResume = {
					...r,
					sections: [...r.sections, newSection],
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	// Variation management
	createVariation: (baseResumeId: string, domain: string, name: string) => {
		const sourceResume = get().resumes.find((r) => r.id === baseResumeId);
		if (!sourceResume) return "";

		let actualBaseResume = sourceResume;
		let actualBaseResumeId = baseResumeId;
		if (
			sourceResume.variationType === "variation" &&
			sourceResume.baseResumeId
		) {
			const originalBase = get().resumes.find(
				(r) => r.id === sourceResume.baseResumeId,
			);
			if (originalBase) {
				actualBaseResume = originalBase;
				actualBaseResumeId = originalBase.id;
			}
		}

		const now = new Date().toISOString();
		const variation: Resume = {
			...JSON.parse(JSON.stringify(actualBaseResume)),
			id: crypto.randomUUID(),
			name,
			baseResumeId: actualBaseResumeId,
			variationType: "variation",
			domain,
			createdAt: now,
			updatedAt: now,
			lastSyncedAt: now,
			tags: [...(actualBaseResume.tags || []), domain],
		};
		variation.sections = variation.sections.map((s: ResumeSection) => ({
			...s,
			id: crypto.randomUUID(),
			linkedToBase: true,
		}));

		const activity = logActivity(
			variation.id,
			"variation_created",
			`Created tailored copy "${name}" for ${domain}`,
		);
		set((state) => ({
			resumes: [...state.resumes, variation],
			activeResumeId: variation.id,
			activeResume: variation,
			activityLog: [...state.activityLog, activity],
		}));
		syncManager.queueSave(variation);
		return variation.id;
	},

	getVariations: (baseResumeId: string) => {
		return get().resumes.filter((r) => r.baseResumeId === baseResumeId);
	},

	duplicateVariation: (variationId: string, newName: string) => {
		const original = get().resumes.find((r) => r.id === variationId);
		if (!original || original.variationType !== "variation") return "";

		const now = new Date().toISOString();
		const duplicate: Resume = {
			...JSON.parse(JSON.stringify(original)),
			id: crypto.randomUUID(),
			name: newName,
			createdAt: now,
			updatedAt: now,
			lastSyncedAt: now,
		};
		duplicate.sections = duplicate.sections.map((s: ResumeSection) => ({
			...s,
			id: crypto.randomUUID(),
		}));

		const activity = logActivity(
			duplicate.id,
			"duplicated",
			`Copied tailored copy from "${original.name}"`,
		);
		set((state) => ({
			resumes: [...state.resumes, duplicate],
			activeResumeId: duplicate.id,
			activeResume: duplicate,
			activityLog: [...state.activityLog, activity],
		}));
		syncManager.queueSave(duplicate);
		return duplicate.id;
	},

	// Section linking
	customizeSection: (resumeId: string, sectionId: string) => {
		const resume = get().resumes.find((r) => r.id === resumeId);
		if (!resume || resume.variationType !== "variation") return;

		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				updatedResume = {
					...r,
					sections: r.sections.map((s) =>
						s.id === sectionId ? { ...s, linkedToBase: false } : s,
					),
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	resetSectionToBase: (resumeId: string, sectionId: string) => {
		const resume = get().resumes.find((r) => r.id === resumeId);
		if (!resume || resume.variationType !== "variation" || !resume.baseResumeId)
			return;

		const baseResume = get().resumes.find((r) => r.id === resume.baseResumeId);
		if (!baseResume) return;

		const section = resume.sections.find((s) => s.id === sectionId);
		if (!section) return;

		const baseSection = baseResume.sections.find(
			(s) => s.type === section.type,
		);
		if (!baseSection) return;

		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				updatedResume = {
					...r,
					sections: r.sections.map((s) =>
						s.id === sectionId
							? {
									...s,
									content: JSON.parse(JSON.stringify(baseSection.content)),
									visible: baseSection.visible,
									linkedToBase: true,
								}
							: s,
					),
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			const activity = logActivity(
				resumeId,
				"updated",
				`Reset ${SECTION_CONFIGS[section.type]?.label || section.type} to base version`,
			);
			return {
				resumes,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	syncLinkedSections: (variationId: string) => {
		const variation = get().resumes.find((r) => r.id === variationId);
		if (
			!variation ||
			variation.variationType !== "variation" ||
			!variation.baseResumeId
		)
			return;

		const baseResume = get().resumes.find(
			(r) => r.id === variation.baseResumeId,
		);
		if (!baseResume) return;

		const now = new Date().toISOString();
		const syncedSections = variation.sections.map((section) => {
			if (section.linkedToBase !== false) {
				const baseSection = baseResume.sections.find(
					(s) => s.type === section.type,
				);
				if (baseSection) {
					return {
						...section,
						content: JSON.parse(JSON.stringify(baseSection.content)),
						visible: baseSection.visible,
						linkedToBase: true,
					};
				}
			}
			return section;
		});

		const variationTypes = new Set(variation.sections.map((s) => s.type));
		baseResume.sections.forEach((baseSection) => {
			if (!variationTypes.has(baseSection.type)) {
				syncedSections.push({
					...JSON.parse(JSON.stringify(baseSection)),
					id: crypto.randomUUID(),
					order: syncedSections.length,
					linkedToBase: true,
				});
			}
		});

		set((state) => {
			const resumes = state.resumes.map((r) =>
				r.id === variationId
					? {
							...r,
							sections: syncedSections,
							lastSyncedAt: now,
							updatedAt: now,
						}
					: r,
			);
			const activeResume =
				state.activeResumeId === variationId
					? resumes.find((r) => r.id === variationId) || null
					: state.activeResume;
			const activity = logActivity(
				variationId,
				"synced_with_base",
				`Updated linked sections from base resume`,
			);
			return {
				resumes,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		const syncedVariation = get().resumes.find((r) => r.id === variationId);
		if (syncedVariation) syncManager.queueSave(syncedVariation);
	},

	getSectionLinkStatus: (resumeId: string, sectionId: string) => {
		const resume = get().resumes.find((r) => r.id === resumeId);
		if (!resume) return "base";
		if (resume.variationType !== "variation") return "base";

		const section = resume.sections.find((s) => s.id === sectionId);
		if (!section) return "base";

		return section.linkedToBase === false ? "customized" : "linked";
	},

	logSectionChange: (
		resumeId: string,
		sectionType: SectionType,
		changeDescription: string,
	) => {
		const sectionLabel = SECTION_CONFIGS[sectionType]?.label || sectionType;
		const activity = logActivity(
			resumeId,
			"section_updated",
			`${sectionLabel}: ${changeDescription}`,
		);
		set((state) => ({
			activityLog: [...state.activityLog, activity],
		}));
	},

	// Settings & Templates
	updateSettings: (resumeId: string, settings: PartialResumeSettings) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const currentSettings =
					r.metadata?.settings || createDefaultSettings(r.template || "modern");
				const mergedColors = settings.colors
					? { ...currentSettings.colors, ...settings.colors }
					: currentSettings.colors;
				const mergedMargins = settings.margins
					? { ...currentSettings.margins, ...settings.margins }
					: currentSettings.margins;
				const mergedTypography = settings.typography
					? {
							...(currentSettings.typography || DEFAULT_TYPOGRAPHY),
							...settings.typography,
						}
					: currentSettings.typography || DEFAULT_TYPOGRAPHY;
				const newSettings = {
					...currentSettings,
					...settings,
					colors: mergedColors,
					margins: mergedMargins,
					typography: mergedTypography,
					fontScale: settings.fontScale ?? currentSettings.fontScale ?? 1.0,
				};
				const metadata = {
					personalInfo: r.metadata?.personalInfo || { fullName: "", email: "" },
					settings: newSettings as ResumeSettings,
				};
				updatedResume = { ...r, metadata, updatedAt: new Date().toISOString() };
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			const activity = logActivity(
				resumeId,
				"settings_changed",
				"Updated resume settings",
			);
			return {
				resumes,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	updateTemplate: (resumeId: string, template: TemplateType) => {
		const activity = logActivity(
			resumeId,
			"template_changed",
			`Changed template to ${template}`,
		);
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const currentSettings =
					r.metadata?.settings || createDefaultSettings(template);
				const metadata = {
					personalInfo: r.metadata?.personalInfo || { fullName: "", email: "" },
					settings: {
						...currentSettings,
						colors: TEMPLATE_CONFIGS[template].defaultColors,
						layout: currentSettings.layout ?? TEMPLATE_CONFIGS[template].layout,
					},
				};
				updatedResume = {
					...r,
					template,
					metadata,
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return {
				resumes,
				activeResume,
				activityLog: [...state.activityLog, activity],
			};
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	// Page management
	addPage: (resumeId: string, name?: string) => {
		const pageId = crypto.randomUUID();
		let updatedResume: Resume | null = null;
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
				updatedResume = {
					...r,
					pages: [...existingPages, newPage],
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
		return pageId;
	},

	deletePage: (resumeId: string, pageId: string) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const pages = (r.pages || []).filter((p) => p.id !== pageId);
				const sections = r.sections.map((s) =>
					s.pageId === pageId ? { ...s, pageId: undefined } : s,
				);
				updatedResume = {
					...r,
					pages: pages.map((p, i) => ({ ...p, order: i })),
					sections,
					updatedAt: new Date().toISOString(),
				};
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	reorderPages: (resumeId: string, pageIds: string[]) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const pages = pageIds
					.map((id, index) => {
						const page = (r.pages || []).find((p) => p.id === id);
						return page ? { ...page, order: index } : null;
					})
					.filter(Boolean) as ResumePage[];
				updatedResume = { ...r, pages, updatedAt: new Date().toISOString() };
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	updatePage: (
		resumeId: string,
		pageId: string,
		updates: Partial<ResumePage>,
	) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const pages = (r.pages || []).map((p) =>
					p.id === pageId ? { ...p, ...updates } : p,
				);
				updatedResume = { ...r, pages, updatedAt: new Date().toISOString() };
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	moveSectionToPage: (resumeId: string, sectionId: string, pageId: string) => {
		let updatedResume: Resume | null = null;
		set((state) => {
			const resumes = state.resumes.map((r) => {
				if (r.id !== resumeId) return r;
				const sections = r.sections.map((s) =>
					s.id === sectionId ? { ...s, pageId: pageId || undefined } : s,
				);
				updatedResume = { ...r, sections, updatedAt: new Date().toISOString() };
				return updatedResume;
			});
			const activeResume =
				state.activeResumeId === resumeId
					? resumes.find((r) => r.id === resumeId) || null
					: state.activeResume;
			return { resumes, activeResume };
		});
		if (updatedResume) syncManager.queueSave(updatedResume);
	},

	// Import/Export
	exportToJSON: (resumeId: string) => {
		const resume = get().resumes.find((r) => r.id === resumeId);
		if (!resume) return "";
		const activity = logActivity(resumeId, "exported", "Exported to JSON");
		set((state) => ({
			resumes: state.resumes.map((r) =>
				r.id === resumeId
					? { ...r, lastExportedAt: new Date().toISOString() }
					: r,
			),
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
				baseResumeId: null,
				variationType: "base",
				createdAt: now,
				updatedAt: now,
			};
			imported.sections = imported.sections.map((s) => ({
				...s,
				id: crypto.randomUUID(),
				linkedToBase: undefined,
			}));
			const activity = logActivity(
				imported.id,
				"imported",
				`Imported resume "${resume.name}"`,
			);
			set((state) => ({
				resumes: [...state.resumes, imported],
				activityLog: [...state.activityLog, activity],
			}));
			syncManager.queueSave(imported);
			return imported.id;
		} catch (error) {
			console.error("Failed to import resume:", error);
			return null;
		}
	},

	exportAllToJSON: () => {
		const { resumes } = get();
		return JSON.stringify(
			{ resumes, exportedAt: new Date().toISOString() },
			null,
			2,
		);
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
					sections: r.sections.map((s: ResumeSection) => ({
						...s,
						id: crypto.randomUUID(),
					})),
				}));
				set((state) => ({ resumes: [...state.resumes, ...importedResumes] }));
				importedResumes.forEach((resume: Resume) => {
					syncManager.queueSave(resume);
				});
			}
		} catch (error) {
			console.error("Failed to import all resumes:", error);
		}
	},

	// Activity & Search
	getActivityLog: (resumeId?: string) => {
		const log = get().activityLog;
		return resumeId ? log.filter((a) => a.resumeId === resumeId) : log;
	},

	clearActivityLog: () => set({ activityLog: [] }),

	searchResumes: (query: string) => {
		const q = query.toLowerCase();
		return get().resumes.filter(
			(r) =>
				!r.isArchived &&
				(r.name.toLowerCase().includes(q) ||
					r.domain?.toLowerCase().includes(q) ||
					r.metadata?.personalInfo?.fullName?.toLowerCase().includes(q) ||
					r.tags?.some((t) => t.toLowerCase().includes(q))),
		);
	},

	filterByTag: (tag: string) =>
		get().resumes.filter((r) => !r.isArchived && r.tags?.includes(tag)),
	filterByDomain: (domain: string) =>
		get().resumes.filter((r) => !r.isArchived && r.domain === domain),

	// Cloud sync
	cloudSync: {
		isEnabled: false,
		isSyncing: false,
		lastSyncedAt: null,
		error: null,
	},

	setCloudUserId: (userId: string | null) => {
		// No-op for now, would be used for cloud sync
		console.log("setCloudUserId:", userId);
	},

	enableCloudSync: (userId: string) => {
		set({
			cloudSync: {
				isEnabled: true,
				isSyncing: false,
				lastSyncedAt: null,
				error: null,
			},
		});
		console.log("enableCloudSync:", userId);
	},

	disableCloudSync: () => {
		set((state) => ({
			cloudSync: {
				isEnabled: false,
				isSyncing: false,
				lastSyncedAt: state.cloudSync.lastSyncedAt,
				error: null,
			},
		}));
	},

	syncToCloud: async () => {
		const { cloudSync, resumes } = get();
		if (!cloudSync.isEnabled) return;

		set({ cloudSync: { ...cloudSync, isSyncing: true, error: null } });

		try {
			// TODO: Implement actual cloud sync
			await new Promise((resolve) => setTimeout(resolve, 1000));
			console.log("Would sync to cloud:", resumes.length, "resumes");

			set({
				cloudSync: {
					...cloudSync,
					isSyncing: false,
					lastSyncedAt: new Date().toISOString(),
					error: null,
				},
			});
		} catch (error) {
			set({
				cloudSync: {
					...cloudSync,
					isSyncing: false,
					error: error instanceof Error ? error.message : "Sync failed",
				},
			});
		}
	},

	fetchFromCloud: async () => {
		const { cloudSync } = get();
		if (!cloudSync.isEnabled) return;

		set({ cloudSync: { ...cloudSync, isSyncing: true, error: null } });

		try {
			// TODO: Implement actual cloud fetch
			await new Promise((resolve) => setTimeout(resolve, 1000));
			console.log("Would fetch from cloud");

			set({
				cloudSync: {
					...cloudSync,
					isSyncing: false,
					lastSyncedAt: new Date().toISOString(),
					error: null,
				},
			});
		} catch (error) {
			set({
				cloudSync: {
					...cloudSync,
					isSyncing: false,
					error: error instanceof Error ? error.message : "Fetch failed",
				},
			});
		}
	},
}));
