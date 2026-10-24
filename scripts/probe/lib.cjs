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
 * The preview is a `<button aria-hidden tabindex=-1>` — a redundant pointer target beside
 * the card title, which is the announced control. Clicking the thumbnail mirrors what a
 * mouse user does; the title is what a keyboard user would use.
 */
async function openResume(page, index = 0) {
	const thumbs = page.locator('button[aria-hidden="true"][tabindex="-1"]');
	await thumbs.nth(index).click();
}

/** Wait until the editor's own chrome is on screen. */
async function waitForEditor(page, timeout = 30000) {
	await page.waitForFunction(
		() => /SECTIONS/.test(document.body.innerText),
		undefined,
		{ timeout },
	);
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
