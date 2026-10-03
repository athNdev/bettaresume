import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * A dead persistence layer must stay deleted.
 *
 * `src/features/resume-editor/resume.store.ts` (1,326 lines) and `src/lib/api.ts`
 * (493 lines) implemented an "offline-first" design: every edit wrote to localStorage
 * immediately and was queued for a background sync to the backend.
 *
 * It never ran. Nothing imported `resume.store.ts`, so `initializeSync()` was never
 * called, `syncManager.initialize()` never ran, and none of the 25 `queueSave` call
 * sites ever executed. The only importer of `src/lib/api.ts` was `resume.store.ts`.
 *
 * Meanwhile real persistence went through tRPC the whole time -- `handleSectionChange`
 * calls the live `updateSection` mutation, and the dashboard renders `useResumes()`.
 * So this was not a data-loss risk. It was worse in a quieter way: a second, fictional
 * source of truth, documented as though it were the architecture, which is what led to
 * #142 ("a failed sync reported success") being treated as a data-loss bug rather than
 * a bug in code that never executed.
 *
 * These assertions exist so the layer cannot quietly come back. Reintroducing an
 * offline queue is a legitimate future feature -- but it must be wired to the tRPC
 * client and a Clerk token getter when it is, not revived in this shape.
 */

const DEAD_FILES = [
	"src/features/resume-editor/resume.store.ts",
	"src/lib/api.ts",
	"test/sync-manager-honesty.test.ts",
];

describe("the dead persistence layer stays deleted", () => {
	it.each(DEAD_FILES)("%s does not exist", (f) => {
		expect(existsSync(new URL(`../${f}`, import.meta.url).pathname)).toBe(
			false,
		);
	});

	it("no source file references the removed modules", async () => {
		const { readdirSync } = await import("node:fs");
		const root = new URL("../src/", import.meta.url).pathname;
		const files: string[] = [];
		const walk = (dir: string) => {
			for (const e of readdirSync(dir, { withFileTypes: true })) {
				const p = `${dir}/${e.name}`;
				if (e.isDirectory()) walk(p);
				else if (/\.tsx?$/.test(e.name)) files.push(p);
			}
		};
		walk(root);

		const offenders = files.filter((f) => {
			const src = readFileSync(f, "utf8");
			return /from\s+"@\/lib\/api"|resume\.store/.test(src);
		});

		expect(
			offenders.map((f) => f.replace(root, "src/")),
			"a removed module is imported again",
		).toEqual([]);
	});

	it("no test asserts behaviour of the removed sync manager", async () => {
		const { readdirSync } = await import("node:fs");
		const root = new URL("../test/", import.meta.url).pathname;
		const offenders = readdirSync(root)
			.filter((f) => f.endsWith(".ts"))
			.filter((f) =>
				/SyncManager|syncManager|queueSave/.test(
					readFileSync(`${root}/${f}`, "utf8"),
				),
			)
			.filter((f) => f !== "dead-sync-layer.test.ts");

		expect(offenders).toEqual([]);
	});
});

describe("real persistence is the tRPC path, not a local queue", () => {
	const src = (p: string) =>
		readFileSync(new URL(`../${p}`, import.meta.url).pathname, "utf8");

	it("section edits go through the live updateSection mutation", () => {
		const editor = src("src/features/resume-editor/resume-editor.tsx");
		// The one thing the deleted layer was assumed to be doing.
		expect(editor).toMatch(/const handleSectionChange = useCallback\(/);
		expect(editor).toMatch(/await updateSection\(sectionId, updates\)/);
	});

	it("the editor takes updateSection from useSectionMutations, not a local store", () => {
		const editor = src("src/features/resume-editor/resume-editor.tsx");
		expect(editor).toMatch(/useSectionMutations/);
		// And no local-queue call survives in the edit path.
		expect(editor).not.toMatch(/queueSave|syncManager/);
	});

	it("the dashboard lists resumes from the server query", () => {
		const dash = src("src/features/dashboard/dashboard.tsx");
		expect(dash).toMatch(/useResumes\(\{/);
		expect(dash).not.toMatch(/syncManager|queueSave/);
	});

	it("the visible save status reads the real auto-save hook", () => {
		// Guards the claim that removing the dead layer changed no user-visible
		// state: the indicator never read the dead store.
		const indicator = src("src/components/ui/save-status-indicator.tsx");
		expect(indicator).toMatch(/use-auto-save/);
		expect(indicator).not.toMatch(/lib\/api|syncManager/);
	});
});
