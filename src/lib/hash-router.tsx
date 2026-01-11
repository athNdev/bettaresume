'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';

interface RouterContextType {
  path: string;
  params: Record<string, string>;
  navigate: (to: string | { to?: string; search?: any; replace?: boolean }) => void;
  replace: (to: string) => void;
}

const RouterContext = createContext<RouterContextType | null>(null);

/**
 * Parse hash path and extract route params
 * e.g., "/#/resume-editor/123" -> { path: "/resume-editor/123", params: {} }
 */
function parseHash(hash: string): { path: string; params: Record<string, string> } {
  // Remove leading # and /# 
  let path = hash.replace(/^#\/?/, '/');
  if (path === '' || path === '/') path = '/';
  
  // Extract query params if any
  const [pathname, search] = path.split('?');
  const params: Record<string, string> = {};
  
  if (search) {
    const searchParams = new URLSearchParams(search);
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
  }
  
  return { path: pathname || '/', params };
}

/**
 * Match a path against a route pattern and extract params
 * e.g., "/resume-editor/123" matches "/resume-editor/:id" -> { id: "123" }
 */
export function matchRoute(path: string, pattern: string): Record<string, string> | null {
  const pathParts = path.split('/').filter(Boolean);
  const patternParts = pattern.split('/').filter(Boolean);
  
  if (pathParts.length !== patternParts.length) return null;
  
  const params: Record<string, string> = {};
  
  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]!;
    const pathPart = pathParts[i]!;
    
    if (patternPart.startsWith(':')) {
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
    if (typeof window === 'undefined') {
      return { path: '/', params: {} };
    }
    return parseHash(window.location.hash);
  });

  useEffect(() => {
    const handleHashChange = () => {
      setState(parseHash(window.location.hash));
    };

    // Handle initial load
    handleHashChange();
    
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = useCallback((to: string | { to?: string; search?: any; replace?: boolean }) => {
    if (typeof to === 'string') {
      window.location.hash = to.startsWith('/') ? to : `/${to}`;
    } else {
      const { to: path, search, replace } = to;
      let newPath = path || state.path;
      if (!newPath.startsWith('/')) newPath = `/${newPath}`;
      
      let finalParams = state.params;
      if (search === true) {
        finalParams = state.params;
      } else if (typeof search === 'function') {
        finalParams = search(state.params);
      } else if (search) {
        finalParams = search;
      }

      if (search) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(finalParams)) {
          if (value !== undefined && value !== null) {
            searchParams.set(key, String(value));
          }
        }
        const queryString = searchParams.toString();
        if (queryString) {
          newPath += `?${queryString}`;
        }
      }
      
      if (replace) {
        window.location.replace(`${window.location.pathname}${window.location.search}#${newPath}`);
      } else {
        window.location.hash = newPath;
      }
    }
  }, [state.path, state.params]);

  const replace = useCallback((to: string) => {
    const newHash = to.startsWith('/') ? to : `/${to}`;
    window.location.replace(`${window.location.pathname}${window.location.search}#${newHash}`);
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
    throw new Error('useHashRouter must be used within a HashRouterProvider');
  }
  return context;
}

export function useNavigate() {
  const { navigate } = useHashRouter();
  return navigate;
}

export function useLocation() {
  const { path } = useHashRouter();
  return { pathname: path };
}

export function useSearch(_?: any) {
  const { params } = useHashRouter();
  return params;
}

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  search?: Record<string, string>;
  disabled?: boolean;
}

export function Link({ to, search, disabled, children, ...props }: LinkProps) {
  const { navigate } = useHashRouter();
  
  const href = useMemo(() => {
    let finalTo = to.startsWith('/') ? to : `/${to}`;
    if (search) {
      const searchParams = new URLSearchParams(search);
      finalTo += `?${searchParams.toString()}`;
    }
    return `#${finalTo}`;
  }, [to, search]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (props.onClick) props.onClick(e);
    if (!e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      navigate(to + (search ? `?${new URLSearchParams(search).toString()}` : ''));
    }
  };

  return (
    <a 
      {...props} 
      href={href} 
      onClick={handleClick}
      aria-disabled={disabled}
      className={`${disabled ? 'pointer-events-none opacity-50' : ''} ${props.className || ''}`}
    >
      {children}
    </a>
  );
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
