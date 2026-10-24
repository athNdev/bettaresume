// The library panel: does it open, and is it searchable?
const { launch, newPage, goto, shoot } = require("./lib.cjs");

(async () => {
	const b = await launch();
	const { ctx, page, errors } = await newPage(b, { width: 1600, height: 1000 });
	await goto(page, "/app/#/resume-editor/resume-1", { wait: 9000 });

	const buttons = await page.evaluate(() =>
		[...document.querySelectorAll("button")].map((x) => x.innerText.trim().replace(/\s+/g, " ")),
	);
	console.log("LIBRARY button present:", buttons.filter((t) => /library/i.test(t)));

	const lib = page.getByRole("button", { name: /^LIBRARY/ });
	console.log("count:", await lib.count(), "visible:", (await lib.count()) ? await lib.first().isVisible() : null);

	try {
		await lib.first().click({ timeout: 5000 });
		console.log("clicked");
	} catch (err) {
		console.log("click failed:", err.message.split("\n")[0]);
	}

	await page.waitForTimeout(2500);
	const search = page.getByLabel("Search your library");
	console.log("search input:", await search.count());
	if (await search.count()) {
		await search.fill("zzzz");
		await page.waitForTimeout(1500);
		console.log("empty message:", await page.getByText(/Nothing in your library matches/i).count());
		await search.fill("");
		await page.waitForTimeout(1000);
	}
	await shoot(page, "71-library");
	console.log("errors:", [...new Set(errors)].filter((e) => !/ERR_ABORTED/.test(e)).slice(0, 4));

	await ctx.close();
	await b.close();
})();
