'use client';

import { useState } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Settings, Type, Palette, Layout, RotateCcw } from 'lucide-react';
import { TEMPLATE_CONFIGS, type FontFamily, type PartialResumeSettings, type ResumeSettings, type ResumeColors } from '@/types/resume';

interface SettingsPanelProps {
  resumeId: string;
}

const FONTS: { value: FontFamily; label: string; category: string }[] = [
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Arial', label: 'Arial', category: 'Sans-serif' },
  { value: 'Georgia', label: 'Georgia', category: 'Serif' },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'Serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
];

const DATE_FORMATS = [
  { value: 'MM/YYYY', label: '01/2024' },
  { value: 'MMM YYYY', label: 'Jan 2024' },
  { value: 'MMMM YYYY', label: 'January 2024' },
  { value: 'YYYY', label: '2024' },
];

export function SettingsPanel({ resumeId }: SettingsPanelProps) {
  const { activeResume, updateSettings } = useResumeStore();
  const [open, setOpen] = useState(false);
  const settings = activeResume?.metadata.settings;

  if (!settings) return null;

  const handleUpdate = (updates: PartialResumeSettings) => {
    updateSettings(resumeId, updates);
  };

  const handleColorChange = (key: keyof ResumeColors, value: string) => {
    updateSettings(resumeId, { colors: { [key]: value } });
  };

  const handleMarginChange = (key: keyof ResumeSettings['margins'], value: number) => {
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Settings</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Resume Settings
          </SheetTitle>
          <SheetDescription>
            Customize the appearance and layout of your resume.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="typography" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="typography"><Type className="h-4 w-4 mr-2" />Typography</TabsTrigger>
            <TabsTrigger value="colors"><Palette className="h-4 w-4 mr-2" />Colors</TabsTrigger>
            <TabsTrigger value="layout"><Layout className="h-4 w-4 mr-2" />Layout</TabsTrigger>
          </TabsList>

          <TabsContent value="typography" className="space-y-6 mt-4">
            <div>
              <Label>Font Family</Label>
              <Select value={settings.fontFamily} onValueChange={(v) => handleUpdate({ fontFamily: v as FontFamily })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value}>
                      <span style={{ fontFamily: font.value }}>{font.label}</span>
                      <span className="text-muted-foreground ml-2 text-xs">({font.category})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Font Size</Label>
                <span className="text-sm text-muted-foreground">{settings.fontSize}pt</span>
              </div>
              <Slider value={[settings.fontSize]} onValueChange={([v]) => handleUpdate({ fontSize: v })} min={9} max={14} step={0.5} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Line Height</Label>
                <span className="text-sm text-muted-foreground">{settings.lineHeight}</span>
              </div>
              <Slider value={[settings.lineHeight]} onValueChange={([v]) => handleUpdate({ lineHeight: v })} min={1} max={2} step={0.1} />
            </div>

            <div>
              <Label>Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(v) => handleUpdate({ dateFormat: v as ResumeSettings['dateFormat'] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((format) => (
                    <SelectItem key={format.value} value={format.value}>{format.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="colors" className="space-y-6 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries({
                primary: 'Primary',
                secondary: 'Secondary',
                heading: 'Headings',
                text: 'Body Text',
                accent: 'Accent',
                divider: 'Dividers',
              }).map(([key, label]) => (
                <div key={key}>
                  <Label className="text-xs">{label}</Label>
                  <div className="flex gap-2 mt-1">
                    <div 
                      className="h-9 w-9 rounded border cursor-pointer" 
                      style={{ backgroundColor: settings.colors[key as keyof ResumeColors] }}
                      onClick={() => document.getElementById(`color-${key}`)?.click()}
                    />
                    <Input 
                      id={`color-${key}`}
                      type="color" 
                      value={settings.colors[key as keyof ResumeColors]} 
                      onChange={(e) => handleColorChange(key as keyof ResumeColors, e.target.value)}
                      className="w-full h-9"
                    />
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            <div>
              <Label>Accent Style</Label>
              <Select value={settings.accentStyle} onValueChange={(v) => handleUpdate({ accentStyle: v as ResumeSettings['accentStyle'] })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="underline">Underline</SelectItem>
                  <SelectItem value="background">Background</SelectItem>
                  <SelectItem value="border">Left Border</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="layout" className="space-y-6 mt-4">
            <div>
              <Label>Page Size</Label>
              <Select value={settings.pageSize} onValueChange={(v) => handleUpdate({ pageSize: v as 'A4' | 'Letter' })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                  <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-3 block">Margins (mm)</Label>
              <div className="grid grid-cols-2 gap-4">
                {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                  <div key={side}>
                    <Label className="text-xs capitalize">{side}</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Slider value={[settings.margins[side]]} onValueChange={([v]) => handleMarginChange(side, v)} min={5} max={40} step={1} className="flex-1" />
                      <span className="text-xs text-muted-foreground w-8">{settings.margins[side]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label>Section Spacing</Label>
              <Select value={settings.sectionSpacing} onValueChange={(v) => handleUpdate({ sectionSpacing: v as 'compact' | 'normal' | 'spacious' })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="compact">Compact</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="spacious">Spacious</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <Label>Show Section Icons</Label>
                <p className="text-xs text-muted-foreground">Display icons next to section headings</p>
              </div>
              <Switch checked={settings.showIcons} onCheckedChange={(v) => handleUpdate({ showIcons: v })} />
            </div>
          </TabsContent>
        </Tabs>

        <Separator className="my-6" />

        <Button variant="outline" onClick={resetToDefault} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset to Template Defaults
        </Button>
      </SheetContent>
    </Sheet>
  );
}
