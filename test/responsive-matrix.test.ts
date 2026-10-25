/**
 * The viewport matrix.
 *
 * Seven real viewports, driven in Chrome, asserting the things a source assertion
 * cannot: geometry. `test/responsive-overflow.test.ts` pins the *mechanisms* (no
 * `h-screen`, no body mask, collapsed grids); this file is the evidence that the
 * mechanisms produce a layout that fits.
 *
 * Why it is gated behind `RESPONSIVE_MATRIX=1`
 *   It needs a running frontend, a running Worker and a seeded D1. `npx vitest run`
 *   on a clean checkout has none of those, so the matrix runs in its own CI job
 *   (`.github/workflows/responsive.yml`) after that stack is up, and locally with the
 *   same env var against `scripts/probe-start.cjs`. It is skipped, never silently
 *   passed: `describe.skipIf` reports the skip.
 *
 * Why it measures instead of looking
 *   The reason this whole wave exists is that `body { overflow-x: hidden }` made
 *   horizontal overflow invisible in review. A scrollbar check inherits that lie, so
 *   every assertion here reads `getBoundingClientRect()`, `scrollWidth` and
 *   `clientWidth` per element.
 *
 * Why `channel: "chrome"`
 *   This host has Chrome and no Playwright-managed Chromium. CI has Chrome too;
 *   `launch()` falls back to the bundled build if the channel is unavailable.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

/*
 * The slice of Playwright this file drives, declared locally.
 *
 * Playwright is deliberately NOT a dependency: the repo installs it ad hoc in the
 * workflows that need a browser (visual.yml says 'never added to package.json'),
 * because a browser is not needed to build or ship. A type-only import from it would
 * still make `tsc --noEmit` — which includes `test/**` — fail on a clean `npm ci`.
 *
 * These interfaces are what the file actually calls. The module is cast to them at
 * the one dynamic import, so the runtime contract is explicit instead of `any`.
 */
interface MatrixLocator {
	first(): MatrixLocator;
	nth(index: number): MatrixLocator;
	count(): Promise<number>;
	click(): Promise<void>;
	isVisible(): Promise<boolean>;
	getAttribute(name: string): Promise<string | null>;
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
	locator(selector: string): MatrixLocator;
}

interface MatrixPage {
	goto(
		url: string,
		options?: { waitUntil?: string; timeout?: number },
	): Promise<unknown>;
	waitForSelector(
		selector: string,
		options?: { state?: "visible" | "attached"; timeout?: number },
	): Promise<unknown>;
	waitForTimeout(ms: number): Promise<void>;
	locator(selector: string): MatrixLocator;
	getByRole(role: string, options?: { name?: string | RegExp }): MatrixLocator;
	evaluate<R>(pageFunction: () => R): Promise<R>;
	evaluate<R, A>(pageFunction: (arg: A) => R, arg: A): Promise<R>;
	keyboard: { press(key: string): Promise<void> };
}

interface MatrixContext {
	newPage(): Promise<MatrixPage>;
	close(): Promise<void>;
}

interface MatrixBrowser {
	newContext(options: MatrixContextOptions): Promise<MatrixContext>;
	close(): Promise<void>;
}

interface MatrixContextOptions {
	viewport: { width: number; height: number };
	deviceScaleFactor?: number;
	hasTouch?: boolean;
}

interface MatrixChromium {
	launch(options: {
		channel?: string;
		headless?: boolean;
	}): Promise<MatrixBrowser>;
}

const ENABLED = process.env.RESPONSIVE_MATRIX === "1";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const RESUME_ID = process.env.PROBE_RESUME ?? "resume-1";

const VIEWPORTS = [
	{ name: "360x640", width: 360, height: 640 },
	{ name: "390x844", width: 390, height: 844 },
	{ name: "414x896", width: 414, height: 896 },
	{ name: "768x1024", width: 768, height: 1024 },
	{ name: "1024x768", width: 1024, height: 768 },
	{ name: "1280x800", width: 1280, height: 800 },
	{ name: "1440x900", width: 1440, height: 900 },
] as const;

/** Below `lg` the editor is one column plus a three-way switcher. */
const SMALL_EDITOR_WIDTH = 1024;

