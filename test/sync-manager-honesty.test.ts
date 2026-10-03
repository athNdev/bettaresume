import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncManager } from "../src/lib/api";

/**
 * The SyncManager must not report a write that never happened.
 *
 * `executeSyncOperation` was a stub that logged the operation and returned. That
 * read as success at every level above it:
 *
 *   1. `processSyncQueue` shifted the op off the queue — the write was discarded.
 *   2. `attemptSync` then set `status: "synced"` — the UI reported success.
 *   3. On failure the retry handler shifted the op off again after three attempts.
 *
 * 25 call sites in `resume.store.ts` route through `queueSave`, so this was silent
 * data loss across most of the editor, reported as a successful save.
 *
 * These tests pin the corrected behaviour. They do not assert that backend sync
 * works — it does not, and it cannot from here. They assert that the failure is
 * **visible and the data is retained**, which is what was missing.
 */

/** Minimal localStorage so the module's persistence helpers work under Node. */
function stubStorage() {
	const store = new Map<string, string>();
	vi.stubGlobal("localStorage", {
		getItem: (k: string) => store.get(k) ?? null,
		setItem: (k: string, v: string) => void store.set(k, String(v)),
		removeItem: (k: string) => void store.delete(k),
		clear: () => store.clear(),
		key: (i: number) => [...store.keys()][i] ?? null,
		get length() {
			return store.size;
		},
	});
	return store;
}

/** Reach into the queue so a test can assert an operation was not discarded. */
function queuedIds(m: SyncManager): string[] {
	return (m as unknown as { syncQueue: { entityId: string }[] }).syncQueue.map(
		(o) => o.entityId,
	);
}

function queueUpdate(m: SyncManager, id: string) {
	(
		m as unknown as {
			queueSyncOperation: (
				op: string,
				e: string,
				id: string,
				d: unknown,
			) => void;
		}
	).queueSyncOperation("update", "resume", id, { id, name: "edited" });
}

describe("SyncManager does not fake a successful sync", () => {
	beforeEach(() => {
		stubStorage();
		vi.restoreAllMocks();
	});

	it("executeSyncOperation rejects rather than resolving", async () => {
		const m = new SyncManager();
		const op = {
			id: "op-1",
			operation: "update" as const,
			entity: "resume" as const,
			entityId: "resume-1",
			data: {},
			timestamp: Date.now(),
			retryCount: 0,
		};

		// Pre-fix this resolved, and the caller treated resolution as "persisted".
		await expect(
			(
				m as unknown as {
					executeSyncOperation: (o: typeof op) => Promise<void>;
				}
			).executeSyncOperation(op),
		).rejects.toThrow(/not wired/i);
	});

	it("the error names the operation and says it was not persisted", async () => {
		const m = new SyncManager();
		queueUpdate(m, "resume-42");

		const [op] = (m as unknown as { syncQueue: Record<string, unknown>[] })
			.syncQueue;
		await expect(
			(
				m as unknown as {
					executeSyncOperation: (o: unknown) => Promise<void>;
				}
			).executeSyncOperation(op),
		).rejects.toThrow(/resume-42/);
		await expect(
			(
				m as unknown as {
					executeSyncOperation: (o: unknown) => Promise<void>;
				}
			).executeSyncOperation(op),
		).rejects.toThrow(/localStorage/);
	});

	it("never reports 'synced' while operations remain queued", async () => {
		const m = new SyncManager();
		// Pretend the backend is reachable, so health gating is not what stops us.
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("{}", { status: 200 }),
		);

		queueUpdate(m, "resume-1");
		queueUpdate(m, "resume-2");
		expect(queuedIds(m)).toHaveLength(2);

		await m.attemptSync();

		const state = (m as unknown as { syncState: { status: string } }).syncState;
		// Pre-fix: status became "synced" with an empty queue and no backend write.
		expect(state.status).not.toBe("synced");
		expect(state.status).toBe("error");
	});

	it("keeps the queued operations instead of discarding them", async () => {
		const m = new SyncManager();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("{}", { status: 200 }),
		);

		queueUpdate(m, "resume-1");
		queueUpdate(m, "resume-2");

		// Run well past the old three-attempt drop.
		for (let i = 0; i < 5; i++) {
			await m.attemptSync();
		}

		// Pre-fix the queue was emptied after three attempts per op.
		expect(queuedIds(m)).toEqual(
			expect.arrayContaining(["resume-1", "resume-2"]),
		);
	});

	it("reports the pending count so the UI can surface it", async () => {
		const m = new SyncManager();
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response("{}", { status: 200 }),
		);

		queueUpdate(m, "resume-1");
		await m.attemptSync();

		const state = (
			m as unknown as {
				syncState: { pendingChanges: number; error: string | null };
			}
		).syncState;
		expect(state.pendingChanges).toBe(1);
		// Either the underlying failure or the parked-operation notice is acceptable;
		// what must never happen is a null error beside a non-zero pending count.
		expect(state.error).not.toBeNull();
		expect(state.error).toMatch(/not wired|not persisted|queued/i);
	});
});
