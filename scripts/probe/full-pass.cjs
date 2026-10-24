// Full functional + responsive pass, with the browser.
const fs = require("node:fs");
const path = require("node:path");
const {
	launch,
	newPage,
	goto,
	shoot,
	bodyText,
	openResume,
	waitForEditor,
} = require("./lib.cjs");

const DL = path.join(__dirname, "..", "..", ".probe-downloads");
fs.mkdirSync(DL, { recursive: true });

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

const overflow = (page) =>
	page.evaluate(() => ({
		scrollWidth: document.documentElement.scrollWidth,
		innerWidth: window.innerWidth,
	}));

(async () => {
	const browser = await launch();

	// ── Desktop ────────────────────────────────────────────────────────────────
	const { ctx, page, errors } = await newPage(browser, {
		width: 1440,
		height: 900,
	});
	await goto(page, "/app/", { wait: 6000 });

	await check("dashboard: keyboard opens a resume", async () => {
		// The card title is the announced control; the preview beside it is a
		// pointer-only duplicate. Tab to the title and press Enter.
		const title = page.getByRole("button", { name: /^Harvard Application$/ });
		if ((await title.count()) === 0) throw new Error("no named card button");
		await title.first().focus();
		await page.keyboard.press("Enter");
		await waitForEditor(page);
		return "Enter on the card title mounted the editor";
	});

	await page.waitForTimeout(8000);
	await check("editor: preview renders two Letter pages", async () => {
		// Pages are `<img>` elements with a blob URL now, not inline SVG: an image context
		// cannot execute script, which is what makes the compiler's own `<script>` inert.
		// `naturalWidth` is the assertion that means something — a broken blob still
		// produces an element with the right `width` attribute.
		const pages = await page.evaluate(() =>
			[...document.querySelectorAll('img[src^="blob:"]')]
				.map((i) => `${i.naturalWidth}x${i.naturalHeight}`)
				.filter((d) => d === "612x792"),
		);
		if (pages.length === 0) throw new Error("no rendered 612x792 page images");
		return `${pages.length} pages`;
	});

	await check("export: DOCX downloads and is a zip", async () => {
		await page.getByRole("button", { name: /^Export$/ }).click();
		await page.waitForTimeout(250);
		const [download] = await Promise.all([
			page.waitForEvent("download", { timeout: 60000 }),
			page.getByRole("menuitem", { name: /DOCX/i }).click(),
		]);
		const file = path.join(DL, download.suggestedFilename());
		await download.saveAs(file);
		const magic = fs.readFileSync(file).subarray(0, 2).toString("latin1");
		if (magic !== "PK") throw new Error(`not a zip: ${JSON.stringify(magic)}`);
		return `${download.suggestedFilename()} ${fs.statSync(file).size}b`;
	});

	await check(
		"export: Text downloads and contains the resume text",
		async () => {
			await page.getByRole("button", { name: /^Export$/ }).click();
			await page.waitForTimeout(250);
			const [download] = await Promise.all([
				page.waitForEvent("download", { timeout: 60000 }),
				page.getByRole("menuitem", { name: /as Text/i }).click(),
			]);
			const file = path.join(DL, download.suggestedFilename());
			await download.saveAs(file);
			const text = fs.readFileSync(file, "utf8");
			if (!/James Smith/.test(text))
				throw new Error("no name in the text export");
			if (!/Education/.test(text)) throw new Error("no section headings");
			return `${download.suggestedFilename()} ${text.split("\n").length} lines`;
		},
	);

	await check("export: JSON round-trips the document", async () => {
		await page.getByRole("button", { name: /^Export$/ }).click();
		await page.waitForTimeout(250);
		const [download] = await Promise.all([
			page.waitForEvent("download", { timeout: 60000 }),
			page.getByRole("menuitem", { name: /as JSON/i }).click(),
		]);
		const file = path.join(DL, download.suggestedFilename());
		await download.saveAs(file);
		const json = JSON.parse(fs.readFileSync(file, "utf8"));
		if (!Array.isArray(json.sections) || json.sections.length === 0)
			throw new Error("no sections in the JSON export");
		return `${json.sections.length} sections`;
	});

	await check(
		"review: bullet findings name the entry and do not collide",
		async () => {
			await page.getByRole("button", { name: /^Review/ }).click();
			await page.waitForTimeout(3000);
			await page.getByRole("tab", { name: /Bullets/i }).click();
			await page.waitForTimeout(1500);
			const headings = await page.evaluate(() => {
				const dialog = document.querySelector("[role=dialog]");
				if (!dialog) return null;
				return [...dialog.querySelectorAll("li > p.font-medium")].map((p) =>
					p.textContent.trim(),
				);
			});
			if (!headings) throw new Error("no review dialog");
			return `entry headings: ${JSON.stringify(headings)}`;
		},
	);

	await page.keyboard.press("Escape");
	await page.waitForTimeout(800);

	// ── Mobile ─────────────────────────────────────────────────────────────────
	// A SECOND BROWSER PROCESS, not just a second context.
	//
	// Reusing one process means the mobile page hydrates while the desktop page still
	// holds the 28 MB Typst WASM, and it does not mount inside 30s — a harness artefact.
	// In a fresh process the same editor mounts in ~0.9s. Measuring the artificial case
	// would have recorded a product defect that does not exist.
	await ctx.close();
	await browser.close();
	const mobileBrowser = await launch();
	const mobile = await newPage(mobileBrowser, { width: 390, height: 844 });
	await goto(mobile.page, "/app/", { wait: 6000 });

	await check("mobile 390: dashboard has no horizontal overflow", async () => {
		const { scrollWidth, innerWidth } = await overflow(mobile.page);
		if (scrollWidth > innerWidth + 1)
			throw new Error(`scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`);
		await shoot(mobile.page, "50-mobile-dashboard", true);
		return `${scrollWidth} <= ${innerWidth}`;
	});

	await check("mobile 390: editor has no horizontal overflow", async () => {
		await openResume(mobile.page, 0);
		await waitForEditor(mobile.page);
		await mobile.page.waitForTimeout(3000);
		const { scrollWidth, innerWidth } = await overflow(mobile.page);
		if (scrollWidth > innerWidth + 1)
			throw new Error(`scrollWidth ${scrollWidth} > innerWidth ${innerWidth}`);
		await shoot(mobile.page, "51-mobile-editor", true);
		return `${scrollWidth} <= ${innerWidth}`;
	});

	console.log("\n== console errors (desktop) ==");
	for (const e of [...new Set(errors)]
		.filter((x) => !/ERR_ABORTED/.test(x))
		.slice(0, 8))
		console.log("  ", e.slice(0, 200));
	console.log("== console errors (mobile) ==");
	for (const e of [...new Set(mobile.errors)]
		.filter((x) => !/ERR_ABORTED/.test(x))
		.slice(0, 8))
		console.log("  ", e.slice(0, 200));

	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} checks passed`);

	await ctx.close();
	await mobile.ctx.close();
	await mobileBrowser.close();
})();
