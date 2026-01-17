"use client";

import { Toaster } from "react-hot-toast";

/**
 * Toast Provider
 *
 * Provides toast notifications using react-hot-toast.
 * Renders a Toaster component that displays notifications.
 */
export function ToastProvider() {
	return <Toaster position="bottom-right" />;
}
