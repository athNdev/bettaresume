import { ImageResponse } from "next/og";

/**
 * The link-preview card, served at `/og.png`.
 *
 * Generated at build time rather than hand-drawn, so the words on the card cannot
 * disagree with the words on the page. `output: "export"` has no server to render this
 * on request, so `dynamic = "force-static"` prerenders it into `out/og.png`.
 *
 * The directory name is the URL. It was `src/app/opengraph-image.tsx`, the file
 * convention, which emits `/opengraph-image` with no extension -- and GitHub Pages
 * types an extensionless file as `application/octet-stream`. Crawlers check the
 * extension before they check `og:image:type`, so the card would render correctly in a
 * browser and refuse to unfurl in every link preview. Naming the segment `og.png` is
 * the whole fix: the bytes and the content type now agree without a post-build copy.
 *
 * Satori — the renderer behind `ImageResponse` — supports a subset of CSS: flexbox
 * only, no grid, no oklch. The palette below is therefore literal hex, mirroring the
 * light-surface brand: near-black ink, a near-white paper, and the same blue the
 * focus ring uses.
 */
export const dynamic = "force-static";

const SIZE = { width: 1200, height: 630 };

const INK = "#0b0b0c";
const PAPER = "#ffffff";
const ACCENT = "#2f6bff";
const MUTED = "#a1a1aa";
const HAIRLINE = "#27272a";

export function GET() {
	return new ImageResponse(
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				background: INK,
				color: PAPER,
				padding: "64px 72px",
				fontFamily: "sans-serif",
			}}
		>
			{/* Left: the claim. */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "space-between",
					width: 640,
					height: "100%",
				}}
			>
				<div style={{ display: "flex", alignItems: "center" }}>
					<div
						style={{
							display: "flex",
							width: 28,
							height: 28,
							borderRadius: 7,
							background: ACCENT,
							marginRight: 14,
						}}
					/>
					<div style={{ display: "flex", fontSize: 26, letterSpacing: -0.4 }}>
						Betta Resume
					</div>
				</div>

				<div style={{ display: "flex", flexDirection: "column" }}>
					<div
						style={{
							display: "flex",
							fontSize: 68,
							lineHeight: 1.05,
							letterSpacing: -2.4,
							fontWeight: 700,
						}}
					>
						One master resume.
					</div>
					<div
						style={{
							display: "flex",
							fontSize: 68,
							lineHeight: 1.05,
							letterSpacing: -2.4,
							fontWeight: 700,
							color: ACCENT,
						}}
					>
						Tailored per role.
					</div>
					<div
						style={{
							display: "flex",
							marginTop: 28,
							fontSize: 25,
							lineHeight: 1.45,
							color: MUTED,
							maxWidth: 560,
						}}
					>
						Versioning, linked variants and a content library — around the
						writing, not instead of it.
					</div>
				</div>

				<div style={{ display: "flex", fontSize: 20, color: MUTED }}>
					app.bettaresume.com
				</div>
			</div>

			{/* Right: one base, three variants — the product in one picture. */}
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					justifyContent: "center",
					width: 416,
					height: "100%",
					paddingLeft: 56,
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						background: "#18181b",
						border: `1px solid ${HAIRLINE}`,
						borderRadius: 14,
						padding: 22,
					}}
				>
					<div style={{ display: "flex", fontSize: 15, color: MUTED }}>
						Base
					</div>
					<div style={{ display: "flex", fontSize: 24, marginTop: 4 }}>
						Master resume
					</div>
					{[92, 74, 84, 58].map((w) => (
						<div
							key={w}
							style={{
								display: "flex",
								height: 6,
								borderRadius: 3,
								background: "#3f3f46",
								marginTop: 10,
								width: `${w}%`,
							}}
						/>
					))}
				</div>

				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						height: 34,
						color: ACCENT,
						fontSize: 26,
					}}
				>
					↓
				</div>

				{["Backend role", "Research role", "Startup role"].map((label, i) => (
					<div
						key={label}
						style={{
							display: "flex",
							alignItems: "center",
							background: "#111113",
							border: `1px solid ${i === 0 ? ACCENT : HAIRLINE}`,
							borderRadius: 10,
							padding: "12px 16px",
							marginTop: 8,
							fontSize: 19,
							color: i === 0 ? PAPER : MUTED,
						}}
					>
						<div
							style={{
								display: "flex",
								width: 8,
								height: 8,
								borderRadius: 4,
								background: i === 0 ? ACCENT : "#52525b",
								marginRight: 12,
							}}
						/>
						{label}
					</div>
				))}
			</div>
		</div>,
		{ ...SIZE },
	);
}
