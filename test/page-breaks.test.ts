import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Semantic page breaks, compiled.
 *
 * A keep-together entry must not split across pages, and the flag must be what does it.
 * Both halves are asserted on rendered text: the same document with the same content is
 * compiled twice, once with `keepTogether: "always"` and once with `"never"`, and the
 * page the entry's heading lands on is compared with the page its last bullet lands on.
 *
 * The entry is deliberately taller than the space left on page 1 but shorter than a full
 * page, which is the case the flag exists for: with `never` it splits at the boundary
 * (heading above, last bullet below), and with `always` it moves to page 2 whole.
 *
 * Runs only when the `typst` binary is available, like `typst-compile.test.ts`; the
 * source-level mapping is asserted unconditionally in `typst-templates.test.ts`.
 */

const ROOT = resolve(process.cwd());
const TEMPLATE_DIR = join(ROOT, "src/features/resume-editor/typst_templates");

const TYPST = (() => {
	for (const [command, prefix] of [
		["typst", []],
		["typst.exe", []],
		["npx", ["--no-install", "typst"]],
	] as Array<[string, string[]]>) {
		const probe = spawnSync(command, [...prefix, "--version"], {
			encoding: "utf8",
			shell: process.platform === "win32",
		});
		if (probe.status === 0 && (probe.stdout ?? "").includes("typst")) {
			return [command, prefix] as const;
		}
	}
	return null;
})();

const hasTypst = TYPST !== null;

const HEADING = "Boundary Keeper";
const LAST_BULLET = "Bullet thirty is the last one in this entry";

/** A resume whose single long entry straddles a page boundary. */
function fixture(keepTogether: "always" | "never") {
	const filler = Array.from({ length: 40 }, (_, i) => ({
		id: `b${i + 1}`,
		position: `Filler role ${i + 1}`,
		company: "Placeholder",
		location: "",
		startDate: "2018",
		endDate: "2019",
		current: false,
		description: "",
		highlights: ["Did a short thing that fits on one line"],
	}));
	return {
		settings: {
			pageSize: "Letter",
			fontScale: 1,
			fontFamily: "Inter",
			lineHeight: 1.35,
			sectionSpacing: "normal",
			accentStyle: "underline",
			dateFormat: "YYYY",
			colors: {
				background: "#ffffff",
				text: "#1e293b",
				heading: "#111827",
				secondary: "#6b7280",
				accent: "#2563eb",
			},
			typography: {
				name: 18,
				title: 11,
				sectionHeading: 11,
				itemTitle: 10.5,
				body: 10.5,
				small: 9.5,
			},
			margins: { top: 43, right: 50, bottom: 43, left: 50 },
		},
		personalInfo: {
			fullName: "Avery Chen",
			professionalTitle: "Engineer",
			email: "avery@example.test",
			phone: "",
			location: "Berlin",
			linkedin: "",
			github: "",
			website: "",
		},
		sections: [
			{
				id: "s-summary",
				type: "summary",
				title: "Summary",
				summaryText:
					"A short summary that still takes a few lines on the page. ".repeat(
						4,
					),
			},
			{
				id: "s-filler",
				type: "experience",
				title: "Earlier Roles",
				items: filler.slice(0, 6),
			},
			{
				id: "s-keeper",
				type: "experience",
				title: "Work Experience",
				items: [
					{
						id: "keeper",
						position: "Boundary Keeper",
						company: "Acme",
						location: "",
						startDate: "2020",
						endDate: "",
						current: true,
						description: "",
						highlights: [
							...Array.from(
								{ length: 29 },
								(_, i) => `Bullet ${i + 1} is a single short line of text`,
							),
							LAST_BULLET,
						],
						keepTogether,
					},
				],
			},
		],
	};
}

async function pageTexts(path: string): Promise<string[]> {
	const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const doc = await getDocument({ url: path, useSystemFonts: true }).promise;
	const pages: string[] = [];
	for (let page = 1; page <= doc.numPages; page++) {
		const content = await (await doc.getPage(page)).getTextContent();
		pages.push(
			content.items.map((item) => ("str" in item ? item.str : "")).join(" "),
		);
	}
	return pages;
}

const pageOf = (pages: string[], needle: string) =>
	pages.findIndex((text) => text.includes(needle)) + 1;

describe.skipIf(!hasTypst)("semantic page breaks", () => {
	const dir = mkdtempSync(join(tmpdir(), "typst-breaks-"));
	const sections = readFileSync(join(TEMPLATE_DIR, "sections.typ"), "utf8");
	const body = readFileSync(join(TEMPLATE_DIR, "standard.typ"), "utf8");

	async function compile(keepTogether: "always" | "never") {
		const json = join(dir, `${keepTogether}.json`);
		writeFileSync(json, JSON.stringify(fixture(keepTogether)));
		const sourcePath = join(dir, `${keepTogether}.typ`);
		const pdfPath = join(dir, `${keepTogether}.pdf`);
		writeFileSync(
			sourcePath,
			`#let data = json("${keepTogether}.json")\n${sections}\n\n${body}`,
		);
		const [command, prefix] = TYPST as readonly [string, string[]];
		execFileSync(command, [...prefix, "compile", sourcePath, pdfPath], {
			cwd: dir,
			stdio: "pipe",
			shell: process.platform === "win32",
		});
		return pageTexts(pdfPath);
	}

	it("keeps an entry that straddles a boundary on one page when flagged", async () => {
		const pages = await compile("always");
		expect(pages.join(" ")).toContain(HEADING);
		expect(pages.join(" ")).toContain(LAST_BULLET);

		const headingPage = pageOf(pages, HEADING);
		const lastPage = pageOf(pages, LAST_BULLET);
		expect(headingPage).toBeGreaterThan(0);
		expect(lastPage).toBe(headingPage);
	}, 120_000);

	it("lets the same entry split when it is flagged as splittable", async () => {
		// The control. Without this, the first test would pass on a document that never
		// crossed a page boundary at all, and the flag would be unproven.
		const pages = await compile("never");
		const headingPage = pageOf(pages, HEADING);
		const lastPage = pageOf(pages, LAST_BULLET);
		expect(headingPage).toBeGreaterThan(0);
		expect(lastPage).toBeGreaterThan(headingPage);
	}, 120_000);
});
