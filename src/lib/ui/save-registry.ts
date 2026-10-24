/**
 * The save registry: how ⌘S reaches a form that owns its own save trigger.
 *
 * Each section form holds its own local state and its own `saveNow`, so a global
 * keyboard shortcut cannot reach any of them without either wiring twelve
 * components or putting the shortcut inside the one hook every form already
 * uses. This is that second option: `useAutoSave` registers its save, the editor
 * listens for ⌘S, and the flush calls whatever is registered.
 *
 * Registration is by function identity in a Set, so a form that unmounts
 * unregisters and never leaks. A save on a clean form is a no-op in the hook, so
 * flushing everything registered is safe.
 */

type SaveFn = () => Promise<void>;

const pending = new Set<SaveFn>();

/** Register a save trigger. Returns the unregister function. */
export function registerPendingSave(save: SaveFn): () => void {
	pending.add(save);
	return () => {
		pending.delete(save);
	};
}

/**
 * Forget every registered save.
 *
 * For tests and for the editor's teardown. Without it, registrations accumulate
 * across mounts — a form that unmounts calls its own unregister, but a test that
 * registers inline has nothing to unregister.
 */
export function clearPendingSaves(): void {
	pending.clear();
}

/**
 * Run every registered save, newest content first.
 *
 * Returns how many ran, so a caller can say "saved" or "nothing to save" rather
 * than flashing a success message for an empty action.
 */
export async function flushPendingSaves(): Promise<number> {
	const saves = [...pending];
	let ran = 0;
	for (const save of saves) {
		try {
			await save();
			ran++;
		} catch {
			// A failed save reports itself through the hook's own error state; one
			// broken form must not stop the others from flushing.
		}
	}
	return ran;
}
