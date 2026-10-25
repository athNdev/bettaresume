import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sectionTypeSchema, templateTypeSchema } from "@bettaresume/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarketingHome from "../src/app/page";
import {
	FIT_EXAMPLE,
	FIT_EXAMPLE_CHIP,
} from "../src/components/marketing/capabilities";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";
import {
	PREFERRED_WEIGHT,
	REQUIRED_WEIGHT,
} from "../src/lib/analysis/ats-match";
import { findDutyPhrase } from "../src/lib/analysis/metrics";
import { READABILITY_RULES } from "../src/lib/analysis/rubric";
import {
	DENSITY_LABELS,
	DENSITY_PRESETS_ORDER,
} from "../src/lib/layout/density";
import { formatFitChip, ptToMm } from "../src/lib/layout/page-fit";

/**
 * The landing page makes checkable promises. This file holds it to them.
 *
 * The previous version of this file asserted the *argument*: parser-heading lists from
 * `parse-fidelity.ts`, an alias from the skills map, a duty phrase from the metric
 * detector. That kept an essay honest. The page is now a product page, so the things
 * worth pinning are different — and more useful:
 *
 * **Counts.** "13 section types", "4 export formats", "3 templates" are asserted against
 * the schema, the exporter and the template registry. A count is the easiest claim to let
 * rot and the easiest to check.
 *
 * **Feature → module.** Every capability named on the page must have a real
 * implementation behind it, named in this file. Renaming or deleting one fails here
 * before the page can keep advertising it.
 *
 * **No outcome claims.** No percentage, no "guaranteed", no promise that a file passes an
 * applicant tracking system. There is no measurement behind any of those, which is the
 * category's credibility problem rather than a marketing opportunity.
 *
 * **Reachability.** `AGENT-CONTEXT.md` records a shipped feature that could not be opened
 * because a `TabsContent` had no `TabsTrigger`. So presence is not enough: every section
 * must be linkable and every link must resolve.
 *
 * Rendered with `renderToStaticMarkup` rather than a DOM renderer because these are
 * server components that render to real HTML in production anyway — asserting on that
 * HTML is asserting on the artefact crawlers and link previews see.
 */

const root = new URL("../", import.meta.url);
const html = renderToStaticMarkup(createElement(MarketingHome));
const read = (file: string) =>
	readFileSync(fileURLToPath(new URL(file, root)), "utf8");

/** Visible copy only: strip tags so a claim in an attribute cannot satisfy a text check. */
const visible = [...html.matchAll(/>([^<]*)</g)]
	.map((m) => m[1] ?? "")
	.join(" ")
	.replace(/&#?\w+;/g, " ")
	.replace(/\s+/g, " ");

describe("the page renders", () => {
	it("produces real HTML at the root route", () => {
		expect(html.length).toBeGreaterThan(4000);
		expect(html).toContain('<main id="main"');
		expect(html).toMatch(/data-marketing="(true)?"/);
	});

	it("has exactly one h1", () => {
		expect(html.match(/<h1/g) ?? []).toHaveLength(1);
	});

	it("ships no client JavaScript", () => {
		for (const file of [
			"src/app/page.tsx",
			"src/components/marketing/hero.tsx",
			"src/components/marketing/sections.tsx",
			"src/components/marketing/capabilities.tsx",
			"src/components/marketing/site-chrome.tsx",
		]) {
			expect(read(file), `${file} opts into the client`).not.toMatch(
				/^["']use client["']/m,
			);
		}
		expect(html).not.toMatch(/<script/);
	});

	it("carries no analytics or third-party tag", () => {
		// Backs the FAQ's data answer. If someone adds a tag, this fails and the copy
		// has to change with it.
		const pkg = read("package.json");
		for (const dependency of [
			"@vercel/analytics",
			"posthog",
			"plausible",
			"mixpanel",
			"segment",
			"gtag",
			"hotjar",
			"fullstory",
		]) {
			expect(pkg, `${dependency} is a dependency`).not.toContain(dependency);
		}
		expect(html).not.toMatch(
			/cookie-banner|consent-dialog|onetrust|cookieyes/i,
		);
	});
});

describe("every section is reachable", () => {
	const sectionIds = [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(
		(m) => m[1] ?? "",
	);
	const anchors = [...html.matchAll(/href="\/?#([^"]+)"/g)].map(
		(m) => m[1] ?? "",
	);

	it("finds the sections and the in-page links", () => {
		expect(sectionIds.length).toBeGreaterThanOrEqual(6);
		expect(anchors.length).toBeGreaterThanOrEqual(5);
	});

	it("no link points at an id that is not on the page", () => {
		const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1] ?? "");
		const dangling = anchors.filter((id) => !allIds.includes(id));
		expect(dangling, `dangling anchors: ${dangling.join(", ")}`).toEqual([]);
	});

	it("no section is orphaned", () => {
		const orphans = sectionIds.filter((id) => !anchors.includes(id));
		expect(orphans, `unreachable sections: ${orphans.join(", ")}`).toEqual([]);
	});

	it("has unique section ids", () => {
		expect(new Set(sectionIds).size).toBe(sectionIds.length);
	});
});

