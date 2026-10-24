import { afterEach, describe, expect, it } from "vitest";

import {
	clearPendingSaves,
	flushPendingSaves,
	registerPendingSave,
} from "../src/lib/ui/save-registry";

/**
 * The save registry, which is what makes ⌘/Ctrl+S work.
 *
 * Each section form owns its own save trigger, so a global shortcut has to reach
 * twelve components it cannot see. Rather than wire them all, `useAutoSave`
 * registers every form's save here and the editor flushes the dirty ones.
 *
 * The properties that matter are the boring ones: nothing is called after it
 * unregisters, one broken form does not stop the rest, and the caller learns how
 * many actually ran so it can say "saved" or say nothing.
 */

afterEach(() => {
	// Registrations are module state, so a test that registers inline has nothing to
	// unregister. Clearing between tests is what keeps them independent.
	clearPendingSaves();
});

describe("the save registry", () => {
	it("runs every registered save and reports how many ran", async () => {
		const calls: string[] = [];
		registerPendingSave(async () => {
			calls.push("a");
		});
		registerPendingSave(async () => {
			calls.push("b");
		});

		const ran = await flushPendingSaves();
		expect(ran).toBe(2);
		expect(calls.sort()).toEqual(["a", "b"]);
	});

	it("stops calling a save once it has been unregistered", async () => {
		let calls = 0;
		const unregister = registerPendingSave(async () => {
			calls++;
		});

		await flushPendingSaves();
		expect(calls).toBe(1);

		unregister();
		await flushPendingSaves();
		expect(calls).toBe(1);
	});

	it("keeps going when one save throws", async () => {
		// A failing form reports itself through its own error state; it must not
		// stop the other forms from flushing, or ⌘S saves nothing because one panel
		// is broken.
		let called = false;
		registerPendingSave(async () => {
			throw new Error("save failed");
		});
		registerPendingSave(async () => {
			called = true;
		});

		const ran = await flushPendingSaves();
		expect(called).toBe(true);
		expect(ran).toBe(1);
	});

	it("reports zero when nothing is registered", async () => {
		expect(await flushPendingSaves()).toBe(0);
	});
});
