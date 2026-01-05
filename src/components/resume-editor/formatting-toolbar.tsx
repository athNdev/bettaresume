'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  Type, 
  Minus, 
  Plus, 
  RotateCcw,
  LayoutGrid,
  Palette,
} from 'lucide-react';
import type { ResumeSettings, FontFamily, PartialResumeSettings, TypographyScale } from '@/types/resume';
import { DEFAULT_TYPOGRAPHY } from '@/types/resume';

interface FormattingToolbarProps {
  settings: ResumeSettings;
  onSettingsChange: (settings: PartialResumeSettings) => void;
  scale: number;
  onScaleChange: (scale: number) => void;
}

const FONTS: { value: FontFamily; label: string }[] = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Playfair Display', label: 'Playfair Display' },
];

const COLOR_PRESETS = {
  primary: [
    '#000000', '#1a1a2e', '#16213e', '#0f3460', '#4a5568', '#2d3748',
    '#1e40af', '#1e3a8a', '#7c3aed', '#6d28d9', '#059669', '#047857',
    '#065f46', '#84cc16', '#d4d4d4',
  ],
  accent: [
    '#3b82f6', '#2563eb', '#1d4ed8', '#4f46e5', '#6366f1', '#8b5cf6',
    '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#ef4444', '#f97316',
    '#eab308', '#22c55e', '#a3e635',
  ],
  text: [
    '#111827', '#1f2937', '#374151', '#4b5563', '#6b7280', '#9ca3af',
    '#0f172a', '#1e293b', '#334155', '#475569', '#64748b', '#94a3b8',
    '#d4d4d4',
  ],
};