describe("the counts on the page are the counts in the code", () => {
	it("says thirteen section types, and the schema has thirteen", () => {
		expect(sectionTypeSchema.options).toHaveLength(13);
		expect(visible).toContain("One editor, thirteen section types");
		expect(visible).toContain("13");
	});

	it("names as many templates as the registry ships", () => {
		// The schema union and the registry are one list: every archetype the schema
		// accepts has a config, and no config exists for a value it would reject.
		expect(Object.keys(TEMPLATE_CONFIGS).sort()).toEqual(
			[...templateTypeSchema.options].sort(),
		);

		const count = Object.keys(TEMPLATE_CONFIGS).length;
		const words = [
			"Zero",
			"One",
			"Two",
			"Three",
			"Four",
			"Five",
			"Six",
			"Seven",
			"Eight",
		];
		expect(visible).toContain(`${words[count]} templates`);

		// Every archetype gets a card, and every card's specimen comes from a real file.
		// `postgrad.typ` and `undergrad.typ` were 0 bytes while the page advertised them.
		for (const config of Object.values(TEMPLATE_CONFIGS)) {
			expect(visible, `${config.name} is not on the page`).toContain(
				config.name,
			);
			const source = read(
				`src/features/resume-editor/typst_templates/${config.sourceFile}.typ`,
			);
			expect(
				source.trim().length,
				`${config.sourceFile}.typ is empty`,
			).toBeGreaterThan(200);
		}
	});

	it("says four exports, and the exporter has four", () => {
		const exporter = read("src/components/export/export-buttons.tsx");
		const copy = visible.toLowerCase();
		for (const label of ["pdf", "docx", "plain text", "json"]) {
			expect(copy, `${label} is not named on the page`).toContain(label);
		}
		// Every format must be a real call site, not a dropdown item.
		expect(exporter).toMatch(/compileToPdf|toDownloadBlob/);
		expect(exporter).toMatch(/resumeToDocx/);
		expect(exporter).toMatch(/exportText|text\/plain/);
		expect(exporter).toMatch(/application\/json/);
	});
});

describe("every feature named has an implementation", () => {
	it("the library is a real router", () => {
		const router = read("api/src/trpc/procedures/content.ts");
		expect(router).toMatch(/attach:/);
		expect(router).toMatch(/divergence:/);
		expect(visible).toContain("library");
	});

	it("variants are a real procedure with link semantics", () => {
		const resumeRouter = read("api/src/trpc/procedures/resume.ts");
		const sectionRouter = read("api/src/trpc/procedures/section.ts");
		expect(resumeRouter).toMatch(/createVariation:/);
		expect(resumeRouter).toMatch(/pullFromBase:/);
		expect(sectionRouter).toMatch(/setLink:/);
		expect(visible).toContain("Variants");
		expect(visible).toContain("linked");
		expect(visible).toContain("detached");
	});

	it("history is captured without a button press", () => {
		const revisionRouter = read("api/src/trpc/procedures/revision.ts");
		expect(revisionRouter).toMatch(/export async function maybeSnapshot/);
		expect(revisionRouter).toMatch(/AUTOSNAPSHOT_COOLDOWN_MS/);
		expect(visible).toContain("History recorded as you work");
	});

	it("import really accepts the formats the page names", () => {
		const dashboard = read("src/features/dashboard/dashboard.tsx");
		const extractors = read("src/lib/import/extractors/index.ts");
		expect(extractors).toMatch(/extractDocumentText/);
		expect(dashboard).toMatch(/sectionResumeText/);
		expect(dashboard).toMatch(/\.json/);
		expect(visible).toContain("PDF, Word, Markdown, plain text");
	});

	it("the parser review is a real analysis module", () => {
		expect(read("src/lib/analysis/parse-fidelity.ts")).toMatch(
			/export (function|const) /,
		);
		expect(visible).toContain("parser-fit review");
	});
});

