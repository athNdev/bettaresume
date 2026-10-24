// What is in the editor's top bar, and is the variation manager among it?
const { launch, newPage, goto } = require("./lib.cjs");

(async () => {
	const b = await launch();
	const { ctx, page } = await newPage(b, { width: 1600, height: 1000 });
	await goto(page, "/app/#/resume-editor/resume-2", { wait: 9000 });

	const top = await page.evaluate(() =>
		[...document.querySelectorAll("header button")].map((x) => ({
			t: x.textContent.trim().slice(0, 26),
			aria: x.getAttribute("aria-label"),
		})),
	);
	console.log("header buttons:", JSON.stringify(top, null, 1));
	console.log("text 'Variation' present:", await page.getByText("Variation").count());
	console.log(
		"header html length:",
		await page.evaluate(() => (document.querySelector("header")?.innerHTML ?? "").length),
	);

	await ctx.close();
	await b.close();
})();
