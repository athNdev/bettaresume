// Agent B surface screenshots: dashboard and the marketing home page — at 1440
// and 390, dark and light.
//
//   node scripts/probe/wave2b-b-shots.cjs before
//   node scripts/probe/wave2b-b-shots.cjs after
//
// Files land in .probe-shots/ as wave2b-b-<phase>-<view>-<width>-<theme>.png.
// The phase is only a filename prefix; the script does not care what is on screen.
//
// Theme comes from next-themes' localStorage key ("theme"), seeded before the
// page loads — the provider defaults to dark, so "light" is the one to set. The
// marketing page is theme-independent (it owns its brand tokens under
// [data-marketing]) but is captured in both anyway, so the before/after pairs
// are complete at every size.
const { launch, newPage, goto, shoot } = require("./lib.cjs");

const phase = process.argv[2] ?? "after";
const name = (view, width, theme) =>
	`wave2b-b-${phase}-${view}-${width}-${theme}`;

async function capture(browser, width, height, theme) {
	const { ctx, page, errors } = await newPage(browser, { width, height });
	await page.addInitScript((value) => {
		try {
			window.localStorage.setItem("theme", value);
		} catch {}
	}, theme);

	// Marketing home: full page, so the section rhythm and the template cards
	// are in the shot and not just the hero.
	await goto(page, "/", { wait: 2500 });
	await page.evaluate(() => {
		// Fire every lazy image/observer before the shot, or the template
		// specimens read as empty boxes in exactly the state being audited.
		for (const el of document.querySelectorAll("img[loading=lazy]")) {
			el.loading = "eager";
		}
		window.scrollTo(0, document.body.scrollHeight);
	});
	await page.waitForTimeout(1200);
	await page.evaluate(() => window.scrollTo(0, 0));
	await page.waitForTimeout(600);
	await shoot(page, name("home", width, theme), true);

	// Dashboard: the viewport a user lands in (dead space below the grid is the
	// finding, so this one is deliberately not full page).
	await goto(page, "/app/#/dashboard", { wait: 8000 });
	await shoot(page, name("dash", width, theme));

	await ctx.close();
	return errors;
}

(async () => {
	const browser = await launch();
	for (const [width, height] of [
		[1440, 900],
		[390, 844],
	]) {
		for (const theme of ["dark", "light"]) {
			const errors = await capture(browser, width, height, theme);
			if (errors.length > 0) {
				console.log(
					`[${width}/${theme}] console errors:\n${errors.join("\n")}`,
				);
			}
			console.log(`captured ${width}/${theme}`);
		}
	}
	await browser.close();
	console.log(`done — ${phase}-*.png in .probe-shots/`);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
