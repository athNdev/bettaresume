#!/usr/bin/env node

/**
 * Visual/console gate: load the built site in a real browser and fail on any console
 * error, page error, or failed same-origin request.
 *
 * ## Why this exists
 *
 * Every previous verification in this repo asserted over source text or over a string
 * returned by `renderToStaticMarkup`. Nothing ever loaded a page. That gap was not
 * theoretical — the production landing page shipped with two defects that 1,031 tests
 * passed straight through:
 *
 *   - six `Encountered two children with the same key, 1` errors on every load
 *   - React error #418, a hydration mismatch, visible only as a minified string
 *
 * React keys are not present in HTML output and `renderToStaticMarkup` does not
 * validate them, so neither defect is reachable from a unit test. Only a browser sees
 * them. Note the split, though, because it decides which guard owns which defect:
 *
 *   - **Hydration mismatches, missing resources and blank pages** are real errors in a
 *     production build, so this gate owns them.
 *   - **Duplicate React keys are stripped from production React.** They are a
 *     development-only warning, so a build that renders perfectly clean here can still
 *     ship one. `test/marketing-keys.test.ts` is the only guard for those, which is why
 *     it exists and why deleting it would quietly reopen a class of bug.
 *
 * ## Why Playwright is installed inside the job, not as a devDependency
 *
 * `docs/AGENT-CONTEXT.md` §2.1: caret ranges in this repo stalled every Dependabot PR
 * with `ERESOLVE`, and every lockstep package is now pinned exactly. Adding a browser
 * automation dependency to the root `package.json` re-enters that fight for a tool that
 * is not needed to build or ship the product. So CI installs it with `--no-save` at an
 * exact version, which never touches the lockfile.
 *
 * ## Usage
 *
 *   node scripts/visual-audit.mjs --url https://example.com
 *   node scripts/visual-audit.mjs --serve ./out --url http://127.0.0.1:4173
 *
 * Exits 1 if the gate fails. Always writes a report and a screenshot.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { startServer } from "./static-server.mjs";

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
	const i = argv.indexOf(name);
	return i === -1 ? fallback : argv[i + 1];
};

const BASE = arg("--url", "http://127.0.0.1:4173");
const SERVE_DIR = arg("--serve", null);
const OUT_DIR = arg("--out", "/tmp/visual-audit");
const SHOTS = (arg("--paths", "/") || "/")
	.split(",")
	.map((s) => s.trim())
	.filter(Boolean);

/**
 * Allowlist of failure signatures, each with the reason it cannot be a product defect.
 * Keep this list short. An entry here is a decision to stop looking, so every line
 * needs a reason that would still read true in six months.
 */
const ALLOWED = [
	{
		pattern: /Download the React DevTools/i,
		reason: "dev-only banner, absent from production builds",
	},
	{
		pattern: /was preloaded using link preload but not used/i,
		reason:
			"Next emits a warning for fonts it preloads speculatively; no visual effect",
	},
	{
		pattern: /favicon/i,
		reason:
			"browsers request /favicon.ico unprompted; absence is not an app defect",
	},
	{
		// Next emits `<link rel="prefetch">` for routes linked on the page. The browser
		// aborts those speculative HEADs when the document finishes loading, which is
		// the browser declining a request it no longer needs -- not a failure. Observed
		// on the deployed landing page for both `/` and `/app/`. Scoped to HEAD so a real
		// GET failure still fails the gate.
		pattern: /^HEAD \S+ :: net::ERR_ABORTED$/,
		reason: "browser aborts a speculative prefetch it no longer needs",
	},
];

function allowed(text) {
	return ALLOWED.find((a) => a.pattern.test(text));
}

let server = null;
let target = BASE;
if (SERVE_DIR) {
	const s = await startServer(SERVE_DIR);
	server = s.server;
	target = `http://127.0.0.1:${s.port}`;
}

mkdirSync(OUT_DIR, { recursive: true });

let chromium;
try {
	({ chromium } = await import("playwright"));
} catch {
	console.error(
		"playwright is not installed. Run: npm install --no-save --no-audit playwright@1.63.0",
	);
	if (server) server.close();
	process.exit(2);
}

