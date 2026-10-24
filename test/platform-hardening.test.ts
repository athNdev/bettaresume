import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

/**
 * Wave 5 is the platform layer: the things a visitor, a crawler or an operator sees
 * when they are not looking at the UI.
 *
 * Two of these tests exist because the defect they pin had already shipped:
 *
 * 1. The canonical origin was `https://athndev.github.io/bettaresume` while
 *    production is served from `app.bettaresume.com`. Every canonical, sitemap entry
 *    and OG URL pointed at the redirecting host — the exact duplicate-origin signal a
 *    canonical tag exists to prevent.
 * 2. The generated card was emitted at `/opengraph-image`, extensionless. GitHub Pages
 *    types an extensionless file as `application/octet-stream`, and crawlers check the
 *    extension before `og:image:type`, so the card would never unfurl.
 */

const read = (p: string) => readFileSync(p, "utf8");

const site = codeOf("src/lib/site.ts");
const layout = codeOf("src/app/layout.tsx");
const page = codeOf("src/app/page.tsx");
const sitemap = codeOf("src/app/sitemap.ts");
const robots = codeOf("src/app/robots.ts");
const ogRoute = codeOf("src/app/og.png/route.tsx");
const backup = read(".github/workflows/backup.yml");
const backupDoc = read("docs/BACKUP.md");

describe("one canonical origin, in one place", () => {
	it("defaults to the production custom domain", () => {
		expect(site).toMatch(/https:\/\/app\.bettaresume\.com/);
		expect(site).not.toMatch(/athndev\.github\.io/);
	});

	it("every metadata route imports it rather than repeating it", () => {
		for (const source of [layout, sitemap, robots]) {
			expect(source).toMatch(/from "@\/lib\/site"/);
			// A second copy of the fallback is how the first one went stale.
			expect(source).not.toMatch(/NEXT_PUBLIC_SITE_URL\n?\s*\?\?/);
		}
	});

	it("the marketing page's canonical is the custom domain", () => {
		expect(page).toMatch(/alternates: \{ canonical: "\/" \}/);
	});
});

describe("the link-preview card", () => {
	it("is generated into a path that ends in .png", () => {
		// The directory name IS the URL. `/opengraph-image` has no extension.
		expect(ogRoute.length).toBeGreaterThan(0);
		expect(read("src/lib/site.ts")).toMatch(/url: "\/og\.png"/);
	});

	it("is generated at build time, since the export has no server", () => {
		expect(ogRoute).toMatch(/export const dynamic = "force-static"/);
		expect(ogRoute).toMatch(/export function GET\(\)/);
	});

	it("is described by the page and the root layout both", () => {
		// A page that declares `openGraph` replaces the parent object rather than
		// merging into it. The marketing page shipped one without `images` and lost
		// the card entirely.
		expect(layout).toMatch(/images: \[OG_IMAGE\]/);
		expect(page).toMatch(/images: \[OG_IMAGE\]/);
	});

	it("its alt text comes from the same constant the metadata uses", () => {
		expect(site).toMatch(/export const OG_IMAGE/);
		expect(site).toMatch(/alt: OG_ALT/);
	});

	it("the words on the card match the product's promise", () => {
		// Marketing copy is pinned deliberately; see test/marketing-claims.test.ts.
		const route = read("src/app/og.png/route.tsx");
		expect(route).toMatch(/One master resume\./);
		expect(route).toMatch(/Tailored per role\./);
		// No composite grade, the constraint the whole product is built around.
		expect(route).not.toMatch(/\b\d{1,3}\s*(\/\s*100|out of 100)\b/i);
		// And it points at the origin that actually serves the app.
		expect(route).toMatch(/app\.bettaresume\.com/);
	});
});

describe("the nightly backup can actually be restored", () => {
	it("runs on a schedule and on demand", () => {
		expect(backup).toMatch(/schedule:/);
		expect(backup).toMatch(/workflow_dispatch:/);
	});

	it("polls the export until it completes", () => {
		// D1 documents that an in-progress export which stops being polled is
		// cancelled, so a single request would silently produce nothing.
		expect(backup).toMatch(/output_format.*polling/);
		expect(backup).toMatch(/current_bookmark/);
		expect(backup).toMatch(/at_bookmark/);
	});

	it("disables foreign keys when loading, and checks them afterwards", () => {
		// D1 emits `Section` before `Resume`, so its INSERTs name a parent that does
		// not exist yet and SQLite refuses to prepare them with enforcement on.
		expect(backup).toMatch(/PRAGMA foreign_keys=OFF;/);
		expect(backup).toMatch(/PRAGMA foreign_key_check;/);
	});

	it("refuses to archive a backup whose core tables are empty", () => {
		expect(backup).toMatch(/for table in User Resume Section/);
		expect(backup).toMatch(/Refusing to archive an empty backup/);
	});

	it("keeps the artifact long enough to matter", () => {
		expect(backup).toMatch(/retention-days: 90/);
	});

	it("fails loudly on the D1 scope error that blocks deploys too", () => {
		expect(backup).toMatch(/7403/);
	});

	it("the runbook states the non-obvious part of a restore", () => {
		// If the doc loses this, the next person restores with foreign keys on and
		// gets `no such table: main.Resume` with no explanation.
		expect(backupDoc).toMatch(/foreign keys disabled/i);
		expect(backupDoc).toMatch(/no such table: main\.Resume/);
	});

	it("the runbook says to take a fresh export before overwriting production", () => {
		expect(backupDoc).toMatch(/fresh\*{0,2} export of the current production/i);
	});

	it("the runbook is honest about what is not covered", () => {
		expect(backupDoc).toMatch(/not\*{0,2} covered/i);
		expect(backupDoc).toMatch(/point-in-time/i);
	});
});
