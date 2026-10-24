"use client";

import { create } from "zustand";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * A promise-shaped confirmation, so a destructive action can `await` the answer
 * instead of threading a callback through a component.
 *
 * The dialog itself is Radix's `AlertDialog`, which is what gives Escape-to-close,
 * focus trapping and focus return to the trigger without any code here.
 *
 * ## The hang this used to have
 *
 * `close()` only set `isOpen: false`. Escape, the Cancel button's own handler and
 * `onOpenChange` could each take that path, and none of them resolved the promise the
 * caller was awaiting — so `await confirm(...)` never settled and the caller's
 * continuation (a toast, a `finally`, a re-enable of the button) simply never ran.
 * The visible symptom is a dialog that closes and an action that does nothing, with no
 * error anywhere.
 *
 * So every exit routes through `settle()`, which resolves exactly once and clears the
 * resolver. There is one way out of this dialog and it always answers.
 */

interface ConfirmStore {
	isOpen: boolean;
	title: string;
	description: string;
	resolve: ((value: boolean) => void) | null;
	confirm: (title: string, description: string) => Promise<boolean>;
	settle: (value: boolean) => void;
}

const useConfirmStore = create<ConfirmStore>((set, get) => ({
	isOpen: false,
	title: "",
	description: "",
	resolve: null,
	confirm: (title, description) =>
		new Promise<boolean>((resolve) => {
			set({ isOpen: true, title, description, resolve });
		}),
	settle: (value) => {
		const { resolve } = get();
		// Clear first, then resolve: a double-click on "Continue" must not settle twice,
		// and resolving after the clear keeps the resolver local to this call.
		set({ isOpen: false, resolve: null });
		resolve?.(value);
	},
}));

/**
 * Returns the confirm function.
 *
 * Deliberately returns the stable action rather than an object, so callers can list it
 * in a dependency array without re-running the effect that calls it.
 */
export function useConfirm() {
	return useConfirmStore((state) => state.confirm);
}

export function ConfirmDialog() {
	const isOpen = useConfirmStore((state) => state.isOpen);
	const title = useConfirmStore((state) => state.title);
	const description = useConfirmStore((state) => state.description);
	const settle = useConfirmStore((state) => state.settle);

	return (
		<AlertDialog
			// Escape and any other dismissal land here. A dismissal is a "no".
			onOpenChange={(open) => {
				if (!open) settle(false);
			}}
			open={isOpen}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel onClick={() => settle(false)}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction onClick={() => settle(true)}>
						Continue
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
