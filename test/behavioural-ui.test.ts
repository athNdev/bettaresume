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
	click(options?: { noWaitAfter?: boolean }): Promise<void>;
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
	waitForFunction(
		fn: (arg: never) => boolean,
		arg?: unknown,
		options?: { timeout?: number },
	): Promise<unknown>;
	waitForSelector(
		selector: string,
		options?: { state?: "visible" | "attached" | "detached"; timeout?: number },
	): Promise<unknown>;
	waitForTimeout(ms: number): Promise<void>;
	locator(selector: string): ProbeLocator;
	getByRole(role: string, options?: { name?: string | RegExp }): ProbeLocator;
	evaluate<R>(fn: () => R): Promise<R>;
	evaluate<R, A>(fn: (arg: A) => R, arg: A): Promise<R>;
	keyboard: { press(key: string): Promise<void> };
	setDefaultTimeout(ms: number): void;
	close(): Promise<void>;
	/**
	 * Intercept requests. Used to make one query fail on purpose, so the failed state
	 * is driven rather than inferred.
	 */
	route(
		url: string,
		handler: (route: {
			request(): { url(): string };
			abort(kind?: string): Promise<void>;
			continue(): Promise<void>;
		}) => void | Promise<void>,
	): Promise<void>;
	unroute(url: string): Promise<void>;
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

/**
 * Select a section from the rail and wait until the form pane agrees.
 *
 * The rail is a scroll area and the row is a drag item, so a click that lands while
 * the list is still settling can be delivered to the row above it. Verifying the
 * *outcome* and retrying once is what keeps the check honest: the assertion below the
 * click is still that the section became active and its toolbar took a click.
 */
async function selectSection(page: ProbePage, type: string): Promise<void> {
	const row = page.locator(`[data-section-type="${type}"] button`).nth(1);
	for (let attempt = 0; attempt < 3; attempt++) {
		await row.click();
		try {
			await page.waitForSelector(`[data-active-section-type="${type}"]`, {
				state: "attached",
				timeout: 8_000,
			});
			return;
		} catch {
			if (attempt === 2) throw new Error(`${type}: the section never opened`);
		}
	}
}

async function openExample(page: ProbePage): Promise<void> {
	await page.goto(`${BASE}/app/#/dashboard`, {
		waitUntil: "load",
		timeout: 60_000,
	});
	await page.waitForTimeout(6_000);
	await page
		.getByRole("button", { name: /^Open the example resume$/i })
		.first()
		.click({ noWaitAfter: true });
	await page.waitForSelector("[data-editor-shell]", {
		state: "attached",
		timeout: 60_000,
	});
	// The shell mounts before the document does. Waiting for the identity line to have
	// text is the honest "the editor is usable" signal, and it removes a fixed sleep
	// that the rest of the suite was implicitly racing.
	await page.waitForFunction(
		() =>
			(document.querySelector("[data-editor-meta]")?.textContent ?? "").trim()
				.length > 0,
		undefined,
		{ timeout: 60_000 },
	);
}