describe("the job-match claims match the matcher", () => {
	it("weights required above preferred, as the page says", () => {
		// The copy no longer quotes the ratio, but it does claim a weighting exists —
		// and it must stay in the right direction, or the claim is simply wrong.
		expect(REQUIRED_WEIGHT).toBeGreaterThan(PREFERRED_WEIGHT);
		expect(visible).toContain(
			"Required terms are weighted over preferred ones",
		);
	});

	it("does not claim the detector fills in a missing number", () => {
		// The product detects; it never generates. Pinned because "we suggest a metric"
		// is the single most tempting sentence to add here.
		expect(findDutyPhrase("Responsible for the migration")).not.toBeNull();
		expect(visible).toContain("It does not choose a number for you");
	});
});

describe("no unsubstantiated numbers or outcome claims", () => {
	// The hero's sample document contains a quantified bullet ("41%"). That is the
	// resume's own content, not a claim about this product, and stripping it keeps the
	// assertion about marketing copy rather than about the example.
	const copy = visible
		.replace(/13 section types/gi, "")
		.replace(/at most once every five minutes/gi, "")
		.replace(/41%/g, "");

	it("contains no percentages", () => {
		const matches = [...copy.matchAll(/\b\d+(?:\.\d+)?\s*%/g)].map((m) => m[0]);
		expect(matches, `outcome percentages: ${matches.join(", ")}`).toEqual([]);
	});

	it("never promises a file will pass an ATS", () => {
		expect(copy).not.toMatch(/guarantee[sd]?/i);
		expect(copy).not.toMatch(/will (pass|get you|land)/i);
		// The FAQ asks the question in order to refuse to answer it; the refusal is the
		// claim being pinned, not the question.
		expect(copy).toMatch(/Nobody can promise that/);
	});

	it("names no competitor", () => {
		for (const competitor of [
			"Rezi",
			"Teal",
			"Jobscan",
			"Zety",
			"Novoresume",
			"Enhancv",
			"Kickresume",
			"Resume Worded",
		]) {
			expect(copy).not.toContain(competitor);
		}
	});

	it("offers no price and no checkout", () => {
		expect(copy).not.toMatch(/per month|\/month|\$\d/);
		expect(visible).toContain("Nothing. There is no checkout");
	});

	it("has no social proof or invented testimonial", () => {
		expect(html).not.toMatch(
			/testimonial|Trustpilot|G2\b|\bstars\b|\brated\b/i,
		);
	});
});

