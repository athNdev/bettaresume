'use client';

import { useResumeStore } from '@/store/resume-store';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { 
  Type, 
  Layout, 
  RotateCcw, 
  ChevronDown,
  Minus,
  Plus,
  Rows3,
  LayoutTemplate,
  Palette
} from 'lucide-react';
import { TEMPLATE_CONFIGS, type FontFamily, type PartialResumeSettings, type ResumeSettings, type ResumeColors } from '@/types/resume';

interface InlineSettingsToolbarProps {
  resumeId: string;
}

const FONTS: { value: FontFamily; label: string; preview: string }[] = [
  { value: 'Inter', label: 'Inter', preview: 'var(--font-inter), Inter' },
  { value: 'Roboto', label: 'Roboto', preview: 'var(--font-roboto), Roboto' },
  { value: 'Open Sans', label: 'Open Sans', preview: 'var(--font-open-sans), "Open Sans"' },
  { value: 'Lato', label: 'Lato', preview: 'var(--font-lato), Lato' },
  { value: 'Montserrat', label: 'Montserrat', preview: 'var(--font-montserrat), Montserrat' },
  { value: 'Arial', label: 'Arial', preview: 'Arial, sans-serif' },
  { value: 'Georgia', label: 'Georgia', preview: 'Georgia, serif' },
  { value: 'Times New Roman', label: 'Times New Roman', preview: '"Times New Roman", serif' },
  { value: 'Playfair Display', label: 'Playfair Display', preview: 'var(--font-playfair), "Playfair Display"' },
];

const QUICK_COLORS = [
  '#000000', '#1a1a1a', '#374151', '#4b5563',
  '#1e40af', '#2563eb', '#3b82f6', '#60a5fa',
  '#047857', '#059669', '#10b981', '#34d399',
  '#6d28d9', '#7c3aed', '#8b5cf6', '#a78bfa',
  '#b91c1c', '#dc2626', '#ef4444', '#f87171',
  '#c2410c', '#ea580c', '#f97316', '#fb923c',
];

