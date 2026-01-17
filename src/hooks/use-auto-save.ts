"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

interface UseAutoSaveOptions<T> {
	/** Initial data from server */
	data: T;
	/** Callback to save data - should return a promise */
	onSave: (data: T) => Promise<void>;
	/** Debounce delay in ms (default: 400) */
	debounceMs?: number;
	/** Whether auto-save is enabled (default: true) */
	enabled?: boolean;
	/** Callback triggered on every local data change (for real-time preview) */
	onLocalUpdate?: (data: T) => void;
}

interface UseAutoSaveReturn<T> {
	/** Local data state - use this for form inputs */
	localData: T;
	/** Update local data - triggers debounced auto-save */
	setLocalData: React.Dispatch<React.SetStateAction<T>>;
	/** Current save status */
	status: SaveStatus;
	/** Whether there are unsaved changes */
	isDirty: boolean;
	/** Whether currently saving */
	isSaving: boolean;
	/** Error message if save failed */
	error: string | null;
	/** Manually trigger save (bypasses debounce) */
	saveNow: () => Promise<void>;
	/** Retry failed save */
	retrySave: () => Promise<void>;
	/** Discard local changes and revert to server data */
	discard: () => void;
}

/**
 * Hook for auto-saving form data with debounce.
 *
 * Features:
 * - 400ms debounced auto-save
 * - Dirty state tracking
 * - Error handling with retry
 * - Manual save/discard options
 *
 * @example
 * ```tsx
 * const { localData, setLocalData, status, error, retrySave } = useAutoSave({
 *   data: serverData,
 *   onSave: async (data) => await updateSection(sectionId, { content: { data } }),
 * });
 *
 * return (
 *   <>
 *     <SaveStatusIndicator status={status} error={error} onRetry={retrySave} />
 *     <Input
 *       value={localData.name}
 *       onChange={(e) => setLocalData(prev => ({ ...prev, name: e.target.value }))}
 *     />
 *   </>
 * );
 * ```
 */
export function useAutoSave<T>({
	data,
	onSave,
	debounceMs = 1000,
	enabled = true,
	onLocalUpdate,
}: UseAutoSaveOptions<T>): UseAutoSaveReturn<T> {
	const [localData, setLocalData] = useState<T>(data);
	const [status, setStatus] = useState<SaveStatus>("idle");
	const [error, setError] = useState<string | null>(null);

	// Refs for tracking
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const savedDataRef = useRef<string>(JSON.stringify(data));
	const isMountedRef = useRef(true);
	const pendingSaveRef = useRef<T | null>(null);

	// Cleanup on unmount
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, []);

	// Sync local data when server data changes (only if not dirty)
	useEffect(() => {
		const serverDataStr = JSON.stringify(data);
		const localDataStr = JSON.stringify(localData);

		// If server data changed and local data matches what we last saved, sync
		if (
			serverDataStr !== savedDataRef.current &&
			localDataStr === savedDataRef.current
		) {
			setLocalData(data);
			savedDataRef.current = serverDataStr;
			setStatus("idle");
		}
	}, [data, localData]);

	// Core save function
	const performSave = useCallback(
		async (dataToSave: T) => {
			if (!isMountedRef.current) return;

			setStatus("saving");
			setError(null);

			try {
				await onSave(dataToSave);

				if (!isMountedRef.current) return;

				savedDataRef.current = JSON.stringify(dataToSave);
				setStatus("saved");

				// Reset to idle after showing "Saved" briefly
				setTimeout(() => {
					if (isMountedRef.current) {
						// Only reset if we're still in saved state (no new changes)
						// We use a functional update to get the latest status without dependency
						setStatus((currentStatus) => {
							if (currentStatus === "saved") {
								return "idle";
							}
							return currentStatus;
						});
					}
				}, 2000);
			} catch (err) {
				if (!isMountedRef.current) return;

				pendingSaveRef.current = dataToSave;
				setError(err instanceof Error ? err.message : "Failed to save changes");
				setStatus("error");
			}
		},
		[onSave],
	);

	// Check if dirty and trigger debounced save
	useEffect(() => {
		if (!enabled) return;

		const localDataStr = JSON.stringify(localData);
		const isDirty = localDataStr !== savedDataRef.current;

		if (isDirty && status !== "saving") {
			// Clear existing timer
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}

			// Set new status to dirty if it wasn't already
			if (status !== "dirty" && status !== "error") {
				setStatus("dirty");
			}

			// Set new debounce timer
			debounceTimerRef.current = setTimeout(() => {
				performSave(localData);
			}, debounceMs);
		}

		return () => {
			if (debounceTimerRef.current) {
				clearTimeout(debounceTimerRef.current);
			}
		};
	}, [localData, enabled, debounceMs, performSave, status]);

	// Trigger onLocalUpdate for real-time preview
	useEffect(() => {
		if (onLocalUpdate) {
			onLocalUpdate(localData);
		}
	}, [localData, onLocalUpdate]);

	// Manual save (bypasses debounce)
	const saveNow = useCallback(async () => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		await performSave(localData);
	}, [localData, performSave]);

	// Retry failed save
	const retrySave = useCallback(async () => {
		const dataToRetry = pendingSaveRef.current || localData;
		await performSave(dataToRetry);
	}, [localData, performSave]);

	// Discard changes
	const discard = useCallback(() => {
		if (debounceTimerRef.current) {
			clearTimeout(debounceTimerRef.current);
			debounceTimerRef.current = null;
		}
		setLocalData(data);
		savedDataRef.current = JSON.stringify(data);
		setStatus("idle");
		setError(null);
		pendingSaveRef.current = null;
	}, [data]);

	// Computed values
	const isDirty = status === "dirty" || status === "error";
	const isSaving = status === "saving";

	return {
		localData,
		setLocalData,
		status,
		isDirty,
		isSaving,
		error,
		saveNow,
		retrySave,
		discard,
	};
}
