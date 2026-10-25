// Screenshot the design-system route at 1440 and 390, in both themes.
//
// Run with the local stack up:
//   node scripts/probe-start.cjs api web && npm run db:reset-seed
//   node scripts/probe/design-system.cjs
const { launch, newPage, goto, shoot, bodyText } = require("./lib.cjs");

(async () => {
	const browser = await launch();
	const runs = [
		{ theme: "light", width: 1440, height: 900 },
		{ theme: "dark", width: 1440, height: 900 },
		{ theme: "light", width: 390, height: 844 },
		{ theme: "dark", width: 390, height: 844 },
	];
	let failed = false;

	for (const { theme, width, height } of runs) {
		const { ctx, page, errors } = await newPage(browser, {
			width,
			height,
		});
		await page.addInitScript((value) => {
			try {
				localStorage.setItem("br-ds-theme", value);
			} catch {}
		}, theme);
		await goto(page, "/design-system/", { wait: 1200 });

		const text = await bodyText(page);
		if (!text.includes("Ink, paper, and instrument")) {
			console.error(`[${theme} ${width}] page did not render`);
			failed = true;
		}
		if (!text.includes("DS-15")) {
			console.error(`[${theme} ${width}] rules missing`);
			failed = true;
		}
		const isDark = await page.evaluate(() =>
			document.documentElement.classList.contains("dark"),
		);
		if (isDark !== (theme === "dark")) {
			console.error(`[${theme} ${width}] theme class wrong: ${isDark}`);
			failed = true;
		}

		await shoot(page, `ds-${theme}-${width}`, true);
		await shoot(page, `ds-${theme}-${width}-top`, false);

		if (width === 1440) {
			for (const id of [
				"colour",
				"type",
				"scales",
				"components",
				"states",
				"ornament",
				"rules",
			]) {
				await page
					.locator(`#${id}`)
					.screenshot({ path: `${require("node:path").join(require("./lib.cjs").OUT, `ds-${theme}-1440-${id}`)}.png` });
			}
		} else {
			// Below lg the page is one column; capture the two densest regions.
			for (const id of ["components", "states"]) {
				await page
					.locator(`#${id}`)
					.screenshot({ path: `${require("node:path").join(require("./lib.cjs").OUT, `ds-${theme}-390-${id}`)}.png` });
			}
		}

		if (errors.length > 0) {
			failed = true;
			console.error(`[${theme} ${width}] console errors:`);
			for (const error of errors) console.error(`  ${error}`);
		}
		console.log(`[${theme} ${width}] ok — ${text.length} chars`);
		await ctx.close();
	}

	// The marketing header carries the live lockup; capture it for the brand review.
	{
		const { ctx, page, errors } = await newPage(browser, {
			width: 1440,
			height: 900,
		});
		await goto(page, "/", { wait: 800 });
		await page.screenshot({
			path: require("node:path").join(
				require("./lib.cjs").OUT,
				"brand-header-1440.png",
			),
			clip: { x: 0, y: 0, width: 1440, height: 240 },
		});
		if (errors.length > 0) {
			failed = true;
			console.error("[marketing] console errors:");
			for (const error of errors) console.error(`  ${error}`);
		}
		await ctx.close();
	}

	await browser.close();
	if (failed) process.exit(1);
	console.log("design-system screenshots written");
})();
