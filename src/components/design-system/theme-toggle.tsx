"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Light / dark switch for the documentation page.
 *
 * Deliberately not `next-themes` and not a provider: the root layout must stay
 * provider-free (see `docs/AGENT-CONTEXT.md` §2.3), and this page needs one
 * class on `<html>`, not a context. No flash: the class is applied after mount
 * from `localStorage`, and the page renders correctly in either theme because
 * every value on it is a token.
 */
const STORAGE_KEY = "br-ds-theme";

export function ThemeToggle() {
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		const next = stored === "dark" ? "dark" : "light";
		setTheme(next);
		document.documentElement.classList.toggle("dark", next === "dark");
	}, []);

	function choose(next: "light" | "dark") {
		setTheme(next);
		document.documentElement.classList.toggle("dark", next === "dark");
		window.localStorage.setItem(STORAGE_KEY, next);
	}

	return (
		<fieldset className="br-sunken-static m-0 flex min-w-0 items-center gap-0.5 border-0 p-0.5">
			<legend className="sr-only">Theme</legend>
			<button
				aria-pressed={theme === "light"}
				className={cn(
					"flex size-7 items-center justify-center rounded-xs transition-colors duration-(--br-duration-fast)",
					theme === "light"
						? "bg-surface text-foreground shadow-elev-1"
						: "text-fg-muted hover:text-foreground",
				)}
				onClick={() => choose("light")}
				title="Light theme"
				type="button"
			>
				<Sun aria-hidden className="size-4" />
				<span className="sr-only">Light</span>
			</button>
			<button
				aria-pressed={theme === "dark"}
				className={cn(
					"flex size-7 items-center justify-center rounded-xs transition-colors duration-(--br-duration-fast)",
					theme === "dark"
						? "bg-surface text-foreground shadow-elev-1"
						: "text-fg-muted hover:text-foreground",
				)}
				onClick={() => choose("dark")}
				title="Dark theme"
				type="button"
			>
				<Moon aria-hidden className="size-4" />
				<span className="sr-only">Dark</span>
			</button>
		</fieldset>
	);
}
