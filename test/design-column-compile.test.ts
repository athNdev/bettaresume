import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { GALLERY_SAMPLE_RESUME } from "../src/components/marketing/sample-resume";
import { resumeToDesignTypstJson } from "../src/features/resume-editor/design-export";
import { resumeToTypstJson } from "../src/lib/typst/serialize";
import { TYPST, TYPST_COMPILE_FLAGS, TYPST_PROBLEM } from "./helpers/typst-cli";

/**
 * The design CV's text layer, measured rather than described.
 *
 * The unit tests pin the *model* (sidebar sections first, then main). This compiles the
 * real template with the real compiler and reads the PDF's own text layer, because the
 * model is only useful if Typst actually emits the columns in that order.
 *
 * Two documents, one sample:
 *
 *   standard.typ  → SUMMARY before SKILLS (document order, the parser-safe guarantee)
 *   design-column → SKILLS before SUMMARY (sidebar first, the design target)
 *
 * The second assertion is the one that would catch a future refactor promoting the design
 * layout into the normal path. It is not enough that the design export works; the standard
 * one must still be the document it says it is.
 */

const ROOT = resolve(process.cwd());
const TEMPLATE_DIR = join(ROOT, "src/features/resume-editor/typst_templates");
const DESIGN_DIR = join(ROOT, "src/features/resume-editor/design-export");

const dir = mkdtempSync(join(tmpdir(), "br-design-"));

async function pdfText(path: string): Promise<string> {
	const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
	const doc = await getDocument({ url: path, useSystemFonts: true }).promise;
	let text = "";
	for (let page = 1; page <= doc.numPages; page++) {
		const content = await (await doc.getPage(page)).getTextContent();
		text += `${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}\n`;
	}
	return text.replace(/\s+/g, " ");
}

function compile(bodyFile: string, dataJson: string, name: string): string {
	const sections = readFileSync(join(TEMPLATE_DIR, "sections.typ"), "utf8");
	const body = readFileSync(join(bodyFile), "utf8");
	writeFileSync(join(dir, `${name}.json`), dataJson);
	const sourcePath = join(dir, `${name}.typ`);
	const pdfPath = join(dir, `${name}.pdf`);
	writeFileSync(
		sourcePath,
		`#let data = json("${name}.json")\n${sections}\n\n${body}`,
	);

	const [command, prefix] = TYPST as readonly [string, string[]];
	execFileSync(
		command,
		[...prefix, "compile", ...TYPST_COMPILE_FLAGS, sourcePath, pdfPath],
		{ cwd: dir, stdio: "pipe", shell: process.platform === "win32" },
	);
	return pdfPath;
}

describe("the design export and the standard export disagree about column order, on purpose", () => {
	beforeAll(() => {
		expect(TYPST, TYPST_PROBLEM).not.toBeNull();
	});

	it("the standard template keeps document order (SUMMARY before SKILLS)", async () => {
		const pdfPath = compile(
			join(TEMPLATE_DIR, "standard.typ"),
			resumeToTypstJson(GALLERY_SAMPLE_RESUME),
			"standard",
		);
		const text = await pdfText(pdfPath);
		expect(text).toContain("Avery Chen");
		expect(text).toContain("SUMMARY");
		expect(text).toContain("SKILLS");
		expect(text.indexOf("SUMMARY")).toBeLessThan(text.indexOf("SKILLS"));
	}, 60_000);

	it("the design template reads the sidebar first, then the main column", async () => {
		const pdfPath = compile(
			join(DESIGN_DIR, "design-column.typ"),
			resumeToDesignTypstJson(GALLERY_SAMPLE_RESUME),
			"design",
		);
		const text = await pdfText(pdfPath);
		expect(text).toContain("Avery Chen");
		expect(text).toContain("CONTACT");
		expect(text).toContain("SKILLS");
		expect(text).toContain("SUMMARY");
		expect(text).toContain("WORK EXPERIENCE");
		expect(text).toContain("EDUCATION");
		expect(text).toContain("Cut p99 checkout latency 41%");

		// The sidebar is the last section in document order and the first thing the
		// design page reads. This is the exact reversal the text companion describes.
		const order = [
			"Avery Chen",
			"CONTACT",
			"avery@chen.dev",
			"SKILLS",
			"Go, TypeScript, Python",
			"SUMMARY",
			"WORK EXPERIENCE",
			"EDUCATION",
		];
		let cursor = -1;
		for (const needle of order) {
			const at = text.indexOf(needle);
			expect(at, `missing or out of order: ${needle}`).toBeGreaterThan(cursor);
			cursor = at;
		}
	}, 60_000);
});
