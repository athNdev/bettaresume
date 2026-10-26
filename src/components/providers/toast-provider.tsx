"use client";

import { Toaster } from "react-hot-toast";

/**
 * Toast Provider
 *
 * Provides toast notifications using react-hot-toast.
 *
 * The library's defaults are its own design system: an 8px radius, a stock shadow and
 * `#fff`/`#363636` colours that ignore both themes. Every toast here therefore carried
 * a second, foreign surface into the app. They are now the system's overlay rung
 * (elev-2, `--surface-raised`, `md` radius, `sm` type), so a failure notice looks like
 * the rest of the chrome and follows the theme swap.
 */
export function ToastProvider() {
	return (
		<Toaster
			position="bottom-right"
			toastOptions={{
				style: {
					background: "var(--surface-raised)",
					color: "var(--surface-raised-foreground)",
					border: "1px solid var(--border)",
					borderRadius: "var(--br-radius-md)",
					boxShadow: "var(--elev-2)",
					fontSize: "var(--br-text-sm)",
					lineHeight: "var(--br-text-sm--line-height)",
					maxWidth: "24rem",
				},
			}}
		/>
	);
}