interface GeometryReport {
	viewport: { width: number; height: number };
	documentOverflow: { scrollWidth: number; clientWidth: number };
	wide: { tag: string; classes: string; left: number; right: number }[];
	clipped: {
		tag: string;
		classes: string;
		text: string;
		scrollWidth: number;
		clientWidth: number;
	}[];
	smallTargets: { text: string; width: number; height: number }[];
	/**
	 * Controls and text that a clipping ancestor (`overflow: hidden`) has cut off.
	 *
	 * Viewport-width checks cannot see this: a 200px rail inside a 1024px window can
	 * amputate its own row and the document still "fits". This was the sections outline's
	 * real bug — the label and its two action buttons were wider than the pane and the
	 * pane clipped them, so the actions existed but could not be seen.
	 */
	clippedByAncestor: {
		container: string;
		child: string;
		text: string;
		overflow: number;
	}[];
	pages: { width: number; height: number; background: string }[];
	/** True when the page at fit-width is no wider than the scroller that holds it. */
	pageFits: boolean;
	slivers: { text: string; width: number; height: number }[];
}

/**
 * Everything this file measures, in one round trip.
 *
 * Runs inside the page, so it takes the target-size floor as an argument rather than
 * closing over it.
 */
async function geometry(
	page: MatrixPage,
	options: { minTarget: number; checkAllTargets: boolean },
): Promise<GeometryReport> {
	return page.evaluate(({ minTarget, checkAllTargets }) => {
		const isVisible = (el: Element): boolean => {
			const rect = el.getBoundingClientRect();
			if (rect.width < 1 || rect.height < 1) return false;
			const style = getComputedStyle(el);
			return (
				style.display !== "none" &&
				style.visibility !== "hidden" &&
				Number(style.opacity) > 0
			);
		};

		/**
		 * An ancestor that is *both* scrollable and actually overflowing is a deliberate
		 * viewport: the document page at 100% inside `overflow-auto`, the review tab
		 * strip at a pinch. Content wider than that is the feature, not a bug.
		 *
		 * `overflow: hidden` does NOT qualify. A clipped pane is exactly the failure this
		 * wave removes (`overflow-hidden` panes + the body mask silently chopped the
		 * form's fields), so it must be reported.
		 */
		const intentionalScroller = (el: Element): boolean => {
			for (let p = el.parentElement; p; p = p.parentElement) {
				const style = getComputedStyle(p);
				const scrolls = /(auto|scroll)/.test(style.overflowX);
				if (scrolls && p.scrollWidth > p.clientWidth + 1) return true;
			}
			return false;
		};

		const label = (el: Element) =>
			(el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 48);

		const viewportWidth = document.documentElement.clientWidth;

		// ── Horizontal overflow, measured per element ─────────────────────────
		const wide: GeometryReport["wide"] = [];
		for (const el of document.querySelectorAll("body *")) {
			if (!isVisible(el)) continue;
			if (intentionalScroller(el)) continue;
			const rect = el.getBoundingClientRect();
			if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
			// Portalled overlays that are animating in can be a frame off; a closed one
			// is not mounted at all.
			wide.push({
				tag: el.tagName.toLowerCase(),
				classes: el.className?.toString().slice(0, 80) ?? "",
				left: Math.round(rect.left),
				right: Math.round(rect.right),
			});
			if (wide.length >= 8) break;
		}

		// ── Clipped text ─────────────────────────────────────────────────────
		const clipped: GeometryReport["clipped"] = [];
		for (const el of document.querySelectorAll("body *")) {
			if (el.children.length > 0) continue;
			const text = (el.textContent ?? "").trim();
			if (!text) continue;
			if (!isVisible(el)) continue;
			if (el.closest(".sr-only")) continue;
			if (intentionalScroller(el)) continue;
			const style = getComputedStyle(el);
			// Deliberate truncation is a design decision, not a clipped control.
			if (style.textOverflow === "ellipsis") continue;
			if (style.webkitLineClamp && style.webkitLineClamp !== "none") continue;
			if (el.scrollWidth <= el.clientWidth + 1) continue;
			clipped.push({
				tag: el.tagName.toLowerCase(),
				classes: el.className?.toString().slice(0, 60) ?? "",
				text,
				scrollWidth: el.scrollWidth,
				clientWidth: el.clientWidth,
			});
			if (clipped.length >= 8) break;
		}

		/*
		 * Input values are not text nodes, so the check above cannot see them.
		 *
		 * This is not hypothetical: before the container-aware field grid, the contact
		 * row at a 405px form pane gave Email 123px and Phone 237px (a `col-span-2`
		 * child created a phantom second column), and the email field silently scrolled
		 * "james.smith@harvard.edu" out of view. The value the user is editing must be
		 * readable.
		 */
		for (const el of document.querySelectorAll("input, textarea")) {
			if (!isVisible(el)) continue;
			const value = (el as HTMLInputElement).value ?? "";
			if (!value) continue;
			if (el.scrollWidth <= el.clientWidth + 1) continue;
			clipped.push({
				tag: el.tagName.toLowerCase(),
				classes: el.className?.toString().slice(0, 60) ?? "",
				text: value.slice(0, 48),
				scrollWidth: el.scrollWidth,
				clientWidth: el.clientWidth,
			});
			if (clipped.length >= 8) break;
		}

		// ── Touch targets ────────────────────────────────────────────────────
		const smallTargets: GeometryReport["smallTargets"] = [];
		const controls = document.querySelectorAll(
			"button, a[href], [role=button], input:not([type=hidden]), select, textarea",
		);
		for (const el of controls) {
			if (!isVisible(el)) continue;
			if ((el as HTMLButtonElement).disabled) continue;
			if (el.closest('[aria-hidden="true"]')) continue;
			// A skip link is 1x1 until it is focused. That is the accessible pattern, not
			// a small target: keyboard users are not aiming at it with a thumb.
			if (el.closest(".sr-only")) continue;
			if (!checkAllTargets && !el.hasAttribute("data-touch-primary")) continue;
			const style = getComputedStyle(el);
			if (style.pointerEvents === "none") continue;
			const floor = el.hasAttribute("data-touch-minimal")
				? Math.min(minTarget, 40)
				: minTarget;
			const rect = el.getBoundingClientRect();
			if (rect.width + 1 < floor || rect.height + 1 < floor) {
				smallTargets.push({
					text: (el as HTMLElement).getAttribute("aria-label") ?? label(el),
					width: Math.round(rect.width),
					height: Math.round(rect.height),
				});
			}
			if (smallTargets.length >= 10) break;
		}

		// ── Content a clipping ancestor cut off ──────────────────────────────
		//
		// Only controls and text are considered: a decorative gradient bleeding out of
		// an `overflow-hidden` hero is the effect, not a casualty.
		const clippedByAncestor: GeometryReport["clippedByAncestor"] = [];
		const readable = document.querySelectorAll(
			"button, a[href], [role=button], input, select, textarea, span, p, h1, h2, h3, li, td, th",
		);
		for (const el of readable) {
			const rect = el.getBoundingClientRect();
			if (rect.width < 1 || rect.height < 1) continue;
			for (
				let parent = el.parentElement;
				parent;
				parent = parent.parentElement
			) {
				const style = getComputedStyle(parent);
				if (!/(hidden|clip)/.test(style.overflowX)) continue;
				// Deliberate truncation ends in an ellipsis and is a design decision;
				// the clipped text checks own that case.
				if (style.textOverflow === "ellipsis") continue;
				if (parent.scrollWidth <= parent.clientWidth + 1) continue;
				const parentRect = parent.getBoundingClientRect();
				if (
					rect.right > parentRect.right + 1 ||
					rect.left < parentRect.left - 1
				) {
					clippedByAncestor.push({
						container:
							parent.className?.toString().slice(0, 60) || parent.tagName,
						child: el.className?.toString().slice(0, 60) || el.tagName,
						text: label(el),
						overflow: parent.scrollWidth - parent.clientWidth,
					});
					break;
				}
			}
			if (clippedByAncestor.length >= 8) break;
		}

		// ── The document page ────────────────────────────────────────────────
		const pages = [...document.querySelectorAll("[data-typst-page]")]
			.filter(isVisible)
			.map((el) => {
				const rect = el.getBoundingClientRect();
				return {
					width: Math.round(rect.width),
					height: Math.round(rect.height),
					background: getComputedStyle(el).backgroundColor,
				};
			});

		/*
		 * Fit-width means the page FITS. The scroll container is exempt from the
		 * overflow checks (it is a deliberate viewport), which is exactly why this has
		 * to be asserted separately: a scale computed with the wrong gutter leaves the
		 * page 40px too wide and every other check still passes.
		 */
		let pageFits = true;
		const firstPage = document.querySelector("[data-typst-page]");
		if (firstPage) {
			let scroller = firstPage.parentElement;
			while (
				scroller &&
				!/(auto|scroll)/.test(getComputedStyle(scroller).overflowX)
			) {
				scroller = scroller.parentElement;
			}
			if (scroller) {
				pageFits =
					firstPage.getBoundingClientRect().width <= scroller.clientWidth + 1;
			}
		}

		// ── Degenerate controls (visible but effectively unhittable) ─────────
		const slivers: GeometryReport["slivers"] = [];
		for (const el of controls) {
			if (el.closest(".sr-only")) continue;
			const rect = el.getBoundingClientRect();
			if (rect.height < 8 || rect.width < 8) {
				if (isVisible(el) && getComputedStyle(el).pointerEvents !== "none") {
					slivers.push({
						text: (el as HTMLElement).getAttribute("aria-label") ?? label(el),
						width: Math.round(rect.width),
						height: Math.round(rect.height),
					});
				}
			}
			if (slivers.length >= 6) break;
		}

		return {
			viewport: { width: viewportWidth, height: window.innerHeight },
			documentOverflow: {
				scrollWidth: document.documentElement.scrollWidth,
				clientWidth: document.documentElement.clientWidth,
			},
			wide,
			clipped,
			smallTargets,
			clippedByAncestor,
			pages,
			pageFits,
			slivers,
		};
	}, options);
}

