"use client";

import { FileText, Plus } from "lucide-react";
import { Specimen } from "@/components/design-system/primitives";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import {
	PanelClear,
	PanelEmpty,
	PanelError,
	PanelLoading,
} from "@/components/ui/panel-state";

/**
 * Empty, loading and error, designed as states rather than defaults.
 *
 * The page uses the real components the app ships, so what a reviewer comments
 * on here is what a user sees in the editor.
 */
export function StateSection() {
	return (
		<>
			<div className="grid gap-8 lg:grid-cols-3">
				<Specimen
					note="40px tinted tile, headline, one muted line, one action. Centred in the region."
					title="Empty"
				>
					<div className="br-sunken-static py-4">
						<PanelEmpty
							action={
								<Button size="sm">
									<Plus aria-hidden />
									Add section
								</Button>
							}
							hint="Add the first one — Experience is usually where readers look first."
							icon={<FileText aria-hidden className="size-5" />}
							title="This resume has no sections yet"
						/>
					</div>
				</Specimen>

				<Specimen
					note="Skeletons keep the final shape: the same page frame, then text bars."
					title="Loading"
				>
					<div className="flex flex-col gap-4">
						<div className="mx-auto w-40">
							<div className="aspect-[8.5/11] w-full border bg-preview-paper p-3">
								<div className="flex flex-col gap-2">
									<div className="h-2 w-1/2 rounded-xs bg-[var(--preview-paper-shade)]" />
									<div className="h-1 w-full rounded-xs bg-[var(--preview-paper-shade)]" />
									<div className="h-1 w-11/12 rounded-xs bg-[var(--preview-paper-shade)]" />
									<div className="h-1 w-4/5 rounded-xs bg-[var(--preview-paper-shade)]" />
								</div>
							</div>
						</div>
						<PanelLoading label="Loading your library…" />
					</div>
				</Specimen>

				<Specimen
					note="A danger-soft callout pinned to the affected region, with the retry beside it."
					title="Error"
				>
					<PanelError
						message="Could not load your library: the request timed out."
						onRetry={() => undefined}
						retryLabel="Try again"
					/>
					<PanelClear
						hint="No blocking issues in this resume right now."
						title="Nothing to fix"
					/>
				</Specimen>
			</div>

			<Specimen
				note="The compile state keeps the page's box so the document does not jump when it resolves."
				title="Typesetting"
			>
				<div className="br-stage flex items-center justify-center p-6">
					<div className="br-page flex aspect-[8.5/11] w-48 flex-col items-center justify-center gap-3 p-4">
						<div className="h-1 w-full max-w-32 overflow-hidden rounded-full bg-sunken">
							<div className="h-1 w-2/3 rounded-full bg-primary" />
						</div>
						<span className="text-fg-muted text-xs">Typesetting…</span>
					</div>
				</div>
			</Specimen>
		</>
	);
}

/**
 * The ornament budget, shown rather than asserted.
 *
 * Five sites are allowed to be decorative. Everything else is quiet, and the
 * "stays quiet" column is the half of the rule people forget.
 */
export function OrnamentSection() {
	return (
		<>
			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="The one hero surface: a vignetted field with the sheet on a three-layer page shadow. In dark the sheet gets a top edge."
					title="1 · The paper stage"
				>
					<div className="br-stage flex items-center justify-center p-8">
						<div className="br-page flex aspect-[8.5/11] w-40 flex-col gap-2 p-4">
							<div className="h-2 w-2/3 rounded-full bg-[var(--preview-paper-shade)]" />
							<div className="h-1 w-1/3 rounded-full bg-[var(--preview-paper-shade)]" />
							<div className="mt-2 h-1 w-full rounded-full bg-[var(--preview-paper-shade)]" />
							<div className="h-1 w-11/12 rounded-full bg-[var(--preview-paper-shade)]" />
							<div className="mt-2 h-1 w-1/2 rounded-full bg-[var(--preview-paper-shade)]" />
							<div className="h-1 w-full rounded-full bg-[var(--preview-paper-shade)]" />
						</div>
					</div>
				</Specimen>

				<div className="flex flex-col gap-8">
					<Specimen
						note="The app's most repeated accent moment, and the one that carries meaning."
						title="2 · Selection"
					>
						<div className="relative flex h-10 items-center gap-2 rounded-sm bg-selected px-3 text-sm">
							<span className="br-selection-rule" />
							<span className="flex-1">Executive</span>
							<span className="text-border-selected">✓</span>
						</div>
					</Specimen>

					<Specimen
						note="One per empty state, never a stock icon on a page of void."
						title="3 · Empty-state tiles"
					>
						<div className="flex items-center gap-4">
							<span className="br-tile">◎</span>
							<span className="br-tile" data-tone="success">
								✓
							</span>
							<span className="br-tile" data-tone="danger">
								!
							</span>
						</div>
					</Specimen>
				</div>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="In menus and tooltips, so a shortcut is discoverable rather than folklore."
					title="4 · Kbd chips"
				>
					<div className="flex items-center gap-2 text-sm">
						<span>Export</span>
						<Kbd>⌘</Kbd>
						<Kbd>E</Kbd>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span>Save a version</span>
						<Kbd>⌘</Kbd>
						<Kbd>S</Kbd>
					</div>
					<div className="flex items-center gap-2 text-sm">
						<span>Dismiss</span>
						<Kbd>esc</Kbd>
					</div>
				</Specimen>

				<Specimen
					note="Used exactly once in the chrome: the top edge of the active form group."
					title="5 · One gradient hairline"
				>
					<div className="br-accent-edge br-panel p-4">
						<span className="br-label">Contact information · active</span>
						<p className="mt-2 text-fg-muted text-sm">
							The gradient is a 1px rule, not a background. It marks the region
							the form is writing to.
						</p>
					</div>
				</Specimen>
			</div>

			<Specimen
				note="The other half of the budget: what must not be decorated."
				title="Stays quiet"
			>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
					{[
						["Rails", "Seams, never lifts or tints."],
						["Forms", "No gradients, glows or fills."],
						["Tables", "Hairlines, not zebra stripes."],
						["Dialogs", "One surface, one scrim, no ornament."],
					].map(([title, note]) => (
						<div className="rounded-sm border p-3" key={title}>
							<span className="font-medium text-sm">{title}</span>
							<p className="mt-1 text-fg-muted text-xs">{note}</p>
						</div>
					))}
				</div>
			</Specimen>
		</>
	);
}