describe("the hero artefact matches the real exporter", () => {
	it("labels the text panel as exported text, not as a description", () => {
		expect(visible).toContain("Exported text");
		expect(visible).toContain(
			"Copy this from the editor before you send the file",
		);
	});

	it("renders the exporter's own output, not a restatement of it", () => {
		// This panel used to be a hand-written `key: value` list whose comment claimed it
		// matched the exporter. It stopped matching the day the exporter stopped emitting
		// internal field names, so the most prominent panel on the site advertised
		// `startDate: 2020-09` as the product's output. Importing the function is the only
		// form of this claim that cannot drift.
		const hero = read("src/components/marketing/hero.tsx");
		expect(hero).toMatch(
			/import \{ buildPlainText \} from "@\/lib\/export\/text"/,
		);
		expect(hero).toMatch(/buildPlainText\(SAMPLE_RESUME\)/);

		// And the rendered HTML must contain real exporter output: the section rule, the
		// template's own date range (not a stored `YYYY-MM`), and a `- ` bullet.
		expect(html).toContain("=".repeat(50));
		expect(html).toContain("Mar 2022 - Present");
		expect(html).toMatch(/- Cut p99 checkout latency 41%/);

		// The bug that started this: schema keys must never appear in the artefact.
		expect(html).not.toContain("startDate:");
		expect(html).not.toContain("highlights:");
	});

	it("keeps the mock document out of the page outline", () => {
		// The document is `role="img"`, so a screen reader hears one description rather
		// than fiction announced as sections of the site.
		expect(html).toMatch(/aria-label="A resume document for Avery Chen/);
		// Raw inner HTML, not tag-stripped: these headings contain plain text only, and a
		// sanitiser in a test is a CodeQL finding waiting to happen. `toContain` is also a
		// stronger assertion here — it catches the fiction appearing inside any heading,
		// not only as the whole heading.
		const headings = [...html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/g)]
			.map((m) => (m[1] ?? "").trim())
			.join(" | ");
		expect(headings).not.toContain("Work Experience");
		expect(headings).not.toContain("Avery Chen");
	});
});

describe("the boundary is stated once, and clearly", () => {
	it("has exactly three principles", () => {
		const section = html.slice(
			html.indexOf('id="principles"'),
			html.indexOf('id="faq"'),
		);
		const items = section.match(/<li/g) ?? [];
		expect(items).toHaveLength(3);
	});

	it("names each boundary in the principles band", () => {
		expect(visible).toContain("No invented content");
		expect(visible).toContain("No score");
		expect(visible).toContain("No tracker, no auto-apply");
	});

	it("never attributes authorship to the product", () => {
		expect(visible).not.toMatch(/we (write|generate|create) your resume/i);
		expect(visible).toContain("No. It gives you the editor");
	});
});

describe("positioning", () => {
	it("leads with the job the product does", () => {
		expect(visible).toContain("Write it once. Tailor it for every role.");
	});

	it("makes the primary CTA an action, not a slogan", () => {
		expect(visible).toContain("Open the editor");
		expect(html).toContain('href="/app"');
	});
});

/* ------------------------------------------------------------------------
 * What shipped after the page was last written.
 * ---------------------------------------------------------------------- */

describe("the page-fit suite is the shipped one", () => {
	it("renders the chip through the editor's own formatter", () => {
		// The sentence on the page is not transcribed: it is `formatFitChip`'s output.
		// A copy edit cannot change the format, and a change to the formatter cannot
		// leave the page advertising an old one.
		const pageFit = read("src/lib/layout/page-fit.ts");
		expect(pageFit).toMatch(/export function formatFitChip/);
		expect(pageFit).toMatch(/export function deriveFit/);

		expect(FIT_EXAMPLE_CHIP).toBe(formatFitChip(FIT_EXAMPLE));
		expect(FIT_EXAMPLE_CHIP).toBe("1.2 pages · 22 mm over target");
		expect(visible).toContain(FIT_EXAMPLE_CHIP);
	});

	it("names the three density presets the module ships", () => {
		const density = read("src/lib/layout/density.ts");
		expect(density).toMatch(/DENSITY_PRESETS/);
		expect(DENSITY_PRESETS_ORDER).toHaveLength(3);
		for (const preset of DENSITY_PRESETS_ORDER) {
			expect(visible, `${preset} is not on the page`).toContain(
				DENSITY_LABELS[preset],
			);
		}
	});

	it("names the three semantic page-break controls the schema stores", () => {
		const schemas = read("packages/types/src/schemas.ts");
		for (const flag of [
			"keepTogether",
			"keepSectionTogether",
			"pageBreakBefore",
		]) {
			expect(schemas).toContain(flag);
		}
		expect(visible).toContain("Keep entries together");
		expect(visible).toContain("Keep the whole section on one page");
		expect(visible).toContain("Start this section on a new page");
	});
});

