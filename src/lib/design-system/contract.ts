/**
 * The design system, as data.
 *
 * The `/design-system` page renders from these tables, and
 * `test/design-system-page.test.ts` walks them: every contract pair is measured
 * against the token file in both themes, and every numbered rule is asserted to
 * be present on the page. That makes the page a *reference implementation* of
 * the system rather than documentation that can quietly fall out of date —
 * if a token moves, the page's numbers move with it or the build fails.
 */

export interface ContrastPair {
	/** Role token measured as the foreground. */
	fg: string;
	/** Optional state layer painted over `base` first. */
	layer?: string;
	/** Role token measured as the background. */
	base: string;
	/** WCAG minimum: 4.5 for text, 3 for meaningful non-text. */
	min: number;
	label: string;
}

/**
 * The text contract: every role a user can read, on every surface it can land
 * on. 4.5:1 (WCAG 2.1 §1.4.3).
 */
export const TEXT_CONTRACT: ContrastPair[] = [
	{
		fg: "--foreground",
		base: "--background",
		min: 4.5,
		label: "Body on the page",
	},
	{ fg: "--foreground", base: "--surface", min: 4.5, label: "Body on a card" },
	{
		fg: "--muted-foreground",
		base: "--background",
		min: 4.5,
		label: "Secondary text on the page",
	},
	{
		fg: "--muted-foreground",
		base: "--surface",
		min: 4.5,
		label: "Secondary text on a card",
	},
	{
		fg: "--muted-foreground",
		base: "--surface-raised",
		min: 4.5,
		label: "Secondary text in an overlay",
	},
	{
		fg: "--primary-foreground",
		base: "--primary",
		min: 4.5,
		label: "Label on a primary button",
	},
	{
		fg: "--success",
		base: "--background",
		min: 4.5,
		label: "Success text on the page",
	},
	{
		fg: "--warning",
		base: "--background",
		min: 4.5,
		label: "Warning text on the page",
	},
	{
		fg: "--danger",
		base: "--background",
		min: 4.5,
		label: "Danger text on the page",
	},
	{
		fg: "--info",
		base: "--background",
		min: 4.5,
		label: "Info text on the page",
	},
	{
		fg: "--success",
		layer: "--br-success-soft",
		base: "--surface",
		min: 4.5,
		label: "Success text on its own tint",
	},
	{
		fg: "--warning",
		layer: "--br-warning-soft",
		base: "--surface",
		min: 4.5,
		label: "Warning text on its own tint",
	},
	{
		fg: "--danger",
		layer: "--br-danger-soft",
		base: "--surface",
		min: 4.5,
		label: "Danger text on its own tint",
	},
	{
		fg: "--info",
		layer: "--br-info-soft",
		base: "--surface",
		min: 4.5,
		label: "Info text on its own tint",
	},
	{ fg: "--link", base: "--background", min: 4.5, label: "A link on the page" },
	{ fg: "--link", base: "--surface", min: 4.5, label: "A link on a card" },
];

/**
 * The non-text contract: boundaries, state indicators and focus (WCAG 2.1
 * §1.4.11). This is the tier the old theme failed at 1.31:1.
 */
export const NON_TEXT_CONTRACT: ContrastPair[] = [
	{
		fg: "--ring",
		base: "--background",
		min: 3,
		label: "Focus ring on the page",
	},
	{ fg: "--ring", base: "--surface", min: 3, label: "Focus ring on a card" },
	{
		fg: "--ring",
		base: "--surface-raised",
		min: 3,
		label: "Focus ring in an overlay",
	},
	{
		fg: "--border-control",
		base: "--background",
		min: 3,
		label: "Control edge on the page",
	},
	{
		fg: "--border-control",
		base: "--surface",
		min: 3,
		label: "Control edge on a card",
	},
	{
		fg: "--border-control",
		base: "--surface-raised",
		min: 3,
		label: "Control edge in an overlay",
	},
	{
		fg: "--border-control",
		base: "--sunken",
		min: 3,
		label: "Control edge on a well",
	},
	{
		fg: "--border-selected",
		base: "--surface",
		min: 3,
		label: "Selected edge on a card",
	},
	{
		fg: "--border-selected",
		base: "--surface-raised",
		min: 3,
		label: "Selected edge in an overlay",
	},
	{
		fg: "--subtle",
		base: "--background",
		min: 3,
		label: "Icon tone on the page",
	},
	{
		fg: "--subtle",
		base: "--surface-raised",
		min: 3,
		label: "Icon tone in an overlay",
	},
];

