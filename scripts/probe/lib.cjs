/**
 * Browser harness for the app itself.
 *
 * Every other gate in this repo reads source, or the prerendered marketing page. The
 * dashboard and editor have never been driven by a browser, which is how a section form
 * could discard an edit and a template could be invisible before you picked it.
 *
 * Uses the dev auth bypass: `NEXT_PUBLIC_DEV_MODE=true` in `.env.local` plus
 * `NEXT_PUBLIC_API_URL` pointing at `wrangler dev` (port 4100 on this host) with
 * `ENVIRONMENT=development`, so `x-dev-mode: true` is honoured and the seeded `user-1`
 * data is reachable without Clerk.
 *
 * Launch with `channel: "chrome"`: this host has Chrome installed but not Playwright's
 * bundled Chromium, and `channel` is the difference between "works" and
 * "Executable doesn't exist".
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const OUT = path.join(__dirname, "..", "..", ".probe-shots");
fs.mkdirSync(OUT, { recursive: true });

/** Console messages that are not product defects. Keep this list short and justified. */
const NOISE = [
	/Download the React DevTools/i,
	/\[Fast Refresh\]/i,
	/WebSocket connection to .* failed/i, // next dev HMR
	/Clerk has been loaded with development keys/i,
	/failed to load resource: net::err_(connection|name)/i, // Clerk CDN under the bypass
];

const isNoise = (text) => NOISE.some((re) => re.test(text));

async function launch() {
	return chromium.launch({ headless: true, channel: "chrome" });
}

async function newPage(browser, { width = 1440, height = 900 } = {}) {
	const ctx = await browser.newContext({
		viewport: { width, height },
		acceptDownloads: true,
	});
	const page = await ctx.newPage();
	const errors = [];
	const warnings = [];

	page.on("console", (msg) => {
		const text = msg.text();
		if (msg.type() === "error" && !isNoise(text)) errors.push(text);
		else if (msg.type() === "warning" && !isNoise(text)) warnings.push(text);
	});
	page.on("pageerror", (err) => {
		if (!isNoise(String(err))) errors.push(`pageerror: ${err.message}`);
	});
	page.on("requestfailed", (req) => {
		const text = `${req.method()} ${req.url()} :: ${req.failure()?.errorText}`;
		if (!isNoise(text)) errors.push(text);
	});
	page.on("response", (res) => {
		const url = res.url();
		if (res.status() >= 400 && url.startsWith(BASE)) {
			errors.push(`HTTP ${res.status()} ${url}`);
		}
	});

	return { ctx, page, errors, warnings };
}

async function shoot(page, name, fullPage = false) {
	const file = path.join(OUT, `${name}.png`);
	await page.screenshot({ path: file, fullPage });
	return file;
}

/** Navigate and wait for the app to settle. */
async function goto(page, route, { wait = 2500 } = {}) {
	const url = route.startsWith("http") ? route : `${BASE}${route}`;
	await page.goto(url, { waitUntil: "load", timeout: 60000 });
	await page.waitForTimeout(wait);
}

/** Body text, for asserting a screen is not blank. */
async function bodyText(page) {
	return page.evaluate(() => document.body?.innerText ?? "");
}

/**
 * Open a resume from the dashboard.
 *
 * The card title is the announced control — its own text is the accessible name — and the
 * preview beside it is a pointer-only duplicate that `aria-hidden` keeps out of the tab
 * order. That duplicate is also a `<button>` whose text is the whole rendered document, so
 * this picks the short buttons: everything else in `main` is a filter or an action.
 */
async function openResume(page, index = 0) {
	const titles = page
		.locator("main button")
		.filter({ hasNotText: /^(All templates|Show archived|Create Your First Resume|Import)/ });
	const count = await titles.count();
	const names = [];
	for (let i = 0; i < count; i++) {
		const text = ((await titles.nth(i).innerText()) ?? "").trim();
		if (text.length > 0 && text.length < 80) names.push(i);
	}
	const target = names[index];
	if (target === undefined) {
		throw new Error(`no resume card at index ${index} (found ${names.length})`);
	}
	await titles.nth(target).click();
}

/**
 * Wait until the editor's own chrome is on screen.
 *
 * Was `/SECTIONS/` in body text, which broke below `lg`: the outline lives in the
 * "Sections" mode, that mode starts hidden (the form is the default), and hidden
 * subtrees are not in `innerText`. The shell attribute is true in every mode.
 */
async function waitForEditor(page, timeout = 30000) {
	await page.waitForSelector("[data-editor-shell]", {
		state: "attached",
		timeout,
	});
}

/** Every interactive control's accessible name, so a pass can name what it is missing. */
async function controls(page) {
	return page.evaluate(() =>
		[...document.querySelectorAll("button, a[href], [role=button]")]
			.map((el) => ({
				tag: el.tagName.toLowerCase(),
				text: (el.innerText || el.getAttribute("aria-label") || "")
					.trim()
					.slice(0, 60),
				disabled: el.hasAttribute("disabled"),
			}))
			.filter((c) => c.text.length > 0),
	);
}

module.exports = {
	BASE,
	OUT,
	launch,
	newPage,
	shoot,
	goto,
	bodyText,
	controls,
	isNoise,
	openResume,
	waitForEditor,
};
