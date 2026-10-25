"use client";

import {
	ArrowRight,
	Check,
	ChevronDown,
	Download,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import type { ReactNode } from "react";
import { Specimen, Subhead } from "@/components/design-system/primitives";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SelectionRule } from "@/components/ui/selection-rule";
import { Slider } from "@/components/ui/slider";
import { StatusChip } from "@/components/ui/status-chip";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * The component system, in every state it owns.
 *
 * Hover, active and focus are pseudo-classes: a static page cannot point a
 * cursor at itself. So the specimens render the *surface values* those states
 * resolve to (the same `bg-accent` layer the CSS uses), and each is labelled.
 * Default, disabled, loading, error and selection are real — they are props.
 */
export function ComponentSection() {
	return (
		<>
			<Specimen
				note="Five variants, three sizes. The solid accent is the one primary action in a region."
				title="Buttons"
			>
				<div className="flex flex-wrap items-center gap-3">
					<Button>
						<Plus aria-hidden />
						New resume
					</Button>
					<Button variant="outline">Export</Button>
					<Button variant="secondary">Secondary</Button>
					<Button variant="ghost">Ghost</Button>
					<Button variant="destructive">
						<Trash2 aria-hidden />
						Delete
					</Button>
					<Button variant="link">
						Read the rules
						<ArrowRight aria-hidden />
					</Button>
				</div>
				<div className="flex flex-wrap items-end gap-3">
					<Button size="sm">Small · 28</Button>
					<Button>Default · 32</Button>
					<Button size="lg">Large · 40</Button>
				</div>
				<div className="flex items-center gap-2">
					<TooltipProvider>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button aria-label="Export" size="icon" variant="ghost">
									<Download aria-hidden />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								Export <Kbd>⌘E</Kbd>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
					<span className="text-fg-muted text-xs">
						Icon-only controls are square, tooltipped and named.
					</span>
				</div>
			</Specimen>

			<Specimen
				note="Disabled is 50% opacity plus a reason — never a grey slab that reads enabled. Loading holds the width."
				title="Button states"
			>
				<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
					<StateCell label="Default">
						<Button>Save</Button>
					</StateCell>
					<StateCell label="Hover — state layer">
						<Button className="bg-accent text-accent-foreground">Save</Button>
					</StateCell>
					<StateCell label="Active — pressed">
						<Button className="scale-[0.96]">Save</Button>
					</StateCell>
					<StateCell label="Focus-visible">
						<Button className="ring-2 ring-ring ring-offset-2 ring-offset-background">
							Save
						</Button>
					</StateCell>
					<StateCell label="Disabled + reason">
						<Button disabled disabledReason="Name your resume to continue">
							Create resume
						</Button>
					</StateCell>
					<StateCell label="Loading">
						<Button loading>Saving</Button>
					</StateCell>
				</div>
			</Specimen>

			<Specimen
				note="The input spine: 32px, 1px control boundary at ≥3:1, error via aria-invalid."
				title="Fields"
			>
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-default">Default</Label>
						<Input id="ds-default" placeholder="Amara Okafor" />
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-hover">Hover — boundary moves to ink</Label>
						<Input
							className="border-foreground"
							id="ds-hover"
							placeholder="Amara Okafor"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-focus">Focus-visible</Label>
						<Input
							className="ring-2 ring-ring ring-offset-2 ring-offset-background"
							id="ds-focus"
							placeholder="Amara Okafor"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-error">Error</Label>
						<Input aria-invalid id="ds-error" placeholder="not-an-email" />
						<span className="text-destructive text-xs">
							Use an address like name@example.com
						</span>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-disabled">Disabled</Label>
						<Input disabled id="ds-disabled" placeholder="Not editable" />
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-loading">Loading</Label>
						<Input id="ds-loading" loading placeholder="Checking…" />
					</div>
					<div className="flex flex-col gap-1 sm:col-span-2">
						<Label htmlFor="ds-textarea">Textarea · min 80px</Label>
						<Textarea
							id="ds-textarea"
							placeholder="A summary is two or three sentences."
						/>
					</div>
					<div className="flex flex-col gap-1">
						<Label htmlFor="ds-select">Select</Label>
						<Select defaultValue="standard">
							<SelectTrigger id="ds-select">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="standard">Standard</SelectItem>
								<SelectItem value="compact">Compact</SelectItem>
								<SelectItem value="executive">Executive</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<Label>Disabled select</Label>
						<Select defaultValue="standard" disabled>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="standard">Standard</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>
			</Specimen>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="16px box, checked fill = primary."
					title="Checkbox & radio"
				>
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<Checkbox defaultChecked id="ds-check" />
							<Label htmlFor="ds-check">Checked</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox id="ds-check-2" />
							<Label htmlFor="ds-check-2">Unchecked</Label>
						</div>
						<div className="flex items-center gap-2">
							<Checkbox disabled id="ds-check-3" />
							<Label htmlFor="ds-check-3">Disabled</Label>
						</div>
						<RadioGroup defaultValue="a">
							<div className="flex items-center gap-2">
								<RadioGroupItem id="ds-radio-a" value="a" />
								<Label htmlFor="ds-radio-a">Selected</Label>
							</div>
							<div className="flex items-center gap-2">
								<RadioGroupItem id="ds-radio-b" value="b" />
								<Label htmlFor="ds-radio-b">Alternative</Label>
							</div>
						</RadioGroup>
					</div>
				</Specimen>

				<Specimen
					note="The thumb lifts; the track is a state, not a colour field."
					title="Switch & slider"
				>
					<div className="flex flex-col gap-6">
						<div className="flex items-center gap-3">
							<Switch defaultChecked id="ds-switch" />
							<Label htmlFor="ds-switch">Show archived</Label>
						</div>
						<div className="flex flex-col gap-2">
							<Label>Scale · 100%</Label>
							<Slider defaultValue={[40]} max={100} step={1} />
						</div>
						<div className="flex flex-wrap items-center gap-2">
							<Badge>Count</Badge>
							<Badge variant="secondary">Secondary</Badge>
							<Badge variant="outline">Outline</Badge>
							<StatusChip icon={<Check />} tone="success">
								Saved
							</StatusChip>
							<Kbd>↵</Kbd>
							<Kbd>esc</Kbd>
						</div>
					</div>
				</Specimen>
			</div>

			<div className="grid gap-8 lg:grid-cols-2">
				<Specimen
					note="A quiet underline with the count in the panel, not in the tab."
					title="Tabs"
				>
					<Tabs defaultValue="checklist">
						<TabsList>
							<TabsTrigger value="checklist">Checklist</TabsTrigger>
							<TabsTrigger value="parser">Parser fit</TabsTrigger>
							<TabsTrigger value="history">History</TabsTrigger>
						</TabsList>
						<TabsContent value="checklist">
							<p className="pt-3 text-fg-muted text-sm">
								3 to fix · 3 worth considering · 10 holding
							</p>
						</TabsContent>
						<TabsContent value="parser">
							<p className="pt-3 text-fg-muted text-sm">
								Single column, headings in the list.
							</p>
						</TabsContent>
						<TabsContent value="history">
							<p className="pt-3 text-fg-muted text-sm">
								Named versions, newest first.
							</p>
						</TabsContent>
					</Tabs>
				</Specimen>

				<Specimen
					note="Region seam on the left, floating card on the right. A card never contains a card."
					title="Region vs card"
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<div className="flex flex-col gap-2">
							<span className="br-micro">Region</span>
							<div className="rounded-sm border border-l-2 border-l-control bg-background p-3">
								<span className="text-sm">Hairline seam, no shadow.</span>
							</div>
						</div>
						<div className="flex flex-col gap-2">
							<span className="br-micro">Floating card</span>
							<div className="br-panel p-3">
								<span className="text-sm">Hairline + elev-1.</span>
							</div>
						</div>
					</div>
					<Subhead hint="Micro label left, 28px ghost actions right, 1px hairline under.">
						Panel header anatomy
					</Subhead>
					<div className="br-panel overflow-hidden">
						<div className="flex h-11 items-center justify-between gap-2 border-b px-4">
							<span className="br-micro">Sections · 8</span>
							<div className="flex items-center gap-1">
								<Button
									aria-label="Search sections"
									size="icon-sm"
									variant="ghost"
								>
									<Search aria-hidden />
								</Button>
								<Button aria-label="Add section" size="icon-sm" variant="ghost">
									<Plus aria-hidden />
								</Button>
							</div>
						</div>
						<div className="p-4">
							<span className="text-fg-muted text-xs">
								Body: p-4 dense / p-6 default, one rhythm.
							</span>
						</div>
					</div>
				</Specimen>
			</div>

			<Specimen
				note="The same three signals everywhere: accent tint, 2px left rule, check."
				title="Selection language"
			>
				<div className="flex max-w-md flex-col gap-1">
					{[
						["Executive", true],
						["Standard", false],
						["Academic", false],
					].map(([label, selected]) => (
						<button
							aria-pressed={Boolean(selected)}
							className={cn(
								"relative flex h-10 items-center gap-2 rounded-sm px-3 text-left text-sm transition-colors",
								selected ? "bg-selected" : "hover:bg-accent/50",
							)}
							key={label as string}
							type="button"
						>
							<SelectionRule selected={Boolean(selected)} />
							<span className="flex-1">{label}</span>
							{selected ? (
								<Check aria-hidden className="size-4 text-border-selected" />
							) : null}
						</button>
					))}
				</div>
				<div className="flex items-center gap-2 text-fg-muted text-xs">
					<span className="text-border-selected">—</span> rule · tint · check
					<span className="ml-4">
						<ChevronDown aria-hidden className="size-4" />
					</span>
					<span>The chevron is never the selection signal.</span>
				</div>
			</Specimen>
		</>
	);
}

function StateCell({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2 rounded-sm border border-dashed p-3">
			<span className="br-label">{label}</span>
			<div className="flex">{children}</div>
		</div>
	);
}
