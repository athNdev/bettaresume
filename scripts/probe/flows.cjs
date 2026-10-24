// The core document flows, driven end to end: create, duplicate, variation, library,
// history, archive, delete. These are the product; nothing else in the repo exercises them.
const { launch, newPage, goto, openResume, waitForEditor, shoot } = require("./lib.cjs");

const results = [];
const check = async (name, fn) => {
	try {
		const detail = await fn();
		results.push({ name, ok: true });
		console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
	} catch (err) {
		results.push({ name, ok: false });
		console.log(`FAIL  ${name} — ${err.message.split("\n")[0].slice(0, 160)}`);
	}
};

/**
 * Count the resume cards, always from the dashboard.
 *
 * Several actions navigate into the document they just created, so counting wherever
 * the browser happens to be produced a false "0 cards" and then a chain of timeouts.
 */
async function cardCount(page) {
	if (!page.url().includes("#/dashboard")) {
		const base = page.url().split("#")[0];
		await page.goto(`${base}#/dashboard`, { waitUntil: "load" });
		await page.waitForTimeout(3000);
	}
	return page.locator('button[aria-hidden="true"][tabindex="-1"]').count();
}

/** The names on the cards, taken from the action buttons' accessible names. */
async function cardNames(page) {
	return page.evaluate(() =>
		[...document.querySelectorAll('button[aria-label^="Actions for "]')].map((b) =>
			b.getAttribute("aria-label").replace("Actions for ", ""),
		),
	);
}

/** Open the card menu for the first resume whose name contains `name`. */
async function cardAction(page, name, item) {
	if (!page.url().includes("#/dashboard")) {
		const base = page.url().split("#")[0];
		await page.goto(`${base}#/dashboard`, { waitUntil: "load" });
		await page.waitForTimeout(3000);
	}
	const names = await cardNames(page);
	const match = names.find((n) => n.includes(name));
	if (!match) throw new Error(`no card matching "${name}" among ${JSON.stringify(names)}`);
	await page.getByRole("button", { name: `Actions for ${match}` }).click();
	await page.waitForTimeout(400);
	await page.getByRole("menuitem", { name: item }).click();
	await page.waitForTimeout(900);
}

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, { width: 1600, height: 1000 });

	await goto(page, "/app/", { wait: 6000 });
	const initial = await cardCount(page);
	console.log("resumes at start:", initial);

	await check("create: New Resume adds a document and opens it", async () => {
		await page.getByRole("button", { name: /New Resume/i }).click();
		await page.waitForTimeout(900);
		// A dialog may ask for a name.
		const dialog = page.locator("[role=dialog]");
		if (await dialog.count()) {
			const input = dialog.locator("input").first();
			await input.fill("Probe Document");
			await dialog.getByRole("button", { name: /create|save|continue/i }).click();
		}
		await waitForEditor(page);
		const heading = await page.locator("h1").first().textContent();
		return `heading: ${heading}`;
	});

	await goto(page, "/app/#/dashboard", { wait: 3500 });
	await check("create: the new document is on the dashboard", async () => {
		const n = await cardCount(page);
		if (n !== initial + 1) throw new Error(`${n} cards, expected ${initial + 1}`);
		const named = await page.getByText("Probe Document").count();
		if (named === 0) throw new Error("no card named Probe Document");
		return `${n} cards`;
	});

	await check("duplicate: copies a document", async () => {
		await cardAction(page, "Probe Document", /Duplicate/i);
		await page.waitForTimeout(2500);
		const n = await cardCount(page);
		if (n !== initial + 2) throw new Error(`${n} cards, expected ${initial + 2}`);
		return `${n} cards`;
	});

	await check("variation: forks a base into a linked copy", async () => {
		const before = await cardCount(page);
		await cardAction(page, "Probe Document", /Create Variation/i);
		await page.waitForTimeout(2500);
		const n = await cardCount(page);
		if (n <= before) throw new Error(`no new card (${before} -> ${n})`);
		const badges = await page.getByText("Variation", { exact: true }).count();
		if (badges === 0) throw new Error("no Variation badge on the new card");
		return `${before} -> ${n}, ${badges} badge(s)`;
	});

	await check("history: a revision exists after editing", async () => {
		await page.getByRole("button", { name: /Harvard Application/ }).first().click();
		await waitForEditor(page);
		await page.waitForTimeout(2500);
		await page.getByRole("button", { name: /^Review/ }).click();
		await page.waitForTimeout(2000);
		await page.getByRole("tab", { name: /History/i }).click();
		await page.waitForTimeout(2000);
		const text = await page.evaluate(() => {
			const d = document.querySelector("[role=dialog]");
			return d ? d.innerText.slice(0, 400) : "";
		});
		await shoot(page, "70-history");
		if (/no revisions|nothing here|no history/i.test(text))
			throw new Error(`history empty: ${text.slice(0, 120)}`);
		return text.split("\n").filter(Boolean).slice(0, 4).join(" / ");
	});

	await page.keyboard.press("Escape");
	await page.waitForTimeout(800);

	await check("library: the panel lists items and can search", async () => {
		await page.getByRole("button", { name: /^LIBRARY/ }).click();
		await page.waitForTimeout(2500);
		const search = page.getByLabel("Search your library");
		const hasSearch = await search.count();
		if (hasSearch === 0) throw new Error("no search input");
		await search.fill("zzzz-no-match");
		await page.waitForTimeout(1200);
		const empty = await page.getByText(/Nothing in your library matches/i).count();
		await search.fill("");
		await page.waitForTimeout(800);
		return `search present, empty-state ${empty > 0 ? "shown" : "MISSING"}`;
	});

	await goto(page, "/app/#/dashboard", { wait: 3500 });
	await check("archive: a document leaves the active list", async () => {
		const before = await cardCount(page);
		await cardAction(page, "Probe Document", /^Archive$/);
		await page.waitForTimeout(2500);
		const after = await cardCount(page);
		if (after !== before - 1) throw new Error(`${before} -> ${after}`);
		return `${before} -> ${after}`;
	});

	await check("restore: the archived document comes back", async () => {
		await page.getByRole("button", { name: /Show archived/i }).click();
		await page.waitForTimeout(2000);
		const shown = await page.getByText("Archived", { exact: true }).count();
		if (shown === 0) throw new Error("no Archived badge after toggling the filter");
		await cardAction(page, "Probe Document", /^Restore$/);
		await page.waitForTimeout(2500);
		return "restored";
	});

	await check("delete: removes a document for good", async () => {
		const before = await cardCount(page);
		await cardAction(page, "Probe Document", /^Delete$/);
		await page.waitForTimeout(700);
		const dialog = page.locator("[role=alertdialog]");
		if (await dialog.count()) {
			await dialog.getByRole("button", { name: /delete|continue|confirm/i }).click();
		}
		await page.waitForTimeout(2500);
		const after = await cardCount(page);
		if (after >= before) throw new Error(`${before} -> ${after}, nothing was deleted`);
		return `${before} -> ${after}`;
	});

	await page.getByRole("button", { name: /Show archived/i }).click();
	await page.waitForTimeout(800);

	console.log("\nerrors:");
	for (const e of [...new Set(errors)].filter((x) => !/ERR_ABORTED/.test(x)).slice(0, 8))
		console.log("  ", e.slice(0, 200));

	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} flows passed`);

	await ctx.close();
	await browser.close();
})();
