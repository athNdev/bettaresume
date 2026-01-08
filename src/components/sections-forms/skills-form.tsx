'use client';

import { useState, useCallback } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { useAutoSave, useBeforeUnload } from '@/hooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { Plus, Trash2, Zap, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { SkillCategory, Skill, SkillLevel } from '@/types/resume';
import { createDefaultSkillCategory, createDefaultSkill } from '@/types/resume';

interface SkillsFormProps {
  data: SkillCategory[];
  onChange: (data: SkillCategory[]) => Promise<void>;
  title?: string;
}

const SKILL_LEVELS: { value: SkillLevel; label: string; percent: number }[] = [
  { value: 'beginner', label: 'Beginner', percent: 25 },
  { value: 'intermediate', label: 'Intermediate', percent: 50 },
  { value: 'advanced', label: 'Advanced', percent: 75 },
  { value: 'expert', label: 'Expert', percent: 100 },
];

const SUGGESTED_CATEGORIES = [
  'Programming Languages', 'Frameworks & Libraries', 'Databases', 'Cloud & DevOps',
  'Tools & Software', 'Soft Skills', 'Languages', 'Design', 'Management',
];

export function SkillsForm({ data, onChange, title }: SkillsFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);
  const [newSkill, setNewSkill] = useState<Record<string, string>>({});

  // Auto-save hook
  const {
    localData,
    setLocalData,
    status,
    error,
    retrySave,
    isDirty,
  } = useAutoSave({
    data,
    onSave: onChange,
  });

  // Warn user before leaving with unsaved changes
  useBeforeUnload(isDirty);

  const addCategory = useCallback((name?: string) => {
    const newCat = { ...createDefaultSkillCategory(), name: name || '', order: localData.length };
    setLocalData(prev => [...prev, newCat]);
    setExpandedItems([newCat.id]);
  }, [localData.length, setLocalData]);

  const removeCategory = useCallback((id: string) => {
    setLocalData(prev => prev.filter((cat) => cat.id !== id));
  }, [setLocalData]);

  const updateCategory = useCallback((id: string, updates: Partial<SkillCategory>) => {
    setLocalData(prev => prev.map((cat) => cat.id === id ? { ...cat, ...updates } : cat));
  }, [setLocalData]);

  const moveCategory = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localData.length) return;
    setLocalData(prev => {
      const newData = [...prev];
      const temp = newData[index]!;
      newData[index] = newData[newIndex]!;
      newData[newIndex] = temp;
      return newData.map((cat, i) => ({ ...cat, order: i }));
    });
  }, [localData.length, setLocalData]);

  const addSkill = useCallback((catId: string) => {
    const name = newSkill[catId]?.trim();
    if (!name) return;
    const cat = localData.find((c) => c.id === catId);
    if (!cat) return;
    const skill: Skill = { ...createDefaultSkill(), name };
    updateCategory(catId, { skills: [...cat.skills, skill] });
    setNewSkill(prev => ({ ...prev, [catId]: '' }));
  }, [newSkill, localData, updateCategory]);

  const removeSkill = useCallback((catId: string, skillId: string) => {
    const cat = localData.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { skills: cat.skills.filter((s) => s.id !== skillId) });
  }, [localData, updateCategory]);

  const updateSkill = useCallback((catId: string, skillId: string, updates: Partial<Skill>) => {
    const cat = localData.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { skills: cat.skills.map((s) => s.id === skillId ? { ...s, ...updates } : s) });
  }, [localData, updateCategory]);

  const totalSkills = localData.reduce((acc, cat) => acc + cat.skills.length, 0);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 -mx-4 -mt-4 mb-4 flex items-center justify-between min-h-10">
        <div className="flex items-center gap-3">
          {title && <h3 className="font-semibold">{title}</h3>}
          <SaveStatusIndicator status={status} error={error} onRetry={retrySave} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{localData.length} categor{localData.length !== 1 ? 'ies' : 'y'}, {totalSkills} skill{totalSkills !== 1 ? 's' : ''}</p>
          <Button onClick={() => addCategory()} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
        </div>
      </div>

      {localData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Zap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No skills added</h3>
            <p className="text-sm text-muted-foreground mb-4">Organize your skills into categories to showcase your expertise.</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {SUGGESTED_CATEGORIES.slice(0, 4).map((cat) => (
                <Button key={cat} variant="outline" size="sm" onClick={() => addCategory(cat)}>{cat}</Button>
              ))}
            </div>
            <Button onClick={() => addCategory()}><Plus className="h-4 w-4 mr-2" /> Add Custom Category</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
            {localData.map((cat, index) => (
              <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg overflow-hidden">
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline hover:bg-muted/50">
                    <div className="flex items-center gap-3 w-full">
                      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{cat.name || 'Untitled Category'}</div>
                        <div className="text-sm text-muted-foreground">{cat.skills.length} skill{cat.skills.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <div className="flex items-center gap-1 px-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCategory(index, 'up')} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveCategory(index, 'down')} disabled={index === localData.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { const confirmed = await confirm('Remove Category', 'Remove this category?'); if (confirmed) removeCategory(cat.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Category Name</Label>
                      <Input value={cat.name} onChange={(e) => updateCategory(cat.id, { name: e.target.value })} placeholder="e.g., Programming Languages" className="mt-1" />
                    </div>

                    <div>
                      <Label>Skills</Label>
                      <div className="space-y-2 mt-2">
                        {cat.skills.map((skill) => (
                          <div key={skill.id} className="flex items-center gap-3 p-2 border rounded">
                            <Input value={skill.name} onChange={(e) => updateSkill(cat.id, skill.id, { name: e.target.value })} placeholder="Skill name" className="flex-1 h-8" />
                            <Select value={skill.level} onValueChange={(v) => updateSkill(cat.id, skill.id, { level: v as SkillLevel })}>
                              <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {SKILL_LEVELS.map((level) => (
                                  <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Progress value={SKILL_LEVELS.find((l) => l.value === skill.level)?.percent || 50} className="w-20 h-2" />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSkill(cat.id, skill.id)}><X className="h-3 w-3" /></Button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input value={newSkill[cat.id] || ''} onChange={(e) => setNewSkill({ ...newSkill, [cat.id]: e.target.value })} placeholder="Add skill..." onKeyDown={(e) => e.key === 'Enter' && addSkill(cat.id)} />
                          <Button variant="outline" size="sm" onClick={() => addSkill(cat.id)}><Plus className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="pt-2">
            <Label className="text-muted-foreground text-xs">Quick Add Categories</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SUGGESTED_CATEGORIES.filter((cat) => !localData.some((d) => d.name.toLowerCase() === cat.toLowerCase())).map((cat) => (
                <Badge key={cat} variant="outline" className="cursor-pointer hover:bg-accent" onClick={() => addCategory(cat)}>
                  <Plus className="h-3 w-3 mr-1" /> {cat}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
