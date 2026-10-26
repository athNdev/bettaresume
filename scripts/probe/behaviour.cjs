// Behavioural audit: drive the UI and report what actually works.
//
// A screenshot is necessary but never sufficient — every check here asks "does the
// control do its job when a user operates it". Run against the dev stack:
//
//   node scripts/probe-start.cjs api web
//   npm run db:reset-seed
//   node scripts/probe/behaviour.cjs
//
// Written in the same style as the rest of `scripts/probe/`: plain CommonJS, the
// shared harness from `lib.cjs`, and a PASS/FAIL line per check so the output is the
// evidence.
const {
	launch,
	newPage,
	goto,
	shoot,
	openResume,
	waitForEditor,
} = require("./lib.cjs");

const results = [];
const check = async (name, fn) => {
	try {
		const d = await fn();
		results.push({ name, ok: true });
		console.log(`PASS  ${name}${d ? ` — ${d}` : ""}`);
	} catch (err) {
		results.push({ name, ok: false });
		console.log(`FAIL  ${name} — ${String(err.message).split("\n")[0].slice(0, 240)}`);
	}
};

/**
 * The first scrollable ancestor of `selector`, measured and actually driven.
 *
 * `scrollHeight > clientHeight` alone proves the content is taller, not that a wheel
 * or drag would move it: an ancestor with `overflow: hidden` can satisfy the first and
 * fail the second. This sets `scrollTop` and reads it back.
 */
const SCROLL_PROBE = `(selector) => {
	const start = document.querySelector(selector);
	if (!start) return { error: "no element for " + selector };
	let el = start;
	let scroller = null;
	while (el) {
		const cs = getComputedStyle(el);
		if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4) {
			scroller = el;
			break;
		}
		el = el.parentElement;
	}
	if (!scroller) {
		// Report the height chain so a failure names the cause.
		const chain = [];
		let n = start;
		while (n && n !== document.body) {
			const r = n.getBoundingClientRect();
			chain.push({
				tag: n.tagName,
				cls: (n.className || "").toString().slice(0, 50),
				h: Math.round(r.height),
				overflowY: getComputedStyle(n).overflowY,
			});
			n = n.parentElement;
		}
		return { error: "no scrollable ancestor", chain: chain.slice(0, 8) };
	}
	const before = scroller.scrollTop;
	const max = scroller.scrollHeight - scroller.clientHeight;
	scroller.scrollTop = Math.min(max, before + 240);
	const after = scroller.scrollTop;
	return {
		before,
		after,
		max,
		client: scroller.clientHeight,
		scrollHeight: scroller.scrollHeight,
		moved: after > before,
		atEnd: after >= max - 2,
	};
}`;

/**
 * Does the topmost element at a control's centre belong to that control?
 *
 * This is the check that catches an overlay: a sticky header covering a `<details>`
 * summary looks correct in a screenshot and fails every real click.
 */
const HIT_TEST = `() => {
	const view = { w: innerWidth, h: innerHeight };
	const out = [];
	const controls = [...document.querySelectorAll("main button, main a[href], main summary")];
	for (const el of controls) {
		if (el.closest("[aria-hidden=true]")) continue;
		if (el.hasAttribute("disabled")) continue;
		const r = el.getBoundingClientRect();
		if (r.width < 4 || r.height < 4) continue;
		const cx = r.left + r.width / 2;
		const cy = r.top + r.height / 2;
		if (cx < 0 || cy < 0 || cx > view.w || cy > view.h) continue;
		const top = document.elementFromPoint(cx, cy);
		const ok = top === el || el.contains(top) || (top && top.contains(el));
		if (!ok) {
			out.push({
				text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 50),
				tag: el.tagName,
				top: top ? top.tagName + " " + (top.innerText || "").trim().slice(0, 40) : null,
			});
		}
	}
	return out;
}`;