const browser = await chromium.launch({
	args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const report = [];
let failed = false;

for (const path of SHOTS) {
	const ctx = await browser.newContext({
		viewport: { width: 1280, height: 900 },
	});
	const page = await ctx.newPage();

	const errors = [];
	const warnings = [];

	page.on("console", (m) => {
		const text = m.text();
		if (allowed(text)) return;
		if (m.type() === "error") errors.push(text);
		else if (m.type() === "warning") warnings.push(text);
	});
	page.on("pageerror", (e) => {
		const text = String(e);
		if (!allowed(text)) errors.push(text);
	});
	page.on("requestfailed", (r) => {
		const text = `${r.method()} ${r.url()} :: ${r.failure()?.errorText}`;
		if (!allowed(text)) errors.push(text);
	});
	page.on("response", (r) => {
		// A 4xx/5xx on the page's own origin is a defect. Third-party origins are
		// reported but not failed: a bot challenge on an auth provider is not
		// something this repo can fix, and failing on it would make the gate flaky.
		const url = r.url();
		const own = url.startsWith(target);
		if (r.status() >= 400 && own) errors.push(`HTTP ${r.status()} ${url}`);
		else if (r.status() >= 400)
			warnings.push(`HTTP ${r.status()} ${url} (third party)`);
	});

	const url = new URL(path, target).toString();
	const entry = { path, url, errors, warnings, status: null };

	try {
		const resp = await page.goto(url, { waitUntil: "load", timeout: 45000 });
		entry.status = resp?.status() ?? null;
		// Give hydration a chance to run and fail; the mismatch surfaces here.
		await page.waitForTimeout(3000);
		entry.title = await page.title();
		entry.h1 = await page
			.locator("h1")
			.first()
			.textContent()
			.catch(() => null);
		entry.textLength = await page.evaluate(
			() => document.body?.innerText?.trim().length ?? 0,
		);
		entry.landmarks = await page.evaluate(() => ({
			main: document.querySelectorAll("main").length,
			h1: document.querySelectorAll("h1").length,
			links: document.querySelectorAll("a[href]").length,
		}));
		const slug =
			path === "/"
				? "index"
				: path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
		entry.screenshot = `${OUT_DIR}/${slug}.png`;
		await page.screenshot({ path: entry.screenshot, fullPage: true });
	} catch (e) {
		entry.errors.push(`navigation failed: ${String(e).split("\n")[0]}`);
	}

	if (entry.status !== null && entry.status >= 400) {
		entry.errors.push(`page returned HTTP ${entry.status}`);
	}
	if ((entry.textLength ?? 0) < 200) {
		entry.errors.push(
			`page rendered only ${entry.textLength ?? 0} characters of text — it is probably blank or an error page`,
		);
	}
	if (entry.landmarks && entry.landmarks.main === 0) {
		entry.errors.push(
			"no <main> landmark: the page has no declared main region",
		);
	}

	report.push(entry);
	if (entry.errors.length > 0) failed = true;

	console.log(
		`${entry.errors.length === 0 ? "PASS" : "FAIL"} ${path.padEnd(24)} ` +
			`status=${entry.status} text=${entry.textLength ?? 0} ` +
			`errors=${entry.errors.length} warnings=${entry.warnings.length}`,
	);
	for (const e of entry.errors) console.log(`    error:   ${e.slice(0, 240)}`);
	for (const w of entry.warnings.slice(0, 5))
		console.log(`    warning: ${w.slice(0, 200)}`);

	await ctx.close();
}

await browser.close();
if (server) server.close();

writeFileSync(`${OUT_DIR}/report.json`, JSON.stringify(report, null, 2));
console.log(`\nreport: ${OUT_DIR}/report.json`);
console.log(
	`allowlist (${ALLOWED.length}):\n` +
		ALLOWED.map((a) => `  - ${a.pattern} — ${a.reason}`).join("\n"),
);

if (failed) {
	console.error("\nvisual audit FAILED — see above");
	process.exit(1);
}
console.log("\nvisual audit passed");
