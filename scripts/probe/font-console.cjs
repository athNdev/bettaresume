// Capture every console message during a PDF export.
const path = require("node:path");
const fs = require("node:fs");
const { launch, newPage, goto, openResume } = require("./lib.cjs");

(async () => {
	const browser = await launch();
	const { ctx, page } = await newPage(browser, { width: 1440, height: 900 });

	const logs = [];
	page.on("console", (m) => logs.push(`${m.type()}: ${m.text()}`));

	await goto(page, "/app/", { wait: 5000 });
	await openResume(page);
	await page.waitForTimeout(6000);

	await page.getByRole("button", { name: /^Export$/ }).click();
	await page.waitForTimeout(300);
	const [download] = await Promise.all([
		page.waitForEvent("download", { timeout: 120000 }),
		page.getByRole("menuitem", { name: /Export as PDF/i }).click(),
	]);
	const file = path.join(
		__dirname,
		"..",
		"..",
		".probe-downloads",
		download.suggestedFilename(),
	);
	await download.saveAs(file);
	console.log("pdf bytes:", fs.statSync(file).size);

	console.log("\nconsole:");
	for (const l of logs) {
		if (/typst|font|warn|error/i.test(l)) console.log("  ", l.slice(0, 300));
	}

	await ctx.close();
	await browser.close();
})();
