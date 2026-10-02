import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import type { Context } from "./context";

/**
 * A single field-level validation problem, safe to publish.
 *
 * `path` is dot-joined so a client can attach the message to a form control, and
 * `code` lets a client branch (e.g. Zod's "unrecognized_keys"). No value from
 * the failing input is carried — only the path and the validator's own message.
 */
export interface ValidationIssue {
	path: string;
	code: string;
	message: string;
}

/** What every non-`TRPCError` failure collapses to on the wire. */
export const REDACTED_ERROR_MESSAGE = "Something went wrong";

/**
 * Map a `ZodError` to publishable field issues, or `null` if `cause` is not one.
 *
 * This is the *only* cause shape whose contents reach the client. Anything else
 * — a plain `new Error(...)`, a D1/SQLite driver error, a bug — returns `null`
 * and its message is dropped.
 */
export function toValidationIssues(cause: unknown): ValidationIssue[] | null {
	if (!(cause instanceof ZodError)) return null;

	return cause.issues.map((issue) => ({
		path: issue.path.join("."),
		code: issue.code,
		message: issue.message,
	}));
}

/**
 * True when `error.message` was inherited from `error.cause` rather than written
 * by us.
 *
 * `getTRPCErrorFromUnknown` wraps any non-`TRPCError` throw as
 * `new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause })`, and the `TRPCError`
 * constructor falls back to `cause.message` when no explicit message is given.
 * So `new Error("SQLITE_CONSTRAINT: UNIQUE constraint failed: User.email")`
 * becomes an `INTERNAL_SERVER_ERROR` whose `.message` is that driver string —
 * and tRPC's default shape publishes `.message` verbatim.
 *
 * Distinguishing "inherited" from "deliberate" by comparing the two is what
 * keeps this from over-redacting: a hand-written
 * `new TRPCError({ code: "NOT_FOUND", message: "Resume not found or access
 * denied" })` does not match its cause and survives untouched.
 */
function messageInheritedFromCause(error: TRPCError): boolean {
	const cause = error.cause;
	if (!(cause instanceof Error)) return false;
	return error.message === cause.message;
}

const t = initTRPC.context<Context>().create({
	transformer: superjson,
	/**
	 * Default OFF, and it must stay explicit.
	 *
	 * tRPC infers `isDev` as `process.env.NODE_ENV !== "production"`. In a Worker
	 * `NODE_ENV` is normally undefined, so that expression is TRUE in production
	 * and `getErrorShape` then attaches `data.stack` — a full stack trace, with
	 * file paths and the internals of the throw — to every error response. This
	 * was observable before: see the `stack` assertion in
	 * test/error-formatter.test.ts.
	 *
	 * Opt in per environment rather than relying on the NODE_ENV inference.
	 */
	isDev: false,
	errorFormatter({ shape, error }) {
		const validationIssues = toValidationIssues(error.cause);

		// An INTERNAL_SERVER_ERROR whose message came from its cause is an
		// unhandled throw (or a driver error) dressed up as a tRPC error. Publish a
		// fixed string instead. Deliberately-written TRPCError messages are left
		// alone — see messageInheritedFromCause.
		const redactMessage =
			error.code === "INTERNAL_SERVER_ERROR" &&
			messageInheritedFromCause(error);

		if (redactMessage) {
			// Request-id plumbing does not exist yet (separate ticket): the error
			// formatter has no access to the request. Until then the id is the
			// procedure path, and `server.ts`'s onError still logs the real error
			// object with its stack.
			console.error(
				`[trpc] Redacted ${error.code} at '${String(shape.data.path)}': `,
				error.cause,
			);
		}

		return {
			...shape,
			message: redactMessage ? REDACTED_ERROR_MESSAGE : shape.message,
			data: {
				...shape.data,
				// Renamed from `zodError`, which was a lie: it held
				// `error.cause.message` for ANY error, Zod or not. Nothing in the
				// frontend read it.
				validationIssues,
			},
		};
	},
});

export const router = t.router;
export const middleware = t.middleware;

// Public procedure - no auth required
export const publicProcedure = t.procedure;

// Protected procedure - requires authenticated user
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
	if (!ctx.user || !ctx.userId) {
		throw new TRPCError({
			code: "UNAUTHORIZED",
			message: "You must be logged in to access this resource",
		});
	}

	return next({
		ctx: {
			...ctx,
			user: ctx.user,
			userId: ctx.userId,
		},
	});
});
