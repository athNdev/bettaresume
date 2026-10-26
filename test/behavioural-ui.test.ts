/**
 * The behavioural gate.
 *
 * A screenshot is necessary and never sufficient. Three defects shipped through a green
 * suite because every gate in this repo either read source or measured geometry:
 *
 *  - the Review sheet had no scrollable body (the Radix `Tabs.Root` was a block, so the
 *    `flex-1` panel never received a height),
 *  - a `sticky` form toolbar with `-mt-6` sat on top of the "Page breaks" `<details>`, so
 *    its summary was visible and unclickable,
 *  - the example resume existed on the dashboard but was not recognisable as one.
 *
 * This file drives each of those as a user would and fails when the *outcome* is wrong.
 * It does not assert pixels; it asserts that a control takes the click, that a region
 * moves under `scrollTop`, and that a disclosure actually opens.
 *
 * Why it is gated behind `BEHAVIOURAL_UI=1`
 *   It needs the dev stack — `next dev` with the dev auth bypass plus `wrangler dev` and
 *   a seeded D1. `npx vitest run` on a clean checkout has none of those, so the suite is
 *   skipped (never silently passed) outside `.github/workflows/responsive.yml`, which
 *   starts that stack for the viewport matrix. Locally:
 *
 *     node scripts/probe-start.cjs api web
 *     npm run db:reset-seed
 *     BEHAVIOURAL_UI=1 npx vitest run test/behavioural-ui.test.ts
 *
 * Playwright is not a dependency — it is installed ad hoc in the workflow that needs a
 * browser. The module is imported through a variable specifier so `tsc --noEmit` still
 * works on a clean `npm ci`.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

interface ProbeLocator {
	first(): ProbeLocator;
	nth(index: number): ProbeLocator;
	count(): Promise<number>;
	click(): Promise<void>;
	innerText(): Promise<string>;
	getAttribute(name: string): Promise<string | null>;
	allInnerTexts(): Promise<string[]>;
	boundingBox(): Promise<{
		x: number;
		y: number;
		width: number;
		height: number;
	} | null>;
	waitFor(options: {
		state: "visible" | "attached";
		timeout?: number;
	}): Promise<void>;
	locator(selector: string): ProbeLocator;
}

interface ProbePage {
	goto(
		url: string,
		options?: { waitUntil?: string; timeout?: number },
	): Promise<unknown>;
	waitForSelector(
		selector: string,
		options?: { state?: "visible" | "attached"; timeout?: number },
	): Promise<unknown>;
	waitForTimeout(ms: number): Promise<void>;
	locator(selector: string): ProbeLocator;
	getByRole(role: string, options?: { name?: string | RegExp }): ProbeLocator;
	evaluate<R>(fn: () => R): Promise<R>;
	evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R>;
	keyboard: { press(key: string): Promise<void> };
	setDefaultTimeout(ms: number): void;
}

interface ProbeContext {
	newPage(): Promise<ProbePage>;
	close(): Promise<void>;
}

interface ProbeBrowser {
	newContext(options: {
		viewport: { width: number; height: number };
	}): Promise<ProbeContext>;
	close(): Promise<void>;
}

interface ProbeChromium {
	launch(options: {
		channel?: string;
		headless?: boolean;
	}): Promise<ProbeBrowser>;
}

const ENABLED = process.env.BEHAVIOURAL_UI === "1";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

/** The scrollable ancestor of `selector`, driven rather than merely measured. */
async function driveScroll(
	page: ProbePage,
	selector: string,
): Promise<{
	error?: string;
	chain?: { tag: string; classes: string; height: number; overflowY: string }[];
	before?: number;
	after?: number;
	max?: number;
	atEnd?: boolean;
}> {
	return page.evaluate((sel: string) => {
		const start = document.querySelector(sel);
		if (!start) return { error: `no element for ${sel}` };
		let el: Element | null = start;
		let scroller: HTMLElement | null = null;
		while (el) {
			const style = getComputedStyle(el);
			if (
				/(auto|scroll)/.test(style.overflowY) &&
				el.scrollHeight > el.clientHeight + 4
			) {
				scroller = el as HTMLElement;
				break;
			}
			el = el.parentElement;
		}
		if (!scroller) {
			const chain: {
				tag: string;
				classes: string;
				height: number;
				overflowY: string;
			}[] = [];
			let node: Element | null = start;
			while (node && node !== document.body) {
				chain.push({
					tag: node.tagName,
					classes: String(node.className).slice(0, 50),
					height: Math.round(node.getBoundingClientRect().height),
					overflowY: getComputedStyle(node).overflowY,
				});
				node = node.parentElement;
			}
			return { error: "no scrollable ancestor", chain: chain.slice(0, 8) };
		}
		const before = scroller.scrollTop;
		const max = scroller.scrollHeight - scroller.clientHeight;
		scroller.scrollTop = Math.min(max, before + 240);
		return {
			before,
			after: scroller.scrollTop,
			max,
			atEnd: scroller.scrollTop >= max - 2,
		};
	}, selector);
}

