import { Check, X } from "lucide-react";
import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand/brand-lockup";
import { BrandMark } from "@/components/brand/brand-mark";
import { BrandWordmark } from "@/components/brand/brand-wordmark";
import { Specimen, Subhead } from "@/components/design-system/primitives";

/**
 * The brand identity, shown as the system that produced it.
 *
 * The mark is two offset sheets (master + variant); the wordmark is Inter at
 * two weights. Everything here is the live component, so this section cannot
 * drift from what the header and the favicon actually use.
 */
export function BrandSection() {
	return (
		<>
			<Specimen
				note="Live components, not images. Sizes are the four supported steps."
				title="Lockup — mark + wordmark"
			>
				<div className="flex flex-wrap items-end gap-12">
					<div className="flex flex-col gap-2">
						<BrandLockup size="xl" variant="accent" />
						<span className="br-label">xl · 56 / 32</span>
					</div>
					<div className="flex flex-col gap-2">
						<BrandLockup size="lg" variant="accent" />
						<span className="br-label">lg · 40 / 20</span>
					</div>
					<div className="flex flex-col gap-2">
						<BrandLockup size="md" variant="accent" />
						<span className="br-label">md · 28 / 16 · header</span>
					</div>
					<div className="flex flex-col gap-2">
						<BrandLockup size="sm" variant="accent" />
						<span className="br-label">sm · 20 / 14 · minimum</span>
					</div>
				</div>
			</Specimen>

			<div className="grid gap-8 sm:grid-cols-2">
				<Specimen
					note="One colour by default. Inherits currentColor, so it works on paper and on ink without a second asset."
					title="Mark — mono"
				>
					<div className="flex items-end gap-8">
						<div className="flex flex-col items-center gap-2">
							<BrandMark className="size-4" label={null} />
							<span className="br-label">16</span>
						</div>
						<div className="flex flex-col items-center gap-2">
							<BrandMark className="size-8" label={null} />
							<span className="br-label">32</span>
						</div>
						<div className="flex flex-col items-center gap-2">
							<BrandMark className="size-16" label={null} />
							<span className="br-label">64</span>
						</div>
						<div className="flex flex-col items-center gap-2">
							<BrandMark className="size-24" label={null} />
							<span className="br-label">96</span>
						</div>
					</div>
				</Specimen>

				<Specimen
					note="Accent on the back sheet only. The accent is an event: this variant is for the brand moment, never for status and never twice on a screen."
					title="Mark — accent"
				>
					<div className="flex items-end gap-8">
						<BrandMark className="size-8" label={null} variant="accent" />
						<BrandMark className="size-16" label={null} variant="accent" />
						<BrandMark className="size-24" label={null} variant="accent" />
					</div>
					<div className="flex items-center gap-2">
						<BrandWordmark className="text-lg" />
						<span className="br-label">
							wordmark — Inter 700 / 400, −0.01em
						</span>
					</div>
				</Specimen>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="Clear space is one mark width on every side (x). The dashed box is the measurement, not a component style."
					title="Clear space"
				>
					<div className="flex items-center gap-4">
						<span className="br-label">x</span>
						<div className="inline-flex border border-dashed p-8">
							<BrandLockup size="md" variant="accent" />
						</div>
					</div>
					<p className="text-fg-muted text-xs">
						At the default size x = 28px, so the minimum padding is 28px. The
						lockup never sits closer than that to type, an edge or another mark.
					</p>
				</Specimen>

				<Specimen
					note="The four ways to break it. Each one is a real CSS mistake, not a hypothetical."
					title="Don't"
				>
					<div className="flex flex-wrap items-end gap-8">
						<div className="flex flex-col items-center gap-2">
							<span className="inline-flex -rotate-12">
								<BrandMark className="size-10" label={null} />
							</span>
							<span className="text-destructive text-xs">Don't rotate</span>
						</div>
						<div className="flex flex-col items-center gap-2">
							<span className="inline-flex scale-x-150">
								<BrandMark className="size-10" label={null} />
							</span>
							<span className="text-destructive text-xs">Don't stretch</span>
						</div>
						<div className="flex flex-col items-center gap-2">
							<span className="text-warning">
								<BrandMark className="size-10" label={null} />
							</span>
							<span className="text-destructive text-xs">Don't recolour</span>
						</div>
						<div className="flex flex-col items-center gap-2">
							<BrandMark className="size-3" label={null} />
							<span className="text-destructive text-xs">
								Don't go under 16
							</span>
						</div>
					</div>
				</Specimen>
			</div>

			<Specimen
				note="The specification, for anyone building with it."
				title="The brand, in one table"
			>
				<dl className="grid gap-4 sm:grid-cols-2">
					<Fact term="Mark">
						Two offset sheets: master in front, variant behind. The front
						sheet's lines are knocked out, so it survives one colour and 16px.
					</Fact>
					<Fact term="Wordmark">
						Inter 700 for “Betta”, 400 for “Resume”, −0.01em. Outlined in{" "}
						<code className="font-mono text-xs">public/brand/wordmark.svg</code>{" "}
						from the self-hosted Inter files.
					</Fact>
					<Fact term="Sizes">
						Lockup 20 / 28 / 40 / 56px tall. Mark alone down to 16px. Below
						20px, mark only.
					</Fact>
					<Fact term="Clear space">
						One mark width (x) on all sides. At md, x = 28px.
					</Fact>
					<Fact term="Colour">
						Mono by default (currentColor). Accent (
						<code className="font-mono text-xs">--primary</code>, hue 255) on
						the back sheet only, where the brand is the subject.
					</Fact>
					<Fact term="Assets">
						<code className="font-mono text-xs">public/brand/</code> (mark,
						mark-accent, wordmark, lockup, lockup-mono, lockup-accent),{" "}
						<code className="font-mono text-xs">public/icon.svg</code>,{" "}
						<code className="font-mono text-xs">public/favicon.ico</code>.
						Generated by{" "}
						<code className="font-mono text-xs">scripts/brand-assets.cjs</code>.
					</Fact>
				</dl>
			</Specimen>

			<div className="grid gap-8 sm:grid-cols-2">
				<Rule title="Do">
					<ul className="flex flex-col gap-2">
						<Do>Set the lockup on a flat surface with x of clear space.</Do>
						<Do>Use the mono mark on both paper and ink.</Do>
						<Do>
							Use the accent variant once per screen, where the brand is the
							subject.
						</Do>
						<Do>Keep the wordmark at 14px or larger.</Do>
					</ul>
				</Rule>
				<Rule title="Don't">
					<ul className="flex flex-col gap-2">
						<Dont>Rotate, stretch or outline the mark.</Dont>
						<Dont>Recolour the wordmark, or set it in another typeface.</Dont>
						<Dont>
							Put the accent variant on a tint where it loses its 3:1 edge.
						</Dont>
						<Dont>Set a lockup below 20px — use the mark alone.</Dont>
					</ul>
				</Rule>
			</div>
		</>
	);
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
	return (
		<div className="flex flex-col gap-1">
			<dt className="br-label">{term}</dt>
			<dd className="text-sm leading-relaxed">{children}</dd>
		</div>
	);
}

function Rule({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className="border-t pt-4">
			<Subhead>{title}</Subhead>
			<div className="mt-4">{children}</div>
		</div>
	);
}

function Do({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2 text-sm">
			<Check aria-hidden className="mt-1 size-4 shrink-0 text-success" />
			<span>{children}</span>
		</li>
	);
}

function Dont({ children }: { children: ReactNode }) {
	return (
		<li className="flex items-start gap-2 text-sm">
			<X aria-hidden className="mt-1 size-4 shrink-0 text-destructive" />
			<span>{children}</span>
		</li>
	);
}
