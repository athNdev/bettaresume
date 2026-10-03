/**
 * Sync Layer - Offline-First with Backend Sync
 *
 * Strategy:
 * 1. Always write to localStorage immediately (offline-first)
 * 2. Queue operations for backend sync
 * 3. Process queue when online via tRPC calls
 * 4. Use last-write-wins with updatedAt timestamp for conflicts
 */

import type { Resume, SyncState } from "@/features/resume-editor/types";

// ============================================
// Configuration
// ============================================

const STORAGE_KEY = "bettaresume-resumes";
const SYNC_QUEUE_KEY = "bettaresume-sync-queue";
const SYNC_STATE_KEY = "bettaresume-sync-state";

// ============================================
// Types
// ============================================

export type BackendStatus = "online" | "offline" | "unknown";

type SyncOperation = {
	id: string;
	operation: "create" | "update" | "delete";
	entity: "resume" | "section";
	entityId: string;
	data: unknown;
	timestamp: number;
	retryCount: number;
};

type SyncEventCallback = (state: SyncState) => void;

// ============================================
// Local Storage Helpers
// ============================================

function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
	if (typeof window === "undefined") return defaultValue;

	try {
		const stored = localStorage.getItem(key);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error(`Failed to load from localStorage (${key}):`, error);
	}
	return defaultValue;
}

function saveToLocalStorage<T>(key: string, data: T): void {
	if (typeof window === "undefined") return;

	try {
		localStorage.setItem(key, JSON.stringify(data));
	} catch (error) {
		console.error(`Failed to save to localStorage (${key}):`, error);
	}
}

// ============================================
// Backend Health Check
// ============================================

export async function checkBackendHealth(): Promise<BackendStatus> {
	const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

	try {
		const response = await fetch(`${apiUrl}/health`, {
			method: "GET",
			signal: AbortSignal.timeout(5000),
		});

		if (response.ok) {
			return "online";
		}
		return "offline";
	} catch {
		return "offline";
	}
}

// ============================================
// Unified Sync Manager
// ============================================

/** Attempts before an operation is parked as persistently failing. It is NOT dropped. */
const MAX_SYNC_RETRIES = 3;

export class SyncManager {
	private userId: string | null = null;
	private saveQueue: Map<string, Resume> = new Map();
	private saveTimeout: NodeJS.Timeout | null = null;
	private isInitialized = false;
	private cachedResumes: Resume[] = [];
	private syncQueue: SyncOperation[] = [];
	private syncState: SyncState = {
		status: "offline",
		lastSyncedAt: null,
		pendingChanges: 0,
		error: null,
	};
	private listeners: Set<SyncEventCallback> = new Set();
	private syncInProgress = false;
	private trpcClient: unknown = null;

	// Subscribe to sync state changes
	subscribe(callback: SyncEventCallback): () => void {
		this.listeners.add(callback);
		callback(this.syncState);
		return () => this.listeners.delete(callback);
	}

	private notifyListeners() {
		this.listeners.forEach((cb) => cb(this.syncState));
	}

	private updateSyncState(updates: Partial<SyncState>) {
		this.syncState = { ...this.syncState, ...updates };
		saveToLocalStorage(SYNC_STATE_KEY, this.syncState);
		this.notifyListeners();
	}

	getSyncState(): SyncState {
		return this.syncState;
	}

	// Set the tRPC client for backend calls
	setTrpcClient(client: unknown) {
		this.trpcClient = client;
	}

	async initialize(): Promise<{
		resumes: Resume[];
		backendStatus: BackendStatus;
	}> {
		if (this.isInitialized) {
			return {
				resumes: this.cachedResumes,
				backendStatus:
					this.syncState.status === "offline" ? "offline" : "online",
			};
		}

		// Load from localStorage
		this.cachedResumes = loadFromLocalStorage(STORAGE_KEY, []);
		this.syncQueue = loadFromLocalStorage(SYNC_QUEUE_KEY, []);
		const savedSyncState = loadFromLocalStorage(SYNC_STATE_KEY, this.syncState);
		this.syncState = {
			...savedSyncState,
			pendingChanges: this.syncQueue.length,
		};

		this.isInitialized = true;

		console.log(
			"[SyncManager] Loaded",
			this.cachedResumes.length,
			"resumes from localStorage",
		);
		console.log(
			"[SyncManager] Pending sync operations:",
			this.syncQueue.length,
		);

		// Check backend status
		const backendStatus = await checkBackendHealth();
		this.updateSyncState({
			status: backendStatus === "online" ? "synced" : "offline",
		});

		return { resumes: this.cachedResumes, backendStatus };
	}