describe.skipIf(!ENABLED)(
	"the app answers to a user, not only a screenshot",
	/*
	 * One retry, and it is for the harness rather than the product.
	 *
	 * This suite drives a dev server that compiles routes on demand and a browser that
	 * holds the Typst WASM compiler; on a loaded machine a page can take ten seconds to
	 * mount, which no amount of assertion design removes. A retried run still fails a
	 * real defect — the assertion is unchanged — and it stops a slow boot from being
	 * reported as a broken control.
	 */
	{ retry: 1 },
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
				.click({ noWaitAfter: true });
			await page.waitForSelector("[data-editor-shell]", {
				state: "attached",
				timeout: 60_000,
			});
			await page.waitForFunction(
				() =>
					(
						document.querySelector("[data-editor-meta]")?.textContent ?? ""
					).trim().length > 0,
				undefined,
				{ timeout: 60_000 },
			);

			const meta = await page.evaluate(
				() => document.querySelector("[data-editor-meta]")?.textContent ?? "",
			);
			expect(meta).toMatch(/showcase/i);
		}, 90_000);

		it("opens the page-break panel and changes a break setting", async () => {
			await openExample(page);
			await selectSection(page, "experience");
			await page.waitForSelector(
				'[data-active-section-type="experience"] [data-section-breaks]',
				{ state: "visible", timeout: 30_000 },
			);

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
			await selectSection(page, "experience");
			await page.waitForSelector(
				'[data-active-section-type="experience"] [data-section-breaks]',
				{ state: "visible", timeout: 30_000 },
			);

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
				await page.waitForFunction(
					(expected: string) => {
						const button = [...document.querySelectorAll("button")].find((b) =>
							new RegExp(`^${expected}`).test((b.textContent ?? "").trim()),
						);
						return button?.getAttribute("aria-expanded") === "true";
					},
					label,
					{ timeout: 30_000 },
				);
				expect(
					await trigger.getAttribute("aria-expanded"),
					`${label} did not open`,
				).toBe("true");
			}
		}, 120_000);

		it("scrolls every review tab, and shows exactly one panel at a time", async () => {
			await openExample(page);
			await page.getByRole("button", { name: /^Review/ }).click();
			await page.waitForSelector("[role=tab]", {
				state: "attached",
				timeout: 30_000,
			});

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
			await page.goto(`${BASE}/app/#/dashboard`, {
				waitUntil: "load",
				timeout: 60_000,
			});
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

		it("orders the library so the example reads as one pair", async () => {
			await page.goto(`${BASE}/app/#/dashboard`, {
				waitUntil: "load",
				timeout: 60_000,
			});
			await page.waitForTimeout(6_000);
			const titles = await page.evaluate(() =>
				[...document.querySelectorAll("[data-card-title]")].map((el) =>
					(el.textContent ?? "").trim(),
				),
			);
			expect(titles.length, "the seeded library renders").toBeGreaterThan(1);
			expect(
				titles[0],
				"the one-pager is the stronger artefact and leads",
			).toMatch(/^Showcase — One-pager/);
			expect(
				titles[1],
				"the full CV follows it, so the pair is adjacent",
			).toMatch(/^Showcase — Full CV/);
		}, 90_000);

		it("anchors the result count to the grid it counts", async () => {
			await page.goto(`${BASE}/app/#/dashboard`, {
				waitUntil: "load",
				timeout: 60_000,
			});
			await page.waitForTimeout(6_000);
			const info = await page.evaluate(() => {
				const count = document.querySelector("[data-grid-count]");
				const first = document.querySelector("[data-card-title]");
				if (!count || !first) return null;
				const card = first.closest("div[class*=rounded-md]") ?? first;
				const countBox = count.getBoundingClientRect();
				const cardBox = card.getBoundingClientRect();
				return {
					text: (count.textContent ?? "").trim(),
					leftGap: Math.round(countBox.left - cardBox.left),
					aboveCard: countBox.bottom <= cardBox.top + 1,
					extra: Math.round(
						document.documentElement.clientWidth - countBox.right,
					),
				};
			});
			expect(info, "the count and the grid are both on screen").not.toBeNull();
			expect(info?.text).toMatch(/\d+ resumes?/);
			expect(
				Math.abs(info?.leftGap ?? 99),
				"the count is aligned with the cards, not floating at the page's right edge",
			).toBeLessThanOrEqual(2);
			expect(info?.aboveCard, "the count sits directly above the grid").toBe(
				true,
			);
		}, 90_000);

		it("keeps the example invitation's action beside its words", async () => {
			await page.goto(`${BASE}/app/#/dashboard`, {
				waitUntil: "load",
				timeout: 60_000,
			});
			await page.waitForTimeout(6_000);
			const info = await page.evaluate(() => {
				const section = document.querySelector(
					"section[aria-labelledby=example-resume-heading]",
				);
				const copy = section?.querySelector("p");
				const button = [...(section?.querySelectorAll("button") ?? [])].find(
					(b) => (b.textContent ?? "").trim() === "Open the example resume",
				);
				if (!section || !copy || !button) return null;
				const copyBox = copy.getBoundingClientRect();
				const buttonBox = button.getBoundingClientRect();
				return {
					gap: Math.round(buttonBox.left - copyBox.right),
					below: buttonBox.top >= copyBox.bottom - 1,
					aboveFold: buttonBox.top < window.innerHeight,
				};
			});
			expect(info, "the example invitation renders").not.toBeNull();
			expect(
				info?.gap ?? 999,
				`the action is stranded ${info?.gap}px from the copy it belongs to`,
			).toBeLessThanOrEqual(32);
			expect(info?.aboveFold, "the invitation is still above the fold").toBe(
				true,
			);
		}, 90_000);

		it("hit-tests the entry toolbar of every section form", async () => {
			/*
			 * Every entry-list section shares one sticky toolbar, and that toolbar's `-mt-6`
			 * is what sat on top of the page-break disclosure. Experience was the only form
			 * driven before; the other nine had no evidence at all.
			 */
			const types = [
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
			await openExample(page);
			const failures: string[] = [];
			for (const type of types) {
				const row = page.locator(`[data-section-type="${type}"] button`).nth(1);
				try {
					await row.waitFor({ state: "attached", timeout: 30_000 });
				} catch {
					const diag = await page.evaluate(() => ({
						shell: Boolean(document.querySelector("[data-editor-shell]")),
						rows: document.querySelectorAll("[data-section-type]").length,
						href: location.href,
					}));
					failures.push(`${type}: no section row ${JSON.stringify(diag)}`);
					continue;
				}
				await selectSection(page, type);
				try {
					await page.waitForSelector(
						`[data-active-section-type="${type}"] [data-entry-toolbar]`,
						{ state: "visible", timeout: 20_000 },
					);
				} catch {
					const state = await page.evaluate(() => ({
						active: document
							.querySelector("[data-active-section-type]")
							?.getAttribute("data-active-section-type"),
						toolbar: Boolean(document.querySelector("[data-entry-toolbar]")),
						body: document.body.innerText.slice(0, 160),
					}));
					throw new Error(`${type}: ${JSON.stringify(state)}`);
				}
				await page.waitForTimeout(400);
				const result = await page.evaluate(() => {
					const toolbar = document.querySelector("[data-entry-toolbar]");
					const details = document.querySelector("[data-section-breaks]");
					const summary = details?.querySelector("summary");
					const hit = (el: Element | null | undefined) => {
						if (!el) return "missing";
						const r = el.getBoundingClientRect();
						const top = document.elementFromPoint(
							r.left + r.width / 2,
							r.top + r.height / 2,
						);
						return top === el || el.contains(top) || top?.contains(el)
							? "ok"
							: `${top?.tagName ?? "nothing"} covers it`;
					};
					const toolbarBox = toolbar?.getBoundingClientRect();
					const detailsBox = details?.getBoundingClientRect();
					return {
						toolbar: hit(toolbar),
						summary: hit(summary),
						stacked:
							toolbarBox && detailsBox
								? toolbarBox.top >= detailsBox.bottom - 1
								: false,
					};
				});
				if (result.toolbar !== "ok")
					failures.push(`${type}: toolbar ${result.toolbar}`);
				if (result.summary !== "ok")
					failures.push(`${type}: page-break summary ${result.summary}`);
				if (!result.stacked)
					failures.push(`${type}: toolbar overlaps the page-break panel`);
			}
			expect(failures, failures.join("; ")).toEqual([]);
		}, 180_000);

		it("says the example is unavailable, and recovers on retry", async () => {
			/*
			 * The failed state has to be driven, not assumed: the library query is aborted at
			 * the network, and the header must say so rather than render nothing. The document
			 * itself is a separate request, which is why the editor still has a header here.
			 *
			 * A fresh context, because React Query's cache would otherwise answer the library
			 * query from the previous test and never reach the network at all.
			 */
			const isolated = await browser.newContext({
				viewport: { width: 1440, height: 900 },
			});
			const blocked = await isolated.newPage();
			blocked.setDefaultTimeout(15_000);
			let blocking = true;
			await blocked.route("**/trpc/**", (route) => {
				if (blocking && route.request().url().includes("resume.list")) {
					return route.abort("failed");
				}
				return route.continue();
			});
			try {
				await blocked.goto(`${BASE}/app/#/resume-editor/resume-1`, {
					waitUntil: "load",
					timeout: 60_000,
				});
				await blocked.waitForSelector("[data-editor-shell]", {
					state: "attached",
					timeout: 60_000,
				});
				await blocked.waitForSelector("[data-example-unavailable]", {
					state: "attached",
					timeout: 60_000,
				});
				const state = await blocked.evaluate(() => {
					const box = document.querySelector("[data-example-unavailable]");
					return {
						text: (box?.textContent ?? "").trim(),
						retry: [...(box?.querySelectorAll("button") ?? [])].some(
							(b) => (b.textContent ?? "").trim() === "Retry",
						),
						example: [...document.querySelectorAll("button")].some((b) =>
							/^Open the example resume$/.test(
								b.getAttribute("aria-label") ?? "",
							),
						),
					};
				});
				expect(state.text).toContain("Example unavailable");
				expect(state.retry, "the failed state offers a retry").toBe(true);
				expect(
					state.example,
					"the entry point is replaced, not hidden beside a message",
				).toBe(false);

				blocking = false;
				await blocked.getByRole("button", { name: "Retry" }).first().click();
				await blocked.waitForSelector(
					'button[aria-label="Open the example resume"]',
					{ state: "attached", timeout: 30_000 },
				);
				const recovered = await blocked.evaluate(() => ({
					unavailable: Boolean(
						document.querySelector("[data-example-unavailable]"),
					),
					example: [...document.querySelectorAll("button")].some((b) =>
						/^Open the example resume$/.test(
							b.getAttribute("aria-label") ?? "",
						),
					),
				}));
				expect(recovered.unavailable, "the failure notice is gone").toBe(false);
				expect(
					recovered.example,
					"retry restores the example entry point",
				).toBe(true);
			} finally {
				blocking = false;
				await isolated.close();
			}
		}, 180_000);

		it("switches documents from the editor without going back", async () => {
			await page.goto(`${BASE}/app/#/resume-editor/resume-1`, {
				waitUntil: "load",
				timeout: 60_000,
			});
			await page.waitForSelector("[data-editor-shell]", {
				state: "attached",
				timeout: 60_000,
			});
			// The example control and the switcher are fed by the same library query; waiting
			// for the first is how this test knows the second has something to list.
			await page.waitForSelector(
				'button[aria-label="Open the example resume"]',
				{
					state: "attached",
					timeout: 30_000,
				},
			);
			await page.locator("[data-document-switcher]").first().click();
			await page.waitForSelector("[data-document-id]", {
				state: "attached",
				timeout: 30_000,
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
			expect(menu.count, "the switcher lists the library").toBeGreaterThan(1);
			expect(menu.current, "the open document is marked as current").toEqual([
				"resume-1",
			]);
			await page.locator(`[data-document-id="${menu.other}"]`).click({
				noWaitAfter: true,
			});
			await page.waitForTimeout(4_000);
			const heading = await page.evaluate(
				() => document.querySelector("header h1")?.textContent ?? "",
			);
			expect(heading, "the editor now shows the chosen document").not.toBe(
				"Harvard Application",
			);
		}, 120_000);

		it("explains a state badge to a keyboard user", async () => {
			/*
			 * The badge is a `div`, so a Radix tooltip on it was hover-only. It now takes
			 * focus, which is the whole difference between "a mouse can read this" and
			 * "the explanation exists".
			 */
			await page.goto(`${BASE}/app/#/dashboard`, {
				waitUntil: "load",
				timeout: 60_000,
			});
			await page.waitForTimeout(6_000);
			const focused = await page.evaluate(() => {
				const badge = [
					...document.querySelectorAll("[data-card-meta] div"),
				].find((el) => (el.textContent ?? "").trim() === "Showcase");
				if (!badge) return false;
				(badge as HTMLElement).focus();
				return document.activeElement === badge;
			});
			expect(focused, "the Showcase badge is focusable").toBe(true);
			await page.waitForTimeout(1_200);
			const tooltip = await page.evaluate(
				() => document.querySelector("[role=tooltip]")?.textContent ?? "",
			);
			expect(tooltip).toMatch(/complete example resume/i);
		}, 90_000);

		it("names each per-entry break control after its entry", async () => {
			/*
			 * These were eleven anonymous comboboxes under one "Per entry" label: the entry
			 * name was adjacent text, not the control's accessible name, so a screen-reader
			 * user tabbing through them heard "Section default, combobox" each time.
			 */
			await openExample(page);
			await selectSection(page, "experience");
			await page.waitForSelector(
				'[data-active-section-type="experience"] [data-section-breaks]',
				{ state: "visible", timeout: 45_000 },
			);
			// The disclosure persists across section changes, so only toggle it if it is shut.
			if (
				!(await page.evaluate(
					() =>
						(
							document.querySelector(
								"[data-section-breaks]",
							) as HTMLDetailsElement
						)?.open,
				))
			) {
				await page.locator("[data-section-breaks] > summary").first().click();
			}
			await page.waitForTimeout(600);
			const rows = await page.evaluate(() => {
				const selects = [
					...document.querySelectorAll<HTMLElement>(
						'[data-section-breaks] button[aria-label^="Page breaks for "]',
					),
				];
				return selects.map((select) => {
					const label = select.getAttribute("aria-label") ?? "";
					const row = select.parentElement;
					return {
						label,
						entry: (row?.firstElementChild?.textContent ?? "").trim(),
					};
				});
			});
			expect(
				rows.length,
				"the experience form lists its entries",
			).toBeGreaterThan(0);
			for (const row of rows) {
				expect(
					row.label,
					`a row's accessible name does not name it: ${JSON.stringify(row)}`,
				).toBe(`Page breaks for ${row.entry}`);
			}
		}, 90_000);

		it("works at 390px: the example is reachable, and the form and breaks open", async () => {
			// The same defects have to be absent at the narrow end. The editor becomes three
			// modes, so this drives the mode bar rather than assuming the desktop panes.
			const small = await browser.newContext({
				viewport: { width: 390, height: 844 },
			});
			const narrow = await small.newPage();
			narrow.setDefaultTimeout(15_000);
			try {
				await narrow.goto(`${BASE}/app/#/dashboard`, {
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

				/*
				 * The card meta has a designed narrow variant: two lines at most, and the
				 * secondary facts are absent rather than wrapped into a five-line column.
				 */
				const cardMeta = await narrow.evaluate(() => {
					const el = document.querySelector("[data-card-meta]");
					if (!el) return null;
					const secondary = [...el.querySelectorAll("[data-meta-secondary]")];
					return {
						text: (el.textContent ?? "").replace(/\s+/g, " ").trim(),
						lines: Math.round(el.getBoundingClientRect().height / 16),
						visibleSecondary: secondary.filter(
							(n) => getComputedStyle(n).display !== "none",
						).length,
					};
				});
				expect(cardMeta, "the card meta renders at 390px").not.toBeNull();
				expect(cardMeta?.text).toMatch(/Updated/);
				expect(
					cardMeta?.visibleSecondary,
					"page size, density and variation count step aside below `sm`",
				).toBe(0);
				expect(cardMeta?.lines ?? 99).toBeLessThanOrEqual(2);

				await exampleButton.click({ noWaitAfter: true });
				await narrow.waitForSelector("[data-editor-shell]", {
					state: "attached",
					timeout: 60_000,
				});
				await narrow.waitForSelector("[data-editor-meta]", {
					state: "attached",
					timeout: 30_000,
				});
				await narrow.waitForTimeout(2_500);

				/*
				 * The header's identity sentence used to be `truncate`d against a column
				 * that could not hold it, so it read "… · Com…". The narrow variant drops
				 * facts instead of cutting a word in half.
				 */
				const editorMeta = await narrow.evaluate(() => {
					const el = document.querySelector("[data-editor-meta]");
					return el
						? {
								text: (el.textContent ?? "").trim(),
								clipped: el.scrollWidth > el.clientWidth + 1,
							}
						: null;
				});
				expect(editorMeta, "the header meta renders at 390px").not.toBeNull();
				expect(
					editorMeta?.clipped,
					`the header meta is truncated: "${editorMeta?.text}"`,
				).toBe(false);
				// The narrow variant keeps the archetype; the page count joins it once the
				// preview has compiled, which is not guaranteed at 2.5s on a cold start.
				expect(editorMeta?.text).toMatch(/Compact/);

				const modes = narrow
					.locator('nav[aria-label="Editor view"]')
					.locator("button");
				expect(await modes.count()).toBe(3);
				await modes.nth(0).click(); // Sections
				await narrow.waitForSelector(
					'[data-section-type="experience"] button',
					{
						state: "visible",
						timeout: 30_000,
					},
				);
				await narrow
					.locator('[data-section-type="experience"] button')
					.nth(1)
					.click();
				await modes.nth(1).click(); // Form
				await narrow.waitForSelector(
					'[data-active-section-type="experience"] [data-section-breaks]',
					{ state: "visible", timeout: 45_000 },
				);

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
