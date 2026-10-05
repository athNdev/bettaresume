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

/**
 * Should unmount push the pending edit to the server?
 *
 * Extracted as a pure predicate because it is the whole of the fix and it is
 * otherwise invisible: a `useEffect` cleanup is very hard to assert on, and the
 * bug it prevents -- switching sections inside the debounce window and losing the
 * edit while the preview still showed it -- is exactly the kind that ships
 * because nothing exercises it.
 *
 * Three conditions, all necessary:
 * - a debounce is genuinely pending (nothing typed, nothing to do),
 * - auto-save is on (a disabled hook must not write on the way out),
 * - the local data actually differs from what was last saved.
 */
export function shouldFlushOnUnmount({
	hasPendingTimer,
	enabled,
	localJson,
	savedJson,
}: {
	hasPendingTimer: boolean;
	enabled: boolean;
	localJson: string;
	savedJson: string;
}): boolean {
	return hasPendingTimer && enabled && localJson !== savedJson;
}

/**
 * Should this draft be reported to `onLocalUpdate`?
 *
 * `onLocalUpdate` drives the live preview and the editor's dirty banner, so it must
 * fire for real edits and not for hydration. `localData` is seeded from `data`, so on
 * mount it holds a value the user never typed; reporting it made the editor announce
 * unsaved work on a resume nobody had touched.
 *
 * The test is "does the draft differ from what was last known to be saved", the same
 * predicate as `isDirty` and `shouldFlushOnUnmount` above. Counting calls would have
 * been simpler and wrong in a second way: it would also swallow a genuine first edit.
 *
 * This became visible only once personal info started resolving from two stores
 * (`Resume.metadata.personalInfo` and the `personal-info` section), which made the
 * form's initial value legitimately differ from the draft's baseline. See
 * `resolvePersonalInfo` in `src/lib/typst/serialize.ts`.
 */
export function shouldReportLocalEdit(
	localJson: string,
	savedJson: string,
): boolean {
	return localJson !== savedJson;
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
	// Read by the unmount flush, which must not re-subscribe to every keystroke.
	const localDataRef = useRef<T>(data);
	const onSaveRef = useRef<((data: T) => Promise<void>) | undefined>(onSave);

	useEffect(() => {
		localDataRef.current = localData;
	}, [localData]);

	useEffect(() => {
		onSaveRef.current = onSave;
	}, [onSave]);

	// Cleanup on unmount.
	//
	// This used to only clear the debounce timer, which silently threw away
	// whatever the user had typed in the last `debounceMs`. Because the editor
	// unmounts a section's form the moment you select another section -- the most
	// common action in the app -- that made "type, click another section, come back"
	// a data-loss path. Worse, it was invisible: `onLocalUpdate` had already pushed
	// the edit into the draft, so the preview showed it while the server never
	// received it.
	//
	// So a pending save is *flushed* on unmount rather than dropped. The network
	// call is made, but state updates are skipped because the component is gone.
	useEffect(() => {
		isMountedRef.current = true;
		return () => {
			isMountedRef.current = false;
			const flush = shouldFlushOnUnmount({
				enabled,
				hasPendingTimer: debounceTimerRef.current !== null,
				localJson: JSON.stringify(localDataRef.current),
				savedJson: savedDataRef.current,
			});
			debounceTimerRef.current = null;
			if (flush) void onSaveRef.current?.(localDataRef.current);
		};
		// biome-ignore lint/correctness/useExhaustiveDependencies: the flush reads
		// refs, so re-subscribing on every keystroke would defeat the purpose.
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

	/*
	 * Report local edits for the live preview, but only actual edits.
	 *
	 * `localData` is seeded from `data`, so on mount it reports a value the user never
	 * typed, and the editor would claim unsaved work on a résumé nobody had touched. The
	 * test is the same one `isDirty` already uses — does the draft differ from what was
	 * last known to be saved — rather than counting calls, which would also skip a
	 * legitimate first edit.
	 *
	 * This surfaced once personal info began resolving from two stores, so the form's
	 * initial value legitimately differs from `metadata`; see `resolvePersonalInfo`.
	 */
	useEffect(() => {
		if (!onLocalUpdate) return;
		if (
			!shouldReportLocalEdit(JSON.stringify(localData), savedDataRef.current)
		) {
			return;
		}
		onLocalUpdate(localData);
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

	/*
	 * Dirty means the local data differs from what was last successfully saved.
	 *
	 * It used to be derived from `status`, which is a label for the debounce rather
	 * than a statement about the data: for the window between "the user typed" and
	 * "the debounce fired" the status was briefly `saved`, and `isDirty` reported
	 * false while an edit was genuinely unsaved. `useBeforeUnload` is wired to this
	 * value, so getting it wrong means the "you will lose work" prompt does not
	 * appear when it should.
	 */
	const isDirty = JSON.stringify(localData) !== savedDataRef.current;
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
