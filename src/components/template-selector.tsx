'use client';

import { useState } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Layout, Check, Sparkles } from 'lucide-react';
import { TEMPLATE_CONFIGS, type TemplateType } from '@/types/resume';

interface TemplateSelectorProps {
  resumeId: string;
  compact?: boolean;
  variant?: 'button' | 'panel';
}

export function TemplateSelector({ resumeId, compact = false, variant = 'button' }: TemplateSelectorProps) {
  const { activeResume, updateTemplate } = useResumeStore();
  const [open, setOpen] = useState(false);

  const handleSelect = (template: TemplateType) => {
    updateTemplate(resumeId, template);
    setOpen(false);
  };

  const currentTemplate = activeResume?.template || 'minimal';

  // Panel variant - embedded display for left sidebar
  if (variant === 'panel') {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Current: <span className="capitalize font-medium text-foreground">{currentTemplate}</span>
        </div>
        <div className="grid grid-cols-2 gap-1">
          {Object.values(TEMPLATE_CONFIGS).slice(0, 6).map((template) => (
            <button
              key={template.id}
              onClick={() => handleSelect(template.id)}
              className={`p-2 rounded text-xs text-left transition-colors ${
                currentTemplate === template.id 
                  ? 'bg-primary/10 border border-primary/30' 
                  : 'hover:bg-accent border border-transparent'
              }`}
            >
              <div 
                className="w-full h-1.5 rounded-sm mb-1"
                style={{ backgroundColor: template.defaultColors.primary }}
              />
              <span className="capitalize">{template.id}</span>
            </button>
          ))}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-7 text-xs"
          onClick={() => setOpen(true)}
        >
          <Sparkles className="h-3 w-3 mr-1" />
          View All Templates
        </Button>
        
        {/* Reuse the dialog for full template selection */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Layout className="h-5 w-5" />
                Choose Template
              </DialogTitle>
              <DialogDescription>
                Select a professional template for your resume. Your content will be preserved.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.values(TEMPLATE_CONFIGS).map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:border-primary/50 ${currentTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                    onClick={() => handleSelect(template.id)}
                  >
                    <CardContent className="p-0">
                      <div className="aspect-[8.5/11] bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden rounded-t-lg">
                        <div className="absolute inset-2 bg-background rounded shadow-sm p-2 text-[6px]">
                          <div className="space-y-1.5">
                            <div 
                              className="h-3 w-2/3 mx-auto rounded-sm" 
                              style={{ backgroundColor: template.defaultColors.heading }}
                            />
                            <div 
                              className="h-1.5 w-1/2 mx-auto rounded-sm opacity-50" 
                              style={{ backgroundColor: template.defaultColors.secondary }}
                            />
                            <div className="h-px w-full my-1" style={{ backgroundColor: template.defaultColors.divider }} />
                          </div>
                        </div>
                      </div>
                      <div className="p-3 border-t">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm capitalize">{template.id}</span>
                          {currentTemplate === template.id && (
                            <Badge variant="secondary" className="text-xs">
                              <Check className="h-3 w-3 mr-1" />
                              Current
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={compact ? "gap-1.5 h-7 text-xs" : "gap-2"}>
          <Layout className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          <span className="capitalize">{currentTemplate}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Choose Template
          </DialogTitle>
          <DialogDescription>
            Select a professional template for your resume. Your content will be preserved.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.values(TEMPLATE_CONFIGS).map((template) => (
              <Card 
                key={template.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${currentTemplate === template.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
                onClick={() => handleSelect(template.id)}
              >
                <CardContent className="p-0">
                  <div className="aspect-[8.5/11] bg-gradient-to-br from-muted/50 to-muted relative overflow-hidden rounded-t-lg">
                    {/* Template preview mockup */}
                    <div className="absolute inset-2 bg-background rounded shadow-sm p-2 text-[6px]">
                      <div className="space-y-1.5">
                        <div 
                          className="h-3 w-2/3 mx-auto rounded-sm" 
                          style={{ backgroundColor: template.defaultColors.heading }}
                        />
                        <div 
                          className="h-1.5 w-1/2 mx-auto rounded-sm opacity-50" 
                          style={{ backgroundColor: template.defaultColors.secondary }}
                        />
                        <div className="h-px w-full my-1" style={{ backgroundColor: template.defaultColors.divider }} />
                        {template.layout === 'two-column' ? (
                          <div className="flex gap-1">
                            <div className="flex-1 space-y-1">
                              <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: template.defaultColors.accent + '40' }} />
                              <div className="h-1 w-full rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                              <div className="h-1 w-3/4 rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                            </div>
                            <div className="w-1/3 space-y-1">
                              <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: template.defaultColors.accent + '40' }} />
                              <div className="h-1 w-full rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                            </div>
                          </div>
                        ) : template.layout === 'sidebar' ? (
                          <div className="flex gap-1">
                            <div className="w-1/4 p-1 rounded-sm" style={{ backgroundColor: template.defaultColors.primary + '10' }}>
                              <div className="space-y-1">
                                <div className="h-1 w-full rounded-sm opacity-50" style={{ backgroundColor: template.defaultColors.primary }} />
                                <div className="h-1 w-full rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                              </div>
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="h-1.5 w-full rounded-sm" style={{ backgroundColor: template.defaultColors.accent + '40' }} />
                              <div className="h-1 w-full rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="h-1.5 w-1/3 rounded-sm" style={{ backgroundColor: template.defaultColors.accent + '40' }} />
                            <div className="h-1 w-full rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                            <div className="h-1 w-5/6 rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                            <div className="h-1.5 w-1/3 rounded-sm mt-2" style={{ backgroundColor: template.defaultColors.accent + '40' }} />
                            <div className="h-1 w-full rounded-sm opacity-30" style={{ backgroundColor: template.defaultColors.text }} />
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {currentTemplate === template.id && (
                      <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline" className="text-[10px]">{template.layout.replace('-', ' ')}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {template.features.slice(0, 2).map((feature, idx) => (
                        <Badge key={idx} variant="secondary" className="text-[9px]">
                          <Sparkles className="h-2 w-2 mr-1" />
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
