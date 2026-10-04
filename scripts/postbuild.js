import {
	copyFileSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

// Copy custom 404.html for GitHub Pages SPA support
copyFileSync("public/404.html", "out/404.html");
console.log("✓ Copied 404.html for GitHub Pages SPA redirect");

/**
 * Disable Cloudflare Email Address Obfuscation on the generated pages.
 *
 * ## The bug this fixes
 *
 * The deployed site served React error #418 — a hydration mismatch — on every single
 * page load. It was not a React bug and not a code bug.
 *
 * Cloudflare's Email Address Obfuscation (a Scrape Shield feature) rewrites any email
 * address it finds in the HTML it serves. The landing page contains a demo address in
 * two places, so the *served* HTML contained:
 *
 *     <a href="/cdn-cgi/l/email-protection" class="__cf_email__"
 *        data-cfemail="99f8effc...">[email&#160;protected]</a> · +49 30 555 0142 · Berlin
 *
 * while React's client tree expected the literal string `avery@chen.dev`. Two different
 * trees, so React discarded the server markup and re-rendered — logging #418 for every
 * visitor, and discarding whatever the server had rendered for that subtree.
 *
 * Confirmed by diffing the served HTML against the hydrated DOM: the only text that
 * differed was the obfuscated email, plus a text-node offset caused by the `<a>` element
 * Cloudflare injected where React had rendered a plain string.
 *
 * ## Why opt out rather than work around it
 *
 * `suppressHydrationWarning` does not help. Cloudflare injects an *element* where React
 * rendered a string, which is a structural difference, and that directive only covers
 * text and attribute differences one level deep.
 *
 * The demo address is fictional sample content on a marketing page, not a secret. And the
 * alternative — turning obfuscation off for the zone in the Cloudflare dashboard — needs
 * dashboard access, which an agent cannot reach. `<!--email_off-->` is Cloudflare's
 * documented per-page opt-out and needs no dashboard access, so the fix lives in the
 * repository where it is reviewable and survives a redeploy.
 *
 * ## What it costs
 *
 * The email addresses become plain text in the served HTML. That is normal for a public
 * marketing page and is what crawlers want anyway; obfuscation protects an address from
 * naive scrapers, which is not a threat model worth a hydration error on every page load.
 */
const OFF = "<!--email_off-->";

/** @param {string} dir @returns {string[]} */
function htmlFiles(dir) {
	/** @type {string[]} */
	const found = [];
	for (const entry of readdirSync(dir)) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
		else if (entry.endsWith(".html")) found.push(full);
	}
	return found;
}

const pages = htmlFiles("out");
let patched = 0;

for (const page of pages) {
	const html = readFileSync(page, "utf8");
	if (html.includes(OFF)) continue;
	// Immediately after <head> so the marker is seen before any body content.
	const patchedHtml = html.includes("<head>")
		? html.replace("<head>", `<head>${OFF}`)
		: html.replace("<html", `<html>${OFF}`);
	if (patchedHtml === html) continue;
	writeFileSync(page, patchedHtml);
	patched++;
}

console.log(
	`✓ Disabled Cloudflare email obfuscation on ${patched}/${pages.length} generated pages`,
);
