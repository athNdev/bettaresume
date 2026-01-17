"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

/**
 * Theme Toggle
 *
 * Toggles between light and dark mode.
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

	return (
		<Button
			aria-label="Toggle theme"
			className="h-9 w-9"
			onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
			size="icon"
			variant="ghost"
		>
			<Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
			<Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
			<span className="sr-only">Toggle theme</span>
		</Button>
	);
}
