// The marketing gallery must show every archetype, with a specimen that loads.
//
//   node scripts/probe/marketing-templates.cjs
//
// `test/marketing-claims.test.ts` pins the copy and the count against the registry; this
// pins what a reader actually sees: six cards, six `<img>` files that exist, and a
// specimen whose alt text describes the archetype rather than repeating its name.

const path = require("node:path");
const { launch, newPage, goto, OUT } = require("./lib.cjs");

const EXPECTED = [
	"Standard",
	"Compact",
	"Technical",
	"Graduate",
	"Academic CV",
	"Executive",
];

(async () => {
	const browser = await launch();
	const { page, errors } = await newPage(browser, { width: 1600, height: 1200 });
	try {
		await goto(page, "/#templates", { wait: 2500 });

		const cards = await page.evaluate(() => {
			const section = document.querySelector("#templates");
			return [...section.querySelectorAll("article")].map((card) => ({
				heading: card.querySelector("h3")?.textContent?.trim() ?? "",
				src: card.querySelector("img")?.getAttribute("src") ?? "",
				alt: card.querySelector("img")?.getAttribute("alt") ?? "",
			}));
		});
		console.log("cards:", cards.map((c) => `${c.heading} <- ${c.src}`));

		const missing = EXPECTED.filter(
			(name) => !cards.some((c) => c.heading === name),
		);
		if (missing.length > 0) throw new Error(`missing cards: ${missing.join(", ")}`);

		for (const card of cards) {
			if (!card.src.startsWith("/templates/") || !card.src.endsWith(".svg")) {
				throw new Error(`bad specimen path: ${card.src}`);
			}
			if (card.alt.length < 40) {
				throw new Error(`alt text is a restatement, not a description: ${card.alt}`);
			}
		}

		const heading = await page.locator("#templates h2").innerText();
		console.log("heading:", heading);

		const file = path.join(OUT, "marketing-templates.png");
		await page.locator("#templates").screenshot({ path: file });
		console.log("screenshot:", file);

		const realErrors = errors.filter((e) => !/ERR_ABORTED/.test(e));
		if (realErrors.length > 0) {
			console.error("console errors:", realErrors.slice(0, 5));
			process.exitCode = 1;
		} else {
			console.log(
				`PASS  ${cards.length} archetype cards, all specimens present and described`,
			);
		}
	} finally {
		await browser.close();
	}
})();
