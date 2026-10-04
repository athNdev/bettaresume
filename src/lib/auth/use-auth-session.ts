"use client";

/**
 * One auth session hook for the whole app, so a build can substitute a local development
 * session for Clerk's without any component knowing.
 *
 * ## Why this indirection exists
 *
 * `@clerk/react`'s `useAuth()` and `useUser()` **throw when used outside a
 * `ClerkProvider`**. So a bypass cannot simply skip mounting Clerk and leave the call
 * sites alone — every one of them would break instead.
 *
 * The choice between "ask Clerk" and "return the dev session" is therefore made once, at
 * module load, from a build-time constant. Two named hook implementations are selected
 * between rather than branching inside one hook body, because a conditional hook call is a
 * rules-of-hooks violation and this repo runs Biome's `useHookRules` on its own source.
 * Since `DEV_BYPASS_ACTIVE` cannot change within a build, selecting at module scope is
 * exactly equivalent to branching per render — without the violation.
 *
 * Consumers import `useAuthSession` and `useSessionUser` from here and never import from
 * `@clerk/react` directly. That is the property to preserve: a new call site that reaches
 * for Clerk directly would reintroduce the crash this file exists to prevent.
 */

import {
	useAuth as useClerkAuth,
	useClerk as useClerkClerk,
	useUser as useClerkUser,
} from "@clerk/react";
import { DEV_BYPASS_ACTIVE, DEV_USER } from "@/lib/dev-bypass";

/**
 * The Clerk-shaped subset of `useAuth()` this app consumes.
 *
 * Declared rather than inferred from Clerk's types because Clerk's return type carries a
 * great deal the app never reads, and because the dev implementation must satisfy exactly
 * the fields the call sites destructure.
 */
export interface AuthSession {
	isLoaded: boolean;
	isSignedIn: boolean;
	getToken: () => Promise<string | null>;
}

function useClerkSession(): AuthSession {
	// `isLoaded` is renamed rather than passed through: every call site in this app reads
	// `isLoaded`, and keeping the Clerk name would make the dev branch look like a
	// second source of truth for it.
	const { isLoaded, isSignedIn, getToken } = useClerkAuth();
	// Clerk types `isLoaded` as `boolean | undefined` because it is genuinely undefined
	// before the provider has decided. This app only ever branches on it, and treating
	// undefined as false is that branch's meaning.
	return {
		isLoaded: isLoaded === true,
		isSignedIn: isSignedIn === true,
		getToken,
	};
}

const devSession: AuthSession = {
	isLoaded: true,
	isSignedIn: true,
	// No token: the API's dev gate needs the `x-dev-mode` header, not a bearer token, and
	// a fabricated JWT would be rejected by the real verifier.
	getToken: async () => null,
};

function useDevSession(): AuthSession {
	return devSession;
}

/** Selected once per build. See the module comment for why this is not a runtime branch. */
export const useAuthSession: () => AuthSession = DEV_BYPASS_ACTIVE
	? useDevSession
	: useClerkSession;

/**
 * The subset of Clerk's `User` this app reads.
 *
 * Deliberately mirrors Clerk's own optionality — `createdAt` is `Date | string | null` and
 * the primary email address carries a `verification` object — because the consumer in
 * `auth-provider.tsx` narrows both. Trimming the type to what the dev user happens to
 * supply would force that consumer to be rewritten to accept a narrower shape, and the
 * next field anyone reads would silently fail to typecheck.
 */
export interface SessionUser {
	id: string;
	primaryEmailAddress?: {
		emailAddress?: string;
		verification?: { status?: string | null } | null;
	} | null;
	fullName?: string | null;
	firstName?: string | null;
	imageUrl?: string;
	createdAt?: Date | string | null;
}

const devUser = {
	id: DEV_USER.id,
	primaryEmailAddress: { emailAddress: DEV_USER.email },
	fullName: DEV_USER.name,
	firstName: "Demo",
	imageUrl: undefined,
	createdAt: new Date(DEV_USER.createdAt),
};

function useClerkSessionUser(): SessionUser | undefined {
	const { user } = useClerkUser();
	// Clerk types `user` as possibly null while signed out; this app only reads it after
	// `isSignedIn`, and collapsing null to undefined keeps one absence value downstream.
	return user ?? undefined;
}

function useDevSessionUser(): SessionUser {
	return devUser;
}

export const useSessionUser: () => SessionUser | undefined = DEV_BYPASS_ACTIVE
	? useDevSessionUser
	: useClerkSessionUser;
/**
 * Sign-out, or a no-op in a bypass build.
 *
 * There is no session to end locally, so a dev build reports success and stops. Making it
 * throw instead would leave the user staring at a menu that cannot be dismissed, and
 * making it pretend to redirect to a sign-in page that does not exist locally would be
 * worse. The truth is "there is no session"; the UI consequence is "nothing changes".
 */
function useClerkSignOut(): () => Promise<void> {
	const { signOut } = useClerkClerk();
	return signOut;
}

function useDevSignOut(): () => Promise<void> {
	return async () => {};
}

export const useSignOut: () => () => Promise<void> = DEV_BYPASS_ACTIVE
	? useDevSignOut
	: useClerkSignOut;
