// End-to-end: does the editor actually export a PDF in a browser?
//
// This is the verification that was impossible before a browser was available. It also
// proves whether the self-hosted WASM and font assets are reached at runtime rather than
// merely being present in the export.
const fs = require("node:fs");
const path = require("node:path");
const { launch, newPage, goto, shoot, openResume } = require("./lib.cjs");

const OUT = path.join(__dirname, "..", "..", ".probe-downloads");
fs.mkdirSync(OUT, { recursive: true });

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, {
		width: 1600,
		height: 1000,
	});

	/** Every request the page makes to our own origin that looks like a runtime asset. */
	const assets = [];
	page.on("request", (req) => {
		const url = req.url();
		if (/\/wasm\/|\.wasm|\/fonts\//.test(url)) {
			assets.push(url.replace(/^https?:\/\/[^/]+/, ""));
		}
	});

	await goto(page, "/app/", { wait: 5000 });
	await openResume(page);
	await page.waitForTimeout(6000);
	console.log("editor url:", page.url());

	// Open the export menu.
	await page.getByRole("button", { name: /^Export$/ }).click();
	await page.waitForTimeout(400);

	const items = await page.evaluate(() =>
		[...document.querySelectorAll("[role=menuitem]")].map((el) =>
			(el.innerText || "").trim(),
		),
	);
	console.log("export menu:", items);

	// PDF.
	const t0 = Date.now();
	let pdf = null;
	try {
		const [download] = await Promise.all([
			page.waitForEvent("download", { timeout: 180000 }),
			page.getByRole("menuitem", { name: /Export as PDF/i }).click(),
		]);
		const target = path.join(OUT, download.suggestedFilename());
		await download.saveAs(target);
		const size = fs.statSync(target).size;
		pdf = { file: target, name: download.suggestedFilename(), size };
		console.log(
			`PDF: ${download.suggestedFilename()} ${size} bytes in ${Date.now() - t0}ms`,
		);
	} catch (err) {
		console.log("PDF FAILED:", err.message.split("\n")[0]);
		await shoot(page, "20-pdf-failed");
	}

	if (pdf) {
		const buf = fs.readFileSync(pdf.file);
		const head = buf.subarray(0, 5).toString("latin1");
		console.log("PDF magic:", JSON.stringify(head), "valid:", head === "%PDF-");
		// The text layer is the product promise. Count embedded font descriptors.
		const text = buf.toString("latin1");
		console.log(
			"font objects:",
			(text.match(/\/FontFile2|\/FontFile3|\/FontFile\b/g) || []).length,
		);
		console.log(
			"fonts named:",
			[...new Set(text.match(/\/BaseFont\s*\/([A-Za-z0-9+-]+)/g) || [])].slice(
				0,
				6,
			),
		);
		console.log("has /ToUnicode:", text.includes("/ToUnicode"));
		/*
		 * Is the PDF tagged? Typst 0.14 emits a tagged document by default, which is what
		 * makes the text layer a structure a parser can read rather than a bag of
		 * positioned glyphs. The markers are the evidence: a structure tree root, the
		 * MarkInfo dictionary, a document language, and one /StructElem per tagged
		 * element.
		 */
		console.log("tagged:", {
			MarkInfo: text.includes("/MarkInfo"),
			StructTreeRoot: text.includes("/StructTreeRoot"),
			Lang: /\/Lang\s*\(/.test(text),
			StructElems: (text.match(/\/StructElem/g) || []).length,
		});
	}

	console.log("\nassets fetched at runtime:");
	for (const a of [...new Set(assets)]) console.log("  ", a);

	console.log("\n== errors ==");
	for (const e of errors) console.log("  ", e.slice(0, 250));

	await ctx.close();
	await browser.close();
})();
