"use client";

import {
	LayoutGrid,
	Minus,
	Palette,
	Plus,
	RotateCcw,
	Type,
} from "lucide-react";
import { memo, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
	FontFamily,
	PartialResumeSettings,
	ResumeLayout,
	ResumeSettings,
	TypographyScale,
} from "@/features/resume-editor/types";
import { DEFAULT_TYPOGRAPHY } from "@/features/resume-editor/types";

interface FormattingToolbarProps {
	settings: ResumeSettings;
	onSettingsChange: (settings: PartialResumeSettings) => void;
	scale: number;
	onScaleChange: (scale: number) => void;
}

const FONTS: { value: FontFamily; label: string }[] = [
	{ value: "Inter", label: "Inter" },
	{ value: "Roboto", label: "Roboto" },
	{ value: "Open Sans", label: "Open Sans" },
	{ value: "Lato", label: "Lato" },
	{ value: "Montserrat", label: "Montserrat" },
	{ value: "Arial", label: "Arial" },
	{ value: "Georgia", label: "Georgia" },
	{ value: "Times New Roman", label: "Times New Roman" },
	{ value: "Playfair Display", label: "Playfair Display" },
];

const COLOR_PRESETS = {
	primary: [
		"#000000",
		"#1a1a2e",
		"#16213e",
		"#0f3460",
		"#4a5568",
		"#2d3748",
		"#1e40af",
		"#1e3a8a",
		"#7c3aed",
		"#6d28d9",
		"#059669",
		"#047857",
		"#065f46",
		"#84cc16",
		"#d4d4d4",
	],
	accent: [
		"#3b82f6",
		"#2563eb",
		"#1d4ed8",
		"#4f46e5",
		"#6366f1",
		"#8b5cf6",
		"#a855f7",
		"#d946ef",
		"#ec4899",
		"#f43f5e",
		"#ef4444",
		"#f97316",
		"#eab308",
		"#22c55e",
		"#a3e635",
	],
	text: [
		"#111827",
		"#1f2937",
		"#374151",
		"#4b5563",
		"#6b7280",
		"#9ca3af",
		"#0f172a",
		"#1e293b",
		"#334155",
		"#475569",
		"#64748b",
		"#94a3b8",
		"#d4d4d4",
	],
};

