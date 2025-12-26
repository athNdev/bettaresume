'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Trash2, GripVertical, Zap, ChevronUp, ChevronDown, Layers } from 'lucide-react';
import type { SkillCategory, Skill, SkillLevel } from '@/types/resume';
import { createDefaultSkillCategory, createDefaultSkill } from '@/types/resume';

interface SkillsFormProps {
  data: SkillCategory[];
  onChange: (data: SkillCategory[]) => void;
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

export function SkillsForm({ data, onChange }: SkillsFormProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 ? [data[0]?.id] : []);
  const [newSkill, setNewSkill] = useState<Record<string, string>>({});

  const addCategory = (name?: string) => {
    const newCat = { ...createDefaultSkillCategory(), name: name || '', order: data.length };
    onChange([...data, newCat]);
    setExpandedItems([newCat.id]);
  };

  const removeCategory = (id: string) => {
    onChange(data.filter((cat) => cat.id !== id));
  };

  const updateCategory = (id: string, updates: Partial<SkillCategory>) => {
    onChange(data.map((cat) => cat.id === id ? { ...cat, ...updates } : cat));
  };

  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    [newData[index], newData[newIndex]] = [newData[newIndex], newData[index]];
    onChange(newData.map((cat, i) => ({ ...cat, order: i })));
  };

  const addSkill = (catId: string) => {
    const name = newSkill[catId]?.trim();
    if (!name) return;
    const cat = data.find((c) => c.id === catId);
    if (!cat) return;
    const skill: Skill = { ...createDefaultSkill(), name };
    updateCategory(catId, { skills: [...cat.skills, skill] });
    setNewSkill({ ...newSkill, [catId]: '' });
  };

  const removeSkill = (catId: string, skillId: string) => {
    const cat = data.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { skills: cat.skills.filter((s) => s.id !== skillId) });
  };

  const updateSkill = (catId: string, skillId: string, updates: Partial<Skill>) => {
    const cat = data.find((c) => c.id === catId);
    if (!cat) return;
    updateCategory(catId, { skills: cat.skills.map((s) => s.id === skillId ? { ...s, ...updates } : s) });
  };

  const totalSkills = data.reduce((acc, cat) => acc + cat.skills.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} categor{data.length !== 1 ? 'ies' : 'y'}, {totalSkills} skill{totalSkills !== 1 ? 's' : ''}</p>
        <Button onClick={() => addCategory()} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Category</Button>
      </div>

      {data.length === 0 ? (
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
            {data.map((cat, index) => (
              <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 w-full">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{cat.name || 'Untitled Category'}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Layers className="h-3 w-3" />
                        {cat.skills.length} skill{cat.skills.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mr-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveCategory(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveCategory(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Remove this category?')) removeCategory(cat.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-4">
                    <div>
                      <Label>Category Name</Label>
                      <Input value={cat.name} onChange={(e) => updateCategory(cat.id, { name: e.target.value })} placeholder="e.g., Programming Languages" className="mt-1" />
                    </div>

                    <div>
                      <Label>Skills</Label>
                      <div className="mt-2 space-y-3">
                        {cat.skills.map((skill) => (
                          <div key={skill.id} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Input value={skill.name} onChange={(e) => updateSkill(cat.id, skill.id, { name: e.target.value })} placeholder="Skill name" className="flex-1 h-8" />
                                <Select value={skill.level || 'intermediate'} onValueChange={(v) => updateSkill(cat.id, skill.id, { level: v as SkillLevel })}>
                                  <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {SKILL_LEVELS.map((level) => (
                                      <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeSkill(cat.id, skill.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                              <Progress value={SKILL_LEVELS.find((l) => l.value === skill.level)?.percent || 50} className="h-1.5" />
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <Input value={newSkill[cat.id] || ''} onChange={(e) => setNewSkill({ ...newSkill, [cat.id]: e.target.value })} placeholder="Add a skill (e.g., Python, React, Leadership)" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill(cat.id))} />
                          <Button variant="outline" onClick={() => addSkill(cat.id)}><Plus className="h-4 w-4" /></Button>
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
              {SUGGESTED_CATEGORIES.filter((cat) => !data.some((d) => d.name.toLowerCase() === cat.toLowerCase())).map((cat) => (
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
