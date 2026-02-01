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
			this.updateSyncState({
				status: "synced",
				lastSyncedAt: new Date().toISOString(),
				pendingChanges: this.syncQueue.length,
				error: null,
			});
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
				if (op.retryCount >= 3) {
					// Max retries reached, log and skip
					console.error("[SyncManager] Max retries reached for operation:", op);
					this.syncQueue.shift();
					saveToLocalStorage(SYNC_QUEUE_KEY, this.syncQueue);
				} else {
					// Will retry on next sync attempt
					saveToLocalStorage(SYNC_QUEUE_KEY, this.syncQueue);
					throw error;
				}
			}
		}
	}

	// Execute a single sync operation via tRPC
	private async executeSyncOperation(op: SyncOperation): Promise<void> {
		// This will be called when we have a tRPC client
		// For now, just log the operation
		console.log("[SyncManager] Would execute sync operation:", op);

		// TODO: Integrate with actual tRPC client when available
		// The tRPC client needs to be injected from React context
		// Example:
		// if (op.entity === 'resume') {
		//   if (op.operation === 'create') {
		//     await trpcClient.resume.create.mutate(op.data);
		//   } else if (op.operation === 'update') {
		//     await trpcClient.resume.update.mutate({ id: op.entityId, data: op.data });
		//   } else if (op.operation === 'delete') {
		//     await trpcClient.resume.delete.mutate({ id: op.entityId });
		//   }
		// }
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
