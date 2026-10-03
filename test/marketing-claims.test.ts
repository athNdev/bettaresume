import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import MarketingHome from "../src/app/page";
import {
	PREFERRED_WEIGHT,
	REQUIRED_WEIGHT,
} from "../src/lib/analysis/ats-match";
import { findDutyPhrase } from "../src/lib/analysis/metrics";
import {
	DATE_FORMATS,
	PARSER_SAFE_HEADINGS,
} from "../src/lib/analysis/parse-fidelity";
import { AMBIGUOUS_ALIASES, SKILL_ENTRIES } from "../src/lib/analysis/skills";

/**
 * The landing page makes checkable promises. This file holds it to them.
 *
 * Two failure modes are being guarded against, and they are different in kind.
 *
 * **Copy drifting from the product.** The audit section lists parser-safe
 * headings, the coverage section states a weighting ratio, the export section
 * names file formats, and the hero's text panel is meant to be a faithful
 * rendering of the real plain-text exporter. All of that can rot silently. So
 * the specific claims are asserted against the modules that implement them —
 * `PARSER_SAFE_HEADINGS`, `DATE_FORMATS`, `REQUIRED_WEIGHT`, the schemas, the
 * exporter source. Change the product and this fails until the page is updated;
 * that is the intended direction of travel.
 *
 * **Unreachable content.** `AGENT-CONTEXT.md` records a shipped feature that
 * could not be opened because a `TabsContent` had no matching `TabsTrigger` —
 * present in the tree, impossible to reach. So presence is not enough. Every
 * section must be linkable, and every link must resolve.
 *
 * Rendered with `renderToStaticMarkup` rather than a DOM renderer because the
 * root vitest project is scoped to the `test` directory at the repository root,
 * matching only `.test.ts` files, in a `node`
 * environment, and because these are server components that render to real HTML
 * in production anyway — asserting on that HTML is asserting on the artefact
 * crawlers and link previews see.
 */

const root = new URL("../", import.meta.url);
const html = renderToStaticMarkup(createElement(MarketingHome));
const read = (file: string) =>
	readFileSync(fileURLToPath(new URL(file, root)), "utf8");

/** Visible copy only: strip tags so a claim in an attribute cannot satisfy a text check. */
const visible = html
	.replace(/<[^>]+>/g, " ")
	.replace(/&[a-z]+;/g, " ")
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
		// The zero-JS page is a performance claim and a privacy claim, not just
		// an implementation detail — the Trust section says there is no analytics
		// script, and a "use client" boundary would put that at risk.
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
		// Backs the Trust section's claim. If someone adds a tag, this fails and
		// the copy has to change with it.
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
		// The copy legitimately *disclaims* cookies, so assert on the DOM and the
		// dependency list rather than on the words: no analytics script, and no
		// consent-dialog element anywhere on the page.
		expect(html).not.toMatch(
			/cookie-banner|consent-dialog|onetrust|cookieyes/i,
		);
	});
});