export function InlineSettingsToolbar({ resumeId }: InlineSettingsToolbarProps) {
  const { activeResume, updateSettings } = useResumeStore();
  const settings = activeResume?.metadata?.settings;

  if (!settings) return null;

  const handleUpdate = (updates: PartialResumeSettings) => {
    updateSettings(resumeId, updates);
  };

  const handleColorChange = (key: keyof ResumeColors, value: string) => {
    updateSettings(resumeId, { colors: { [key]: value } });
  };

  // Update multiple colors at once to avoid race conditions
  const handleMultiColorChange = (updates: Partial<ResumeColors>) => {
    updateSettings(resumeId, { colors: updates });
  };

  const handleMarginChange = (key: 'top' | 'right' | 'bottom' | 'left', value: number) => {
    updateSettings(resumeId, { margins: { [key]: value } });
  };

  const resetToDefault = () => {
    const template = activeResume?.template || 'minimal';
    const defaultColors = TEMPLATE_CONFIGS[template].defaultColors;
    updateSettings(resumeId, {
      colors: defaultColors,
      fontSize: 11,
      lineHeight: 1.5,
      fontFamily: 'Inter',
      margins: { top: 20, right: 20, bottom: 20, left: 20 },
      sectionSpacing: 'normal',
      showIcons: true,
      dateFormat: 'MMM YYYY',
      accentStyle: 'underline',
    });
  };

  const adjustFontSize = (delta: number) => {
    const newSize = Math.min(14, Math.max(9, settings.fontSize + delta));
    handleUpdate({ fontSize: newSize });
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Font Family */}
      <Select value={settings.fontFamily} onValueChange={(v) => handleUpdate({ fontFamily: v as FontFamily })}>
        <SelectTrigger className="h-7 w-[100px] text-xs border-muted-foreground/20">
          <Type className="h-3 w-3 mr-1 flex-shrink-0 opacity-60" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FONTS.map((font) => (
            <SelectItem key={font.value} value={font.value} className="text-xs">
              <span style={{ fontFamily: font.preview }}>{font.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size - inline stepper */}
      <div className="flex items-center h-7 border rounded-md border-muted-foreground/20 bg-background">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 rounded-none hover:bg-muted"
          onClick={() => adjustFontSize(-0.5)}
          disabled={settings.fontSize <= 9}
        >
          <Minus className="h-3 w-3" />
        </Button>
        <span className="text-xs w-9 text-center tabular-nums border-x border-muted-foreground/20">{settings.fontSize}pt</span>
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 rounded-none hover:bg-muted"
          onClick={() => adjustFontSize(0.5)}
          disabled={settings.fontSize >= 14}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Line Height */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 border-muted-foreground/20">
            <Rows3 className="h-3 w-3 opacity-60" />
            {settings.lineHeight.toFixed(1)}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-44 p-3" align="start">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Line Height</Label>
              <span className="text-xs text-muted-foreground tabular-nums">{settings.lineHeight.toFixed(1)}</span>
            </div>
            <Slider 
              value={[settings.lineHeight]} 
              onValueChange={([v]) => handleUpdate({ lineHeight: v })} 
              min={1} 
              max={2} 
              step={0.1} 
            />
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-4 mx-0.5" />

      {/* Colors */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 px-2 border-muted-foreground/20">
            <div className="flex items-center gap-0.5">
              <div 
                className="w-3 h-3 rounded-sm border border-muted-foreground/30" 
                style={{ backgroundColor: settings.colors.primary }} 
              />
              <div 
                className="w-3 h-3 rounded-sm border border-muted-foreground/30" 
                style={{ backgroundColor: settings.colors.accent }} 
              />
            </div>
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="start">
          <div className="space-y-3">
            {/* Primary Color */}
            <div>
              <Label className="text-xs mb-2 flex items-center gap-1.5">
                <Palette className="h-3 w-3 opacity-60" />
                Primary / Headings
              </Label>
              <div className="flex gap-1 flex-wrap">
                {QUICK_COLORS.slice(0, 12).map((color) => (
                  <button
                    key={`primary-${color}`}
                    className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                      settings.colors.primary === color ? 'border-ring ring-1 ring-ring' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleMultiColorChange({ primary: color, heading: color })}
                  />
                ))}
                <Input 
                  type="color" 
                  value={settings.colors.primary} 
                  onChange={(e) => handleMultiColorChange({ primary: e.target.value, heading: e.target.value })}
                  className="w-5 h-5 p-0 border-0 cursor-pointer rounded"
                />
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <Label className="text-xs mb-2 block">Accent</Label>
              <div className="flex gap-1 flex-wrap">
                {QUICK_COLORS.slice(4, 16).map((color) => (
                  <button
                    key={`accent-${color}`}
                    className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                      settings.colors.accent === color ? 'border-ring ring-1 ring-ring' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange('accent', color)}
                  />
                ))}
                <Input 
                  type="color" 
                  value={settings.colors.accent} 
                  onChange={(e) => handleColorChange('accent', e.target.value)}
                  className="w-5 h-5 p-0 border-0 cursor-pointer rounded"
                />
              </div>
            </div>

            {/* Body Text Color */}
            <div>
              <Label className="text-xs mb-2 block">Body Text</Label>
              <div className="flex gap-1 flex-wrap">
                {QUICK_COLORS.slice(0, 8).map((color) => (
                  <button
                    key={`text-${color}`}
                    className={`w-5 h-5 rounded border-2 transition-all hover:scale-110 ${
                      settings.colors.text === color ? 'border-ring ring-1 ring-ring' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange('text', color)}
                  />
                ))}
                <Input 
                  type="color" 
                  value={settings.colors.text} 
                  onChange={(e) => handleColorChange('text', e.target.value)}
                  className="w-5 h-5 p-0 border-0 cursor-pointer rounded"
                />
              </div>
            </div>

            <Separator />

            {/* Accent Style */}
            <div className="flex items-center gap-2">
              <Label className="text-xs flex-shrink-0">Style</Label>
              <Select value={settings.accentStyle} onValueChange={(v) => handleUpdate({ accentStyle: v as ResumeSettings['accentStyle'] })}>
                <SelectTrigger className="h-7 text-xs flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="underline" className="text-xs">Underline</SelectItem>
                  <SelectItem value="background" className="text-xs">Background</SelectItem>
                  <SelectItem value="border" className="text-xs">Left Border</SelectItem>
                  <SelectItem value="none" className="text-xs">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Margins & Layout */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-2 border-muted-foreground/20">
            <Layout className="h-3 w-3 opacity-60" />
            <ChevronDown className="h-2.5 w-2.5 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-3" align="start">
          <div className="space-y-3">
            {/* Page Size */}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Page</Label>
              <Select value={settings.pageSize} onValueChange={(v) => handleUpdate({ pageSize: v as 'A4' | 'Letter' })}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4" className="text-xs">A4</SelectItem>
                  <SelectItem value="Letter" className="text-xs">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            {/* Margins */}
            <div>
              <Label className="text-xs mb-2 block">Margins (mm)</Label>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] capitalize text-muted-foreground">{side}</Label>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-6 text-right">{settings.margins[side]}</span>
                    </div>
                    <Slider 
                      value={[settings.margins[side]]} 
                      onValueChange={([v]) => handleMarginChange(side, v)} 
                      min={5} 
                      max={40} 
                      step={1} 
                      className="h-3"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Spacing */}
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Spacing</Label>
              <Select value={settings.sectionSpacing} onValueChange={(v) => handleUpdate({ sectionSpacing: v as 'compact' | 'normal' | 'spacious' })}>
                <SelectTrigger className="h-7 w-24 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact" className="text-xs">Compact</SelectItem>
                  <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                  <SelectItem value="spacious" className="text-xs">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Show Icons Toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={settings.showIcons ? "secondary" : "ghost"} 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={() => handleUpdate({ showIcons: !settings.showIcons })}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{settings.showIcons ? 'Hide section icons' : 'Show section icons'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Reset */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 w-7 p-0"
            onClick={resetToDefault}
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">Reset to defaults</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
