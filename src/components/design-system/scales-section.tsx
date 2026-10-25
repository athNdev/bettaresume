import { CopyToken } from "@/components/design-system/copy-token";
import { Specimen, Subhead } from "@/components/design-system/primitives";
import {
	ELEVATION_SCALE,
	MOTION_SCALE,
	RADIUS_SCALE,
	SPACING_SCALE,
	Z_LADDER,
} from "@/lib/design-system/contract";
import type { TokenTheme } from "@/lib/design-system/token-theme";
import { resolveValue } from "@/lib/design-system/token-theme";

const RADIUS_DEMO: Array<{ className: string; token: string; label: string }> =
	[
		{ className: "rounded-xs", token: "--br-radius-xs", label: "4 · chips" },
		{ className: "rounded-sm", token: "--br-radius-sm", label: "6 · controls" },
		{ className: "rounded-md", token: "--br-radius-md", label: "8 · panels" },
		{ className: "rounded-lg", token: "--br-radius-lg", label: "12 · dialogs" },
		{
			className: "rounded-full",
			token: "--br-radius-full",
			label: "full · dots",
		},
	];

const ELEVATION_DEMO: Array<{
	className: string;
	token: string;
	label: string;
}> = [
	{ className: "shadow-elev-0", token: "--elev-0", label: "elev-0 · in flow" },
	{ className: "shadow-elev-1", token: "--elev-1", label: "elev-1 · card" },
	{ className: "shadow-elev-2", token: "--elev-2", label: "elev-2 · popover" },
	{ className: "shadow-elev-3", token: "--elev-3", label: "elev-3 · dialog" },
];

/**
 * The closed scales: spacing, density, radius, elevation, motion, z-index.
 *
 * Every bar and specimen reads its value from a token, so this section is a
 * measuring instrument, not an illustration of one.
 */
export function ScalesSection({ theme }: { theme: TokenTheme }) {
	const spacingValue = (token: string) =>
		`${(Number.parseFloat(resolveValue(theme, "light", token)) * 16).toFixed(0)}px`;

	return (
		<>
			<Specimen
				note="4px base, with a 2px optical half-step for icon↔label only. Each step is ≥25% from its neighbour at the small end."
				title="Spacing — 10 steps"
			>
				<div className="flex flex-col gap-2">
					{SPACING_SCALE.map((row) => (
						<div
							className="grid items-center gap-3 sm:grid-cols-[240px_1fr_80px]"
							key={row.token}
						>
							<CopyToken name={row.token} value={spacingValue(row.token)} />
							<span className="flex items-center">
								<span
									className="block h-2 rounded-full bg-primary"
									style={{ width: `var(${row.token})` }}
								/>
							</span>
							<span className="text-fg-muted text-xs">{row.use}</span>
						</div>
					))}
				</div>
			</Specimen>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="28 / 32 / 40 controls. Default 32. Rows 40. Panel headers 44."
					title="Density"
				>
					<div className="flex flex-col gap-3">
						{[
							["sm · 28", "h-7", "Toolbar icon buttons, chips"],
							["md · 32", "h-8", "Default control and button"],
							["lg · 40", "h-10", "Primary action, form row"],
							["panel header · 44", "h-11", "Micro label + actions"],
							["row · 40", "h-10", "Rail and list rows"],
						].map(([label, height, use]) => (
							<div className="flex items-center gap-3" key={label}>
								<span className="w-32 shrink-0 text-fg-muted text-xs">
									{label}
								</span>
								<span
									className={`${height} w-full max-w-72 rounded-sm border bg-sunken`}
								/>
								<span className="text-fg-muted text-xs">{use}</span>
							</div>
						))}
					</div>
					<Subhead hint="Label → control 4 · field → field 16 · group → group 24. Forms cap at a 640px measure.">
						The form rhythm
					</Subhead>
					<div className="flex max-w-lg flex-col gap-0">
						<span className="br-label">Label</span>
						<span className="mt-1 h-8 w-full max-w-md rounded-sm border bg-background" />
						<span className="mt-4 h-8 w-full max-w-md rounded-sm border bg-background" />
						<span className="mt-6 text-fg-muted text-xs">
							4 / 16 / 24 — one rhythm, three distances
						</span>
					</div>
				</Specimen>

				<Specimen
					note="6/8px is the chrome language. 12 is reserved for dialogs and sheets; paper objects stay square."
					title="Radius"
				>
					<div className="flex flex-wrap items-end gap-6">
						{RADIUS_DEMO.map((row) => (
							<div className="flex flex-col items-center gap-2" key={row.token}>
								<span
									className={`block size-16 border bg-sunken ${row.className}`}
								/>
								<span className="br-label">{row.label}</span>
							</div>
						))}
					</div>
					<div className="flex flex-col gap-1">
						{RADIUS_SCALE.map((row) => (
							<CopyToken
								key={row.token}
								name={row.token}
								value={`${row.value} · ${row.use}`}
							/>
						))}
					</div>
				</Specimen>
			</div>

			<Specimen
				note="Two layers, always: tight contact + wide ambient. In dark the alphas multiply and a 1px top highlight is added. Hover a card to see the lift."
				title="Elevation"
			>
				<div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
					{ELEVATION_DEMO.map((row) => (
						<div className="flex flex-col items-center gap-3" key={row.token}>
							<span
								className={`br-lift block size-20 rounded-md border bg-surface ${row.className}`}
							/>
							<span className="br-label">{row.label}</span>
						</div>
					))}
				</div>
				<div className="flex flex-col gap-1">
					{ELEVATION_SCALE.map((row) => (
						<CopyToken
							key={row.token}
							name={row.token}
							value={`${row.className} · ${row.use}`}
						/>
					))}
				</div>
			</Specimen>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="Three durations, one easing family. Nothing floats in slowly; every transition is gated by prefers-reduced-motion."
					title="Motion"
				>
					<div className="flex flex-col gap-3">
						{MOTION_SCALE.map((row) => (
							<div className="flex items-center gap-3" key={row.token}>
								<CopyToken
									className="w-56 shrink-0"
									name={row.token}
									value={row.value}
								/>
								<span className="text-fg-muted text-xs">{row.use}</span>
							</div>
						))}
					</div>
					<div className="br-sunken-static flex items-center justify-between gap-3 p-4">
						<span className="text-sm">
							Hover the card above: 180ms, −2px, ambient shadow.
						</span>
						<span className="br-kbd">esc</span>
					</div>
				</Specimen>

				<Specimen
					note="One ladder. Use z-(--br-z-…); a raw numeric z-index is off-system."
					title="z-index"
				>
					<table className="w-full text-left text-sm">
						<tbody>
							{Z_LADDER.map((row) => (
								<tr className="border-b last:border-b-0" key={row.token}>
									<td className="py-1 pr-4">
										<CopyToken name={row.token} />
									</td>
									<td className="py-1 pr-4 font-mono text-xs">{row.value}</td>
									<td className="py-1 text-fg-muted text-xs">{row.use}</td>
								</tr>
							))}
						</tbody>
					</table>
				</Specimen>
			</div>
		</>
	);
}
