// The variation selector is the header's second button, named after the resume.
const { launch, newPage, goto } = require("./lib.cjs");

(async () => {
	const b = await launch();
	const { ctx, page, errors } = await newPage(b, { width: 1600, height: 1000 });
	await goto(page, "/app/#/resume-editor/resume-2", { wait: 9000 });

	const buttons = page.locator("header button");
	console.log("header button count:", await buttons.count());
	for (let i = 0; i < (await buttons.count()); i++) {
		console.log(`  [${i}]`, (await buttons.nth(i).innerText()).trim().slice(0, 40));
	}

	await buttons.nth(1).click();
	await page.waitForTimeout(900);
	const items = await page.evaluate(() =>
		[...document.querySelectorAll("[role=menuitem]")].map((m) =>
			m.innerText.trim().replace(/\s+/g, " ").slice(0, 60),
		),
	);
	console.log("menu items:", JSON.stringify(items, null, 1));

	await ctx.close();
	await b.close();
})();