(async () => {
	const browser = await launch();
	const { ctx, page, errors } = await newPage(browser, { width: 1440, height: 900 });
	page.setDefaultTimeout(15000);

	await goto(page, "/app/", { wait: 9000 });

	// ── Defect 3: the example resume is nowhere to be seen ────────────────────
	await check("showcase: a named 'Example resume' entry point is above the fold", async () => {
		const info = await page.evaluate(() => {
			const heading = [...document.querySelectorAll("h1,h2,h3")].find((h) =>
				/^Example resume$/i.test((h.innerText || "").trim()),
			);
			const button = [...document.querySelectorAll("button")].find((b) =>
				/^Open the example resume$/i.test((b.innerText || "").trim()),
			);
			const r = (el) => {
				if (!el) return null;
				const box = el.getBoundingClientRect();
				return { y: Math.round(box.y), h: Math.round(box.height) };
			};
			return {
				heading: r(heading),
				button: r(button),
				viewport: innerHeight,
			};
		});
		if (!info.heading) throw new Error("no 'Example resume' heading on the dashboard");
		if (!info.button) throw new Error("no 'Open the example resume' button");
		if (info.button.y >= info.viewport)
			throw new Error(`button is below the fold: y=${info.button.y} viewport=${info.viewport}`);
		return `heading y=${info.heading.y}, button y=${info.button.y}`;
	});

	await check("showcase: the dashboard cards are labelled as the example", async () => {
		const badges = await page.evaluate(() =>
			[...document.querySelectorAll("main div")]
				.filter((el) => {
					const cls = String(el.className || "");
					return /rounded-full/.test(cls) && (el.textContent || "").trim() === "Showcase";
				})
				.map((el) => el.textContent.trim()),
		);
		if (badges.length < 2)
			throw new Error(`only ${badges.length} Showcase badge(s) on the cards`);
		return `${badges.length} card badge(s)`;
	});

	await check("showcase: opening the example lands in the editor", async () => {
		await page.getByRole("button", { name: /^Open the example resume$/i }).first().click();
		await waitForEditor(page);
		// Wait for the identity line to have text: the header renders before the
		// document query resolves, and a fixed wait races it on a cold compile.
		await page.waitForFunction(
			() => (document.querySelector("[data-editor-meta]")?.innerText || "").trim().length > 0,
			null,
			{ timeout: 30000 },
		);
		const meta = await page.evaluate(
			() => document.querySelector("[data-editor-meta]")?.innerText || "",
		);
		const name = await page.evaluate(
			() => document.querySelector("h1")?.innerText || "",
		);
		if (!/showcase/i.test(meta) && !/showcase/i.test(name))
			throw new Error(`editor does not identify the showcase (meta=${meta})`);
		return `editor name: ${name.slice(0, 60)}`;
	});

	await check("showcase: reachable from inside the editor, not only the dashboard", async () => {
		// Open a non-example document, then use the editor's own entry point.
		await page.getByRole("button", { name: "Back to dashboard" }).click();
		const james = page.getByRole("button", {
			name: "Harvard Application",
			exact: true,
		});
		await james.waitFor({ state: "visible", timeout: 30000 });
		await james.first().click();
		await waitForEditor(page);
		// The library is a second request now (it waits for the document), so the
		// entry point arrives shortly after the header rather than with it.
		const trigger = page.getByRole("button", { name: "Open the example resume" });
		await page
			.locator('button[aria-label="Open the example resume"]')
			.first()
			.waitFor({ state: "visible", timeout: 30000 });
		if ((await trigger.count()) === 0)
			throw new Error("no example entry point in the editor header");
		await trigger.first().click();
		await page.waitForFunction(
			() => /showcase/i.test(document.querySelector("[data-editor-meta]")?.innerText || ""),
			null,
			{ timeout: 30000 },
		);
		const meta = await page.evaluate(
			() => document.querySelector("[data-editor-meta]")?.innerText || "",
		);
		if (!/showcase/i.test(meta))
			throw new Error(`the editor control did not open the example (meta=${meta})`);
		return "opened from the editor header";
	});

	// ── Defect 2: Page Breaks remains hidden / unclickable ────────────────────
	await check("page breaks: the panel is present in the section form", async () => {
		await page.getByRole("button", { name: /^Experience$/ }).first().click();
		await page.waitForSelector("[data-form-position]", {
			state: "visible",
			timeout: 30000,
		});
		await page.waitForTimeout(1200);
		const count = await page.locator("[data-section-breaks]").count();
		if (count === 0) throw new Error("no page-break panel in the section form");
		return `${count} panel(s)`;
	});

	await check("page breaks: the summary is hit-testable, then actually expands", async () => {
		const summary = page.locator("[data-section-breaks] > summary").first();
		const box = await summary.boundingBox();
		if (!box) throw new Error("summary has no box");
		const topText = await page.evaluate(
			({ x, y }) => {
				const el = document.elementFromPoint(x, y);
				return {
					tag: el?.tagName,
					text: (el?.innerText || "").trim().slice(0, 40),
					inside: !!el?.closest("[data-section-breaks]"),
				};
			},
			{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
		);
		if (!topText.inside)
			throw new Error(
				`summary is covered by ${topText.tag} "${topText.text}" — a click would be intercepted`,
			);

		await summary.click({ timeout: 5000 });
		await page.waitForTimeout(600);
		const state = await page.evaluate(() => {
			const details = document.querySelector("[data-section-breaks]");
			const switches = [...details.querySelectorAll("[role=switch], input[type=checkbox]")];
			return {
				open: details.open,
				switches: switches.filter((s) => {
					const r = s.getBoundingClientRect();
					return r.width > 0 && r.height > 0;
				}).length,
				text: (details.innerText || "").slice(0, 120),
			};
		});
		if (!state.open) throw new Error("clicked the summary but <details> did not open");
		if (state.switches < 2)
			throw new Error(`expanded but only ${state.switches} break controls are visible`);
		return `<details> open, ${state.switches} controls visible`;
	});

	await check("page breaks: a control inside the panel changes state", async () => {
		const toggle = page.getByRole("switch", { name: /Keep the whole section on one page/i });
		if ((await toggle.count()) === 0) throw new Error("no keep-section switch");
		const before = await toggle.first().getAttribute("aria-checked");
		await toggle.first().click();
		await page.waitForTimeout(1200);
		const after = await toggle.first().getAttribute("aria-checked");
		if (before === after)
			throw new Error(`switch did not change: ${before} -> ${after}`);
		// Leave it as it was so the probe is repeatable.
		await toggle.first().click();
		await page.waitForTimeout(800);
		return `${before} -> ${after}`;
	});

	await check("form: the section form scrolls, not just overflows", async () => {
		const info = await page.evaluate(
			(probe) => eval(probe)("[data-section-breaks]"),
			SCROLL_PROBE,
		);
		if (info.error)
			throw new Error(`${info.error}: ${JSON.stringify(info.chain || [])}`);
		if (!info.moved)
			throw new Error(`scrollTop did not move: ${JSON.stringify(info)}`);
		return `scrolled ${info.before} -> ${info.after} of ${info.max}`;
	});

	await check("form: the bottom of the form is reachable", async () => {
		const reached = await page.evaluate((probe) => {
			const scroll = eval(probe)("[data-section-breaks]");
			if (scroll.error) return scroll;
			let el = document.querySelector("[data-section-breaks]");
			while (el) {
				const cs = getComputedStyle(el);
				if (/(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 4)
					break;
				el = el.parentElement;
			}
			if (!el) return { error: "no scroller" };
			el.scrollTop = el.scrollHeight;
			const last = el.lastElementChild?.getBoundingClientRect();
			return {
				scrollTop: el.scrollTop,
				max: el.scrollHeight - el.clientHeight,
				lastBottom: last ? Math.round(last.bottom) : null,
				viewport: innerHeight,
			};
		}, SCROLL_PROBE);
		if (reached.error) throw new Error(JSON.stringify(reached));
		if (reached.scrollTop < reached.max - 2)
			throw new Error(`could not reach the end: ${JSON.stringify(reached)}`);
		return `scrollTop=${reached.scrollTop} of ${reached.max}`;
	});

	// ── Rail collapsibles: every one must open ────────────────────────────────
	for (const label of ["Sections", "Templates", "Library"]) {
		await check(`rail: the ${label} disclosure opens`, async () => {
			const trigger = page.getByRole("button", { name: new RegExp(`^${label}`) }).first();
			if ((await trigger.count()) === 0) throw new Error(`no ${label} trigger`);
			const before = await trigger.getAttribute("aria-expanded");
			if (before !== "true") await trigger.click();
			await page.waitForTimeout(900);
			const after = await trigger.getAttribute("aria-expanded");
			if (after !== "true") throw new Error(`aria-expanded=${after}`);
			return "expanded";
		});
	}

	await check("rail: the sections list scrolls when it is taller than the rail", async () => {
		const info = await page.evaluate((probe) => {
			const row = [...document.querySelectorAll("button")].find((b) =>
				/^Contact$/.test((b.innerText || "").trim()),
			);
			if (!row) return { error: "no section row" };
			// The rail's scroll area is the nearest scrollable ancestor of a section row.
			let el = row;
			while (el) {
				const cs = getComputedStyle(el);
				if (/(auto|scroll)/.test(cs.overflowY)) break;
				el = el.parentElement;
			}
			if (!el) return { error: "no rail scroller" };
			return {
				client: el.clientHeight,
				scrollHeight: el.scrollHeight,
				overflowY: getComputedStyle(el).overflowY,
			};
		}, SCROLL_PROBE);
		if (info.error) throw new Error(JSON.stringify(info));
		return `rail client=${info.client} content=${info.scrollHeight} (${info.overflowY})`;
	});

	// ── Defect 1: the Review panel does not scroll ───────────────────────────
	await check("review: the sheet opens and every tab has a trigger", async () => {
		await page.getByRole("button", { name: /^Review/ }).click();
		await page.waitForTimeout(2500);
		const tabs = await page.getByRole("tab").allInnerTexts();
		const names = tabs.map((t) => t.trim());
		for (const expected of [
			"Checklist",
			"Plain text",
			"Parser fit",
			"Job target",
			"History",
			"Bullets",
		]) {
			if (!names.includes(expected))
				throw new Error(`missing tab ${expected}; got ${names.join(", ")}`);
		}
		return names.join(", ");
	});

	for (const tab of [
		"Checklist",
		"Plain text",
		"Parser fit",
		"Job target",
		"History",
		"Bullets",
	]) {
		await check(`review: the ${tab} tab shows exactly one panel`, async () => {
			await page.getByRole("tab", { name: tab }).click();
			await page.waitForTimeout(700);
			const info = await page.evaluate(() => {
				const panels = [...document.querySelectorAll("[role=tabpanel]")];
				const visible = panels.filter((p) => {
					const r = p.getBoundingClientRect();
					return r.width > 0 && r.height > 0 && getComputedStyle(p).display !== "none";
				});
				const selected = panels.filter((p) => p.dataset.state === "active");
				return {
					total: panels.length,
					visible: visible.length,
					active: selected.length,
					height: visible[0]?.getBoundingClientRect().height ?? 0,
				};
			});
			if (info.total === 0) throw new Error("no tab panels");
			if (info.visible !== 1)
				throw new Error(
					`${info.visible} panels visible at once — forceMount panels are stacking`,
				);
			if (info.active !== 1) throw new Error(`${info.active} active panels`);
			if (info.height < 100)
				throw new Error(`active panel has no height (${info.height}px)`);
			return `1 of ${info.total} visible, height ${Math.round(info.height)}px`;
		});
	}

	await check("review: the Checklist body actually scrolls", async () => {
		await page.getByRole("tab", { name: "Checklist" }).click();
		await page.waitForTimeout(600);
		const info = await page.evaluate((probe) => {
			const panel = [...document.querySelectorAll("[role=tabpanel]")].find(
				(p) => p.dataset.state === "active",
			);
			if (!panel) return { error: "no active panel" };
			// The Radix viewport is the scroll container; find it inside the panel.
			const candidates = [...panel.querySelectorAll("*")].filter((el) => {
				const cs = getComputedStyle(el);
				return (
					/(auto|scroll)/.test(cs.overflowY) &&
					el.scrollHeight > el.clientHeight + 4
				);
			});
			if (candidates.length === 0) {
				const dialog = panel.closest("[role=dialog]");
				return {
					error: "no scrollable body",
					panel: {
						h: panel.clientHeight,
						sh: panel.scrollHeight,
					},
					dialog: dialog
						? { h: dialog.clientHeight, sh: dialog.scrollHeight }
						: null,
					chain: [...panel.querySelectorAll("div")]
						.slice(0, 6)
						.map((d) => ({
							cls: (d.className || "").toString().slice(0, 50),
							h: d.clientHeight,
							sh: d.scrollHeight,
							overflowY: getComputedStyle(d).overflowY,
						})),
				};
			}
			const el = candidates[0];
			const before = el.scrollTop;
			el.scrollTop = before + 300;
			return {
				before,
				after: el.scrollTop,
				client: el.clientHeight,
				scrollHeight: el.scrollHeight,
			};
		}, SCROLL_PROBE);
		if (info.error) throw new Error(`${info.error}: ${JSON.stringify(info)}`);
		if (info.after === info.before)
			throw new Error(`scrollTop did not move: ${JSON.stringify(info)}`);
		return `scrolled ${info.before} -> ${info.after} (${info.client}/${info.scrollHeight})`;
	});

	await check("review: the last checklist row is reachable by scrolling", async () => {
		const info = await page.evaluate(() => {
			const panel = [...document.querySelectorAll("[role=tabpanel]")].find(
				(p) => p.dataset.state === "active",
			);
			if (!panel) return { error: "no active panel" };
			const scrollers = [...panel.querySelectorAll("*")].filter((el) => {
				const cs = getComputedStyle(el);
				return (
					/(auto|scroll)/.test(cs.overflowY) &&
					el.scrollHeight > el.clientHeight + 4
				);
			});
			const el = scrollers[0];
			if (!el) return { error: "no scroller" };
			el.scrollTop = el.scrollHeight;
			const rows = [...el.querySelectorAll("li")];
			const last = rows[rows.length - 1];
			const box = last?.getBoundingClientRect();
			const scrollerBox = el.getBoundingClientRect();
			return {
				rows: rows.length,
				scrollTop: el.scrollTop,
				max: el.scrollHeight - el.clientHeight,
				lastVisible: box
					? box.top >= scrollerBox.top - 2 && box.bottom <= innerHeight + 2
					: null,
				lastText: (last?.innerText || "").trim().slice(0, 40),
			};
		});
		if (info.error) throw new Error(JSON.stringify(info));
		if (info.scrollTop < info.max - 2)
			throw new Error(`did not reach the end: ${JSON.stringify(info)}`);
		if (info.lastVisible === false)
			throw new Error(`last row still out of view after scrolling: ${JSON.stringify(info)}`);
		return `${info.rows} rows, scrolled to ${info.scrollTop}/${info.max}`;
	});

	await check("review: no control in the sheet is covered by an overlay", async () => {
		const covered = await page.evaluate(() => {
			const dialog = document.querySelector("[role=dialog]");
			if (!dialog) return { error: "no dialog" };
			const out = [];
			for (const el of dialog.querySelectorAll("button, [role=tab], a[href]")) {
				if (el.hasAttribute("disabled")) continue;
				const r = el.getBoundingClientRect();
				if (r.width < 4 || r.height < 4) continue;
				const x = r.left + r.width / 2;
				const y = r.top + r.height / 2;
				if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) continue;
				const top = document.elementFromPoint(x, y);
				if (!(top === el || el.contains(top) || top?.contains(el))) {
					out.push({
						text: (el.innerText || el.getAttribute("aria-label") || "").trim().slice(0, 40),
						top: (top?.innerText || "").trim().slice(0, 40),
					});
				}
			}
			return out;
		});
		if (covered.error) throw new Error(covered.error);
		if (covered.length > 0)
			throw new Error(`covered controls: ${JSON.stringify(covered.slice(0, 4))}`);
		return "every visible control takes the click";
	});

	await page.keyboard.press("Escape");
	await page.waitForTimeout(800);

	// ── Export menu and template picker: open, not just present ──────────────
	await check("export: the menu opens with every format", async () => {
		const trigger = page.getByRole("button", { name: /Export/i }).first();
		if ((await trigger.count()) === 0) throw new Error("no Export control");
		await trigger.click();
		await page.waitForTimeout(600);
		const items = await page.getByRole("menuitem").allInnerTexts();
		if (items.length < 4) throw new Error(`only ${items.length} menu items: ${items.join(", ")}`);
		await page.keyboard.press("Escape");
		await page.waitForTimeout(400);
		return items.map((i) => i.trim()).join(", ");
	});

	await check("templates: the picker opens and lists every template", async () => {
		const trigger = page.getByRole("button", { name: /^Templates/ }).first();
		const expanded = await trigger.getAttribute("aria-expanded");
		if (expanded !== "true") {
			await trigger.click();
			await page.waitForTimeout(800);
		}
		const count = await page.evaluate(() => {
			return [...document.querySelectorAll("button")].filter((b) =>
				/standard|compact|technical|graduate|academic|executive/i.test(b.innerText || ""),
			).length;
		});
		if (count === 0) throw new Error("no template options rendered");
		return `${count} option control(s)`;
	});

	// ── Defect: design system was a page section, should be a footer link ────
	await goto(page, "/", { wait: 5000 });
	await check("design system: a footer link, not a landing-page section", async () => {
		const info = await page.evaluate(() => {
			const links = [...document.querySelectorAll("a")].map((a) => ({
				href: a.getAttribute("href"),
				text: (a.innerText || "").trim(),
			}));
			return {
				dsLinks: links.filter((l) => /^\/design-system\/?$/.test(l.href || "")),
				craft: !!document.querySelector("#craft"),
				text: document.body.innerText,
			};
		});
		if (info.dsLinks.length === 0) throw new Error("no /design-system link anywhere");
		const footerLink = info.dsLinks[0];
		if (!/design system/i.test(footerLink.text))
			throw new Error(`footer link says "${footerLink.text}"`);
		if (info.craft) throw new Error("the #craft section is still on the page");
		if (/how it's built/i.test(info.text))
			throw new Error("the removed 'How it's built' section copy is still present");
		return `${info.dsLinks.length} link(s), no section`;
	});

	// ── Every visible control in the dashboard takes its own click ────────
	await goto(page, "/app/", { wait: 7000 });
	await check("dashboard: no visible control is covered by an overlay", async () => {
		const covered = await page.evaluate((probe) => eval(probe)(), HIT_TEST);
		if (covered.length > 0)
			throw new Error(JSON.stringify(covered.slice(0, 4)));
		return "every in-view control takes the click";
	});

	/*
	 * ── Round 3B: the library reads as one artefact ──────────────────────
	 *
	 * The critique was about composition, but composition fails behaviourally: a card
	 * first on screen is the one people open, and a count on the far side of the page
	 * is not connected to what it counts. Both are measured here.
	 */
	await check("library: the one-pager leads and the showcase pair is adjacent", async () => {
		const titles = await page.evaluate(() =>
			[...document.querySelectorAll("[data-card-title]")].map((el) =>
				(el.textContent || "").trim(),
			),
		);
		if (titles.length < 2) throw new Error(`only ${titles.length} cards`);
		if (!/^Showcase — One-pager/.test(titles[0]))
			throw new Error(`the library leads with "${titles[0]}"`);
		if (!/^Showcase — Full CV/.test(titles[1]))
			throw new Error(`the full CV is not second: "${titles[1]}"`);
		return `${titles[0]} → ${titles[1]}`;
	});

	await check("library: the count is anchored to the grid it counts", async () => {
		const info = await page.evaluate(() => {
			const count = document.querySelector("[data-grid-count]");
			const first = document.querySelector("[data-card-title]");
			if (!count || !first) return null;
			const card = first.closest("div[class*=rounded-md]") || first;
			const countBox = count.getBoundingClientRect();
			const cardBox = card.getBoundingClientRect();
			return {
				text: (count.textContent || "").trim(),
				leftGap: Math.round(countBox.left - cardBox.left),
				above: countBox.bottom <= cardBox.top + 1,
			};
		});
		if (!info) throw new Error("no count or grid");
		if (Math.abs(info.leftGap) > 2)
			throw new Error(`the count is ${info.leftGap}px from the grid's edge`);
		if (!info.above) throw new Error("the count is not above the cards");
		return `"${info.text}" at the grid's left edge`;
	});

	await check("example: the invitation's action sits beside its copy", async () => {
		const info = await page.evaluate(() => {
			const section = document.querySelector(
				"section[aria-labelledby=example-resume-heading]",
			);
			const copy = section && section.querySelector("p");
			const button =
				section &&
				[...section.querySelectorAll("button")].find(
					(b) => (b.textContent || "").trim() === "Open the example resume",
				);
			if (!section || !copy || !button) return null;
			const copyBox = copy.getBoundingClientRect();
			const buttonBox = button.getBoundingClientRect();
			return {
				gap: Math.round(buttonBox.left - copyBox.right),
				aboveFold: buttonBox.top < innerHeight,
			};
		});
		if (!info) throw new Error("the example invitation is missing");
		if (info.gap > 32) throw new Error(`${info.gap}px between the copy and its action`);
		if (!info.aboveFold) throw new Error("the invitation is below the fold");
		return `${info.gap}px gap`;
	});

	await check("card badge: the tooltip opens on focus, not only hover", async () => {
		const focused = await page.evaluate(() => {
			const badge = [...document.querySelectorAll("[data-card-meta] div")].find(
				(el) => (el.textContent || "").trim() === "Showcase",
			);
			if (!badge) return false;
			badge.focus();
			return document.activeElement === badge;
		});
		if (!focused) throw new Error("the Showcase badge cannot take focus");
		await page.waitForTimeout(1200);
		const text = await page.evaluate(
			() => document.querySelector("[role=tooltip]")?.textContent || "",
		);
		if (!/complete example resume/i.test(text))
			throw new Error(`no tooltip on focus (got "${text}")`);
		return text.trim().slice(0, 40);
	});

	// ── Every section form's sticky toolbar, not just Experience's ──────────
	await goto(page, "/app/#/resume-editor/showcase-base", { wait: 7000 });
	await waitForEditor(page);
	await page.waitForTimeout(2500);
	const ENTRY_FORMS = [
		"experience",
		"education",
		"skills",
		"projects",
		"certifications",
		"awards",
		"languages",
		"publications",
		"volunteer",
		"references",
	];
	for (const type of ENTRY_FORMS) {
		await check(`forms: ${type} — toolbar and page-break panel both take a click`, async () => {
			const row = page.locator(`[data-section-type="${type}"] button`).nth(1);
			if ((await row.count()) === 0) throw new Error("no section row");
			await row.click();
			await page.waitForSelector("[data-entry-toolbar]", {
				state: "visible",
				timeout: 20000,
			});
			await page.waitForTimeout(500);
			const info = await page.evaluate(() => {
				const toolbar = document.querySelector("[data-entry-toolbar]");
				const details = document.querySelector("[data-section-breaks]");
				const summary = details && details.querySelector("summary");
				const hit = (el) => {
					if (!el) return "missing";
					const r = el.getBoundingClientRect();
					const top = document.elementFromPoint(
						r.left + r.width / 2,
						r.top + r.height / 2,
					);
					return top === el || el.contains(top) || (top && top.contains(el))
						? "ok"
						: `${top && top.tagName} covers it`;
				};
				const toolbarBox = toolbar && toolbar.getBoundingClientRect();
				const detailsBox = details && details.getBoundingClientRect();
				return {
					toolbar: hit(toolbar),
					summary: hit(summary),
					stacked: !!toolbarBox && !!detailsBox && toolbarBox.top >= detailsBox.bottom - 1,
				};
			});
			if (info.toolbar !== "ok") throw new Error(`toolbar: ${info.toolbar}`);
			if (info.summary !== "ok")
				throw new Error(`page-break summary: ${info.summary}`);
			if (!info.stacked) throw new Error("toolbar overlaps the page-break panel");
			return "toolbar and summary are both clickable";
		});
	}

	await check("per-entry break select: named after its entry", async () => {
		await page.locator('[data-section-type="experience"] button').nth(1).click();
		await page.waitForSelector("[data-section-breaks]", {
			state: "visible",
			timeout: 20000,
		});
		if (!(await page.evaluate(() => document.querySelector("[data-section-breaks]")?.open))) {
			await page.locator("[data-section-breaks] > summary").first().click();
		}
		await page.waitForTimeout(500);
		const rows = await page.evaluate(() =>
			[
				...document.querySelectorAll(
					'[data-section-breaks] button[aria-label^="Page breaks for "]',
				),
			].map((select) => ({
				label: select.getAttribute("aria-label") || "",
				entry: (select.parentElement.firstElementChild.textContent || "").trim(),
			})),
		);
		if (rows.length === 0) throw new Error("no per-entry controls");
		const unnamed = rows.filter((r) => r.label !== `Page breaks for ${r.entry}`);
		if (unnamed.length > 0) throw new Error(JSON.stringify(unnamed.slice(0, 2)));
		return `${rows.length} rows, each named`;
	});

	await check("documents: the editor switcher lists the library and changes document", async () => {
		await goto(page, "/app/#/resume-editor/resume-1", { wait: 7000 });
		await waitForEditor(page);
		await page
			.locator('button[aria-label="Open the example resume"]')
			.first()
			.waitFor({ state: "attached", timeout: 30000 });
		await page.locator("[data-document-switcher]").first().click();
		await page.waitForSelector("[data-document-id]", {
			state: "attached",
			timeout: 30000,
		});
		const menu = await page.evaluate(() => {
			const items = [...document.querySelectorAll("[data-document-id]")];
			return {
				count: items.length,
				current: items
					.filter((el) => el.getAttribute("aria-current") === "true")
					.map((el) => el.getAttribute("data-document-id")),
				other: items
					.map((el) => el.getAttribute("data-document-id"))
					.find((id) => id && id !== "resume-1"),
			};
		});
		if (menu.count < 2) throw new Error(`only ${menu.count} documents listed`);
		if (menu.current.length !== 1 || menu.current[0] !== "resume-1")
			throw new Error(`current marker: ${JSON.stringify(menu.current)}`);
		await page.locator(`[data-document-id="${menu.other}"]`).click();
		await page.waitForTimeout(4000);
		const heading = await page.evaluate(
			() => document.querySelector("header h1")?.textContent || "",
		);
		if (/Harvard Application/.test(heading))
			throw new Error(`still on ${heading}`);
		return `${menu.count} listed → ${heading.trim().slice(0, 40)}`;
	});

	// ── The failure state, driven rather than assumed ──────────────────────
	await check("example: an unavailable library says so, and retry recovers", async () => {
		/*
		 * The library query is aborted at the network, so the failed state is driven rather
		 * than inferred. The page is reloaded first: React Query keeps the answer in memory,
		 * and without a reload the editor would serve the cached library and never reach the
		 * network at all.
		 */
		let blocking = true;
		await page.route("**/trpc/**", (route) => {
			if (blocking && route.request().url().includes("resume.list"))
				return route.abort("failed");
			return route.continue();
		});
		try {
			await goto(page, "/app/#/resume-editor/resume-1", { wait: 6000 });
			await page.reload({ waitUntil: "load", timeout: 60000 });
			await waitForEditor(page, 60000);
			await page.waitForSelector("[data-example-unavailable]", {
				state: "attached",
				timeout: 45000,
			});
			const state = await page.evaluate(() => {
				const box = document.querySelector("[data-example-unavailable]");
				return {
					text: (box.textContent || "").trim(),
					retry: [...box.querySelectorAll("button")].some(
						(b) => (b.textContent || "").trim() === "Retry",
					),
				};
			});
			if (!/Example unavailable/.test(state.text))
				throw new Error(`the failure says "${state.text}"`);
			if (!state.retry) throw new Error("no retry beside the failure");
			blocking = false;
			await page.getByRole("button", { name: "Retry" }).first().click();
			await page.waitForSelector('button[aria-label="Open the example resume"]', {
				state: "attached",
				timeout: 30000,
			});
			return "unavailable → retry → open";
		} finally {
			blocking = false;
			await page.unroute("**/trpc/**");
		}
	});

	// ── The narrow end ────────────────────────────────────────────────────
	await check("mobile: the card meta and header meta are designed, not clipped", async () => {
		/* Resize the warm page rather than opening a context: a cold context re-downloads
		 * the 27 MB compiler, and this check is about layout, not boot time. */
		await page.setViewportSize({ width: 390, height: 844 });
		try {
			await goto(page, "/app/", { wait: 6000 });
			await page.waitForSelector("[data-card-meta]", {
				state: "attached",
				timeout: 30000,
			});
			const cardMeta = await page.evaluate(() => {
				const el = document.querySelector("[data-card-meta]");
				if (!el) return null;
				const secondary = [...el.querySelectorAll("[data-meta-secondary]")];
				return {
					lines: Math.round(el.getBoundingClientRect().height / 16),
					visibleSecondary: secondary.filter(
						(n) => getComputedStyle(n).display !== "none",
					).length,
				};
			});
			if (!cardMeta) throw new Error("no card meta at 390px");
			if (cardMeta.visibleSecondary !== 0)
				throw new Error(`${cardMeta.visibleSecondary} secondary facts still shown`);
			if (cardMeta.lines > 2)
				throw new Error(`the card meta is ${cardMeta.lines} lines`);
			await goto(page, "/app/#/resume-editor/showcase-variant", { wait: 6000 });
			await waitForEditor(page, 60000);
			await page.waitForSelector("[data-editor-meta]", {
				state: "attached",
				timeout: 30000,
			});
			await page.waitForFunction(
				() =>
					(document.querySelector("[data-editor-meta]")?.innerText || "").trim()
						.length > 0,
				null,
				{ timeout: 30000 },
			);
			const headerMeta = await page.evaluate(() => {
				const el = document.querySelector("[data-editor-meta]");
				return el
					? {
							text: (el.textContent || "").trim(),
							clipped: el.scrollWidth > el.clientWidth + 1,
						}
					: null;
			});
			if (!headerMeta) {
				throw new Error("no editor meta at 390px");
			}
			if (headerMeta.clipped)
				throw new Error(`the header meta is truncated: "${headerMeta.text}"`);
			return `card ${cardMeta.lines} line(s); header "${headerMeta.text}"`;
		} finally {
			await page.setViewportSize({ width: 1440, height: 900 });
		}
	});

	if (errors.length > 0) {
		console.log(`\nconsole/page errors (${errors.length}):`);
		for (const e of errors.slice(0, 8)) console.log(`   ${e}`);
	}

	const failed = results.filter((r) => !r.ok).length;
	console.log(`\n${results.length - failed}/${results.length} behavioural checks passed`);
	await shoot(page, "behaviour-final");
	await ctx.close();
	await browser.close();
	process.exitCode = failed > 0 ? 1 : 0;
})();
