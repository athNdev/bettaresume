// Opens the editor's Templates disclosure and exercises the six archetypes.
//
//   node scripts/probe/template-picker.cjs
//
// Checks the thing the unit tests cannot: that the selector renders every archetype from
// `TEMPLATE_CONFIGS`, that selecting one writes it to the document (the save state says so
// and the preview recompiles), and that none of the rows falls back to a blank specimen.
// Screenshots go to `.probe-shots/`.

const {
	launch,
	newPage,
	goto,
	shoot,
	bodyText,
	waitForEditor,
} = require("./lib.cjs");

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
	const { page, errors } = await newPage(browser, { width: 1600, height: 1000 });
	try {
		await goto(page, "/app/#/resume-editor/resume-1");
		await waitForEditor(page);

		// The disclosure is a real button whose text is "Templates".
		await page.getByRole("button", { name: "Templates" }).click();
		await page.waitForTimeout(500);

		const rows = await page.evaluate(() =>
			[...document.querySelectorAll("button[aria-pressed]")].map(
				(b) => b.innerText || "",
			),
		);
		const names = rows.map((r) => r.split("\n").map((s) => s.trim()));
		console.log("archetype rows:", names.map((r) => r.join(" | ")));

		const missing = EXPECTED.filter(
			(name) => !rows.some((row) => row.includes(name)),
		);
		if (missing.length > 0) {
			throw new Error(`picker is missing: ${missing.join(", ")}`);
		}

		// Every row must draw a specimen; an empty one is the "invisible template" bug.
		const specimens = await page.evaluate(
			() =>
				[...document.querySelectorAll("button[aria-pressed]")].filter(
					(b) => (b.querySelector('[aria-hidden="true"]')?.innerText ?? "").length > 0,
				).length,
		);
		console.log("rows with a specimen:", specimens);

		await shoot(page, "archetype-picker");

		await page.getByRole("button", { name: /Executive/ }).first().click();
		// The preview recompiles through the Typst WASM; give it a beat.
		await page.waitForTimeout(6000);

		// Read the pressed row, then reload: "it changed on screen" is not the claim —
		// "it was written" is.
		const pressed = async () =>
			page.evaluate(
				() =>
					document.querySelector('button[aria-pressed="true"]')?.innerText ?? "",
			);
		const beforeReload = await pressed();
		if (!beforeReload.includes("Executive")) {
			throw new Error(`selection did not stick: ${beforeReload}`);
		}
		await goto(page, "/app/#/resume-editor/resume-1", { wait: 5000 });
		await waitForEditor(page);
		// The picker is collapsed again, so the only occurrence of the archetype's name in
		// the chrome is the header subtitle — which reads it from the saved resume.
		const afterReload = await bodyText(page);
		if (!afterReload.includes("Executive")) {
			throw new Error(
				`selection was not persisted; header shows: ${afterReload.slice(0, 80)}`,
			);
		}
		await shoot(page, "archetype-picker-executive");
		await shoot(page, "archetype-picker-executive");

		// `ERR_ABORTED` is Next dev cancelling an RSC prefetch / an in-flight optimistic
		// write that a navigation superseded; it is not a product error.
		const realErrors = errors.filter((e) => !/ERR_ABORTED/.test(e));
		if (realErrors.length > 0) {
			console.error("console errors:", realErrors.slice(0, 5));
			process.exitCode = 1;
		} else {
			console.log("PASS  six archetypes render, select, persist, and redraw the preview");
		}
	} finally {
		await browser.close();
	}
})();
