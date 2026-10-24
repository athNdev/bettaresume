import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";

/**
 * Every template must actually compile.
 *
 * The Typst files are shipped code that no typechecker reads. Two of them were **0 bytes**
 * while the registry advertised three templates, and the `|| minimalSource` fallback turned
 * that into a Minimal document rather than an error. Writing real templates then produced a
 * second, subtler failure: a `#` inside a code block is a syntax error in Typst, and nothing
 * in the repo would have caught it before a user opened the export.
 *
 * So this compiles the real files with the real compiler (`typst` on PATH) and reads the text
 * back out of the PDF. It asserts the layer, not the pixels: reading order and presence are
 * what this product is about.
 *
 * Runs only when the `typst` binary is available. CI may not have it; a missing compiler is a
 * skip with a named reason, not a failure. The source-level checks in
 * `typst-templates.test.ts` always run.
 */

const ROOT = resolve(process.cwd());
const TEMPLATE_DIR = join(ROOT, "src/features/resume-editor/typst_templates");

const TYPST = (() => {
	const candidates: Array<[string, string[]]> = [
		["typst", []],
		["typst.exe", []],
		// `npx --no-install` finds a globally installed typst without touching the
		// network, which is how it resolves on a host where it is not on PATH.
		["npx", ["--no-install", "typst"]],
	];
	for (const [command, prefix] of candidates) {
		// `spawnSync`, not `execFileSync`: a missing binary should be a quiet `status !== 0`,
		// not a thrown error whose message we then have to swallow.
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

/**
 * A document exercising the shapes the serializer emits, including `custom`, which used to
 * serialise to `{body, items}` that no template drew.
 */
const SAMPLE = {
	settings: {
		pageSize: "Letter",
		fontScale: 1,
		fontFamily: "Inter",
		lineHeight: 1.5,
		sectionSpacing: "normal",
		accentStyle: "underline",
		colors: {
			background: "#ffffff",
			text: "#1e293b",
			heading: "#111827",
			secondary: "#6b7280",
			accent: "#2563eb",
			divider: "#e2e8f0",
		},
		typography: {
			name: 24,
			title: 14,
			sectionHeading: 14,
			itemTitle: 12,
			body: 11,
			small: 9,
		},
		margins: { top: 40, right: 40, bottom: 40, left: 40 },
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
			type: "experience",
			title: "Work Experience",
			items: [
				{
					position: "Engineer",
					company: "Acme",
					location: "Berlin",
					startDate: "March 2022",
					endDate: "",
					current: true,
					description: "",
					highlights: ["Cut latency 41%"],
				},
			],
		},
		{
			type: "custom",
			title: "Additional",
			body: "Some text",
			items: [],
		},
	],
};

// Every archetype, including `compact`, which shares `standard.typ` but is a distinct
// document once its settings defaults are applied.
const TEMPLATES = Object.keys(TEMPLATE_CONFIGS) as Array<
	keyof typeof TEMPLATE_CONFIGS
>;

async function pdfText(path: string) {
	const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const doc = await getDocument({ url: path, useSystemFonts: true }).promise;
	let text = "";
	for (let page = 1; page <= doc.numPages; page++) {
		const content = await (await doc.getPage(page)).getTextContent();
		text += `${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}\n`;
	}
	return text.replace(/\s+/g, " ");
}

describe.skipIf(!hasTypst)(
	"every template compiles and keeps its text layer",
	() => {
		const dir = mkdtempSync(join(tmpdir(), "typst-"));
		const sections = readFileSync(join(TEMPLATE_DIR, "sections.typ"), "utf8");
		writeFileSync(join(dir, "sample.json"), JSON.stringify(SAMPLE));

		it.each(TEMPLATES)(
			"%s produces a readable PDF",
			async (template) => {
				const body = readFileSync(
					join(TEMPLATE_DIR, `${TEMPLATE_CONFIGS[template].sourceFile}.typ`),
					"utf8",
				);
				const source = `#let data = json("sample.json")\n${sections}\n\n${body}`;
				const sourcePath = join(dir, `${template}.typ`);
				const pdfPath = join(dir, `${template}.pdf`);
				writeFileSync(sourcePath, source);

				// `execFileSync` throws on a non-zero exit, which is the assertion for syntax.
				const [command, prefix] = TYPST as readonly [string, string[]];
				execFileSync(command, [...prefix, "compile", sourcePath, pdfPath], {
					cwd: dir,
					stdio: "pipe",
					shell: process.platform === "win32",
				});

				const bytes = readFileSync(pdfPath);
				expect(bytes.byteLength).toBeGreaterThan(2000);

				const text = await pdfText(pdfPath);
				expect(text, "the header is the candidate").toContain("Avery Chen");
				expect(text, "an experience bullet survived").toContain(
					"Cut latency 41%",
				);
				expect(text, "a custom section was drawn, not dropped").toContain(
					"Some text",
				);
			},
			60_000,
		);
	},
);

describe.skipIf(hasTypst)("typst is unavailable", () => {
	it("says so, rather than silently passing", () => {
		expect(TYPST).toBeNull();
	});
});