/** Surface separation floors — documented steps, not 3:1 (see DS-1). */
export const LADDER_STEPS: Array<{
	a: string;
	b: string;
	min: number;
	label: string;
}> = [
	{
		a: "--surface",
		b: "--background",
		min: 1.03,
		label: "Card lifts off the page",
	},
	{
		a: "--surface-raised",
		b: "--surface",
		min: 1,
		label: "Overlay lifts off a card",
	},
	{ a: "--muted", b: "--surface", min: 1.05, label: "Well sinks below a card" },
	{ a: "--border", b: "--surface", min: 1.3, label: "Hairline is drawn" },
];

export interface TypeRole {
	role: string;
	spec: string;
	className: string;
	tracking: string;
	weight: string;
	colour: string;
	use: string;
}

/**
 * The nine roles. These are the only type decisions in the system; a tenth is a
 * system change, not a screen decision (DS-4).
 */
export const TYPE_ROLES: TypeRole[] = [
	{
		role: "Page title",
		spec: "24 / 32",
		className: "text-xl font-semibold tracking-title",
		tracking: "−0.015em",
		weight: "600",
		colour: "text",
		use: "Dashboard title, the design-system title",
	},
	{
		role: "Document title",
		spec: "20 / 28",
		className: "text-lg font-semibold tracking-title",
		tracking: "−0.01em",
		weight: "600",
		colour: "text",
		use: "The resume name in the editor; dialog titles",
	},
	{
		role: "Panel title",
		spec: "16 / 24",
		className: "text-base font-semibold tracking-title",
		tracking: "−0.01em",
		weight: "600",
		colour: "text",
		use: "Card and sheet titles, empty-state headlines",
	},
	{
		role: "Body",
		spec: "14 / 20",
		className: "text-sm font-normal",
		tracking: "0",
		weight: "400",
		colour: "text",
		use: "The UI default",
	},
	{
		role: "Body strong",
		spec: "14 / 20",
		className: "text-sm font-medium",
		tracking: "0",
		weight: "500",
		colour: "text",
		use: "Row titles, input values",
	},
	{
		role: "Label",
		spec: "12 / 16",
		className: "br-label",
		tracking: "+0.02em",
		weight: "600",
		colour: "muted",
		use: "Field labels (D5)",
	},
	{
		role: "Micro",
		spec: "12 / 16",
		className: "br-micro",
		tracking: "+0.04em, uppercase",
		weight: "600",
		colour: "muted",
		use: "Rail and panel group headers",
	},
	{
		role: "Meta",
		spec: "12 / 16",
		className: "text-xs text-fg-muted",
		tracking: "0",
		weight: "400",
		colour: "muted",
		use: "Dates, counts, helper text",
	},
	{
		role: "Kbd",
		spec: "12 / 16",
		className: "br-kbd",
		tracking: "+0.02em",
		weight: "600",
		colour: "muted",
		use: "Key caps only",
	},
];

export interface ScaleRow {
	token: string;
	value: string;
	use: string;
}

export const SPACING_SCALE: ScaleRow[] = [
	{
		token: "--br-space-05",
		value: "2px",
		use: "Optical nudge, icon ↔ label only",
	},
	{ token: "--br-space-1", value: "4px", use: "Label → control" },
	{ token: "--br-space-2", value: "8px", use: "Inline gaps, chip padding" },
	{ token: "--br-space-3", value: "12px", use: "Control padding" },
	{
		token: "--br-space-4",
		value: "16px",
		use: "Field → field, dense card padding",
	},
	{ token: "--br-space-6", value: "24px", use: "Group → group, card padding" },
	{
		token: "--br-space-8",
		value: "32px",
		use: "Section → section, dialog padding",
	},
	{ token: "--br-space-12", value: "48px", use: "Panel padding" },
	{ token: "--br-space-16", value: "64px", use: "Page padding" },
	{ token: "--br-space-24", value: "96px", use: "Marketing rhythm only" },
];

