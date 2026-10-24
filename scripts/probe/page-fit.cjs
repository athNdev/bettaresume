/**
 * Wave 3A page-fit screenshots.
 *
 * Drives the real editor at 1440 and captures the four surfaces the brief asks for:
 * the fit chip, the overflow panel expanded, a density preset change, and a semantic
 * page break taking effect. Each capture is asserted first — a screenshot of a blank
 * panel is a screenshot of a bug.
 *
 * Run with the stack up:
 *   node scripts/probe-start.cjs api web && npm run db:reset-seed
 *   node scripts/probe/page-fit.cjs
 */
const {
	launch,
	newPage,
	shoot,
	goto,
	bodyText,
	openResume,
	waitForEditor,
} = require("./lib.cjs");

const CHIP = '[aria-label^="Page fit:"]';

async function chipText(page) {
	const el = page.locator(CHIP).first();
	await el.waitFor({ state: "visible", timeout: 30000 });
	return (await el.innerText()).trim();
}

async function waitForMeasured(page) {
	// "Pages —" is the pre-compile state; anything else means the probe landed.
	await page.waitForFunction(
		(sel) => {
			const el = document.querySelector(sel);
			return !!el && !/Pages\s*—/.test(el.textContent ?? "");
		},
		CHIP,
		{ timeout: 45000 },
	);
}

(async () => {
	const browser = await launch();
	const { page, errors } = await newPage(browser, { width: 1440, height: 900 });
	const results = [];

	try {
		await goto(page, "/#/dashboard", { wait: 2500 });
		await openResume(page, 0);
		await waitForEditor(page);
		await waitForMeasured(page);

		// ── 1. the fit chip ────────────────────────────────────────────────
		const firstChip = await chipText(page);
		await shoot(page, "wave3-fit-chip");
		results.push(`chip: "${firstChip}"`);

		// Force a 1-page target so the overflow panel has something to price.
		await page.locator(CHIP).first().click();
		await page.getByRole("button", { name: "1 page", exact: true }).click();
		await page.waitForTimeout(2500);
		const overChip = await chipText(page);
		await shoot(page, "wave3-fit-over-chip");

		const panel = await bodyText(page);
		if (!/Fit —|The overflow starts at/i.test(panel)) {
			throw new Error("the fit panel did not render its sections");
		}
		await shoot(page, "wave3-fit-overflow-panel", false);
		results.push(`over chip: "${overChip}"`);

		// Close the popover and make sure it is actually gone before clicking behind it.
		await page.keyboard.press("Escape");
		await page.keyboard.press("Escape");
		await page
			.locator('[role="dialog"]')
			.first()
			.waitFor({ state: "detached", timeout: 5000 })
			.catch(() => {});
		await page.waitForTimeout(400);

		// ── 2. a density preset change ─────────────────────────────────────
		await page
			.getByRole("button", { name: /Typography & layout/ })
			.first()
			.click();
		await page.waitForTimeout(500);

		let clicked = null;
		for (const name of ["Compact", "Normal", "Relaxed"]) {
			const button = page.getByRole("button", { name: `${name} density` });
			await button.waitFor({ state: "visible", timeout: 10000 });
			if ((await button.getAttribute("aria-pressed")) !== "true") {
				clicked = { name, button };
				break;
			}
		}
		if (!clicked) throw new Error("every density preset was already selected");

		await shoot(page, "wave3-density-before");
		await clicked.button.click();
		await page.waitForTimeout(3000);
		const pressed = await clicked.button.getAttribute("aria-pressed");
		if (pressed !== "true") {
			throw new Error(`the density control did not switch to ${clicked.name}`);
		}
		await shoot(page, "wave3-density-change");
		results.push(`density: ${clicked.name} pressed=${pressed}`);

		// ── 3. a semantic page break ───────────────────────────────────────
		const pagesBefore = await chipText(page);
		// Select the experience section from the rail. The seed resume calls it
		// "Professional Experience"; do not hard-code a heading the document owns.
		const railItem = page
			.getByRole("button", { name: "Education", exact: true })
			.first();
		await railItem.click();
		// The detail pane's own h2 is the proof the selection landed.
		await page
			.locator("h2", { hasText: "Education" })
			.first()
			.waitFor({ state: "visible", timeout: 15000 });
		await page.waitForTimeout(500);

		const breaks = page.locator("details summary", { hasText: "Page breaks" });
		await breaks.first().waitFor({ state: "visible", timeout: 15000 });
		await breaks.first().click();
		await page.waitForTimeout(300);

		const breakSwitch = page.locator('button[id^="break-before-"]').first();
		await breakSwitch.waitFor({ state: "visible", timeout: 10000 });
		const breakBefore = await breakSwitch.getAttribute("aria-checked");
		await breakSwitch.click();
		await page.waitForTimeout(6000);
		const breakAfter = await breakSwitch.getAttribute("aria-checked");
		if (breakAfter !== "true") {
			throw new Error(
				`the page-break switch did not turn on (was ${breakBefore}, now ${breakAfter})`,
			);
		}

		const pagesAfter = await chipText(page);
		await shoot(page, "wave3-page-break");
		results.push(
			`page break: "${pagesBefore}" -> "${pagesAfter}" (switch ${breakBefore} -> ${breakAfter})`,
		);

		if (errors.length > 0) {
			console.log("\n== console errors ==");
			for (const error of errors) console.log(`  ${error}`);
		}
		console.log(`\n${results.join("\n")}`);
		console.log("\nOK");
	} catch (err) {
		await shoot(page, "wave3-failure").catch(() => {});
		console.error(`FAILED: ${err.message}`);
		console.log(await bodyText(page));
		if (errors.length > 0) {
			console.log("\n== console errors ==");
			for (const error of errors) console.log(`  ${error}`);
		}
		process.exitCode = 1;
	} finally {
		await browser.close();
	}
})();
