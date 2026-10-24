import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { Resume } from "../src/features/resume-editor/types";
import { resumeToTypstJson } from "../src/lib/typst/serialize";

/**
 * Marks → Typst markup → compiled PDF → extracted text.
 *
 * The serialiser now emits `#strong[]`, `#emph[]`, `#underline[]`, `#strike[]` and
 * `#link(url)[text]` for the editor's marks (`content.json`), and the templates lay
 * them out through `#eval(..., mode: "markup")` — which makes ESCAPING load-bearing:
 * user text is parsed as Typst markup now, so a literal `#strong[]` typed into a
 * summary or a bullet must render as those characters and not as a bold run.
 *
 * The round trip is compiled with the real `typst` CLI and read back with
 * `pdfjs-dist`, the same harness `typst-compile.test.ts` uses (including its skip
 * rule: a missing compiler is a named skip, not a failure). The mark itself cannot
 * be asserted from extracted text — a text layer carries words — so the source-level
 * assertions above the compile pin the emission and the compile pins the text.
 */

const ROOT = resolve(process.cwd());
const TEMPLATE_DIR = join(ROOT, "src/features/resume-editor/typst_templates");

const TYPST = (() => {
	const candidates: Array<[string, string[]]> = [
		["typst", []],
		["typst.exe", []],
		["npx", ["--no-install", "typst"]],
	];
	for (const [command, prefix] of candidates) {
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

/** Every mark the editor palette can produce and the export keeps. */
const MARKED_SUMMARY_DOC = {
	type: "doc",
	content: [
		{
			type: "paragraph",
			content: [
				{ type: "text", text: "Plain " },
				{ type: "text", text: "boldword", marks: [{ type: "bold" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "italicword", marks: [{ type: "italic" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "underword", marks: [{ type: "underline" }] },
				{ type: "text", text: " " },
				{ type: "text", text: "struckword", marks: [{ type: "strike" }] },
				{ type: "text", text: " " },
				{
					type: "text",
					text: "linkedword",
					marks: [{ type: "link", attrs: { href: "https://example.dev/x" } }],
				},
			],
		},
	],
};

/** Text that must render literally in every channel. */
const ADVERSARIAL =
	"hash #strong[] brackets [b] underscore _u_ star *s* dollar $x$ at @ref angle <l> tilde ~t tick `k` back \\slash\\ quote \"q\" apos 'a' ellipsis ... comment //slash head =h list -l plus +o term /t";

const resumeWith = (sections: Array<Record<string, unknown>>): Resume =>
	({
		id: "r1",
		userId: "u1",
		name: "Marks",
		variationType: "base",
		baseResumeId: null,
		domain: null,
		template: "minimal",
		tags: [],
		isArchived: false,
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		metadata: {
			personalInfo: { fullName: "Avery Chen", email: "avery@chen.dev" },
			settings: { dateFormat: "MMM YYYY" },
		},
		sections: sections.map((content, order) => ({
			id: `s${order}`,
			order,
			visible: true,
			...content,
		})),
	}) as unknown as Resume;

const summaryOf = (resume: Resume): string => {
	const payload = JSON.parse(resumeToTypstJson(resume)) as {
		sections: Array<{ summaryText?: string; body?: string }>;
	};
	return payload.sections[0]?.summaryText ?? "";
};

describe("the payload carries Typst markup for every mark", () => {
	it("emits the five wrappers from the stored document", () => {
		const summaryText = summaryOf(
			resumeWith([
				{
					type: "summary",
					content: { title: "Summary", json: MARKED_SUMMARY_DOC },
				},
			]),
		);
		expect(summaryText).toContain("#strong[boldword]");
		expect(summaryText).toContain("#emph[italicword]");
		expect(summaryText).toContain("#underline[underword]");
		expect(summaryText).toContain("#strike[struckword]");
		expect(summaryText).toContain('#link("https://example.dev/x")[linkedword]');
		// The link target is spelled out after the label — the text layer must not
		// lose a URL to a PDF annotation. Brackets are escaped, and so is the first
		// slash of a URL's `//`, which Typst would read as a comment opener.
		expect(summaryText).toContain("\\[https:\\//example.dev/x\\]");
	});

	it("carries marks in a custom body too", () => {
		const payload = JSON.parse(
			resumeToTypstJson(
				resumeWith([
					{
						type: "custom",
						content: {
							title: "Extra",
							json: MARKED_SUMMARY_DOC,
							data: [{ title: "Item", body: "plain #literal" }],
						},
					},
				]),
			),
		) as { sections: Array<{ body: string; items: Array<{ body: string }> }> };
		expect(payload.sections[0]?.body).toContain("#strong[boldword]");
		// Item bodies are plain strings, escaped for the eval'd channel.
		expect(payload.sections[0]?.items[0]?.body).toBe("plain \\#literal");
	});

	it("falls back to escaped plain text without a stored document", () => {
		const summaryText = summaryOf(
			resumeWith([
				{
					type: "summary",
					content: { title: "Summary", html: "<p>#strong[] 'q'</p>" },
				},
			]),
		);
		expect(summaryText).toBe("\\#strong\\[\\] \\'q\\'");
	});
});

const TEMPLATES = ["minimal", "postgrad", "undergrad"] as const;

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

describe.skipIf(!hasTypst)("marks survive to the PDF text layer", () => {
	const dir = mkdtempSync(join(tmpdir(), "typst-marks-"));
	const resume = resumeWith([
		{
			type: "summary",
			content: { title: "Summary", json: MARKED_SUMMARY_DOC },
		},
		{
			type: "summary",
			content: {
				title: "Adversarial",
				json: {
					type: "doc",
					content: [
						{
							type: "paragraph",
							content: [{ type: "text", text: ADVERSARIAL }],
						},
					],
				},
			},
		},
		{
			type: "experience",
			content: {
				title: "Work Experience",
				data: [
					{
						id: "exp-1",
						company: "Acme",
						position: "Engineer",
						startDate: "2022-01",
						current: true,
						highlights: ["uses #strong[] notation"],
					},
				],
			},
		},
	]);
	writeFileSync(join(dir, "sample.json"), resumeToTypstJson(resume));
	const sections = readFileSync(join(TEMPLATE_DIR, "sections.typ"), "utf8");

	it.each(TEMPLATES)(
		"%s keeps every word and renders markup characters literally",
		async (template) => {
			const body = readFileSync(join(TEMPLATE_DIR, `${template}.typ`), "utf8");
			const sourcePath = join(dir, `${template}.typ`);
			const pdfPath = join(dir, `${template}.pdf`);
			writeFileSync(
				sourcePath,
				`#let data = json("sample.json")\n${sections}\n\n${body}`,
			);

			const [command, prefix] = TYPST as readonly [string, string[]];
			execFileSync(command, [...prefix, "compile", sourcePath, pdfPath], {
				cwd: dir,
				stdio: "pipe",
				shell: process.platform === "win32",
			});

			const text = await pdfText(pdfPath);
			// Every marked word survives, in reading order.
			expect(text).toContain("Plain boldword italicword underword struckword");
			expect(
				text,
				"the link label and its target are both in the layer",
			).toContain("linkedword [https://example.dev/x]");
			// Escaping: the adversarial summary renders as characters, not as markup.
			expect(text).toContain("hash #strong[] brackets [b]");
			expect(text).toContain("comment //slash");
			// The dots survive the markup parser (they are escaped); whether they
			// survive as three periods or as the "…" glyph is then up to the font's
			// ellipsis ligature — the bundled fallback font shapes both this and the
			// old plain-string path identically, so the text layer is unchanged.
			expect(text).toMatch(/ellipsis (\.\.\.|…) comment/);
			expect(text, "a bullet with literal markup is literal").toContain(
				"uses #strong[] notation",
			);
		},
		60_000,
	);
});

describe.skipIf(hasTypst)("typst is unavailable", () => {
	it("says so, rather than silently passing", () => {
		expect(TYPST).toBeNull();
	});
});
