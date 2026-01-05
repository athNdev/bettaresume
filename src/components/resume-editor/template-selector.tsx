'use client';

import { Button } from '@/components/ui/button';
import type { TemplateType, ResumeColors } from '@/types/resume';
import { TEMPLATE_CONFIGS } from '@/types/resume';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TemplateSelectorProps {
  currentTemplate: TemplateType;
  onSelect: (template: TemplateType) => void;
  onColorChange?: (colors: ResumeColors) => void;
}

export function TemplateSelector({ currentTemplate, onSelect, onColorChange }: TemplateSelectorProps) {
  const templates = Object.values(TEMPLATE_CONFIGS);

  return (
    <div className="space-y-3 px-2">
      <div className="grid grid-cols-2 gap-2">
        {templates.map((template) => (
          <button
            key={template.id}
            className={cn(
              'text-left p-2 rounded-md border transition-all hover:bg-accent/50',
              currentTemplate === template.id && 'bg-accent border-primary'
            )}
            onClick={() => {
              onSelect(template.id);
              if (onColorChange) {
                onColorChange(template.defaultColors);
              }
            }}
          >
            {/* Color bar preview */}
            <div 
              className="h-1 rounded-full mb-2"
              style={{ backgroundColor: template.defaultColors.accent }}
            />
            <span className="text-sm">{template.name}</span>
          </button>
        ))}
      </div>
      <Button variant="outline" size="sm" className="w-full gap-2">
        <Sparkles className="h-4 w-4" />
        View All Templates
      </Button>
    </div>
  );
}
