// Which locator actually finds the LIBRARY button?
const { launch, newPage, goto } = require("./lib.cjs");

(async () => {
	const b = await launch();
	const { ctx, page } = await newPage(b, { width: 1600, height: 1000 });
	await goto(page, "/app/#/resume-editor/resume-1", { wait: 10000 });

	const tests = {
		'getByRole button name "LIBRARY"': page.getByRole("button", { name: "LIBRARY" }),
		"getByRole button name /^LIBRARY/": page.getByRole("button", { name: /^LIBRARY/ }),
		"getByText LIBRARY exact": page.getByText("LIBRARY", { exact: true }),
		"button:has-text(LIBRARY)": page.locator("button:has-text('LIBRARY')"),
	};
	for (const [label, loc] of Object.entries(tests)) {
		console.log(`${label.padEnd(38)} count=${await loc.count()}`);
	}

	const acc = await page.evaluate(() => {
		const btn = [...document.querySelectorAll("button")].find((x) =>
			x.innerText.trim().startsWith("LIBRARY"),
		);
		return btn
			? {
					ariaLabel: btn.getAttribute("aria-label"),
					ariaExpanded: btn.getAttribute("aria-expanded"),
					text: JSON.stringify(btn.innerText),
					html: btn.outerHTML.slice(0, 200),
				}
			: null;
	});
	console.log(JSON.stringify(acc, null, 1));

	await ctx.close();
	await b.close();
})();
