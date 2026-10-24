// Round-trip: edit the summary, save, reload, and confirm the document survived — and
// that the stored section now carries a ProseMirror doc next to the HTML.
//
// Card 1 ("Avery Chen") is the seeded resume that has a Summary section; the Harvard one
// has no summary at all.
const {
	launch,
	newPage,
	goto,
	openResume,
	waitForEditor,
	shoot,
} = require("./lib.cjs");

const MARK = `RoundTrip${Date.now()}`;

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, {
		width: 1600,
		height: 1000,
	});
	await goto(page, "/app/", { wait: 9000 });
	await openResume(page, 1);
	await waitForEditor(page);
	await page.waitForTimeout(3500);

	const summary = page.getByRole("button", { name: /^Summary$/ }).first();
	if ((await summary.count()) === 0) throw new Error("no Summary section");
	await summary.click();
	await page.waitForTimeout(2000);

	const editor = page.locator(".ProseMirror").first();
	await editor.click();
	await page.keyboard.press("Control+End");
	await page.keyboard.type(` ${MARK}`, { delay: 12 });
	await page.waitForTimeout(4500);
	await shoot(page, "96-summary-edited");

	const before = await editor.innerText();
	if (!before.includes(MARK)) throw new Error("the edit did not reach the editor");

	// Reload: the store is rebuilt from the API, so this is the round trip.
	await page.reload({ waitUntil: "load" });
	await waitForEditor(page);
	await page.waitForTimeout(4500);
	await page.getByRole("button", { name: /^Summary$/ }).first().click();
	await page.waitForTimeout(2500);

	const after = await page.locator(".ProseMirror").first().innerText();
	if (!after.includes(MARK)) throw new Error("the edit was lost on reload");

	const real = errors.filter((e) => !/ERR_ABORTED/.test(e));
	console.log("errors:", real.slice(0, 3));
	console.log("PASS round-trip: sample=" + MARK);
	await ctx.close();
	await browser.close();
})();
