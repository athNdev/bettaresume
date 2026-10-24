// Does every control in "Typography & layout" actually change the document?
//
// The audit behind `[CLEAN] Wire or remove the controls that silently do nothing`. A
// setting that is stored and never read looks identical to one that works, until you
// check the output — `dateFormat` was exactly that case for the whole life of the
// product.
const crypto = require("node:crypto");
const { launch, newPage, goto, openResume, waitForEditor } = require("./lib.cjs");

/** Hash of every page SVG, so "did the document change" is one comparison. */
const docHash = (page) =>
	page
		.evaluate(() =>
			[...document.querySelectorAll("svg")]
				.filter((s) => {
					const vb = (s.getAttribute("viewBox") ?? "").split(/\s+/).map(Number);
					return vb[2] > 500 && vb[3] > 500;
				})
				.map((s) => s.outerHTML)
				.join("|"),
		)
		.then((s) => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12));

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, { width: 1600, height: 1000 });

	await goto(page, "/app/", { wait: 6000 });
	await openResume(page, 0);
	await waitForEditor(page);
	await page.waitForTimeout(9000);

	// Open the typography panel.
	const trigger = page.getByRole("button", { name: /Typography & layout/i });
	await trigger.click();
	await page.waitForTimeout(1200);

	const controls = await page.evaluate(() =>
		[...document.querySelectorAll("button, [role=combobox], input[type=range]")]
			.map((el) => ({
				tag: el.tagName.toLowerCase(),
				role: el.getAttribute("role"),
				aria: el.getAttribute("aria-label"),
				text: (el.innerText || "").trim().replace(/\s+/g, " ").slice(0, 40),
				type: el.getAttribute("type"),
				disabled: el.hasAttribute("disabled"),
			}))
			.filter((c) => c.aria || c.text),
	);
	console.log(`controls in the panel: ${controls.length}`);
	for (const c of controls) console.log(`  ${c.tag}${c.role ? `[${c.role}]` : ""} ${c.aria ?? ""} :: ${c.text}`);

	// Baseline.
	const before = await docHash(page);
	console.log("\nbaseline document:", before);

	/** Try one interaction and report whether the document changed. */
	const probe = async (label, act) => {
		const start = await docHash(page);
		try {
			await act();
		} catch (err) {
			console.log(`SKIP  ${label} — ${err.message.split("\n")[0].slice(0, 90)}`);
			return;
		}
		// Compilation is debounced; give it room.
		await page.waitForTimeout(4500);
		const end = await docHash(page);
		console.log(
			`${end !== start ? "WORKS" : "NO-OP"} ${label}  ${start} -> ${end}`,
		);
	};

	await probe("font scale +", async () => {
		await page.getByRole("button", { name: /increase|larger|\+/i }).first().click();
	});

	await probe("accent style", async () => {
		const combo = page.getByRole("combobox").first();
		await combo.click();
		await page.waitForTimeout(400);
		const options = await page.evaluate(() =>
			[...document.querySelectorAll("[role=option]")].map((o) => o.textContent.trim()),
		);
		console.log("    options:", options);
		await page.getByRole("option").nth(1).click();
	});

	await probe("page size", async () => {
		const combos = page.getByRole("combobox");
		await combos.nth(1).click();
		await page.waitForTimeout(400);
		const options = await page.evaluate(() =>
			[...document.querySelectorAll("[role=option]")].map((o) => o.textContent.trim()),
		);
		console.log("    options:", options);
		await page.getByRole("option").nth(1).click();
	});

	await probe("section spacing", async () => {
		const combos = page.getByRole("combobox");
		await combos.nth(2).click();
		await page.waitForTimeout(400);
		const options = await page.evaluate(() =>
			[...document.querySelectorAll("[role=option]")].map((o) => o.textContent.trim()),
		);
		console.log("    options:", options);
		await page.getByRole("option").nth(1).click();
	});

	console.log("\nerrors:", [...new Set(errors)].filter((e) => !/ERR_ABORTED/.test(e)).slice(0, 5));

	await ctx.close();
	await browser.close();
})();
