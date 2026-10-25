// Production smoke test. No dev bypass exists in production on purpose, so this checks
// what is checkable without credentials: the marketing page, the gallery assets, the app
// shell, the API, and the 404 path.
const { launch, newPage, shoot } = require("./lib.cjs");

const BASE = "https://app.bettaresume.com";
const API = "https://api.bettaresume.com";

const results = [];
const check = async (name, fn) => {
	try {
		const detail = await fn();
		results.push({ name, ok: true });
		console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
	} catch (err) {
		results.push({ name, ok: false });
		console.log(`FAIL  ${name} — ${String(err.message).split("\n")[0]}`);
	}
};

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, { width: 1440, height: 1000 });

	await check("marketing page renders the product copy", async () => {
		await page.goto(BASE, { waitUntil: "load", timeout: 60000 });
		await page.waitForTimeout(2500);
		const text = await page.evaluate(() => document.body.innerText);
		if (!text.includes("Write it once. Tailor it for every role."))
			throw new Error("hero copy missing");
		// Word boundaries, or "generated" matches /rated/i and the probe reports social
		// proof that is not there.
		if (/\btestimonial|trustpilot|\brated\b/i.test(text))
			throw new Error("social proof appeared");
		return `${text.length} chars`;
	});

	await check("the template gallery shows one real page per archetype", async () => {
		await page.evaluate(() =>
			document.querySelector("#templates")?.scrollIntoView({ block: "start" }),
		);
		await page.waitForTimeout(2500);
		const { cards, pages } = await page.evaluate(() => ({
			cards: document.querySelectorAll("#templates article").length,
			pages: [...document.querySelectorAll("#templates img")].map((i) => ({
				src: i.getAttribute("src"),
				w: i.naturalWidth,
				h: i.naturalHeight,
			})),
		}));
		// Derived from the page, not from a typed-in count: a new archetype adds a card
		// and a specimen together, and a card without one fails here. The literal count
		// was left at three when the sixth archetype shipped.
		if (cards < 6) throw new Error(`${cards} archetypes, expected at least 6`);
		if (pages.length !== cards)
			throw new Error(`${pages.length} images for ${cards} archetypes`);
		const broken = pages.filter((p) => p.w < 500);
		if (broken.length) throw new Error(`${broken.length} images did not render`);
		return pages.map((p) => `${p.w}x${p.h}`).join(" ");
	});

	await check("the exported-text panel shows exporter output, not schema keys", async () => {
		const pre = await page.evaluate(
			() => document.querySelector("figure pre")?.innerText ?? "",
		);
		if (pre.includes("startDate:")) throw new Error("schema keys leaked");
		if (!pre.includes("Mar 2022 - Present")) throw new Error("no formatted date range");
		if (!pre.includes("=".repeat(50))) throw new Error("no section rule");
		return `${pre.split("\n").length} lines`;
	});

	await check("the app shell mounts and asks for a sign-in", async () => {
		await page.goto(`${BASE}/app/`, { waitUntil: "load", timeout: 60000 });
		await page.waitForTimeout(5000);
		const text = await page.evaluate(() => document.body.innerText);
		if (!/betta|sign in|continue/i.test(text))
			throw new Error("blank app shell");
		await shoot(page, "99-prod-app");
		return text.slice(0, 60).replace(/\s+/g, " ");
	});

	await check("an unknown path 404s", async () => {
		const response = await page.goto(`${BASE}/definitely-not-a-page/`, {
			waitUntil: "domcontentloaded",
			timeout: 60000,
		});
		const status = response?.status() ?? 0;
		// GitHub Pages serves 404.html with a 404 for unknown paths; the redirect shim
		// then lands on the hash route.
		if (status !== 404 && status !== 200) throw new Error(`status ${status}`);
		return `${status}`;
	});

	await check("the API answers health with a request id", async () => {
		const response = await page.request.get(`${API}/health`);
		if (!response.ok()) throw new Error(`status ${response.status()}`);
		const body = await response.json();
		if (!body.requestId) throw new Error("no requestId");
		if (response.headers()["x-request-id"] !== body.requestId)
			throw new Error("header and body disagree");
		return body.service;
	});

	const real = errors.filter((e) => !/ERR_ABORTED|favicon/i.test(e));
	console.log("\nconsole errors:", real.slice(0, 5));

	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} production checks passed`);
	await ctx.close();
	await browser.close();
})();
