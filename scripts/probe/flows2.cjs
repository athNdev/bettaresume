// Targeted flow checks that need the editor: variation, history, library, delete.
const {
	launch,
	newPage,
	goto,
	openResume,
	waitForEditor,
	shoot,
} = require("./lib.cjs");

const results = [];
const check = async (name, fn) => {
	try {
		const d = await fn();
		results.push({ name, ok: true });
		console.log(`PASS  ${name}${d ? ` — ${d}` : ""}`);
	} catch (err) {
		results.push({ name, ok: false });
		console.log(`FAIL  ${name} — ${err.message.split("\n")[0].slice(0, 160)}`);
	}
};

const toDashboard = async (page) => {
	const base = page.url().split("#")[0];
	await page.goto(`${base}#/dashboard`, { waitUntil: "load" });
	await page.waitForTimeout(3500);
};

const names = (page) =>
	page.evaluate(() =>
		[...document.querySelectorAll('button[aria-label^="Actions for "]')].map((b) =>
			b.getAttribute("aria-label").replace("Actions for ", ""),
		),
	);

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, { width: 1600, height: 1000 });

	await goto(page, "/app/", { wait: 7000 });
	console.log("start:", (await names(page)).join(" | "));

	// ── Variation, from the editor ────────────────────────────────────────────
	await check("variation: the editor can fork a base into a linked copy", async () => {
		await openResume(page, 0);
		await waitForEditor(page);
		await page.waitForTimeout(3000);

		// The variation selector is the header's second button; its accessible name is the
		// current resume, not the word "Variation".
		const trigger = page.locator("header button").nth(1);
		await trigger.click();
		await page.waitForTimeout(800);
		const items = await page.evaluate(() =>
			[...document.querySelectorAll("[role=menuitem]")].map((m) => m.textContent.trim()),
		);
		console.log("    menu:", items);
		await page.getByRole("menuitem", { name: /Create Variation/i }).click();
		await page.waitForTimeout(800);

		const dialog = page.locator("[role=dialog]");
		await dialog.locator("input").first().fill("Probe Variation");
		await dialog.getByRole("button", { name: /^Create Variation$/ }).click();
		await page.waitForTimeout(300);

		await toDashboard(page);
		const after = await names(page);
		if (!after.some((n) => n.includes("Probe Variation")))
			throw new Error(`no variation card: ${JSON.stringify(after)}`);
		return after.join(" | ");
	});

	// ── History ───────────────────────────────────────────────────────────────
	await check("history: revisions are listed and restorable", async () => {
		await openResume(page, 0);
		await waitForEditor(page);
		await page.waitForTimeout(3000);
		await page.getByRole("button", { name: /^Review/ }).click();
		await page.waitForTimeout(2500);
		await page.getByRole("tab", { name: /History/i }).click();
		await page.waitForTimeout(3000);

		// A revision row renders "<label>" plus "#<seq> · <localised date>". The date is
		// `toLocaleString`, NOT a relative "2 minutes ago" string, so the old regex here
		// could never match and reported an empty history over a populated one.
		const rows = page.getByRole("button", { name: /#\d+ ·/ });
		const rowCount = await rows.count();
		await shoot(page, "70-history");
		if (rowCount === 0) throw new Error("no revision rows in the History tab");

		// Restore only exists once a version is selected; asserting it before clicking
		// a row tested a control the panel deliberately withholds.
		await rows.first().click();
		await page.waitForTimeout(2000);
		const restores = await page.getByRole("button", { name: /restore/i }).count();
		if (restores === 0) throw new Error("selecting a version produced no Restore control");

		// The active panel must be the only visible one. This is the regression that made
		// the tab look empty: forceMount kept every panel rendered and the History content
		// sat ~2,400px below the tab strip.
		const visiblePanels = await page.evaluate(() => {
			const d = document.querySelector("[role=dialog]");
			return [...d.querySelectorAll('[role="tabpanel"]')].filter(
				(el) => getComputedStyle(el).display !== "none",
			).length;
		});
		if (visiblePanels !== 1)
			throw new Error(`${visiblePanels} tab panels visible at once, expected 1`);

		await shoot(page, "70-history-selected");
		return `${rowCount} revision(s), ${restores} Restore control(s), 1 visible panel`;
	});

	await page.keyboard.press("Escape");
	await page.waitForTimeout(1000);

	// ── Library ───────────────────────────────────────────────────────────────
	await check("library: the panel opens, searches and reports no matches", async () => {
		await page.getByRole("button", { name: "LIBRARY" }).click();
		await page.waitForTimeout(2500);
		const search = page.getByLabel("Search your library");
		if ((await search.count()) === 0) throw new Error("no search input");
		await search.fill("zzzz-no-match");
		await page.waitForTimeout(1500);
		const empty = await page.getByText(/Nothing in your library matches/i).count();
		if (empty === 0) throw new Error("no empty-search message");
		await search.fill("");
		await page.waitForTimeout(800);
		const visible = await page.evaluate(() => {
			const panel = [...document.querySelectorAll("section")].find((s) =>
				/Library/i.test(s.innerText),
			);
			return panel ? panel.innerText.length : 0;
		});
		return `search + empty state ok, library panel ${visible} chars`;
	});

	// ── Delete ────────────────────────────────────────────────────────────────
	await toDashboard(page);
	await check("delete: removes a document after confirmation", async () => {
		const before = await names(page);
		// Names are not unique — several probe runs leave several "Probe Document"
		// cards — so an unscoped accessible-name lookup matches two rows. Take the
		// last card's own menu button instead of querying by name.
		const menus = page.locator('button[aria-label^="Actions for "]');
		const target = (await menus.last().getAttribute("aria-label")).replace(
			"Actions for ",
			"",
		);
		await menus.last().click();
		await page.waitForTimeout(500);
		await page.getByRole("menuitem", { name: /^Delete$/ }).click();
		await page.waitForTimeout(800);
		const kind = await page.evaluate(() =>
			document.querySelector("[role=alertdialog]") ? "alertdialog" : document.querySelector("[role=dialog]") ? "dialog" : "none",
		);
		console.log("    confirm surface:", kind);
		if (kind === "none") throw new Error("no confirmation appeared");
		await page
			.getByRole(kind === "alertdialog" ? "alertdialog" : "dialog")
			.getByRole("button", { name: /delete|continue|confirm/i })
			.click();
		await page.waitForTimeout(3000);
		const after = await names(page);
		if (after.length !== before.length - 1)
			throw new Error(`${before.length} -> ${after.length}; expected exactly one removal`);
		return `${before.length} -> ${after.length} (${target})`;
	});

	console.log("\nerrors:");
	for (const e of [...new Set(errors)].filter((x) => !/ERR_ABORTED/.test(x)).slice(0, 8))
		console.log("  ", e.slice(0, 200));

	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} flows passed`);
	await ctx.close();
	await browser.close();
})();
