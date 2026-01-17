"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";

interface RouterContextType {
	path: string;
	params: Record<string, string>;
	navigate: (to: string) => void;
	replace: (to: string) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

/**
 * Parse hash path and extract route params
 * e.g., "/#/resume-editor/123" -> { path: "/resume-editor/123", params: {} }
 */
function parseHash(hash: string): {
	path: string;
	params: Record<string, string>;
} {
	// Remove leading # and /#
	let path = hash.replace(/^#\/?/, "/");
	if (path === "" || path === "/") path = "/";

	// Extract query params if any
	const [pathname, search] = path.split("?");
	const params: Record<string, string> = {};

	if (search) {
		const searchParams = new URLSearchParams(search);
		searchParams.forEach((value, key) => {
			params[key] = value;
		});
	}

	return { path: pathname || "/", params };
}

/**
 * Match a path against a route pattern and extract params
 * e.g., "/resume-editor/123" matches "/resume-editor/:id" -> { id: "123" }
 */
export function matchRoute(
	path: string,
	pattern: string,
): Record<string, string> | null {
	const pathParts = path.split("/").filter(Boolean);
	const patternParts = pattern.split("/").filter(Boolean);

	if (pathParts.length !== patternParts.length) return null;

	const params: Record<string, string> = {};

	for (let i = 0; i < patternParts.length; i++) {
		const patternPart = patternParts[i]!;
		const pathPart = pathParts[i]!;

		if (patternPart.startsWith(":")) {
			// Dynamic segment
			params[patternPart.slice(1)] = pathPart;
		} else if (patternPart !== pathPart) {
			// Static segment doesn't match
			return null;
		}
	}

	return params;
}

interface HashRouterProviderProps {
	children: ReactNode;
}

export function HashRouterProvider({ children }: HashRouterProviderProps) {
	const [state, setState] = useState(() => {
		if (typeof window === "undefined") {
			return { path: "/", params: {} };
		}
		return parseHash(window.location.hash);
	});

	useEffect(() => {
		const handleHashChange = () => {
			setState(parseHash(window.location.hash));
		};

		// Handle initial load
		handleHashChange();

		window.addEventListener("hashchange", handleHashChange);
		return () => window.removeEventListener("hashchange", handleHashChange);
	}, []);

	const navigate = useCallback((to: string) => {
		window.location.hash = to.startsWith("/") ? to : `/${to}`;
	}, []);

	const replace = useCallback((to: string) => {
		const newHash = to.startsWith("/") ? to : `/${to}`;
		window.location.replace(
			`${window.location.pathname}${window.location.search}#${newHash}`,
		);
	}, []);

	return (
		<RouterContext.Provider value={{ ...state, navigate, replace }}>
			{children}
		</RouterContext.Provider>
	);
}

export function useHashRouter() {
	const context = useContext(RouterContext);
	if (!context) {
		throw new Error("useHashRouter must be used within a HashRouterProvider");
	}
	return context;
}

/**
 * Hook to get route params for a specific pattern
 */
export function useHashParams(pattern: string): Record<string, string> | null {
	const { path } = useHashRouter();
	return matchRoute(path, pattern);
}

/**
 * Link component for hash-based navigation
 */
interface HashLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
	href: string;
	children: ReactNode;
}

export function HashLink({ href, children, onClick, ...props }: HashLinkProps) {
	const { navigate } = useHashRouter();

	const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
		e.preventDefault();
		onClick?.(e);
		navigate(href);
	};

	return (
		<a href={`#${href}`} onClick={handleClick} {...props}>
			{children}
		</a>
	);
}
