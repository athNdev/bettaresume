import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

import { CopyToken } from "@/components/design-system/copy-token";
import { Ratio, Specimen, Swatch } from "@/components/design-system/primitives";
import { StatusChip } from "@/components/ui/status-chip";
import {
	type ContrastPair,
	LADDER_STEPS,
	NON_TEXT_CONTRACT,
	TEXT_CONTRACT,
} from "@/lib/design-system/contract";
import type { TokenTheme } from "@/lib/design-system/token-theme";
import {
	contrastOf,
	contrastThrough,
	resolveColour,
	resolveValue,
} from "@/lib/design-system/token-theme";

const NEUTRALS = [
	"0",
	"50",
	"100",
	"200",
	"300",
	"400",
	"500",
	"600",
	"700",
	"800",
	"900",
	"950",
];

const ACCENTS = [
	"50",
	"100",
	"200",
	"300",
	"400",
	"500",
	"600",
	"700",
	"800",
	"900",
];

const SEMANTIC_ROLES: Array<[string, string, string]> = [
	["--background", "The page. Never a card.", "neutral-50 / neutral-950"],
	["--surface", "Cards and panels.", "neutral-0 / neutral-800"],
	["--surface-raised", "Popovers, dialogs, sheets.", "neutral-0 / neutral-700"],
	["--sunken", "Input wells, toolbar strips.", "neutral-100 / neutral-900"],
	["--foreground", "Body text.", "neutral-950 / neutral-50"],
	[
		"--muted-foreground",
		"Secondary text — never a smaller size alone.",
		"neutral-600 / neutral-300",
	],
	["--subtle", "Icons and decorative meta only.", "neutral-500 / neutral-400"],
	["--border", "Hairlines: structure, dividers.", "neutral-300 / neutral-600"],
	[
		"--border-control",
		"Control edges — held to 3:1.",
		"neutral-500 / neutral-400",
	],
	["--border-selected", "Selection, checked state.", "accent-600 / accent-400"],
	["--primary", "The one solid action per region.", "accent-600 / accent-400"],
	[
		"--selected",
		"The selection tint under the rule.",
		"accent-500 10% / accent-300 14%",
	],
	["--ring", "Focus indicator.", "accent-600 / accent-400"],
	["--link", "Links.", "accent-500 / accent-300"],
];

