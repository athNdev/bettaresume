import { spawnSync } from "node:child_process";

/**
 * The `typst` CLI, resolved once, **and pinned to the engine the app ships**.
 *
 * Several gates in this suite compile the real templates with the real compiler and read
 * the text layer back out of the PDF: `typst-compile`, `page-breaks`, `typst-marks`,
 * `fill-ratio` and the template gallery. They used to *skip* when the binary was absent,
 * which meant the single-column reading-order guarantee — the product promise — was
 * unverified on every CI run, because the runner never had the compiler.
 *
 * A gate that cannot fail is not a gate. CI installs the compiler
 * (`.github/workflows/ci.yml`, "Install the Typst compiler") and these tests now fail
 * with the message below rather than passing quietly.
 *
 * ## Why the version is checked, not just the presence
 *
 * This host had the *npm* package `typst` (0.10.0) resolvable through
 * `npx --no-install`, so "a compiler was found" was true while the compiler was three
 * minor versions older than the one the product runs. The committed template gallery was
 * rendered by 0.10 and a 0.14 compiler reports every specimen as stale — the tests were
 * green about a document nobody ships. Presence without a version is the same lie as a
 * skip.
 *
 * `@myriaddreamin/typst.ts` 0.7.0 wraps Typst **0.14.2**, so only a 0.14.x CLI measures
 * the engine that produces the preview and the PDF. Bumping typst.ts is the moment to
 * bump this constant.
 */
export const TYPST_VERSION = "0.14.2";
const REQUIRED_MINOR = "0.14";

/**
 * Flags shared by every CLI compile in the suite.
 *
 * `--ignore-system-fonts` makes the rendered output a function of the pinned compiler and
 * the document, not of whatever the machine has installed. The gallery compares bytes, and
 * the page-break test compares page boundaries — both move if a host resolves the sample's
 * "Inter" to a system face while CI falls back to Typst's embedded one. Measured as a
 * no-op on a host without the family installed, so it costs nothing and removes a class of
 * "green here, red in CI" failure.
 */
export const TYPST_COMPILE_FLAGS = ["--ignore-system-fonts"] as const;

const MISSING_TYPST_MESSAGE = [
	`This suite needs the \`typst\` CLI ${REQUIRED_MINOR}.x (typst.ts 0.7.0 wraps Typst ${TYPST_VERSION}).`,
	"Install it:",
	`  https://github.com/typst/typst/releases/tag/v${TYPST_VERSION}`,
	"  Windows:  winget install --id Typst.Typst --version 0.14.2",
	"  macOS:    brew install typst   (check `typst --version`; it must be 0.14.x)",
	"These tests used to skip when the compiler was missing. A gate that cannot fail is",
	"not a gate, so they fail now. CI installs the binary in .github/workflows/ci.yml.",
].join("\n");

interface Candidate {
	command: string;
	prefix: string[];
}

interface Detected {
	cli: readonly [string, string[]];
	version: string;
}

const CANDIDATES: Candidate[] = [
	{ command: "typst", prefix: [] },
	{ command: "typst.exe", prefix: [] },
	// `npx --no-install` finds a globally installed typst without touching the network,
	// which is how it resolves on a host where it is not on PATH.
	{ command: "npx", prefix: ["--no-install", "typst"] },
];

function detect(): { detected: Detected | null; wrong: string | null } {
	let wrong: string | null = null;
	for (const { command, prefix } of CANDIDATES) {
		// `spawnSync`, not `execFileSync`: a missing binary should be a quiet `status !== 0`,
		// not a thrown error whose message we then have to swallow.
		const probe = spawnSync(command, [...prefix, "--version"], {
			encoding: "utf8",
			shell: process.platform === "win32",
		});
		if (probe.status !== 0) continue;
		const stdout = probe.stdout ?? "";
		const version = /typst (\d+\.\d+\.\d+)/.exec(stdout)?.[1];
		if (!version) continue;
		// A compiler of the wrong generation validates a different document. Name it
		// rather than falling through to "not found", because the fix is a version bump.
		if (version.startsWith(`${REQUIRED_MINOR}.`)) {
			return {
				detected: { cli: [command, prefix] as const, version },
				wrong: null,
			};
		}
		wrong = `${version} (${command} ${prefix.join(" ")})`.trim();
	}
	return { detected: null, wrong };
}

const result = detect();

export const TYPST: readonly [string, string[]] | null =
	result.detected?.cli ?? null;

/**
 * Why the CLI is unusable right now: the full explanation, including a wrong version.
 */
export const TYPST_PROBLEM = result.wrong
	? [
			`Found Typst ${result.wrong}, but this suite requires ${REQUIRED_MINOR}.x.`,
			MISSING_TYPST_MESSAGE,
		].join("\n\n")
	: MISSING_TYPST_MESSAGE;

/** The resolved CLI, or a throw that names what is wrong and how to fix it. */
export function typstCli(): readonly [string, string[]] {
	if (!TYPST) throw new Error(TYPST_PROBLEM);
	return TYPST;
}
