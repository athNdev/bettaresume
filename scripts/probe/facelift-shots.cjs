// Agent C surface screenshots: editor chrome, section form, typography panel,
// review sheet — at 1440 and 390, dark and light.
//
//   node scripts/probe/facelift-shots.cjs before
//   node scripts/probe/facelift-shots.cjs after
//
// Files land in .probe-shots/ as wave2b-c-<phase>-<view>-<width>-<theme>.png.
// The phase is only a filename prefix; the script does not care what is on screen.
const {
	launch,
	newPage,
	goto,
	shoot,
	waitForEditor,
} = require("./lib.cjs");

const phase = process.argv[2] ?? "after";
const name = (view, width, theme) =>
	`wave2b-c-${phase}-${view}-${width}-${theme}`;

/** Select a section row from the outline by its title text. */
async function selectSection(page, pattern) {
	const rows = page.locator('ul[aria-label^="Resume sections"] li button');
	await rows
		.first()
		.waitFor({ state: "visible", timeout: 20000 })
		.catch(() => {});
	const count = await rows.count();
	const seen = [];
	for (let i = 0; i < count; i++) {
		const text = ((await rows.nth(i).innerText()) ?? "").trim();
		seen.push(text);
		if (text.length > 0 && pattern.test(text)) {
			await rows.nth(i).click();
			await page.waitForTimeout(600);
			return text;
		}
	}
	throw new Error(`no section row matching ${pattern}; rows: ${JSON.stringify(seen)}`);
}

async function shootEditorViews(page, width, theme) {
	await goto(page, "/app/", { wait: 6000 });
	// Deterministic target: the seeded resume the other probes use.
	await page.getByRole("button", { name: /^Harvard Application$/ }).first().click();
	await waitForEditor(page);
	// Let the Typst preview compile before shooting.
	await page.waitForTimeout(8000);

	await shoot(page, name("editor", width, theme));

	await selectSection(page, /Personal|Info/i);
	await shoot(page, name("form-personal", width, theme));

	await selectSection(page, /Experience|Work/i);
	await shoot(page, name("form-experience", width, theme));

	// Typography & layout panel (the twin "%" steppers live here).
	try {
		await page.getByText("Typography & layout").click();
		await page.waitForTimeout(600);
		await shoot(page, name("typography", width, theme));
		await page.getByText("Typography & layout").click();
		await page.waitForTimeout(400);
	} catch (err) {
		console.log(`  (typography panel skipped at ${width}/${theme}: ${err.message.split("\n")[0]})`);
	}

	// Review sheet: the tab strip.
	try {
		await page.getByRole("button", { name: /^Review/ }).click();
		await page.waitForTimeout(3000);
		await shoot(page, name("review", width, theme));
		await page.keyboard.press("Escape");
		await page.waitForTimeout(800);
	} catch (err) {
		console.log(`  (review sheet skipped at ${width}/${theme}: ${err.message.split("\n")[0]})`);
	}
}

(async () => {
	const browser = await launch();
	for (const [width, height] of [
		[1440, 900],
		[390, 844],
	]) {
		for (const theme of ["dark", "light"]) {
			console.log(`shooting ${width} ${theme} …`);
			const { ctx, page } = await newPage(browser, { width, height });
			if (theme === "light") {
				// next-themes reads localStorage before paint; an init script is the
				// only way to get a first paint in the non-default theme.
				await page.addInitScript(() => {
					try {
						localStorage.setItem("theme", "light");
					} catch {}
				});
			}
			try {
				await shootEditorViews(page, width, theme);
			} catch (err) {
				console.log(`  FAILED at ${width}/${theme}: ${err.message.split("\n")[0]}`);
			}
			await ctx.close();
		}
	}
	await browser.close();
	console.log(`done: ${phase}`);
})();