function describeProblems(report: GeometryReport): string {
	const lines: string[] = [];
	if (
		report.documentOverflow.scrollWidth >
		report.documentOverflow.clientWidth + 1
	) {
		lines.push(
			`document scrollWidth ${report.documentOverflow.scrollWidth} > clientWidth ${report.documentOverflow.clientWidth}`,
		);
	}
	for (const item of report.wide) {
		lines.push(
			`${item.tag}.${item.classes} spans ${item.left}..${item.right} (viewport ${report.viewport.width})`,
		);
	}
	for (const item of report.clipped) {
		lines.push(
			`clipped text in ${item.tag}.${item.classes}: "${item.text}" (${item.scrollWidth} > ${item.clientWidth})`,
		);
	}
	for (const item of report.smallTargets) {
		lines.push(`target "${item.text}" is ${item.width}x${item.height}`);
	}
	for (const item of report.clippedByAncestor) {
		lines.push(
			`${item.text ? `"${item.text}" ` : ""}${item.child} is clipped by ${item.container} (${item.overflow}px past the edge)`,
		);
	}
	for (const item of report.slivers) {
		lines.push(
			`degenerate control "${item.text}" is ${item.width}x${item.height}`,
		);
	}
	return lines.join("\n");
}

function expectClean(report: GeometryReport, surface: string): void {
	const problems = describeProblems(report);
	expect(problems, `${surface}:\n${problems}`).toBe("");
}

