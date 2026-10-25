// Screenshots of the editor at the three widths the responsive wave changed.
//
// Usage: node scripts/probe/responsive-shots.cjs [prefix]
//   Requires the stack from `node scripts/probe-start.cjs api web` and a seeded D1
//   (`npm run db:reset-seed`).
//
// Why 390 / 768 / 1024: 390 is the phone the two header overflows were found at,
// 768 is the last width before the three-zone layout, and 1024 is the first width
// after it. Both themes, because a layout that only fits in one is not a layout.
//
// Contexts are closed one at a time: the Typst WASM is ~28 MB and a second editor
// mounting while the first still holds it is the harness artefact recorded in
// docs/AGENT-CONTEXT.md §2.22, not a product defect.
const { launch, newPage, goto, shoot, openResume, waitForEditor } = require("./lib.cjs");

const prefix = process.argv[2] ?? "resp";
const WIDTHS = [390, 768, 1024];
const THEMES = ["light", "dark"];

const HEIGHTS = { 390: 844, 768: 1024, 1024: 768 };

/** Show the document on the small-screen view before the shot. */
async function showPreview(page, width) {
	if (width >= 1024) return;
	const nav = page.locator('nav[aria-label="Editor view"]');
	if ((await nav.count()) === 0) return;
	await nav.locator("button").nth(2).click();
	await page.waitForTimeout(1200);
}

(async () => {
	const browser = await launch();
	const results = [];

	for (const theme of THEMES) {
		for (const width of WIDTHS) {
			const { ctx, page, errors } = await newPage(browser, {
				width,
				height: HEIGHTS[width],
			});
			await page.addInitScript((value) => {
				try {
					window.localStorage.setItem("theme", value);
				} catch {}
			}, theme);

			await goto(page, "/app/", { wait: 6000 });
			await openResume(page, 0);
			await waitForEditor(page);
			await page.waitForSelector("[data-typst-page]", {
				state: "attached",
				timeout: 90000,
			});
			await page.waitForTimeout(2500);

			await shoot(page, `${prefix}-editor-${theme}-${width}`);
			await showPreview(page, width);
			await shoot(page, `${prefix}-editor-${theme}-${width}-preview`);

			const real = errors.filter((e) => !/ERR_ABORTED/.test(e));
			results.push({ theme, width, errors: real.length });
			await ctx.close();
		}
	}

	await browser.close();
	for (const row of results) {
		console.log(
			`${row.theme} ${row.width}px — ${row.errors === 0 ? "no console errors" : `${row.errors} console error(s)`}`,
		);
	}
})();