	setUserId(userId: string) {
		this.userId = userId;
	}

	getUserId(): string | null {
		return this.userId;
	}

	// Add operation to sync queue
	private queueSyncOperation(
		operation: "create" | "update" | "delete",
		entity: "resume" | "section",
		entityId: string,
		data: unknown,
	) {
		const op: SyncOperation = {
			id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
			operation,
			entity,
			entityId,
			data,
			timestamp: Date.now(),
			retryCount: 0,
		};

		// Remove any existing operations for the same entity
		// (last-write-wins - we only need the latest state)
		this.syncQueue = this.syncQueue.filter(
			(o) => !(o.entity === entity && o.entityId === entityId),
		);

		// Don't add create if followed by delete
		if (
			operation !== "delete" ||
			!this.syncQueue.some(
				(o) =>
					o.entity === entity &&
					o.entityId === entityId &&
					o.operation === "create",
			)
		) {
			this.syncQueue.push(op);
		}

		saveToLocalStorage(SYNC_QUEUE_KEY, this.syncQueue);
		this.updateSyncState({
			status: "pending",
			pendingChanges: this.syncQueue.length,
		});
	}

	// Queue a resume save (debounced)
	queueSave(resume: Resume) {
		this.saveQueue.set(resume.id, resume);

		if (this.saveTimeout) {
			clearTimeout(this.saveTimeout);
		}

		// Debounce saves by 500ms
		this.saveTimeout = setTimeout(() => {
			this.flushSaveQueue();
		}, 500);
	}

	// Immediately save all queued resumes
	async flushSaveQueue() {
		const resumes = Array.from(this.saveQueue.values());
		this.saveQueue.clear();

		if (resumes.length === 0) return;

		// Update local cache
		for (const resume of resumes) {
			const index = this.cachedResumes.findIndex((r) => r.id === resume.id);
			const isNew = index < 0;

			if (index >= 0) {
				this.cachedResumes[index] = resume;
			} else {
				this.cachedResumes.push(resume);
			}

			// Queue for backend sync
			this.queueSyncOperation(
				isNew ? "create" : "update",
				"resume",
				resume.id,
				resume,
			);
		}

		// Save to localStorage
		saveToLocalStorage(STORAGE_KEY, this.cachedResumes);
		console.log(
			"[SyncManager] Saved",
			resumes.length,
			"resume(s) to localStorage",
		);

		// Attempt backend sync
		this.attemptSync();
	}

	// Save all resumes at once
	async saveAll(resumes: Resume[]) {
		this.cachedResumes = resumes;
		saveToLocalStorage(STORAGE_KEY, this.cachedResumes);
		console.log(
			"[SyncManager] Saved all",
			resumes.length,
			"resumes to localStorage",
		);
	}

	// Create a new resume
	async createResume(resume: Resume): Promise<Resume> {
		// Add to local cache
		this.cachedResumes.push(resume);
		saveToLocalStorage(STORAGE_KEY, this.cachedResumes);

		// Queue for backend sync
		this.queueSyncOperation("create", "resume", resume.id, resume);

		// Attempt backend sync
		this.attemptSync();

		return resume;
	}

	// Update a resume
	async updateResume(resume: Resume): Promise<Resume> {
		const index = this.cachedResumes.findIndex((r) => r.id === resume.id);
		if (index >= 0) {
			this.cachedResumes[index] = resume;
		} else {
			this.cachedResumes.push(resume);
		}
		saveToLocalStorage(STORAGE_KEY, this.cachedResumes);

		// Queue for backend sync
		this.queueSyncOperation("update", "resume", resume.id, resume);

		// Attempt backend sync
		this.attemptSync();

		return resume;
	}

	// Delete a resume
	async deleteResume(id: string): Promise<void> {
		// Remove from local cache
		this.cachedResumes = this.cachedResumes.filter((r) => r.id !== id);
		saveToLocalStorage(STORAGE_KEY, this.cachedResumes);
		console.log("[SyncManager] Deleted resume:", id);

		// Queue for backend sync
		this.queueSyncOperation("delete", "resume", id, { id });

		// Attempt backend sync
		this.attemptSync();
	}