export const RADIUS_SCALE: ScaleRow[] = [
	{ token: "--br-radius-xs", value: "4px", use: "Chips, badges, state layers" },
	{ token: "--br-radius-sm", value: "6px", use: "Buttons, inputs, menu rows" },
	{ token: "--br-radius-md", value: "8px", use: "Panels, cards, popovers" },
	{ token: "--br-radius-lg", value: "12px", use: "Dialogs, sheets" },
	{ token: "--br-radius-full", value: "∞", use: "Avatars, dots, pill toggles" },
];

export const ELEVATION_SCALE: Array<{
	token: string;
	use: string;
	className: string;
}> = [
	{
		token: "--elev-0",
		use: "In flow: page and regions. No shadow.",
		className: "shadow-elev-0",
	},
	{
		token: "--elev-1",
		use: "Floating cards, hover lifts",
		className: "shadow-elev-1",
	},
	{
		token: "--elev-2",
		use: "Popovers, dropdowns, menus",
		className: "shadow-elev-2",
	},
	{ token: "--elev-3", use: "Dialogs and sheets", className: "shadow-elev-3" },
	{
		token: "--elev-page",
		use: "The paper stage (ornament budget #1)",
		className: "shadow-elev-page",
	},
];

export const MOTION_SCALE: Array<{
	token: string;
	value: string;
	use: string;
}> = [
	{ token: "--br-duration-fast", value: "120ms", use: "Hover, press, colour" },
	{
		token: "--br-duration-base",
		value: "180ms",
		use: "Popovers, accordions, lift",
	},
	{ token: "--br-duration-slow", value: "240ms", use: "Dialogs, sheets" },
];

export const Z_LADDER: Array<{ token: string; value: string; use: string }> = [
	{ token: "--br-z-base", value: "0", use: "Normal flow" },
	{ token: "--br-z-raised", value: "10", use: "Hover-lifted cards" },
	{ token: "--br-z-sticky", value: "100", use: "Sticky headers and toolbars" },
	{ token: "--br-z-dropdown", value: "1000", use: "Menus, combobox lists" },
	{ token: "--br-z-overlay", value: "1100", use: "Modal scrim" },
	{ token: "--br-z-dialog", value: "1200", use: "Dialogs and sheets" },
	{ token: "--br-z-popover", value: "1300", use: "Popovers above dialogs" },
	{ token: "--br-z-toast", value: "1400", use: "Toasts" },
	{ token: "--br-z-tooltip", value: "1500", use: "Tooltips" },
];

export interface Rule {
	id: string;
	title: string;
	statement: string;
	enforcedBy: string;
}

/**
 * The citable rules. Cite `DS-n` in review; the id is the anchor on the page.
 * These are the visual-method rules, layered on the older R1–R15 (tokens).
 */