export function FormattingToolbar({ settings, onSettingsChange, scale, onScaleChange }: FormattingToolbarProps) {
  const fontScale = Math.round((settings.fontScale || 1) * 100);
  
  const handleFontScaleChange = (delta: number) => {
    const newScale = Math.max(0.8, Math.min(1.2, (settings.fontScale || 1) + delta));
    onSettingsChange({ fontScale: newScale });
  };

  const handleTypographyChange = (key: keyof TypographyScale, value: number) => {
    onSettingsChange({
      typography: {
        ...settings.typography,
        [key]: value,
      },
    });
  };

  const resetTypography = () => {
    onSettingsChange({ typography: DEFAULT_TYPOGRAPHY });
  };

  return (
    <div className="border-b bg-background px-4 py-2 flex items-center gap-2 flex-wrap">
      {/* Font Family */}
      <Select
        value={settings.fontFamily}
        onValueChange={(v) => onSettingsChange({ fontFamily: v as FontFamily })}
      >
        <SelectTrigger className="h-8 w-30 text-xs">
          <Type className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Scale */}
      <div className="flex items-center gap-0.5 border rounded-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-r-none"
          onClick={() => handleFontScaleChange(-0.05)}
          disabled={fontScale <= 80}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs w-12 text-center">{fontScale}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-l-none"
          onClick={() => handleFontScaleChange(0.05)}
          disabled={fontScale >= 120}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Typography Scale */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <span className="font-bold">Aa</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm">Typography Scale</h4>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={resetTypography}>
              Reset
            </Button>
          </div>
          <div className="space-y-4">
            {[
              { key: 'name' as const, label: 'Name (H1)' },
              { key: 'title' as const, label: 'Title' },
              { key: 'sectionHeading' as const, label: 'Section Heading (H2)' },
              { key: 'itemTitle' as const, label: 'Item Title (H3)' },
              { key: 'body' as const, label: 'Body Text' },
              { key: 'small' as const, label: 'Small / Dates' },
            ].map(({ key, label }) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <span className="text-xs">{settings.typography?.[key] || DEFAULT_TYPOGRAPHY[key]}pt</span>
                </div>
                <Slider
                  value={[settings.typography?.[key] || DEFAULT_TYPOGRAPHY[key]]}
                  min={key === 'name' ? 18 : 8}
                  max={key === 'name' ? 36 : 20}
                  step={1}
                  onValueChange={(values) => handleTypographyChange(key, values[0] ?? DEFAULT_TYPOGRAPHY[key])}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-4">
            Use the scale control (%) to resize all text proportionally, or adjust individual sizes here.
          </p>
        </PopoverContent>
      </Popover>

      {/* Line Height */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            {settings.lineHeight}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-4" align="start">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Line Height</Label>
            <span className="text-xs">{settings.lineHeight}</span>
          </div>
          <Slider
            value={[settings.lineHeight]}
            min={1.2}
            max={2}
            step={0.1}
            onValueChange={([v]) => onSettingsChange({ lineHeight: v })}
          />
        </PopoverContent>
      </Popover>

      <div className="w-px h-6 bg-border mx-1" />

      {/* Colors */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <div 
              className="w-4 h-4 rounded-full border" 
              style={{ 
                background: `linear-gradient(135deg, ${settings.colors.primary} 50%, ${settings.colors.accent} 50%)` 
              }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-4" align="start">
          <div className="space-y-4">
            {/* Primary / Headings */}
            <div>
              <Label className="text-xs flex items-center gap-1.5 mb-2">
                <Palette className="h-3.5 w-3.5" />
                Primary / Headings
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.primary.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      settings.colors.primary === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onSettingsChange({ colors: { ...settings.colors, primary: color, heading: color } })}
                  />
                ))}
              </div>
            </div>

            {/* Accent */}
            <div>
              <Label className="text-xs mb-2 block">Accent</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.accent.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      settings.colors.accent === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onSettingsChange({ colors: { ...settings.colors, accent: color } })}
                  />
                ))}
              </div>
            </div>

            {/* Body Text */}
            <div>
              <Label className="text-xs mb-2 block">Body Text</Label>
              <div className="flex flex-wrap gap-1.5">
                {COLOR_PRESETS.text.map((color) => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 transition-all ${
                      settings.colors.text === color ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => onSettingsChange({ colors: { ...settings.colors, text: color } })}
                  />
                ))}
              </div>
            </div>

            {/* Accent Style */}
            <div>
              <Label className="text-xs mb-2 block">Style</Label>
              <Select
                value={settings.accentStyle}
                onValueChange={(v) => onSettingsChange({ accentStyle: v as 'underline' | 'background' | 'border' | 'none' })}
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
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="start">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Page</Label>
              <Select
                value={settings.pageSize}
                onValueChange={(v) => onSettingsChange({ pageSize: v as 'A4' | 'Letter' })}
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
              <Label className="text-xs">Margins (mm)</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Top</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.margins.top]}
                      min={5}
                      max={50}
                      step={1}
                      onValueChange={([v]) => onSettingsChange({ margins: { ...settings.margins, top: v } })}
                      className="flex-1"
                    />
                    <span className="text-xs w-6 text-right">{settings.margins.top}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Right</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.margins.right]}
                      min={5}
                      max={50}
                      step={1}
                      onValueChange={([v]) => onSettingsChange({ margins: { ...settings.margins, right: v } })}
                      className="flex-1"
                    />
                    <span className="text-xs w-6 text-right">{settings.margins.right}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Bottom</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.margins.bottom]}
                      min={5}
                      max={50}
                      step={1}
                      onValueChange={([v]) => onSettingsChange({ margins: { ...settings.margins, bottom: v } })}
                      className="flex-1"
                    />
                    <span className="text-xs w-6 text-right">{settings.margins.bottom}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Left</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[settings.margins.left]}
                      min={5}
                      max={50}
                      step={1}
                      onValueChange={([v]) => onSettingsChange({ margins: { ...settings.margins, left: v } })}
                      className="flex-1"
                    />
                    <span className="text-xs w-6 text-right">{settings.margins.left}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Spacing</Label>
              <Select
                value={settings.sectionSpacing}
                onValueChange={(v) => onSettingsChange({ sectionSpacing: v as 'compact' | 'normal' | 'spacious' })}
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
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={resetTypography}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Reset typography</TooltipContent>
      </Tooltip>

      <div className="flex-1" />

      {/* Zoom controls */}
      <div className="flex items-center gap-0.5 border rounded-md">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-r-none"
          onClick={() => onScaleChange(Math.max(0.3, scale - 0.1))}
          disabled={scale <= 0.3}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-l-none"
          onClick={() => onScaleChange(Math.min(1.5, scale + 0.1))}
          disabled={scale >= 1.5}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
