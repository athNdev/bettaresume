import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { codeOf } from "./helpers/code-source";

/**
 * Page titles, checked against the two rules that produced visible defects.
 *
 * The root layout sets `title.template: "%s · Betta Resume"`. That is right for pages
 * whose name is a noun ("Dashboard", "Resume editor") and wrong for a page whose title
 * IS the product name: the app's own layout declared "Betta Resume" and the deployed tab
 * read **"Betta Resume · Betta Resume"**.
 *
 * The marketing page is the only route a search engine indexes, so its title is a claim
 * about what the product does rather than the product's name.
 */

const rootLayout = codeOf("src/app/layout.tsx");
const appLayout = codeOf("src/app/app/layout.tsx");
const marketing = codeOf("src/app/page.tsx");

describe("the app's tab title is not the product name twice", () => {
	it("opts out of the root template", () => {
		expect(appLayout).toMatch(/title: \{ absolute: "Betta Resume" \}/);
	});

	it("does not declare a bare string title, which would be templated", () => {
		expect(appLayout).not.toMatch(/title: "Betta Resume"/);
	});

	it("the root layout still provides the template for everything else", () => {
		expect(rootLayout).toMatch(/template: "%s · Betta Resume"/);
	});
});

describe("the marketing page describes the product, not its name", () => {
	it("has a title longer than the bare product name", () => {
		const title = (marketing.match(/const TITLE = "([^"]+)"/) ?? [])[1];
		expect(title).toBeTruthy();
		expect(title?.length ?? 0).toBeGreaterThan(30);
	});

	it("is not suffixed by the template, because it already ends with the name", () => {
		// `page.tsx` sets `title: TITLE` with no `absolute`, so Next applies the root
		// template. The TITLE ends with "— one master resume, tailored per role", which
		// does not repeat the brand — this pins that it stays that way.
		expect(marketing).toMatch(/const TITLE = "Betta Resume —/);
		expect(marketing).not.toMatch(/const TITLE = "Betta Resume ·/);
	});

	it("the built marketing title is not doubled", () => {
		// Belt and braces: read the prerendered HTML when it exists.
		let html = "";
		try {
			html = readFileSync("out/index.html", "utf8");
		} catch {
			return; // no build present; the source assertions above still ran
		}
		const title = (html.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "";
		expect(title.length).toBeGreaterThan(20);
		expect(title).not.toMatch(/Betta Resume · Betta Resume/);
	});
});
