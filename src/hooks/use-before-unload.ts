"use client";

import { useEffect } from "react";

/**
 * Hook to warn user before leaving page with unsaved changes.
 *
 * @param isDirty - Whether there are unsaved changes
 * @param message - Custom warning message (browser may ignore this)
 *
 * @example
 * ```tsx
 * const { isDirty } = useAutoSave({ ... });
 * useBeforeUnload(isDirty);
 * ```
 */
export function useBeforeUnload(
	isDirty: boolean,
	message = "You have unsaved changes. Are you sure you want to leave?",
) {
	useEffect(() => {
		if (!isDirty) return;

		const handleBeforeUnload = (event: BeforeUnloadEvent) => {
			event.preventDefault();
			// Modern browsers ignore custom messages, but we still set it for older browsers
			event.returnValue = message;
			return message;
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [isDirty, message]);
}