/** The topmost element at the control's centre must belong to the control. */
async function coveredControls(page: ProbePage): Promise<
	{
		text: string;
		tag: string;
		coveredBy: string | null;
	}[]
> {
	return page.evaluate(() => {
		const out: { text: string; tag: string; coveredBy: string | null }[] = [];
		const controls = [
			...document.querySelectorAll<HTMLElement>(
				"main button, main a[href], main summary, [role=dialog] button, [role=dialog] [role=tab]",
			),
		];
		for (const el of controls) {
			if (el.closest("[aria-hidden=true]")) continue;
			if (el.hasAttribute("disabled")) continue;
			const rect = el.getBoundingClientRect();
			if (rect.width < 4 || rect.height < 4) continue;
			const x = rect.left + rect.width / 2;
			const y = rect.top + rect.height / 2;
			if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight)
				continue;
			const top = document.elementFromPoint(x, y);
			const ok = top === el || el.contains(top) || top?.contains(el);
			if (!ok) {
				out.push({
					text: (el.innerText || el.getAttribute("aria-label") || "")
						.trim()
						.slice(0, 50),
					tag: el.tagName,
					coveredBy: (top?.textContent || "").trim().slice(0, 40) || null,
				});
			}
		}
		return out;
	});
}

async function openExample(page: ProbePage): Promise<void> {
	await page.goto(`${BASE}/app/`, { waitUntil: "load", timeout: 60_000 });
	await page.waitForTimeout(6_000);
	await page
		.getByRole("button", { name: /^Open the example resume$/i })
		.first()
		.click();
	await page.waitForSelector("[data-editor-shell]", {
		state: "attached",
		timeout: 60_000,
	});
	await page.waitForTimeout(2_500);
}