async function openEditor(page: MatrixPage, width: number): Promise<void> {
	await page.goto(`${BASE}/app#/resume-editor/${RESUME_ID}`, {
		waitUntil: "load",
		timeout: 60_000,
	});
	await page.waitForSelector("[data-editor-shell]", {
		state: "attached",
		timeout: 60_000,
	});
	// The Typst WASM compiles in the page; the page boxes are the last thing to appear.
	await page.waitForSelector("[data-typst-page]", {
		state: "attached",
		timeout: 90_000,
	});
	// On a phone the preview starts hidden (Form mode); show it before measuring the
	// document, otherwise the aspect-ratio assertion has nothing visible to read.
	if (width < SMALL_EDITOR_WIDTH) {
		const nav = page.locator('nav[aria-label="Editor view"]');
		await nav.waitFor({ state: "visible", timeout: 30_000 });
		const modes = nav.locator("button");
		expect(await modes.count()).toBe(3);
		const preview = modes.nth(2);
		await preview.click();
		expect(await preview.getAttribute("aria-current")).toBe("true");
	}
	await page.waitForTimeout(400);
}

describe.skipIf(!ENABLED)("the responsive viewport matrix", () => {
	let browser: MatrixBrowser;

	beforeAll(async () => {
		/*
		 * A variable specifier, deliberately.
		 *
		 * `import("playwright")` with a string literal is still resolved by TypeScript,
		 * so `tsc --noEmit` fails on a clean `npm ci` (where Playwright is not
		 * installed). A non-literal is not resolved at build time and Node resolves it at
		 * run time, which is exactly the contract: only the job that installs Playwright
		 * can import it.
		 */
		const playwrightModule = "playwright";
		const { chromium } = (await import(playwrightModule)) as unknown as {
			chromium: MatrixChromium;
		};
		try {
			browser = await chromium.launch({ channel: "chrome", headless: true });
		} catch {
			// CI has Chrome; a developer machine using the bundled download should also
			// work. A named failure is better than a mysterious launch error.
			browser = await chromium.launch({ headless: true });
		}
	}, 120_000);

	afterAll(async () => {
		await browser?.close();
	});

	async function pageAt(
		options: MatrixContextOptions,
	): Promise<{ page: MatrixPage; close: () => Promise<void> }> {
		const context = await browser.newContext(options);
		const page = await context.newPage();
		return { page, close: () => context.close() };
	}

	it.each(VIEWPORTS)(
		"$name fits, does not clip, and keeps every action reachable",
		async ({ width, height }) => {
			const { page, close } = await pageAt({
				viewport: { width, height },
				deviceScaleFactor: 1,
			});
			try {
				// ── Marketing ────────────────────────────────────────────────
				await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 60_000 });
				await page.waitForTimeout(600);
				expectClean(
					await geometry(page, { minTarget: 44, checkAllTargets: false }),
					`marketing at ${width}x${height}`,
				);

				// ── Dashboard ────────────────────────────────────────────────
				await page.goto(`${BASE}/app#/dashboard`, {
					waitUntil: "load",
					timeout: 60_000,
				});
				await page.waitForSelector("main", { timeout: 60_000 });
				await page.waitForTimeout(800);
				expectClean(
					await geometry(page, { minTarget: 44, checkAllTargets: false }),
					`dashboard at ${width}x${height}`,
				);

				// ── Editor ───────────────────────────────────────────────────
				await openEditor(page, width);

				// Every header action is on screen at every width. These were the three
				// that used to sit past the right edge at 390px, plus the variations
				// control that `hidden md:flex` removed entirely.
				for (const label of [
					"Import a resume from a PDF or Word document",
					"Review resume for parser fit",
					"Resume variations",
				]) {
					const control = page.locator(`[aria-label="${label}"]`).first();
					expect(
						await control.isVisible(),
						`${label} is missing at ${width}px`,
					).toBe(true);
				}
				expect(
					await page.getByRole("status").first().isVisible(),
					"save state is missing",
				).toBe(true);

				const layout =
					width >= SMALL_EDITOR_WIDTH ? "three-zone" : "one-column";
				expect(
					await page.locator("[data-group]").count(),
					`${layout} layout at ${width}px`,
				).toBe(width >= SMALL_EDITOR_WIDTH ? 1 : 0);

				const report = await geometry(page, {
					minTarget: 44,
					checkAllTargets: false,
				});
				expectClean(report, `editor at ${width}x${height}`);

				// The document is a fixed-aspect page, not a reflowing one.
				expect(report.pages.length, "no preview page rendered").toBeGreaterThan(
					0,
				);
				const pageBox = report.pages[0];
				if (!pageBox) throw new Error("unreachable");
				expect(pageBox.width).toBeGreaterThan(0);
				// Letter: 612 x 792pt.
				expect(
					Math.abs(pageBox.width / pageBox.height - 612 / 792) < 0.02,
					`page aspect ratio drifted: ${pageBox.width}x${pageBox.height}`,
				).toBe(true);
				expect(pageBox.background, "the document page is not paper-white").toBe(
					"rgb(255, 255, 255)",
				);
				// Fit-width means it fits; a wrong gutter silently makes it 40px too wide.
				expect(
					report.pageFits,
					`fit-width overflows the preview scroller at ${width}px: ${pageBox.width}px page`,
				).toBe(true);

				// ── Review sheet ─────────────────────────────────────────────
				await page
					.getByRole("button", { name: "Review resume for parser fit" })
					.click();
				await page.waitForSelector('[role="tablist"]', { timeout: 30_000 });

				const tabs = page.locator('[role="tab"]');
				const tabCount = await tabs.count();
				expect(tabCount, "six review tabs").toBe(6);
				for (let i = 0; i < tabCount; i++) {
					const tab = tabs.nth(i);
					expect(await tab.isVisible(), `review tab ${i} is not visible`).toBe(
						true,
					);
					const box = await tab.boundingBox();
					expect(box?.width ?? 0).toBeGreaterThan(0);
					// Every tab must be inside the viewport without scrolling the sheet's
					// document horizontally -- the defect was tabs past the right edge.
					expect(
						(box?.x ?? 0) + (box?.width ?? 0),
						`review tab ${i} extends past the viewport`,
					).toBeLessThanOrEqual(width + 1);
					await tab.click();
					await expect
						.poll(() =>
							page
								.locator('[role="tabpanel"][data-state="active"]')
								.isVisible(),
						)
						.toBe(true);
				}

				expectClean(
					await geometry(page, { minTarget: 44, checkAllTargets: false }),
					`review sheet at ${width}x${height}`,
				);

				await page.keyboard.press("Escape");
			} finally {
				await close();
			}
		},
		240_000,
	);

	it("moves the mode bar to the left edge on a landscape phone", async () => {
		// The short-height axis, which no width breakpoint can express. 390px of height
		// is a phone on its side or a split screen; a bottom bar would cost 15% of the
		// document, so the bar becomes a narrow icon rail.
		const { page, close } = await pageAt({
			viewport: { width: 844, height: 390 },
			deviceScaleFactor: 1,
		});
		try {
			await openEditor(page, 844);

			const nav = page.locator('nav[aria-label="Editor view"]');
			const box = await nav.boundingBox();
			expect(box, "the mode bar is not rendered").not.toBeNull();
			if (!box) throw new Error("unreachable");
			expect(box.x, "the bar should sit on the left edge").toBeLessThan(8);
			expect(box.width, "the bar should be icons only").toBeLessThanOrEqual(80);
			expect(
				box.height,
				"the bar should span most of the height",
			).toBeGreaterThan(140);

			const label = nav.locator(".small-screen-nav-label").first();
			expect(
				await label.isVisible(),
				"labels should be hidden in the short-height rail",
			).toBe(false);

			expectClean(
				await geometry(page, { minTarget: 44, checkAllTargets: false }),
				"editor, landscape phone 844x390",
			);
		} finally {
			await close();
		}
	}, 180_000);

	it("the touch pass floors every control at 44px (40 for dense ones)", async () => {
		// The brief's 44px rule is a *touch* rule (§5.1). The other viewports run with a
		// fine pointer, where a 32px icon button is correct; this pass is the one that
		// proves the coarse-pointer CSS actually applies.
		const { page, close } = await pageAt({
			viewport: { width: 390, height: 844 },
			hasTouch: true,
			deviceScaleFactor: 1,
		});
		try {
			// A vacuous pass would be a lie: assert the emulation took effect.
			const coarse = await page.evaluate(
				() => window.matchMedia("(pointer: coarse)").matches,
			);
			expect(
				coarse,
				"hasTouch did not produce a coarse pointer, so the 44px floor was not exercised",
			).toBe(true);

			await openEditor(page, 390);
			expectClean(
				await geometry(page, { minTarget: 44, checkAllTargets: true }),
				"editor, coarse pointer, 390x844",
			);
		} finally {
			await close();
		}
	}, 180_000);
});
