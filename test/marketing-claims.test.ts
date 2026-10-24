import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { sectionTypeSchema } from "@bettaresume/types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import MarketingHome from "../src/app/page";
import { TEMPLATE_CONFIGS } from "../src/features/resume-editor/types";
import {
	PREFERRED_WEIGHT,
	REQUIRED_WEIGHT,
} from "../src/lib/analysis/ats-match";
import { findDutyPhrase } from "../src/lib/analysis/metrics";

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

	it("says three templates, and the registry has three real ones", () => {
		expect(Object.keys(TEMPLATE_CONFIGS).sort()).toEqual([
			"minimal",
			"postgrad",
			"undergrad",
		]);
		expect(visible).toContain("Three templates");
		// `postgrad.typ` and `undergrad.typ` were 0 bytes while the page advertised them.
		for (const file of ["minimal", "postgrad", "undergrad"]) {
			const source = read(
				`src/features/resume-editor/typst_templates/${file}.typ`,
			);
			expect(source.trim().length, `${file}.typ is empty`).toBeGreaterThan(200);
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

	it("uses the exporter's own section-rule width", () => {
		// `buildPlainText` writes a `=` rule around headings. A pretty mock-up would
		// undercut the only claim on this page that a reader can verify on their own
		// machine, so the page imports the exporter's constant rather than restating it.
		const rules = read("src/lib/export/rules.ts");
		expect(rules).toMatch(/SECTION_RULE\s*=\s*"="\.repeat\(50\)/);
		const hero = read("src/components/marketing/hero.tsx");
		expect(hero).toMatch(
			/import \{ SECTION_RULE \} from "@\/lib\/export\/rules"/,
		);
		expect(html).toContain("=".repeat(50));
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