describe("the readability rows are the rubric's rows", () => {
	const rubric = read("src/lib/analysis/rubric.ts");

	it("names each check by its id and title", () => {
		const rows: Array<[string, string]> = [
			["line-spacing", "Line spacing is in the readable range"],
			["line-length", "Lines are a readable length"],
			["margins-printable", "Margins keep text printable"],
			["font-embedded", "The export uses the font you picked"],
			["last-page-fill", "The last page is substantial"],
		];
		for (const [id, title] of rows) {
			expect(rubric, `${id} is not a rubric check`).toContain(`id: "${id}"`);
			expect(rubric, `${title} is not a rubric title`).toContain(title);
			expect(visible, `${title} is not on the page`).toContain(title);
		}
	});

	it("renders the bands from READABILITY_RULES, not from typed-in numbers", () => {
		expect(visible).toContain(
			`${READABILITY_RULES.lineHeight.min}–${READABILITY_RULES.lineHeight.max}`,
		);
		expect(visible).toContain(
			`${READABILITY_RULES.lineChars.min}–${READABILITY_RULES.lineChars.max} characters`,
		);
		expect(visible).toContain(
			`${ptToMm(READABILITY_RULES.marginMinPt).toFixed(1)} mm or wider`,
		);
		expect(visible).toContain(
			`${READABILITY_RULES.lastPageFillMin} of a page or more`,
		);
	});

	it("says no score without naming a competitor", () => {
		expect(visible).toContain("No 0–100 score");
		expect(visible).toContain("No score");
	});
});

describe("the marks claim is pinned to the exporter", () => {
	it("the run walker maps every mark to Typst and WordprocessingML", () => {
		const richText = read("src/lib/rich-text.ts");
		for (const mark of ["bold", "italic", "underline", "strike", "link"]) {
			expect(richText, `${mark} is not a stored mark`).toContain(mark);
		}
		for (const markup of [
			"#strong",
			"#emph",
			"#underline",
			"#strike",
			"#link",
		]) {
			expect(richText, `${markup} is never emitted`).toContain(markup);
		}
		expect(read("src/lib/export/docx.ts")).toContain("<w:hyperlink");
	});

	it("says exactly what survives in plain text", () => {
		// A text layer carries words, not styling. The page says so rather than
		// repeating the tempting (and false) "every format keeps every mark".
		expect(visible).toContain(
			"Bold, italic, underline, strikethrough and links",
		);
		expect(visible).toContain("text [url]");
	});
});

describe("the example resume is the seeded one", () => {
	it("the seed carries the persona and both documents", () => {
		const seed = read("api/src/db/seed.sql");
		expect(seed).toContain("Priya Raman");
		expect(seed).toContain("showcase-base");
		expect(seed).toContain("showcase-variant");
	});

	it("the page names the persona, and the UI finds it by tag", () => {
		const showcase = read("src/lib/showcase.ts");
		expect(showcase).toMatch(/SHOWCASE_TAG = "showcase"/);
		expect(showcase).toMatch(/export function findShowcase/);
		expect(visible).toContain("Priya Raman");
		expect(visible).toContain("Showcase");
	});
});

describe("every archetype gets a specimen from the real gallery", () => {
	it("renders the registry's thumbnail for each one", () => {
		for (const config of Object.values(TEMPLATE_CONFIGS)) {
			expect(html, `${config.name} has no specimen`).toContain(
				config.thumbnail,
			);
		}
	});
});

describe("the counts are derived where they can be", () => {
	it("the hero reads the template registry instead of typing a number", () => {
		const hero = read("src/components/marketing/hero.tsx");
		expect(hero).toMatch(/Object\.keys\(TEMPLATE_CONFIGS\)\.length/);
		expect(hero).not.toMatch(/label="Templates" value="3"/);
	});

	it("the templates heading derives its word from the same registry", () => {
		const sections = read("src/components/marketing/sections.tsx");
		expect(sections).toMatch(/COUNT_WORDS\[TEMPLATE_COUNT\]/);
		expect(sections).toMatch(
			/TEMPLATE_COUNT = Object\.keys\(TEMPLATE_CONFIGS\)/,
		);
	});
});
