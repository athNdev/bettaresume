// One screenshot of the editor preview at 1440 width, under a given label.
//
// Used to capture the document typography before and after a change:
//   node scripts/probe/editor-shot.cjs typography-before
// Writes .probe-shots/<label>.png (plus <label>-full.png, the whole page).
const path = require("node:path");
const { launch, newPage, goto, shoot, openResume, waitForEditor } = require("./lib.cjs");

const label = process.argv[2] || "editor-shot";

(async () => {
	const browser = await launch();
	const { page } = await newPage(browser, { width: 1440, height: 900 });
	await goto(page, "/app/", { wait: 6000 });
	await openResume(page, 0);
	await waitForEditor(page);
	// Let the Typst WASM / preview settle and autosave noise clear.
	await page.waitForTimeout(6000);
	await shoot(page, label);
	await shoot(page, `${label}-full`, true);
	console.log(`shot: ${path.join(".probe-shots", `${label}.png`)}`);
	await browser.close();
	process.exit(0);
})().catch((err) => {
	console.error(err);
	process.exit(1);
});
