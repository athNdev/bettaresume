// One-off: measure where the ink ends in the generated template specimens.
const fs = require("node:fs");
const { chromium } = require("playwright");
const path = require("node:path");

(async () => {
	const dir = process.argv[2] ?? "public/templates";
	const browser = await chromium.launch({ headless: true, channel: "chrome" });
	const page = await browser.newPage();
	for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".svg"))) {
		const t = file.replace(/\.svg$/, "");
		const resolved = path.resolve(dir, file);
		await page.goto(`file:///${resolved.replace(/\\/g, "/")}`);
		const box = await page.evaluate(() => {
			const svg = document.querySelector("svg");
			const s = svg.getBoundingClientRect();
			const toVb = (yPx) => ((yPx - s.top) / s.height) * 841.89105;
			const edges = [];
			for (const el of svg.querySelectorAll("path,rect,text,image,line")) {
				const b = el.getBoundingClientRect();
				// Skip page-sized background fills.
				if (b.height < 0.83 * s.height) edges.push(toVb(b.bottom));
			}
			edges.sort((x, y) => x - y);
			return {
				inkBottom: edges[edges.length - 1] ?? 0,
				secondBottom: edges[edges.length - 2] ?? 0,
				count: edges.length,
			};
		});
		console.log(t, JSON.stringify(box));
	}
	await browser.close();
})();
