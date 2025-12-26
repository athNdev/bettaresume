'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Globe2 } from 'lucide-react';
import type { Language } from '@/types/resume';
import { createDefaultLanguage } from '@/types/resume';

interface LanguagesFormProps {
  data: Language[];
  onChange: (data: Language[]) => void;
}

const PROFICIENCY_LEVELS = [
  { value: 'native', label: 'Native / Bilingual' },
  { value: 'fluent', label: 'Fluent' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'basic', label: 'Basic' },
];

const COMMON_LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Mandarin', 'Japanese', 'Portuguese', 'Arabic', 'Hindi', 'Korean'];

export function LanguagesForm({ data, onChange }: LanguagesFormProps) {
  const addLanguage = (name?: string) => {
    const newLang = { ...createDefaultLanguage(), name: name || '' };
    onChange([...data, newLang]);
  };

  const removeLanguage = (id: string) => {
    onChange(data.filter((l) => l.id !== id));
  };

  const updateLanguage = (id: string, updates: Partial<Language>) => {
    onChange(data.map((l) => l.id === id ? { ...l, ...updates } : l));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} language{data.length !== 1 ? 's' : ''}</p>
        <Button onClick={() => addLanguage()} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Language</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Globe2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No languages added</h3>
            <p className="text-sm text-muted-foreground mb-4">List the languages you speak and your proficiency level.</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {COMMON_LANGUAGES.slice(0, 4).map((lang) => (
                <Button key={lang} variant="outline" size="sm" onClick={() => addLanguage(lang)}>{lang}</Button>
              ))}
            </div>
            <Button onClick={() => addLanguage()}><Plus className="h-4 w-4 mr-2" /> Add Language</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((lang) => (
            <div key={lang.id} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1 grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Language</Label>
                  <Input value={lang.name} onChange={(e) => updateLanguage(lang.id, { name: e.target.value })} placeholder="Language name" className="mt-1 h-9" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Proficiency</Label>
                  <Select value={lang.proficiency} onValueChange={(v) => updateLanguage(lang.id, { proficiency: v as Language['proficiency'] })}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Certification (optional)</Label>
                  <Input value={lang.certification || ''} onChange={(e) => updateLanguage(lang.id, { certification: e.target.value })} placeholder="e.g., TOEFL 110" className="mt-1 h-9" />
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive shrink-0" onClick={() => { if (confirm('Remove this language?')) removeLanguage(lang.id); }}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          <div className="pt-2">
            <Label className="text-muted-foreground text-xs">Quick Add</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {COMMON_LANGUAGES.filter((lang) => !data.some((d) => d.name.toLowerCase() === lang.toLowerCase())).slice(0, 6).map((lang) => (
                <Button key={lang} variant="outline" size="sm" onClick={() => addLanguage(lang)}>
                  <Plus className="h-3 w-3 mr-1" /> {lang}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
