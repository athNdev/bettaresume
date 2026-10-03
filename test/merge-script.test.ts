import { execFileSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The merge script must be able to refuse.
 *
 * On 2026-10-03, PRs #150 and #151 were merged with the `quality` job FAILING. The
 * ad-hoc loop waited for `pending == 0` and counted the `pass` lines but never
 * inspected `fail`. A settled check set containing a failure is indistinguishable
 * from a finished one if you only ask "is anything still running?" — so the gate
 * looked like it worked, branch protection was bypassed with `--admin`, and `main`
 * stayed red until someone read the table.
 *
 * These tests drive `scripts/merge-pr.sh` against a stub `gh` on PATH and assert it
 * refuses in exactly the cases that slipped through. A script that always merges is
 * worse than no script, because it looks like a gate.
 */

const script = readFileSync("scripts/merge-pr.sh", "utf8");

/** Runs the script with a fake `gh` that prints `checksOutput`. */
function run(checksOutput: string, ghExit = 0) {
	const dir = mkdtempSync(join(tmpdir(), "merge-"));
	const bin = join(dir, "bin");
	execFileSync("mkdir", ["-p", bin]);

	writeFileSync(
		join(bin, "gh"),
		`#!/usr/bin/env bash
case "$1 $2" in
  "pr checks")
    printf '%b' ${JSON.stringify(checksOutput)}
    exit ${ghExit} ;;
  "pr merge")
    echo "MERGE_HAPPENED" ; exit 0 ;;
  "pr view")
    echo "some-branch" ; exit 0 ;;
esac
echo "UNEXPECTED_GH_CALL: $*" >&2
exit 99
`,
	);
	chmodSync(join(bin, "gh"), 0o755);

	try {
		const stdout = execFileSync("bash", ["scripts/merge-pr.sh", "999"], {
			encoding: "utf8",
			env: {
				PATH: `${bin}:/usr/bin:/bin`,
				HOME: dir,
				// Shrink the real 20-minute budget so the timeout path is testable.
				MERGE_PR_MAX_POLLS: "2",
				MERGE_PR_POLL_SECONDS: "0",
			} as unknown as NodeJS.ProcessEnv,
			stdio: ["ignore", "pipe", "pipe"],
		});
		return { code: 0, stdout };
	} catch (e) {
		const err = e as { status?: number; stdout?: string };
		return { code: err.status ?? 1, stdout: `${err.stdout ?? ""}` };
	}
}

const row = (name: string, state: string) => `${name}\t${state}\t1m\turl\n`;

describe("merge-pr.sh refuses a PR with a failing check", () => {
	it("refuses when one check fails among passing ones", () => {
		// The exact shape of #150 and #151: mostly green, one failure.
		const r = run(
			row("quality", "fail") +
				row("build", "pass") +
				row("test", "pass") +
				row("dev-server", "pass"),
		);

		expect(r.code).not.toBe(0);
		expect(r.stdout).toMatch(/Refusing to merge/);
		expect(r.stdout).toMatch(/quality/);
		// The critical assertion: it must not have merged.
		expect(r.stdout).not.toMatch(/MERGE_HAPPENED/);
	});

	it("does not treat a settled set as green just because nothing is pending", () => {
		// This is the bug in one assertion: no "pending" anywhere, yet a failure.
		const checks = row("quality", "fail") + row("build", "pass");
		expect(checks).not.toMatch(/pending/i);

		const r = run(checks);
		expect(r.stdout).not.toMatch(/MERGE_HAPPENED/);
	});

	it("refuses a PR with no checks at all", () => {
		// "All zero checks passed" is not the same as "verified".
		const r = run("");
		expect(r.code).not.toBe(0);
		expect(r.stdout).toMatch(/no checks reported at all/i);
		expect(r.stdout).not.toMatch(/MERGE_HAPPENED/);
	});

	it("refuses when checks never settle", () => {
		const r = run(row("build", "pending"));
		expect(r.code).not.toBe(0);
		expect(r.stdout).toMatch(/never settled/i);
		expect(r.stdout).not.toMatch(/MERGE_HAPPENED/);
	});

	it("refuses on a cancelled check rather than counting it as fine", () => {
		const r = run(row("test", "cancelled") + row("build", "pass"));
		expect(r.stdout).not.toMatch(/MERGE_HAPPENED/);
	});

	it("refuses on a skipped check that was required", () => {
		// `gh pr checks` marks skipped-but-required as skip; a gate must not
		// treat that as a pass.
		const r = run(row("CodeQL", "skipped") + row("build", "pass"));
		expect(r.stdout).not.toMatch(/MERGE_HAPPENED/);
	});

	it("still honours gh's non-zero exit when checks fail", () => {
		// `gh pr checks` exits non-zero on failure. If the script ran under
		// `set -e` without guarding, it would die before printing a reason.
		const r = run(row("quality", "fail"), 1);
		expect(r.stdout).toMatch(/Refusing to merge/);
		expect(r.stdout).not.toMatch(/UNEXPECTED_GH_CALL/);
	});
});

describe("the script cannot be trivially bypassed", () => {
	it("requires every check to be pass, not merely the absence of fail", () => {
		// The original mistake: counting `pass` lines. A PR with 9 passes and 1
		// failure has a high pass count.
		expect(script).toMatch(/\$2!="pass"/);
		expect(script).not.toMatch(/grep -c.*pass.*-eq|pass.*count/i);
	});

	it("runs under set -euo pipefail", () => {
		expect(script).toMatch(/set -euo pipefail/);
	});

	it("re-reads the check table after it settles", () => {
		// A check can flip between the last poll and the merge.
		expect(script.match(/gh pr checks/g)?.length ?? 0).toBeGreaterThanOrEqual(
			2,
		);
	});

	it("documents why --admin is acceptable only behind a real gate", () => {
		expect(script).toMatch(/--admin/);
		expect(script).toMatch(/branch protection is bypassed/i);
	});
});