	// Attempt to sync with backend (non-blocking)
	async attemptSync() {
		if (this.syncInProgress || this.syncQueue.length === 0) {
			return;
		}

		const backendStatus = await checkBackendHealth();
		if (backendStatus !== "online") {
			this.updateSyncState({ status: "offline" });
			return;
		}

		this.syncInProgress = true;
		this.updateSyncState({ status: "syncing" });

		try {
			await this.processSyncQueue();
			// `processSyncQueue` returns normally when it gives up, so success must be
			// derived from the queue actually being empty. Reporting "synced" while
			// operations remain is the exact bug this whole path had.
			if (this.syncQueue.length > 0) {
				this.updateSyncState({
					status: "error",
					pendingChanges: this.syncQueue.length,
					error: `${this.syncQueue.length} change(s) are queued and NOT persisted to the backend.`,
				});
			} else {
				this.updateSyncState({
					status: "synced",
					lastSyncedAt: new Date().toISOString(),
					pendingChanges: 0,
					error: null,
				});
			}
		} catch (error) {
			console.error("[SyncManager] Sync failed:", error);
			this.updateSyncState({
				status: "error",
				error: error instanceof Error ? error.message : "Sync failed",
			});
		} finally {
			this.syncInProgress = false;
		}
	}

	// Process the sync queue
	private async processSyncQueue() {
		// Process operations in order
		while (this.syncQueue.length > 0) {
			const op = this.syncQueue[0];
			if (!op) break;

			try {
				await this.executeSyncOperation(op);
				// Remove successful operation
				this.syncQueue.shift();
				saveToLocalStorage(SYNC_QUEUE_KEY, this.syncQueue);
			} catch (error) {
				op.retryCount++;
				saveToLocalStorage(SYNC_QUEUE_KEY, this.syncQueue);

				// Keep the operation. The old code shifted it off the queue after three
				// attempts, which discarded the user's edit with only a console.error —
				// a second silent-loss path on top of the stub never throwing.
				if (op.retryCount >= MAX_SYNC_RETRIES) {
					op.retryCount = 0;
					this.updateSyncState({
						status: "error",
						error:
							`${MAX_SYNC_RETRIES} sync attempts failed for ${op.operation} ${op.entity}/${op.entityId}; ` +
							"it is still queued and still unsaved. " +
							(error instanceof Error ? error.message : String(error)),
					});
					console.error(
						`[SyncManager] ${op.operation} ${op.entity}/${op.entityId} is queued but NOT saved to the backend.`,
						error,
					);
					// Stop the loop: every remaining op would fail the same way.
					break;
				}

				throw error;
			}
		}
	}

	// Execute a single sync operation via tRPC
	private async executeSyncOperation(op: SyncOperation): Promise<void> {
		/**
		 * NOT WIRED — and deliberately throwing rather than returning.
		 *
		 * This used to `console.log` the operation and return, which read as success:
		 * `processSyncQueue` shifted the op off the queue, `attemptSync` then set
		 * `status: "synced"`, and the UI reported a save that had never left the
		 * browser. 25 call sites in `resume.store.ts` route through here, so every one
		 * of those writes was silently discarded while claiming to be saved.
		 *
		 * Throwing keeps the operation queued and surfaces `status: "error"`, which is
		 * the honest state. Wiring the tRPC client in is the real fix; until then the
		 * gap is visible instead of invisible.
		 *
		 * Several paths already persist correctly and do NOT come through here:
		 * `resume.update` (template, personalInfo, settings) via `useResumeMutations`,
		 * and `section.upsert` / `section.delete` / `section.reorder` via
		 * `useSectionMutations`.
		 */
		throw new Error(
			`Backend sync is not wired: refusing to report "${op.operation} ${op.entity}/${op.entityId}" as saved when nothing was persisted. ` +
				"This change exists only in localStorage.",
		);
	}

	// Force sync with backend (fetches latest data)
	async syncWithBackend(): Promise<Resume[]> {
		const backendStatus = await checkBackendHealth();

		if (backendStatus !== "online") {
			this.updateSyncState({ status: "offline" });
			return this.cachedResumes;
		}

		// First, push any pending changes
		await this.attemptSync();

		// TODO: Fetch latest from backend and merge
		// For now, just return cached resumes

		return this.cachedResumes;
	}

	// Get all cached resumes
	getResumes(): Resume[] {
		return this.cachedResumes;
	}

	// Get a single resume by ID
	getResume(id: string): Resume | undefined {
		return this.cachedResumes.find((r) => r.id === id);
	}
}

// Singleton instance
export const syncManager = new SyncManager();

// React hook helper for sync state
export function useSyncState(): SyncState {
	// This should be used with React's useState/useEffect
	// The actual implementation is in the provider
	return syncManager.getSyncState();
}
