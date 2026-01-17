"use client";

/**
 * Dev Mode Badge
 *
 * Small fixed corner badge that indicates when the app is running in dev mode.
 * Only visible when NEXT_PUBLIC_DEV_MODE=true
 */

const isDevMode = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export function DevBadge() {
	if (!isDevMode) {
		return null;
	}

	return (
		<div
			className="fixed bottom-2 left-2 z-50 flex items-center gap-1.5 rounded-full bg-amber-500/90 px-2.5 py-1 font-medium text-amber-950 text-xs shadow-lg backdrop-blur-sm"
			title="Development mode is enabled"
		>
			<span className="relative flex h-2 w-2">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-75" />
				<span className="relative inline-flex h-2 w-2 rounded-full bg-amber-200" />
			</span>
			DEV
		</div>
	);
}