export const FormattingToolbar = memo(function FormattingToolbar({
	settings,
	onSettingsChange,
	scale,
	onScaleChange,
}: FormattingToolbarProps) {
	// Local buffered state – slider thumbs move at 60 fps without round-tripping to parent.
	const [localSettings, setLocalSettings] = useState(settings);

	// Sync from prop when settings change externally (template switch, initial load).
	useEffect(() => {
		setLocalSettings(settings);
	}, [settings]);

	const fontScale = Math.round((localSettings.fontScale || 1) * 100);

	const handleFontScaleChange = (delta: number) => {
		const newScale = Math.max(
			0.8,
			Math.min(1.2, (localSettings.fontScale || 1) + delta),
		);
		onSettingsChange({ fontScale: newScale });
	};

	const handleTypographyChange = useCallback(
		(key: keyof TypographyScale, value: number) => {
			setLocalSettings((prev) => ({
				...prev,
				typography: { ...prev.typography, [key]: value },
			}));
		},
		[],
	);

	const resetTypography = () => {
		setLocalSettings((prev) => ({ ...prev, typography: DEFAULT_TYPOGRAPHY }));
		onSettingsChange({ typography: DEFAULT_TYPOGRAPHY });
	};

	return (
		<div className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2">
			{/* Font Family */}
			<Select
				onValueChange={(v) => onSettingsChange({ fontFamily: v as FontFamily })}
				value={settings.fontFamily}
			>
				<SelectTrigger className="h-8 w-30 text-xs">
					<Type className="mr-1.5 h-3.5 w-3.5 shrink-0" />
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FONTS.map((font) => (
						<SelectItem
							key={font.value}
							style={{ fontFamily: font.value }}
							value={font.value}
						>
							{font.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Font Scale */}
			<div className="flex items-center gap-0.5 rounded-md border">
				<Button
					className="h-8 w-8 rounded-r-none"
					disabled={fontScale <= 80}
					onClick={() => handleFontScaleChange(-0.05)}
					size="icon"
					variant="ghost"
				>
					<Minus className="h-3.5 w-3.5" />
				</Button>
				<span className="w-12 text-center text-xs">{fontScale}%</span>
				<Button
					className="h-8 w-8 rounded-l-none"
					disabled={fontScale >= 120}
					onClick={() => handleFontScaleChange(0.05)}
					size="icon"
					variant="ghost"
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>

			{/* Typography Scale */}
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 gap-1.5 text-xs" size="sm" variant="outline">
						<span className="font-bold">Aa</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-4">
					<div className="mb-4 flex items-center justify-between">
						<h4 className="font-semibold text-sm">Typography Scale</h4>
						<Button
							className="h-7 text-xs"
							onClick={resetTypography}
							size="sm"
							variant="outline"
						>
							Reset
						</Button>
					</div>
					<div className="space-y-4">
						{[
							{ key: "name" as const, label: "Name (H1)" },
							{ key: "title" as const, label: "Title" },
							{ key: "sectionHeading" as const, label: "Section Heading (H2)" },
							{ key: "itemTitle" as const, label: "Item Title (H3)" },
							{ key: "body" as const, label: "Body Text" },
							{ key: "small" as const, label: "Small / Dates" },
						].map(({ key, label }) => (
							<div key={key}>
								<div className="mb-1 flex items-center justify-between">
									<Label className="text-muted-foreground text-xs">
										{label}
									</Label>
									<span className="text-xs">
										{localSettings.typography?.[key] || DEFAULT_TYPOGRAPHY[key]}
										pt
									</span>
								</div>
								<Slider
									max={key === "name" ? 36 : 20}
									min={key === "name" ? 18 : 8}
									onValueChange={(values) =>
										handleTypographyChange(
											key,
											values[0] ?? DEFAULT_TYPOGRAPHY[key],
										)
									}
									onValueCommit={(values) =>
										onSettingsChange({
											typography: {
												...localSettings.typography,
												[key]: values[0] ?? DEFAULT_TYPOGRAPHY[key],
											},
										})
									}
									step={1}
									value={[
										localSettings.typography?.[key] || DEFAULT_TYPOGRAPHY[key],
									]}
								/>
							</div>
						))}
					</div>
					<p className="mt-4 text-[10px] text-muted-foreground">
						Use the scale control (%) to resize all text proportionally, or
						adjust individual sizes here.
					</p>
				</PopoverContent>
			</Popover>

			{/* Line Height */}
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 gap-1.5 text-xs" size="sm" variant="outline">
						<svg
							className="h-4 w-4"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							viewBox="0 0 24 24"
						>
							<title>Line height</title>
							<line x1="3" x2="21" y1="6" y2="6" />
							<line x1="3" x2="21" y1="12" y2="12" />
							<line x1="3" x2="21" y1="18" y2="18" />
						</svg>
						{localSettings.lineHeight}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-56 p-4">
					<div className="mb-2 flex items-center justify-between">
						<Label className="text-xs">Line Height</Label>
						<span className="text-xs">{localSettings.lineHeight}</span>
					</div>
					<Slider
						max={2}
						min={1.2}
						onValueChange={([v]) =>
							setLocalSettings((prev) => ({
								...prev,
								lineHeight: v ?? prev.lineHeight,
							}))
						}
						onValueCommit={([v]) =>
							onSettingsChange({ lineHeight: v ?? localSettings.lineHeight })
						}
						step={0.1}
						value={[localSettings.lineHeight]}
					/>
				</PopoverContent>
			</Popover>

			<div className="mx-1 h-6 w-px bg-border" />

			{/* Colors */}
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 gap-1.5 text-xs" size="sm" variant="outline">
						<div
							className="h-4 w-4 rounded-full border"
							style={{
								background: `linear-gradient(135deg, ${settings.colors.primary} 50%, ${settings.colors.accent} 50%)`,
							}}
						/>
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-72 p-4">
					<div className="space-y-4">
						{/* Primary / Headings */}
						<div>
							<Label className="mb-2 flex items-center gap-1.5 text-xs">
								<Palette className="h-3.5 w-3.5" />
								Primary / Headings
							</Label>
							<div className="flex flex-wrap gap-1.5">
								{COLOR_PRESETS.primary.map((color) => (
									<button
										className={`h-6 w-6 rounded border-2 transition-all ${
											settings.colors.primary === color
												? "scale-110 border-primary"
												: "border-transparent"
										}`}
										key={color}
										onClick={() =>
											onSettingsChange({
												colors: {
													...settings.colors,
													primary: color,
													heading: color,
												},
											})
										}
										style={{ backgroundColor: color }}
										type="button"
									/>
								))}
							</div>
						</div>

						{/* Accent */}
						<div>
							<Label className="mb-2 block text-xs">Accent</Label>
							<div className="flex flex-wrap gap-1.5">
								{COLOR_PRESETS.accent.map((color) => (
									<button
										className={`h-6 w-6 rounded border-2 transition-all ${
											settings.colors.accent === color
												? "scale-110 border-primary"
												: "border-transparent"
										}`}
										key={color}
										onClick={() =>
											onSettingsChange({
												colors: { ...settings.colors, accent: color },
											})
										}
										style={{ backgroundColor: color }}
										type="button"
									/>
								))}
							</div>
						</div>

						{/* Body Text */}
						<div>
							<Label className="mb-2 block text-xs">Body Text</Label>
							<div className="flex flex-wrap gap-1.5">
								{COLOR_PRESETS.text.map((color) => (
									<button
										className={`h-6 w-6 rounded border-2 transition-all ${
											settings.colors.text === color
												? "scale-110 border-primary"
												: "border-transparent"
										}`}
										key={color}
										onClick={() =>
											onSettingsChange({
												colors: { ...settings.colors, text: color },
											})
										}
										style={{ backgroundColor: color }}
										type="button"
									/>
								))}
							</div>
						</div>

						{/* Accent Style */}
						<div>
							<Label className="mb-2 block text-xs">Style</Label>
							<Select
								onValueChange={(v) =>
									onSettingsChange({
										accentStyle: v as
											| "underline"
											| "background"
											| "border"
											| "none",
									})
								}
								value={settings.accentStyle}
							>
								<SelectTrigger className="h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="underline">Underline</SelectItem>
									<SelectItem value="background">Background</SelectItem>
									<SelectItem value="border">Border</SelectItem>
									<SelectItem value="none">None</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{/* Page Layout */}
			<Popover>
				<PopoverTrigger asChild>
					<Button className="h-8 gap-1.5 text-xs" size="sm" variant="outline">
						<LayoutGrid className="h-4 w-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-64 p-4">
					<div className="space-y-4">
						<div>
							<Label className="text-xs">Page</Label>
							<Select
								onValueChange={(v) =>
									onSettingsChange({ pageSize: v as "A4" | "Letter" })
								}
								value={settings.pageSize}
							>
								<SelectTrigger className="mt-1 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="A4">A4</SelectItem>
									<SelectItem value="Letter">Letter</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="text-xs">Layout</Label>
							<Select
								onValueChange={(v) =>
									onSettingsChange({ layout: v as ResumeLayout })
								}
								value={settings.layout || "single-column"}
							>
								<SelectTrigger className="mt-1 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="single-column">Single column</SelectItem>
									<SelectItem value="two-column">Two column</SelectItem>
									<SelectItem value="sidebar">Sidebar</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="text-xs">Margins (mm)</Label>
							<div className="mt-2 grid grid-cols-2 gap-3">
								<div>
									<Label className="text-[10px] text-muted-foreground">
										Top
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											className="flex-1"
											max={50}
											min={5}
											onValueChange={([v]) =>
												setLocalSettings((prev) => ({
													...prev,
													margins: {
														...prev.margins,
														top: v ?? prev.margins.top,
													},
												}))
											}
											onValueCommit={([v]) =>
												onSettingsChange({
													margins: {
														...localSettings.margins,
														top: v ?? localSettings.margins.top,
													},
												})
											}
											step={1}
											value={[localSettings.margins.top]}
										/>
										<span className="w-6 text-right text-xs">
											{localSettings.margins.top}
										</span>
									</div>
								</div>
								<div>
									<Label className="text-[10px] text-muted-foreground">
										Right
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											className="flex-1"
											max={50}
											min={5}
											onValueChange={([v]) =>
												setLocalSettings((prev) => ({
													...prev,
													margins: {
														...prev.margins,
														right: v ?? prev.margins.right,
													},
												}))
											}
											onValueCommit={([v]) =>
												onSettingsChange({
													margins: {
														...localSettings.margins,
														right: v ?? localSettings.margins.right,
													},
												})
											}
											step={1}
											value={[localSettings.margins.right]}
										/>
										<span className="w-6 text-right text-xs">
											{localSettings.margins.right}
										</span>
									</div>
								</div>
								<div>
									<Label className="text-[10px] text-muted-foreground">
										Bottom
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											className="flex-1"
											max={50}
											min={5}
											onValueChange={([v]) =>
												setLocalSettings((prev) => ({
													...prev,
													margins: {
														...prev.margins,
														bottom: v ?? prev.margins.bottom,
													},
												}))
											}
											onValueCommit={([v]) =>
												onSettingsChange({
													margins: {
														...localSettings.margins,
														bottom: v ?? localSettings.margins.bottom,
													},
												})
											}
											step={1}
											value={[localSettings.margins.bottom]}
										/>
										<span className="w-6 text-right text-xs">
											{localSettings.margins.bottom}
										</span>
									</div>
								</div>
								<div>
									<Label className="text-[10px] text-muted-foreground">
										Left
									</Label>
									<div className="flex items-center gap-2">
										<Slider
											className="flex-1"
											max={50}
											min={5}
											onValueChange={([v]) =>
												setLocalSettings((prev) => ({
													...prev,
													margins: {
														...prev.margins,
														left: v ?? prev.margins.left,
													},
												}))
											}
											onValueCommit={([v]) =>
												onSettingsChange({
													margins: {
														...localSettings.margins,
														left: v ?? localSettings.margins.left,
													},
												})
											}
											step={1}
											value={[localSettings.margins.left]}
										/>
										<span className="w-6 text-right text-xs">
											{localSettings.margins.left}
										</span>
									</div>
								</div>
							</div>
						</div>

						<div>
							<Label className="text-xs">Spacing</Label>
							<Select
								onValueChange={(v) =>
									onSettingsChange({
										sectionSpacing: v as "compact" | "normal" | "spacious",
									})
								}
								value={settings.sectionSpacing}
							>
								<SelectTrigger className="mt-1 h-8">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="compact">Compact</SelectItem>
									<SelectItem value="normal">Normal</SelectItem>
									<SelectItem value="spacious">Spacious</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</PopoverContent>
			</Popover>

			{/* Reset */}
			<Tooltip>
				<TooltipTrigger asChild>
					<Button
						className="h-8 w-8"
						onClick={resetTypography}
						size="icon"
						variant="ghost"
					>
						<RotateCcw className="h-4 w-4" />
					</Button>
				</TooltipTrigger>
				<TooltipContent>Reset typography</TooltipContent>
			</Tooltip>

			<div className="flex-1" />

			{/* Zoom controls */}
			<div className="flex items-center gap-0.5 rounded-md border">
				<Button
					className="h-8 w-8 rounded-r-none"
					disabled={scale <= 0.3}
					onClick={() => onScaleChange(Math.max(0.3, scale - 0.1))}
					size="icon"
					variant="ghost"
				>
					<Minus className="h-3.5 w-3.5" />
				</Button>
				<span className="w-12 text-center text-xs">
					{Math.round(scale * 100)}%
				</span>
				<Button
					className="h-8 w-8 rounded-l-none"
					disabled={scale >= 1.5}
					onClick={() => onScaleChange(Math.min(1.5, scale + 0.1))}
					size="icon"
					variant="ghost"
				>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
});
