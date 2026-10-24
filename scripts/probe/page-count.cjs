// Count rendered preview pages for every seeded resume, at 1440 width.
const { launch, newPage, goto, openResume, waitForEditor } = require("./lib.cjs");

(async () => {
	const browser = await launch();
	const { page } = await newPage(browser, { width: 1440, height: 900 });

	for (let i = 0; ; i++) {
		await goto(page, "/app/", { wait: 3000 });
		try {
			await openResume(page, i);
		} catch {
			break;
		}
		await waitForEditor(page);
		await page.waitForTimeout(8000);
		const count = await page.evaluate(() =>
			[...document.querySelectorAll('img[src^="blob:"]')]
				.map((im) => `${im.naturalWidth}x${im.naturalHeight}`)
				.filter((d) => d === "612x792").length,
		);
		const name = await page.evaluate(
			() => (document.querySelector("header")?.innerText ?? "").split("\n")[0],
		);
		console.log(`resume[${i}] ${JSON.stringify(name.trim())}: ${count} page(s)`);
	}
	await browser.close();
	process.exit(0);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