function hexOf(theme: TokenTheme, themeName: "light" | "dark", token: string) {
	const rgb = resolveColour(theme, themeName, token);
	const channel = (value: number) =>
		Math.max(0, Math.min(255, Math.round(value)))
			.toString(16)
			.padStart(2, "0");
	return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

function ratioRows(
	theme: TokenTheme,
	pairs: ContrastPair[],
): Array<ContrastPair & { light: number; dark: number }> {
	return pairs.map((pair) => ({
		...pair,
		light: contrastThrough(
			theme,
			"light",
			pair.fg,
			pair.layer ?? null,
			pair.base,
		),
		dark: contrastThrough(
			theme,
			"dark",
			pair.fg,
			pair.layer ?? null,
			pair.base,
		),
	}));
}

/**
 * Colour, shown as roles rather than shades.
 *
 * The ratios are computed from the token file at build time by the same
 * resolver the contrast tests use, so a reviewer can trust the numbers on this
 * page — and a token change that breaks one fails the build before it ships.
 */
export function ColourSection({ theme }: { theme: TokenTheme }) {
	const text = ratioRows(theme, TEXT_CONTRACT);
	const nonText = ratioRows(theme, NON_TEXT_CONTRACT);

	return (
		<>
			<Specimen
				note="Ink-toned, hue 250, never pure black. Click any step to copy its var()."
				title="Neutral ramp — 12 steps"
			>
				<div className="grid grid-cols-6 gap-2 sm:grid-cols-12">
					{NEUTRALS.map((step) => (
						<div className="flex flex-col gap-1" key={step}>
							<Swatch token={`--br-neutral-${step}`} />
							<span className="br-label">{step}</span>
						</div>
					))}
				</div>
				<div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
					{NEUTRALS.map((step) => (
						<CopyToken
							key={step}
							name={`--br-neutral-${step}`}
							value={resolveValue(theme, "light", `--br-neutral-${step}`)}
						/>
					))}
				</div>
			</Specimen>

			<Specimen
				note="One hue (255) for the whole product. Re-hue the @theme block to rebrand; nothing else moves."
				title="Accent ramp — 10 steps"
			>
				<div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
					{ACCENTS.map((step) => (
						<div className="flex flex-col gap-1" key={step}>
							<Swatch token={`--br-accent-${step}`} />
							<span className="br-label">{step}</span>
						</div>
					))}
				</div>
				<p className="text-fg-muted text-xs">
					The accent is interaction only, at three sites per view: the one
					primary button, selection, and focus/links. Everything else is
					neutral.
				</p>
			</Specimen>

			<Specimen
				note="One token per meaning. Softer fills are color-mix of the same value, never a second hue."
				title="Status"
			>
				<div className="flex flex-wrap items-center gap-3">
					<StatusChip icon={<CheckCircle2 />} tone="success">
						Saved
					</StatusChip>
					<StatusChip icon={<AlertTriangle />} tone="warning">
						Needs checking
					</StatusChip>
					<StatusChip icon={<XCircle />} tone="danger">
						Save failed
					</StatusChip>
					<StatusChip icon={<Info />} tone="info">
						Reading order uncertain
					</StatusChip>
				</div>
				<p className="text-fg-muted text-xs">
					Tint + same-hue text + icon. The icon is the redundant channel: every
					one of these survives greyscale, which is the squint test.
				</p>
			</Specimen>

			<Specimen
				note="Swatches show the theme you are reading this page in; the table shows both. Click a role to copy it."
				title="Semantic roles"
			>
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b">
								<th className="br-label py-2 pr-4">Role</th>
								<th className="br-label py-2 pr-4">Light</th>
								<th className="br-label py-2 pr-4">Dark</th>
								<th className="br-label py-2">Use</th>
							</tr>
						</thead>
						<tbody>
							{SEMANTIC_ROLES.map(([token, use, spec]) => (
								<tr className="border-b last:border-b-0" key={token}>
									<td className="py-2 pr-4 align-middle">
										<CopyToken name={token} />
									</td>
									<td className="py-2 pr-4 align-middle">
										<span className="flex items-center gap-2">
											<span
												aria-hidden
												className="block size-6 shrink-0 rounded-sm border"
												style={{
													backgroundColor: hexOf(theme, "light", token),
												}}
											/>
											<span className="font-mono text-xs">{spec}</span>
										</span>
									</td>
									<td className="py-2 pr-4 align-middle">
										<span
											aria-hidden
											className="block size-6 rounded-sm border"
											style={{ backgroundColor: hexOf(theme, "dark", token) }}
										/>
									</td>
									<td className="py-2 text-fg-muted text-xs">{use}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Specimen>

			<Specimen
				note="The surface ladder. In light, shadow lifts; in dark, tone lifts — that asymmetry is the rule."
				title="Depth"
			>
				<div className="grid gap-3 sm:grid-cols-4">
					{[
						["L0 · page", "--background"],
						["L1 · surface", "--surface"],
						["L2 · overlay", "--surface-raised"],
						["sunken · well", "--sunken"],
					].map(([label, token]) => (
						<div className="flex flex-col gap-2" key={label}>
							<div
								className="br-panel flex h-16 items-end p-2"
								style={{ backgroundColor: `var(${token})` }}
							>
								<span className="br-label">{label}</span>
							</div>
							<span className="font-mono text-fg-muted text-xs">{token}</span>
						</div>
					))}
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					{LADDER_STEPS.map((step) => (
						<div className="flex flex-col gap-1" key={`${step.a}-${step.b}`}>
							<span className="br-label">{step.label}</span>
							<span className="flex items-center gap-2 text-xs">
								<span className="text-fg-muted">light</span>
								<Ratio
									min={step.min}
									value={contrastOf(theme, "light", step.a, step.b)}
								/>
								<span className="text-fg-muted">dark</span>
								<Ratio
									min={step.min}
									value={contrastOf(theme, "dark", step.a, step.b)}
								/>
							</span>
						</div>
					))}
				</div>
			</Specimen>

			<Specimen
				note="Every readable pair in both themes. Measured from globals.css, not typed by hand."
				title="Text contrast — 4.5:1"
			>
				<ContrastTable rows={text} />
			</Specimen>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="Boundaries, selection edges, icon tones and focus. This is the tier the old theme failed at 1.31:1."
					title="Non-text contrast — 3:1"
				>
					<ContrastTable rows={nonText} />
				</Specimen>

				<Specimen
					note="The values are resolved through var() and color-mix at build time."
					title="Anchors"
				>
					<dl className="flex flex-col gap-3">
						{[
							"--primary",
							"--link",
							"--ring",
							"--border-control",
							"--border-selected",
							"--success",
							"--warning",
							"--danger",
							"--info",
						].map((token) => (
							<div className="flex items-center gap-3" key={token}>
								<Swatch className="size-8" token={token} />
								<div className="flex min-w-0 flex-1 flex-col">
									<CopyToken name={token} />
									<span className="px-2 font-mono text-fg-muted text-xs">
										light {hexOf(theme, "light", token)} · dark{" "}
										{hexOf(theme, "dark", token)}
									</span>
								</div>
								<span
									className="flex items-center gap-1"
									title="Measured on the page background"
								>
									<span className="text-fg-muted text-xs">L</span>
									<Ratio
										min={4.5}
										value={contrastOf(theme, "light", token, "--background")}
									/>
									<span className="text-fg-muted text-xs">D</span>
									<Ratio
										min={4.5}
										value={contrastOf(theme, "dark", token, "--background")}
									/>
								</span>
							</div>
						))}
					</dl>
					<p className="text-fg-muted text-xs">
						Hex is shown for reading and for tools that cannot read oklch. The
						token is the source; the hex is a rendering of it.
					</p>
				</Specimen>
			</div>
		</>
	);
}

function ContrastTable({
	rows,
}: {
	rows: Array<ContrastPair & { light: number; dark: number }>;
}) {
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead>
					<tr className="border-b">
						<th className="br-label py-2 pr-4">Pair</th>
						<th className="br-label py-2 pr-4">Light</th>
						<th className="br-label py-2">Dark</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row) => (
						<tr
							className="border-b last:border-b-0"
							key={`${row.fg}-${row.layer ?? ""}-${row.base}-${row.label}`}
						>
							<td className="py-2 pr-4">
								<span className="block">{row.label}</span>
								<span className="block font-mono text-fg-muted text-xs">
									{row.fg}
									{row.layer ? ` over ${row.layer}` : ""} on {row.base}
								</span>
							</td>
							<td className="py-2 pr-4">
								<Ratio min={row.min} value={row.light} />
							</td>
							<td className="py-2">
								<Ratio min={row.min} value={row.dark} />
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
