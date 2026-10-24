// Verify whether inactive TabsContent panels are actually hidden in the Review sheet.
const { launch, newPage, goto, openResume, waitForEditor, shoot } = require("./lib.cjs");

(async () => {
	const browser = await launch();
	const { ctx, page } = await newPage(browser, { width: 1600, height: 1000 });
	await goto(page, "/app/", { wait: 7000 });
	await openResume(page, 0);
	await waitForEditor(page);
	await page.waitForTimeout(3000);
	await page.getByRole("button", { name: /^Review/ }).click();
	await page.waitForTimeout(2000);
	await page.getByRole("tab", { name: /History/i }).click();
	await page.waitForTimeout(2500);

	const report = await page.evaluate(() => {
		const panel = document.querySelector("[role=dialog]");
		const contents = [...panel.querySelectorAll('[role="tabpanel"]')].map((el) => {
			const r = el.getBoundingClientRect();
			const cs = getComputedStyle(el);
			return {
				state: el.getAttribute("data-state"),
				hiddenAttr: el.hasAttribute("hidden"),
				display: cs.display,
				visibility: cs.visibility,
				height: Math.round(r.height),
				top: Math.round(r.top),
				text: el.innerText.slice(0, 60).replace(/\s+/g, " "),
			};
		});
		return {
			contents,
			scrollHeight: panel.scrollHeight,
			clientHeight: panel.clientHeight,
			historyMentions: (panel.innerText.match(/#\d+ ·/g) ?? []).length,
		};
	});
	console.log(JSON.stringify(report, null, 2));
	await shoot(page, "72-tabpanels");
	await ctx.close();
	await browser.close();
})();
