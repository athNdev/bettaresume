"use client";

import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
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
 *
 * Exported for `test/hash-router.test.ts`. This guards every navigation in the app, and
 * it is pure, so there is no reason for it to be reachable only through a provider.
 */
export function parseHash(hash: string): {
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
		const patternPart = patternParts[i];
		const pathPart = pathParts[i];
		// Both arrays have the same length (checked above), so this is unreachable — but
		// `noUncheckedIndexedAccess` cannot know that, and a `!` here would turn a future
		// change to the length check into a runtime TypeError inside the router.
		if (patternPart === undefined || pathPart === undefined) return null;

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
	const initialHash = typeof window === "undefined" ? "" : window.location.hash;

	const [state, setState] = useState(() => parseHash(initialHash));

	/**
	 * The hash this router wants the URL to carry, exactly as written.
	 *
	 * Seeded from `location.hash` rather than from empty so a deep link is protected from
	 * the moment the provider mounts. Empty means "no route to protect": the root is the
	 * only case where the URL legitimately has no fragment, and forcing `#/` onto it would
	 * be noise.
	 */
	const desiredHashRef = useRef(
		initialHash === "" || initialHash === "#" ? "" : initialHash,
	);

	useEffect(() => {
		const handleHashChange = () => {
			desiredHashRef.current = window.location.hash;
			setState(parseHash(window.location.hash));
		};

		// Handle initial load
		handleHashChange();

		// `popstate` covers back/forward; `hashchange` covers a fragment typed into the
		// address bar. Neither fires for our own `pushState`, so there is no echo.
		window.addEventListener("hashchange", handleHashChange);
		window.addEventListener("popstate", handleHashChange);
		return () => {
			window.removeEventListener("hashchange", handleHashChange);
			window.removeEventListener("popstate", handleHashChange);
		};
	}, []);

	/**
	 * Keep Next's App Router from deleting the route.
	 *
	 * ## The defect this exists for
	 *
	 * Next's App Router believes it owns `history`. After an in-app navigation it runs an
	 * effect that calls `history.replaceState(state, "", "/app/")` to restore its
	 * canonical route — which drops our fragment. Verified in a browser: clicking a resume
	 * set `#/resume-editor/resume-1`, and 876 ms later `next/dist/client/components/
	 * app-router.js` replaced the URL with `/app/`. The page still rendered the editor,
	 * because our own state had already moved, but the address bar said `/app/`.
	 *
	 * Consequences, all of which were live: the open document was not linkable, a reload
	 * dropped you back on the dashboard, and back/forward had nothing to move between.
	 *
	 * ## Why a patch rather than a different router
	 *
	 * The app has to be hash-addressed. It is a static export on GitHub Pages, which
	 * cannot serve `resume-editor/<id>` for arbitrary ids, so real paths are not available
	 * — the fragment is the routing scheme, not a leftover. Next has no supported way to
	 * tell its router "the fragment is mine", so the fragment is restored on the way out.
	 *
	 * The wrapper is narrow on purpose: it only rewrites a write that has no fragment of
	 * its own, and only while a route is desired. Anything Next writes *with* a fragment,
	 * and every write made after this provider unmounts, passes through untouched.
	 */
	/*
	 * Captured at module load, before Next's App Router patches `history`.
	 *
	 * Our rewrite is a URL correction, not a navigation. Routing it back through Next's
	 * patched `replaceState` made Next dispatch a router action, and during hydration that
	 * threw `Internal Next.js error: Router action dispatched before initialization` — a
	 * blank editor on a cold deep link. Calling the native method directly keeps the
	 * correction invisible to the router, which is what it is.
	 */
	const nativeReplaceState =
		typeof window === "undefined"
			? null
			: window.History.prototype.replaceState;

	useEffect(() => {
		if (!nativeReplaceState) return;

		const patched = history.replaceState;
		const guarded = function (
			this: History,
			data: unknown,
			unused: string,
			url?: string | URL | null,
		) {
			const desired = desiredHashRef.current;
			if (desired && url != null && !String(url).includes("#")) {
				return nativeReplaceState.call(
					this,
					data,
					unused,
					`${String(url)}${desired}`,
				);
			}
			return patched.call(this, data, unused, url);
		} as History["replaceState"];

		history.replaceState = guarded;
		return () => {
			if (history.replaceState === guarded) history.replaceState = patched;
		};
		// `nativeReplaceState` is captured once at module scope, before Next patches
		// `history`. Listing it keeps the rule honest without changing behaviour.
	}, [nativeReplaceState]);

	/**
	 * Navigation helpers.
	 *
	 * `history.pushState`, not `location.hash = …`.
	 *
	 * Assigning to `location.hash` makes the browser emit a `popstate`, and Next's App
	 * Router listens for `popstate` and dispatches a router action. During hydration that
	 * throws `Internal Next.js error: Router action dispatched before initialization`, which
	 * surfaced as a blank editor on a cold deep link. `pushState` changes the URL, fires no
	 * event at all, and leaves the router untouched — so the state update below is the only
	 * thing that happens.
	 *
	 * Back and forward still work: the browser emits `popstate` for those, and the listener
	 * above re-reads the fragment.
	 */
	const toHash = useCallback(
		(to: string) => (to.startsWith("/") ? to : `/${to}`),
		[],
	);

	const navigate = useCallback(
		(to: string) => {
			const hash = toHash(to);
			desiredHashRef.current = `#${hash}`;
			history.pushState(
				history.state,
				"",
				`${window.location.pathname}${window.location.search}#${hash}`,
			);
			setState(parseHash(`#${hash}`));
		},
		[toHash],
	);

	const replace = useCallback(
		(to: string) => {
			const hash = toHash(to);
			desiredHashRef.current = `#${hash}`;
			history.replaceState(
				history.state,
				"",
				`${window.location.pathname}${window.location.search}#${hash}`,
			);
			setState(parseHash(`#${hash}`));
		},
		[toHash],
	);

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
