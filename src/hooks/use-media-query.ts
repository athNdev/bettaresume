"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A media query as React state, without a layout effect and without a hydration
 * mismatch.
 *
 * The editor's small-screen mode must GATE MOUNTING, not merely hide: the three-zone
 * `PanelGroup` measures its panes with a `ResizeObserver`, and a pane that is
 * `display: none` reports width 0 — so mounting it at 390px and hiding it would leave
 * fit-to-pane zoom frozen at the wrong scale. `useSyncExternalStore` gives the first
 * client render the real answer while the server snapshot stays `false`, which is what
 * keeps hydration honest.
 *
 * `getServerSnapshot` returns `false` for every query. That is the phone-first default
 * the rest of this repo writes its base styles against.
 */
export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(onChange: () => void) => {
			if (typeof window === "undefined" || !window.matchMedia) {
				return () => {};
			}
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		[query],
	);

	return useSyncExternalStore(
		subscribe,
		() =>
			typeof window !== "undefined" && window.matchMedia
				? window.matchMedia(query).matches
				: false,
		() => false,
	);
}