export const RULES: Rule[] = [
	{
		id: "DS-1",
		title: "Four surfaces, two ways of lifting",
		statement:
			"Page, sunken, surface and overlay are distinct rungs. In light, shadow lifts; in dark, tone lifts. A rung is never collapsed to save a colour.",
		enforcedBy:
			"app-token-contrast.test.ts (ladder floors) · design-system-page.test.ts",
	},
	{
		id: "DS-2",
		title: "Shadows come in pairs",
		statement:
			"Every elevation is a tight contact shadow plus a wide ambient one. Dark multiplies the alphas and adds a 1px top highlight; a single stock shadow is never depth.",
		enforcedBy: "ui-polish.test.ts · design-system-page.test.ts",
	},
	{
		id: "DS-3",
		title: "Borders state their job",
		statement:
			"The hairline draws structure and is decorative. Control boundaries are ≥3:1 and use `control`. Selection uses `border-selected`. One property never does two jobs.",
		enforcedBy: "app-token-contrast.test.ts · token-scale-closure.test.ts",
	},
	{
		id: "DS-4",
		title: "Hierarchy is tone, weight, space, case — in that order",
		statement:
			"There are seven sizes and nine roles. A new size is a system change. At most two sizes are live in one view; 12px is the floor for anything functional.",
		enforcedBy: "token-scale-closure.test.ts · design-system-page.test.ts",
	},
	{
		id: "DS-5",
		title: "A label is a role, not a smaller body",
		statement:
			"Field labels are 12/600 at +0.02em in muted tone. Micro labels are the same size, uppercase, +0.04em. A label never carries its meaning in colour alone.",
		enforcedBy: "design-system-page.test.ts (.br-label/.br-micro)",
	},
	{
		id: "DS-6",
		title: "One density, one rhythm",
		statement:
			"Controls are 28/32/40 (default 32), rows 40, panel headers 44. label→control 4, field→field 16, group→group 24. Forms stop at a 640px measure.",
		enforcedBy: "token-scale-closure.test.ts · responsive-matrix.test.ts",
	},
	{
		id: "DS-7",
		title: "One primary action per region",
		statement:
			"The accent is an event: one solid button per region, selection, and focus/links. Icon-only controls carry a tooltip and an accessible name. Disabled is 50% opacity plus a reason, never a grey slab.",
		enforcedBy: "token-state-matrix.test.ts · design-system-page.test.ts",
	},
	{
		id: "DS-8",
		title: "Regions are seams; cards float",
		statement:
			"Rails and columns are separated by a hairline and never lift. Cards float on hairline + elev-1. A card is never nested inside a card.",
		enforcedBy: "design-system-page.test.ts",
	},
	{
		id: "DS-9",
		title: "Selection is a language",
		statement:
			"A selected row is an accent tint + a 2px left rule + a check. The same three signals mark a rail row, a template row and a list row.",
		enforcedBy: "design-system-page.test.ts · template-selector tests",
	},
	{
		id: "DS-10",
		title: "Status is tint + hue text + icon",
		statement:
			"Status always carries a redundant channel. Colour alone fails the squint test, so every chip and callout pairs its hue with an icon or a word.",
		enforcedBy: "design-system-page.test.ts · token-raw-colour.test.ts",
	},
	{
		id: "DS-11",
		title: "States are designed, not defaulted",
		statement:
			"Empty = icon tile + headline + one line + one action, centred in its region. Loading keeps the final shape. Errors are danger-soft callouts with a retry in the affected region.",
		enforcedBy: "editor-panel-states.test.ts · design-system-page.test.ts",
	},
	{
		id: "DS-12",
		title: "Spend the ornament budget once",
		statement:
			"Five sites only: the paper stage, selection, empty-state tiles, kbd chips, and one gradient hairline. Everything else is quiet. No gradients on buttons, no glows, no glass.",
		enforcedBy: "design-system-page.test.ts",
	},
	{
		id: "DS-13",
		title: "Motion is three durations",
		statement:
			"120ms state changes, 180ms popovers and lifts, 240ms dialogs. One easing family. Every transition is gated by prefers-reduced-motion.",
		enforcedBy: "token-state-matrix.test.ts · ui-polish.test.ts",
	},
	{
		id: "DS-14",
		title: "The brand is mono first",
		statement:
			"The mark is two offset sheets: one colour by default, accent on the back sheet only where the brand is the subject. Clear space is one mark width on all sides.",
		enforcedBy: "design-system-page.test.ts · brand assets test",
	},
	{
		id: "DS-15",
		title: "The document is not the chrome",
		statement:
			"The resume keeps paper colour, square corners, print metrics and its own palette in both themes. No app token, radius, shadow or motion enters Surface B.",
		enforcedBy: "token-surface-isolation.test.ts",
	},
];
