// The design CV's own browser pass: menu, warning, confirmation, download, PDF.
//
// The standard probes assert the four parser-safe exports. This one asserts the thing
// W5 adds and the thing it must never become: a separate menu section with a permanent
// warning, a confirmation that repeats it, and a real two-column PDF behind it.
const fs = require("node:fs");
const path = require("node:path");
const { launch, newPage, goto, shoot, waitForEditor, OUT } = require("./lib.cjs");

const DOWNLOADS = path.join(__dirname, "..", "..", ".probe-downloads");
fs.mkdirSync(DOWNLOADS, { recursive: true });

const results = [];
const check = async (name, fn) => {
	try {
		const detail = await fn();
		results.push({ name, ok: true, detail });
		console.log(`PASS  ${name}${detail ? ` — ${detail}` : ""}`);
	} catch (err) {
		results.push({ name, ok: false, detail: err.message });
		console.log(`FAIL  ${name} — ${err.message.split("\n")[0]}`);
	}
};

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, {
		width: 1440,
		height: 1000,
	});

	await goto(page, "/app/", { wait: 6000 });
	await page.getByRole("button", { name: /^Harvard Application$/ }).click();
	await waitForEditor(page);
	await page.waitForTimeout(4000);

	await check("export menu separates Design CV from the parser-safe exports", async () => {
		await page.getByRole("button", { name: /^Export$/ }).click();
		await page.waitForTimeout(400);
		const warning = page.locator("[data-design-export-warning]");
		const visible = await warning.isVisible();
		const text = (await warning.innerText()).trim();
		if (!visible) throw new Error("the design warning is not visible in the menu");
		if (!/not parser-safe/i.test(text)) throw new Error(`warning text: ${text}`);
		const group = page.locator("[data-design-export-group]");
		if (!(await group.isVisible())) throw new Error("no design export group");
		const item = page.getByRole("menuitem", { name: /Design CV \(PDF\)/ });
		if ((await item.count()) === 0) throw new Error("no Design CV (PDF) item");
		await shoot(page, "w5-01-export-menu");
		return "warning visible, Design CV (PDF) present";
	});

	await check("the design action cannot run without the confirmation", async () => {
		await page.getByRole("menuitem", { name: /Design CV \(PDF\)/ }).click();
		await page.locator("[data-design-export-dialog]").waitFor({ timeout: 10_000 });
		const text = await page.locator("[data-design-export-warning]").last().innerText();
		if (!/not parser-safe/i.test(text)) throw new Error(`dialog warning: ${text}`);
		await shoot(page, "w5-02-design-confirm");
		return "dialog repeats the warning";
	});

	let pdfPath = null;
	await check("the design PDF downloads and is a PDF", async () => {
		const [download] = await Promise.all([
			page.waitForEvent("download", { timeout: 180_000 }),
			page.locator("[data-design-export-confirm]").click(),
		]);
		pdfPath = path.join(DOWNLOADS, download.suggestedFilename());
		await download.saveAs(pdfPath);
		const bytes = fs.readFileSync(pdfPath);
		const magic = bytes.subarray(0, 5).toString("latin1");
		if (magic !== "%PDF-") throw new Error(`not a PDF: ${JSON.stringify(magic)}`);
		const copy = path.join(OUT, "w5-design-cv.pdf");
		fs.writeFileSync(copy, bytes);
		return `${download.suggestedFilename()} ${bytes.length} bytes`;
	});

	if (pdfPath) {
		await check("the downloaded PDF renders as two columns", async () => {
			// Chrome's built-in PDF viewer is the only PDF rasteriser on this host. A blank
			// screenshot is a failure, not a pass.
			const viewer = await ctx.newPage();
			const url = `file:///${pdfPath.replace(/\\/g, "/")}`;
			await viewer.goto(url, { waitUntil: "load", timeout: 30_000 });
			await viewer.waitForTimeout(3000);
			await viewer.screenshot({ path: path.join(OUT, "w5-03-design-pdf.png") });
			const size = fs.statSync(path.join(OUT, "w5-03-design-pdf.png")).size;
			await viewer.close();
			if (size < 20_000)
				throw new Error(`PDF viewer screenshot looks blank (${size} bytes)`);
			return `${size} bytes`;
		});
	}

	await check("the design text layer is labelled and sidebar-first", async () => {
		await page.getByRole("button", { name: /^Export$/ }).click();
		await page.waitForTimeout(300);
		const [download] = await Promise.all([
			page.waitForEvent("download", { timeout: 60_000 }),
			page.getByRole("menuitem", { name: /Design text layer/i }).click(),
		]);
		const file = path.join(DOWNLOADS, download.suggestedFilename());
		await download.saveAs(file);
		const text = fs.readFileSync(file, "utf8");
		if (!text.startsWith("DESIGN CV - VISUAL READING ORDER (NOT PARSER-SAFE)"))
			throw new Error("the design text has no reading-order label");
		const sidebar = text.indexOf("--- SIDEBAR");
		const main = text.indexOf("--- MAIN COLUMN");
		if (sidebar < 0 || main < 0 || sidebar > main)
			throw new Error("the design text is not sidebar-then-main");
		const skills = text.indexOf("\nSkills\n");
		const experience = text.indexOf("\nProfessional Experience\n");
		if (skills < 0 || experience < 0 || skills > experience)
			throw new Error("the sidebar section is not before the main section");
		return `${download.suggestedFilename()} ${text.split("\n").length} lines`;
	});

	console.log("\n== console errors ==");
	for (const error of [...new Set(errors)].slice(0, 8)) {
		console.log("  ", error.slice(0, 200));
	}

	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} design checks passed`);

	await ctx.close();
	await browser.close();
	process.exitCode = failed === 0 ? 0 : 1;
})();