describe.skipIf(!ENABLED)(
	"the app answers to a user, not only a screenshot",
	() => {
		let browser: ProbeBrowser;
		let context: ProbeContext;
		let page: ProbePage;

		beforeAll(async () => {
			const specifier = "playwright";
			const { chromium } = (await import(specifier)) as unknown as {
				chromium: ProbeChromium;
			};
			try {
				browser = await chromium.launch({ channel: "chrome", headless: true });
			} catch {
				browser = await chromium.launch({ headless: true });
			}
			context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
			});
			page = await context.newPage();
			page.setDefaultTimeout(15_000);
		}, 120_000);

		afterAll(async () => {
			await context?.close();
			await browser?.close();
		});

		it("makes the example resume discoverable, and opens it", async () => {
			await page.goto(`${BASE}/app/`, { waitUntil: "load", timeout: 60_000 });
			await page
				.getByRole("button", { name: /^Open the example resume$/i })
				.first()
				.waitFor({ state: "visible", timeout: 30_000 });

			const entry = await page.evaluate(() => {
				const heading = [...document.querySelectorAll("h1,h2,h3")].find(
					(h) => (h.textContent || "").trim() === "Example resume",
				);
				const button = [...document.querySelectorAll("button")].find(
					(b) => (b.textContent || "").trim() === "Open the example resume",
				);
				if (!heading || !button)
					return { heading: false, button: false, y: 0, viewport: 0 };
				return {
					heading: true,
					button: true,
					y: Math.round(button.getBoundingClientRect().top),
					viewport: window.innerHeight,
				};
			});
			expect(entry.heading, "the dashboard names the example").toBe(true);
			expect(entry.button, "the dashboard offers the example").toBe(true);
			expect(
				entry.y,
				"the example control is above the fold, not hidden below the grid",
			).toBeLessThan(entry.viewport);

			await page
				.getByRole("button", { name: /^Open the example resume$/i })
				.first()
				.click();
			await page.waitForSelector("[data-editor-shell]", {
				state: "attached",
				timeout: 60_000,
			});
			await page.waitForTimeout(2_500);

			const meta = await page.evaluate(
				() => document.querySelector("[data-editor-meta]")?.textContent ?? "",
			);
			expect(meta).toMatch(/showcase/i);
		}, 90_000);

		it("opens the page-break panel and changes a break setting", async () => {
			await openExample(page);
			const experience = page
				.getByRole("button", { name: /^Experience$/ })
				.first();
			await experience.click();
			await page.waitForSelector("[data-section-breaks]", {
				state: "visible",
				timeout: 30_000,
			});

			const summary = page.locator("[data-section-breaks] > summary").first();
			const box = await summary.boundingBox();
			expect(box, "the page-break summary has a box").not.toBeNull();
			if (!box) return;
			const covered = await page.evaluate(
				({ x, y }: { x: number; y: number }) => {
					const top = document.elementFromPoint(x, y);
					return !top?.closest("[data-section-breaks]");
				},
				{ x: box.x + box.width / 2, y: box.y + box.height / 2 },
			);
			expect(
				covered,
				"the summary must not be covered by the sticky form toolbar",
			).toBe(false);

			await summary.click();
			await page.waitForTimeout(500);
			const opened = await page.evaluate(
				() =>
					(
						document.querySelector(
							"[data-section-breaks]",
						) as HTMLDetailsElement
					).open,
			);
			expect(opened, "clicking the summary opens the disclosure").toBe(true);

			const toggle = page.getByRole("switch", {
				name: /Keep the whole section on one page/i,
			});
			const before = await toggle.first().getAttribute("aria-checked");
			await toggle.first().click();
			await page.waitForTimeout(900);
			const after = await toggle.first().getAttribute("aria-checked");
			expect(after, "the break control actually reacts").not.toBe(before);
			await toggle.first().click();
		}, 90_000);

		it("scrolls the section form to its last field", async () => {
			await openExample(page);
			await page
				.getByRole("button", { name: /^Experience$/ })
				.first()
				.click();
			await page.waitForSelector("[data-section-breaks]", {
				state: "visible",
				timeout: 30_000,
			});

			const moved = await driveScroll(page, "[data-section-breaks]");
			expect(moved.error, JSON.stringify(moved.chain ?? [])).toBeUndefined();
			expect(moved.after ?? 0).toBeGreaterThan(moved.before ?? 0);

			const atEnd = await page.evaluate(() => {
				let el: Element | null = document.querySelector(
					"[data-section-breaks]",
				);
				while (el) {
					const style = getComputedStyle(el);
					if (
						/(auto|scroll)/.test(style.overflowY) &&
						el.scrollHeight > el.clientHeight + 4
					) {
						break;
					}
					el = el.parentElement;
				}
				if (!el) return { error: "no scroller", scrollTop: 0, max: 0 };
				const scroller = el as HTMLElement;
				scroller.scrollTop = scroller.scrollHeight;
				return {
					error: undefined as string | undefined,
					scrollTop: scroller.scrollTop,
					max: scroller.scrollHeight - scroller.clientHeight,
				};
			});
			expect(atEnd.error).toBeUndefined();
			expect(atEnd.scrollTop).toBeGreaterThanOrEqual((atEnd.max ?? 0) - 2);
		}, 90_000);

		it("opens every rail disclosure", async () => {
			await openExample(page);
			for (const label of ["Sections", "Templates", "Library"]) {
				const trigger = page
					.getByRole("button", { name: new RegExp(`^${label}`) })
					.first();
				const before = await trigger.getAttribute("aria-expanded");
				if (before !== "true") await trigger.click();
				await page.waitForTimeout(600);
				expect(
					await trigger.getAttribute("aria-expanded"),
					`${label} did not open`,
				).toBe("true");
			}
		}, 90_000);

		it("scrolls every review tab, and shows exactly one panel at a time", async () => {
			await openExample(page);
			await page.getByRole("button", { name: /^Review/ }).click();
			await page.waitForTimeout(1_500);

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
				expect(names, `missing the ${expected} tab`).toContain(expected);
			}

			for (const tab of names) {
				await page.getByRole("tab", { name: tab }).click();
				await page.waitForTimeout(400);
				const panels = await page.evaluate(() => {
					const all = [
						...document.querySelectorAll<HTMLElement>("[role=tabpanel]"),
					];
					const visible = all.filter((panel) => {
						const rect = panel.getBoundingClientRect();
						return (
							rect.width > 0 &&
							rect.height > 0 &&
							getComputedStyle(panel).display !== "none"
						);
					});
					return {
						total: all.length,
						visible: visible.length,
						active: all.filter((p) => p.dataset.state === "active").length,
						height: visible[0]?.getBoundingClientRect().height ?? 0,
					};
				});
				expect(panels.total).toBeGreaterThan(0);
				expect(
					panels.visible,
					`${tab}: force-mounted panels are stacking`,
				).toBe(1);
				expect(panels.active, `${tab}: exactly one active panel`).toBe(1);
				expect(
					panels.height,
					`${tab}: the active panel has no height`,
				).toBeGreaterThan(100);
			}

			await page.getByRole("tab", { name: "Checklist" }).click();
			await page.waitForTimeout(400);
			const scroll = await page.evaluate(() => {
				const panel = [
					...document.querySelectorAll<HTMLElement>("[role=tabpanel]"),
				].find((p) => p.dataset.state === "active");
				if (!panel)
					return {
						error: "no active panel" as string | undefined,
						before: 0,
						after: 0,
						max: 0,
						rows: 0,
						lastVisible: undefined as boolean | undefined,
					};
				const scroller = [...panel.querySelectorAll<HTMLElement>("*")].find(
					(el) => {
						const style = getComputedStyle(el);
						return (
							/(auto|scroll)/.test(style.overflowY) &&
							el.scrollHeight > el.clientHeight + 4
						);
					},
				);
				if (!scroller)
					return {
						error: "the checklist body has no scroll container" as
							| string
							| undefined,
						before: 0,
						after: 0,
						max: 0,
						rows: 0,
						lastVisible: undefined as boolean | undefined,
					};
				const before = scroller.scrollTop;
				scroller.scrollTop = scroller.scrollHeight;
				const rows = scroller.querySelectorAll("li");
				const last = rows[rows.length - 1];
				const lastBox = last?.getBoundingClientRect();
				const bodyBox = scroller.getBoundingClientRect();
				return {
					error: undefined as string | undefined,
					before,
					after: scroller.scrollTop,
					max: scroller.scrollHeight - scroller.clientHeight,
					rows: rows.length,
					lastVisible: lastBox
						? lastBox.top >= bodyBox.top - 2 &&
							lastBox.bottom <= window.innerHeight + 2
						: null,
				};
			});
			expect(scroll.error).toBeUndefined();
			expect(scroll.after ?? 0).toBeGreaterThan(scroll.before ?? 0);
			expect(scroll.after ?? 0).toBeGreaterThanOrEqual((scroll.max ?? 0) - 2);
			expect(scroll.lastVisible, "the last finding is reachable").not.toBe(
				false,
			);

			const covered = await page.evaluate(() => {
				const dialog = document.querySelector("[role=dialog]");
				if (!dialog)
					return [{ text: "no dialog", tag: "DIV", coveredBy: null }];
				const out: { text: string; tag: string; coveredBy: string | null }[] =
					[];
				for (const el of dialog.querySelectorAll<HTMLElement>(
					"button, [role=tab], a[href]",
				)) {
					if (el.hasAttribute("disabled")) continue;
					const rect = el.getBoundingClientRect();
					if (rect.width < 4 || rect.height < 4) continue;
					const x = rect.left + rect.width / 2;
					const y = rect.top + rect.height / 2;
					if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight)
						continue;
					const top = document.elementFromPoint(x, y);
					if (!(top === el || el.contains(top) || top?.contains(el))) {
						out.push({
							text: (el.innerText || el.getAttribute("aria-label") || "")
								.trim()
								.slice(0, 40),
							tag: el.tagName,
							coveredBy: (top?.textContent || "").trim().slice(0, 40) || null,
						});
					}
				}
				return out;
			});
			expect(covered, JSON.stringify(covered)).toEqual([]);
		}, 90_000);

		it("leaves no visible control covered by an overlay", async () => {
			await page.goto(`${BASE}/app/`, { waitUntil: "load", timeout: 60_000 });
			await page.waitForTimeout(6_000);
			expect(await coveredControls(page)).toEqual([]);
		}, 90_000);

		it("keeps the design system out of the landing page and in the footer", async () => {
			await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 60_000 });
			await page.waitForTimeout(800);
			const info = await page.evaluate(() => ({
				links: [...document.querySelectorAll("a")]
					.map((a) => a.getAttribute("href") ?? "")
					.filter((href) => /^\/design-system\/?$/.test(href)),
				craft: Boolean(document.querySelector("#craft")),
				text: document.body.innerText,
			}));
			expect(
				info.links.length,
				"the footer links to the design system",
			).toBeGreaterThan(0);
			expect(
				info.craft,
				"the design system is not a landing-page section",
			).toBe(false);
			expect(info.text).not.toMatch(/how it's built/i);
		});

		it("works at 390px: the example is reachable, and the form and breaks open", async () => {
			// The same defects have to be absent at the narrow end. The editor becomes three
			// modes, so this drives the mode bar rather than assuming the desktop panes.
			const small = await browser.newContext({
				viewport: { width: 390, height: 844 },
			});
			const narrow = await small.newPage();
			narrow.setDefaultTimeout(15_000);
			try {
				await narrow.goto(`${BASE}/app/`, {
					waitUntil: "load",
					timeout: 60_000,
				});
				const exampleButton = narrow
					.getByRole("button", { name: /^Open the example resume$/i })
					.first();
				await exampleButton.waitFor({ state: "visible", timeout: 30_000 });
				const example = await narrow.evaluate(() => {
					const button = [...document.querySelectorAll("button")].find(
						(b) => (b.textContent || "").trim() === "Open the example resume",
					);
					return button
						? {
								y: Math.round(button.getBoundingClientRect().top),
								viewport: window.innerHeight,
							}
						: null;
				});
				expect(example, "the example control exists at 390px").not.toBeNull();
				expect(example?.y ?? 0).toBeLessThan(example?.viewport ?? 0);

				await exampleButton.click();
				await narrow.waitForSelector("[data-editor-shell]", {
					state: "attached",
					timeout: 60_000,
				});
				await narrow.waitForTimeout(2_500);

				const modes = narrow
					.locator('nav[aria-label="Editor view"]')
					.locator("button");
				expect(await modes.count()).toBe(3);
				await modes.nth(0).click(); // Sections
				await narrow.waitForTimeout(500);
				await narrow
					.getByRole("button", { name: /^Experience$/ })
					.first()
					.click();
				await modes.nth(1).click(); // Form
				await narrow.waitForSelector("[data-section-breaks]", {
					state: "visible",
					timeout: 30_000,
				});

				const summary = narrow
					.locator("[data-section-breaks] > summary")
					.first();
				await summary.click();
				await narrow.waitForTimeout(500);
				const open = await narrow.evaluate(
					() =>
						(
							document.querySelector(
								"[data-section-breaks]",
							) as HTMLDetailsElement
						).open,
				);
				expect(open, "page breaks open at 390px").toBe(true);

				const moved = await driveScroll(narrow, "[data-section-breaks]");
				expect(moved.error, JSON.stringify(moved.chain ?? [])).toBeUndefined();
				expect(moved.after ?? 0).toBeGreaterThan(moved.before ?? 0);
			} finally {
				await small.close();
			}
		}, 120_000);
	},
);
