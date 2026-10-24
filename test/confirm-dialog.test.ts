import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

/**
 * `useConfirm` returns a promise, and the caller `await`s it before doing anything
 * destructive. So *every* way out of the dialog has to settle that promise.
 *
 * The shipped bug: Escape and dismissal closed the dialog without resolving, so
 * `await confirm(...)` hung forever. The dialog vanished and the action silently did
 * nothing — no error, no toast, no `finally`. The source assertions below exist
 * because the root vitest config is `environment: "node"` with no DOM, so the promise
 * cannot be driven by a keypress here.
 */

const confirmSource = readFileSync("src/hooks/use-confirm.tsx", "utf8");
const confirmCode = codeOf("src/hooks/use-confirm.tsx");

describe("every exit settles the promise", () => {
	it("has exactly one settle path", () => {
		// One funnel is the fix; two would drift.
		const settles =
			confirmCode.match(
				/set\(\{ isOpen: false, resolve: null \}\);\n\t\tresolve\?\.\(value\);/g,
			) ?? [];
		expect(settles).toHaveLength(1);
	});

	it("dismissal settles as false", () => {
		// Escape, and any other Radix dismissal, arrives as onOpenChange(false).
		expect(confirmCode).toMatch(/onOpenChange=\{\(open\) =>/);
		expect(confirmCode).toMatch(/if \(!open\) settle\(false\)/);
	});

	it("Cancel settles as false and Continue as true", () => {
		expect(confirmCode).toMatch(
			/<AlertDialogCancel onClick=\{\(\) => settle\(false\)\}>/,
		);
		expect(confirmCode).toMatch(
			/<AlertDialogAction onClick=\{\(\) => settle\(true\)\}>/,
		);
	});

	it("no component closes by setting isOpen directly", () => {
		// That is the exact shape of the old bug: a close that is not a settle.
		expect(confirmCode).not.toMatch(/set\(\{ isOpen: false \}\)/);
		expect(confirmCode).not.toMatch(/\bclose\b\s*:/);
	});

	it("the resolver is cleared before it is called, so a double click cannot settle twice", () => {
		const settle = confirmCode.slice(confirmCode.indexOf("settle: (value)"));
		expect(settle.indexOf("resolve: null")).toBeLessThan(
			settle.indexOf("resolve?.(value)"),
		);
	});

	it("explains the defect, so it is not reintroduced for tidiness", () => {
		expect(confirmSource).toMatch(/never settl|hang/i);
		expect(confirmSource).toMatch(/Escape/);
	});
});

describe("the dialog is Radix, not hand-rolled", () => {
	it("uses the shared AlertDialog primitives", () => {
		// Radix is what supplies Escape handling, focus trapping and focus return to
		// the trigger. A bespoke overlay would have to reimplement all three.
		expect(confirmCode).toMatch(/from "@\/components\/ui\/alert-dialog"/);
	});

	it("does not implement its own Escape handler", () => {
		expect(confirmCode).not.toMatch(/onEscapeKeyDown/);
		expect(confirmCode).not.toMatch(/["']Escape["']/);
	});

	it("the caller-facing hook returns a stable function, not an object", () => {
		// `useConfirm()` is listed in dependency arrays by its callers; returning a
		// fresh object each render would re-run those effects.
		expect(confirmCode).toMatch(
			/return useConfirmStore\(\(state\) => state\.confirm\)/,
		);
	});
});
