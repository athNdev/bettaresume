// Token-wave visual verification: dashboard + editor at 1440, both themes.
//
// Usage: node scripts/probe/token-shots.cjs <prefix>
//   prefix identifies the tree under test (e.g. tok-before on main, tok-after
//   on the branch). Run against a stack started with scripts/probe-start.cjs.
//
// Theme comes from next-themes' localStorage key ("theme"), seeded before the
// page loads — the provider defaults to dark, so "light" is the one to set.
const {
	launch,
	newPage,
	goto,
	shoot,
	openResume,
	waitForEditor,
} = require("./lib.cjs");

const prefix = process.argv[2];
if (!prefix) throw new Error("usage: node scripts/probe/token-shots.cjs <prefix>");

async function capture(browser, theme) {
	const { ctx, page, errors } = await newPage(browser, {
		width: 1440,
		height: 900,
	});
	await page.addInitScript((value) => {
		try {
			window.localStorage.setItem("theme", value);
		} catch {}
	}, theme);

	await goto(page, "/#/dashboard", { wait: 8000 });
	const dashText = await bodyTextSafe(page);
	await shoot(page, `${prefix}-dash-${theme}-1440`);

	await openResume(page, 0);
	await waitForEditor(page);
	await page.waitForTimeout(4000);
	await shoot(page, `${prefix}-editor-${theme}-1440`);

	await ctx.close();
	return { dashText: dashText.slice(0, 120), errors };
}

async function bodyTextSafe(page) {
	try {
		return await page.evaluate(() => document.body?.innerText ?? "");
	} catch {
		return "";
	}
}

(async () => {
	const browser = await launch();
	for (const theme of ["dark", "light"]) {
		const { dashText, errors } = await capture(browser, theme);
		console.log(`[${theme}] dashboard says: ${JSON.stringify(dashText)}`);
		if (errors.length > 0) console.log(`[${theme}] console errors:\n${errors.join("\n")}`);
	}
	await browser.close();
	console.log(`done — ${prefix}-*.png in .probe-shots/`);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
