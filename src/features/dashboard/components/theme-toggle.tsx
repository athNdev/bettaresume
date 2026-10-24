"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { StateIcon } from "@/components/ui/state-icon";
import { withoutThemeTransitions } from "@/lib/ui/theme-swap";

/**
 * Theme Toggle
 *
 * Toggles between light and dark mode.
 *
 * Two things here are deliberate and easy to undo by accident:
 *
 * - **The swap is suppressed, not animated.** A theme flip changes colour,
 *   background, border and shadow on nearly every element at once, so letting all
 *   of those transition together smears the page. `withoutThemeTransitions` runs
 *   the change inside a `transition: none` window.
 * - **The two icons cross-fade.** Sun and Moon are both mounted; the second is
 *   absolutely positioned and the pair animates opacity/scale/blur rather than
 *   rotating, which reads as a change of state instead of a spin.
 */
export function ThemeToggle() {
	const { theme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return <Button className="h-9 w-9" disabled size="icon" variant="ghost" />;
	}

	const isDark = theme === "dark";

	return (
		<Button
			aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
			aria-pressed={isDark}
			className="h-9 w-9"
			onClick={() =>
				withoutThemeTransitions(() => setTheme(isDark ? "light" : "dark"))
			}
			size="icon"
			static
			variant="ghost"
		>
			<StateIcon
				active={isDark}
				off={<Sun className="h-4 w-4" />}
				on={<Moon className="h-4 w-4" />}
			/>
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