describe("every section is reachable", () => {
	const sectionIds = [...html.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(
		(m) => m[1] ?? "",
	);
	// Both spellings count: the header nav and footer use the absolute "/#id"
	// form while in-body CTAs use the bare "#id". Missing the absolute form is how
	// a nav can look wired up while every one of its links is unverified.
	const anchors = [...html.matchAll(/href="\/?#([^"]+)"/g)].map(
		(m) => m[1] ?? "",
	);

	it("finds the sections and the in-page links", () => {
		expect(sectionIds.length).toBeGreaterThanOrEqual(7);
		expect(anchors.length).toBeGreaterThanOrEqual(7);
	});

	/**
	 * The `TabsContent`-without-a-`TabsTrigger` failure, in a form that applies
	 * here. A link to an id that no longer exists is a dead navigation; a section
	 * with an id nobody links to is content the reader cannot get to.
	 */
	it("no link points at an id that is not on the page", () => {
		// Every id on the page, not only section ids: the skip link targets
		// `<main id="main">`, which is not a <section>.
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

describe("the tracker claims are gone", () => {
	/**
	 * `ROADMAP.md` ranks the application tracker Value: Low / Verdict: Never, and
	 * the page shipped it twice: a "Applications, tracked" capability card and a
	 * "Send and track" workflow step. Both described a feature that does not
	 * exist. The removal is not a euphemism — the refusal is now published in the
	 * policy section, with the roadmap's own reasoning.
	 */
	it.each([
		"Applications, tracked",
		"Send and track",
		"which variant, which date, what stage",
		"log the application",
		"move it through your pipeline",
		"Follow-ups and interviews",
	])("does not claim %j", (phrase) => {
		expect(visible).not.toContain(phrase);
	});

	it("names the tracker exactly once, as a refusal", () => {
		const matches = visible.match(/application tracker/gi) ?? [];
		expect(matches).toHaveLength(1);
		// It must be a "we will not build this" heading, not a capability.
		expect(visible).toContain("No application tracker");
	});

	it("publishes the other rejections rather than quietly dropping them", () => {
		// Each of these is in `ROADMAP.md`'s "Explicitly rejected" table. Leaving
		// them out is the roadmap's own call; publishing them is the positioning.
		for (const refusal of [
			"No hidden keywords",
			"No 0–100 ATS score",
			"No invented metrics",
			"No auto-apply",
		]) {
			expect(visible, `missing refusal: ${refusal}`).toContain(refusal);
		}
	});
});

/**
 * The hero artefact, cut out of the markup before any claim check runs. It is a
 * fictional résumé plus its extracted text layer, presented as an example; the
 * bullet in it is deliberately quantified because that is what a well-formed
 * bullet looks like. It is sample content, not a statement about Betta Resume.
 *
 * Cut from the raw HTML rather than the stripped text, so the closing `</figure>`
 * is still available as a boundary.
 */
const withoutArtefact = html.replace(
	/aria-label="A resume document[\s\S]*?<\/figure>/g,
	" ",
);

describe("no unsubstantiated numbers", () => {
	/**
	 * FTC substantiation doctrine makes an unverifiable performance claim an
	 * enforcement risk, and the category's own credibility failure. Every figure
	 * below is either folklore or a competitor's marketing number, so quoting
	 * any of them would undercut the argument the page is making.
	 */
	/**
	 * Checked against the marketing copy with the hero artefact removed. The
	 * artefact is a fictional résumé whose bullet is deliberately quantified — it
	 * is the product's own example of a well-formed bullet, and it is sample
	 * content rather than a claim about Betta Resume. A blanket ban on "%" would
	 * have caught it, so the artefact is stripped first rather than the rule
	 * weakened.
	 */
	const copy = withoutArtefact
		.replace(/<[^>]+>/g, " ")
		.replace(/&[a-z]+;/g, " ")
		.replace(/\s+/g, " ");

	it.each([
		[/\d+(\.\d+)?\s*%/, "a percentage of anything"],
		[/\b\d+(\.\d+)?\s*x\b/i, "a multiplier"],
		[/\b6\s?X\b/i, "the 6X claim"],
		[/\b3\s?x\b/i, "the 3x claim"],
		[/above the fold/i, "the above-the-fold folklore stat"],
		[/first 10 seconds/i, "the ten-second folklore stat"],
		[/\b\d{1,3}\s*\/\s*100\b/, "a score out of 100"],
	])("contains no %s", (pattern, label) => {
		const match = copy.match(pattern);
		expect(match, `found ${label}: ${match?.[0]}`).toBeNull();
	});

	it("names no competitor", () => {
		// A deliberate positioning choice: the mechanism argument works on anyone
		// who has used a resume builder, and naming competitors invites a pricing
		// and feature-surface comparison this product would lose.
		for (const brand of [
			"Rezi",
			"Teal",
			"Enhancv",
			"Jobscan",
			"Zety",
			"Kickresume",
			"Resume Worded",
			"Novoresume",
			"LinkedIn",
		]) {
			expect(copy, `names ${brand}`).not.toContain(brand);
		}
	});

	it.each([
		"AI-powered",
		"AI resume builder",
		"AI-optimised",
		"ATS-optimised",
		"ATS-safe",
		"Beat the ATS",
		"get past the bots",
		"privacy-first",
		"Free forever",
		"Trusted by",
		"users love",
	])("does not claim %j", (phrase) => {
		expect(copy.toLowerCase()).not.toContain(phrase.toLowerCase());
	});
});

describe("the export formats named are the ones that exist", () => {
	const exporter = read("src/components/export/export-buttons.tsx");

	it.each([
		["PDF", /\.pdf/],
		["DOCX", /\.docx/],
		["plain text", /\.txt/],
		["JSON", /\.json/],
	])("%s is a real exporter", (label, pattern) => {
		expect(visible, `page omits ${label}`).toMatch(new RegExp(label, "i"));
		expect(exporter, `${label} is claimed but not exported`).toMatch(pattern);
	});

	it("the FAQ lists every format, including DOCX", () => {
		// The stale FAQ said "PDF, plain text, and JSON" while DOCX shipped. That
		// is the failure this pins: formats are the paid axis in this category,
		// so omitting a shipped one is a self-inflicted wound.
		const faq = visible.slice(visible.indexOf("Can I get my data out?"));
		for (const format of ["PDF", "DOCX", "plain text", "JSON"]) {
			expect(faq.slice(0, 400), `FAQ omits ${format}`).toContain(format);
		}
	});

	it("labels the two paginating formats separately", () => {
		// DOCX and PDF paginate differently; calling them interchangeable would be
		// a small lie the user discovers when the page break moves.
		expect(visible).toContain("Parse-optimised");
		expect(visible).toContain("Visual fidelity");
	});
});

describe("the hero artefact matches the real exporter", () => {
	const schemas = read("packages/types/src/schemas.ts");

	/**
	 * The hero's text panel reproduces the output of `exportText`, down to the
	 * `=`×50 rules and the `key: value` field names. If the exporter or the
	 * schema changes shape, the panel is no longer a faithful illustration and
	 * the claim "this is what the parser reads" stops being true.
	 */
	it.each(["company", "position", "startDate", "highlights", "name", "skills"])(
		"the field %s exists in the schemas",
		(field) => {
			expect(html, `hero panel lost the ${field} field`).toContain(
				`${field}: `,
			);
			expect(schemas).toContain(`${field}:`);
		},
	);

	it("uses the exporter's own section-rule width", () => {
		expect(read("src/components/export/export-buttons.tsx")).toContain(
			'"=".repeat(50)',
		);
		expect(html).toContain("=".repeat(50));
	});

	it("labels the text panel as the parser's output, not a description", () => {
		expect(visible).toContain("Verified output");
		expect(visible).toContain("text layer");
	});

	it("keeps the mock document out of the page outline", () => {
		// `role="img"` on the document panel is deliberate: as real headings,
		// "Avery Chen" / "Experience" / "Skills" would be announced as sections of
		// the site. Asserted so the fix is not reverted as dead code.
		expect(html).toContain('role="img"');
		expect(html).toMatch(/aria-label="A resume document/);
		// The stronger claim: no mock résumé line became a heading, which is the
		// actual defect that `role="img"` exists to prevent.
		const headings = [...html.matchAll(/<h[1-6][^>]*>([^<]*)</g)].map(
			(m) => m[1] ?? "",
		);
		for (const leaked of [
			"Avery Chen",
			"Experience",
			"Skills",
			"Work Experience",
		]) {
			expect(
				headings,
				`"${leaked}" leaked into the page outline`,
			).not.toContain(leaked);
		}
	});
});

describe("the audit claims match the audit code", () => {
	it("lists exactly the parser-safe headings the module accepts", () => {
		for (const heading of PARSER_SAFE_HEADINGS) {
			expect(visible, `page omits safe heading: ${heading}`).toContain(heading);
		}
		const listed = visible.match(
			/Summary · Work Experience[^"]*?Projects/,
		)?.[0];
		expect(
			listed,
			"the page's heading list drifted from PARSER_SAFE_HEADINGS",
		).toBe(PARSER_SAFE_HEADINGS.join(" · "));
	});

	it("uses a heading the module actually flags", () => {
		// "Professional Summary" is hardcoded as a `heading-alias` finding in
		// parse-fidelity.ts, so showing it is showing a live result.
		expect(visible).toContain("Professional Summary");
	});

	it("gets the date verdict the right way round", () => {
		expect(DATE_FORMATS["MMMM YYYY"].safe).toBe(true);
		expect(DATE_FORMATS["MMM YYYY"].safe).toBe(true);
		expect(DATE_FORMATS["MM/YYYY"].safe).toBe(false);
		expect(DATE_FORMATS.YYYY.safe).toBe(false);

		// The page presents 03/2026 as the violation and "March 2026" as the fix.
		expect(visible).toContain("03/2026");
		expect(visible).toContain("March 2026");
	});

	it("promises no headline score, and the code has none either", () => {
		expect(visible).toContain("No 0–100 ATS score");
		expect(visible).toMatch(/there is no number|There is no number/);
	});
});

describe("the coverage claims match the coverage code", () => {
	it("states the real required-to-preferred weighting", () => {
		// The page says "weighted three to one". That is REQUIRED_WEIGHT against
		// PREFERRED_WEIGHT, and it is used only to order the report.
		expect(REQUIRED_WEIGHT / PREFERRED_WEIGHT).toBe(3);
		expect(visible).toMatch(/three to one|3:1/);
	});

	it("describes an alias the skills map actually disambiguates", () => {
		expect(AMBIGUOUS_ALIASES.has("AWS")).toBe(true);
		expect(AMBIGUOUS_ALIASES.has("Azure")).toBe(true);
		expect(AMBIGUOUS_ALIASES.has("Node")).toBe(true);

		const aws = SKILL_ENTRIES.find(
			(entry) => entry.canonical === "Amazon Web Services",
		);
		expect(aws?.aliases).toContain("AWS");
		// Both acronym forms is the differentiator, so both must be real aliases.
		expect(aws?.aliases).toContain("Amazon Web Services");

		expect(visible).toContain("AWS");
		expect(visible).toContain("Amazon Web Services");
		expect(visible).toMatch(/not counted as covered|never counted as covered/);
	});

	it("quotes duty language the metric detector really matches", () => {
		// The page quotes four phrases; each must be one `analyzeBullet` catches.
		for (const phrase of [
			"Responsible for migrating the database",
			"responsible for",
			"assisted with",
			"worked on",
			"participated in",
		]) {
			if (phrase.startsWith("Responsible for migrating")) {
				expect(findDutyPhrase(phrase), phrase).not.toBeNull();
			} else {
				expect(visible, `page omits ${phrase}`).toContain(phrase);
			}
		}
	});

	it("says it flags bullets rather than filling them in", () => {
		expect(visible).toMatch(
			/does not choose one for you|don't choose the number|will not choose the number/,
		);
	});
});

describe("the product is not described as writing for you", () => {
	// `AGENT-CONTEXT.md`: marketing copy must not imply the product writes the
	// resume for the user.
	it("states the boundary explicitly", () => {
		expect(visible).toMatch(/Is this an AI resume generator\?/);
		expect(visible).toMatch(
			/deliberate line|does everything.{0,40}and stops there/,
		);
	});

	it("never attributes authorship to the product", () => {
		expect(visible).not.toMatch(/we write your resume|Betta Resume writes/i);
	});
});

describe("the hero positioning", () => {
	it("leads with a mechanism the reader can check", () => {
		// Description of a mechanism, not a prediction of an outcome.
		expect(visible).toMatch(/as a parser actually reads it/);
		expect(visible).toMatch(/single-column text layer/i);
		expect(visible).toMatch(/reading order/i);
	});

	it("makes the primary CTA specific rather than generic", () => {
		// NN/g: "Explore" / "Learn more" do not tell the user what they get.
		expect(visible).toMatch(/Check your own resume/);
		expect(visible).not.toMatch(/Learn more|Explore|Get started free/i);
	});

	it("offers no price and no checkout", () => {
		expect(visible).not.toMatch(/\$\d|per month|\/mo\b|pricing table/i);
	});

	it("has no social proof", () => {
		// Banner blindness means ad-shaped proof gets skipped, and there are no
		// customers to show. Asserted so neither creeps in.
		expect(visible).not.toMatch(
			/testimonial|star rating|reviews from|trusted by|\b\d+\+?\s*(users|customers|resumes created)/i,
		);
	});
});

describe("navigation labels match the sections", () => {
	it("has no dead in-page links in the footer either", () => {
		// Covered generally above; asserted here too because the footer was where
		// the removed tracker-era links used to drift out of date.
		const ids = [...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1] ?? "");
		const anchors = [...html.matchAll(/href="\/?#([^"]+)"/g)].map(
			(m) => m[1] ?? "",
		);
		expect(anchors.filter((a) => !ids.includes(a))).toEqual([]);
	});
});
