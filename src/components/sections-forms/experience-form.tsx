'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Briefcase, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { Experience } from '@/types/resume';
import { createDefaultExperience } from '@/types/resume';

interface ExperienceFormProps {
  data: Experience[];
  onChange: (data: Experience[]) => void;
}

export function ExperienceForm({ data, onChange }: ExperienceFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);
  const [newHighlight, setNewHighlight] = useState<Record<string, string>>({});
  const [newTech, setNewTech] = useState<Record<string, string>>({});

  const addExperience = () => {
    const newExp = createDefaultExperience();
    onChange([...data, newExp]);
    setExpandedItems([newExp.id]);
  };

  const removeExperience = (id: string) => {
    onChange(data.filter((exp) => exp.id !== id));
  };

  const updateExperience = (id: string, updates: Partial<Experience>) => {
    onChange(data.map((exp) => exp.id === id ? { ...exp, ...updates } : exp));
  };

  const moveExperience = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    const temp = newData[index]!;
    newData[index] = newData[newIndex]!;
    newData[newIndex] = temp;
    onChange(newData);
  };

  const addHighlight = (expId: string) => {
    const text = newHighlight[expId]?.trim();
    if (!text) return;
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    updateExperience(expId, { highlights: [...(exp.highlights || []), text] });
    setNewHighlight({ ...newHighlight, [expId]: '' });
  };

  const removeHighlight = (expId: string, index: number) => {
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    updateExperience(expId, { highlights: exp.highlights?.filter((_, i) => i !== index) });
  };

  const addTechnology = (expId: string) => {
    const text = newTech[expId]?.trim();
    if (!text) return;
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    updateExperience(expId, { technologies: [...(exp.technologies || []), text] });
    setNewTech({ ...newTech, [expId]: '' });
  };

  const removeTechnology = (expId: string, index: number) => {
    const exp = data.find((e) => e.id === expId);
    if (!exp) return;
    updateExperience(expId, { technologies: exp.technologies?.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} position{data.length !== 1 ? 's' : ''}</p>
        <Button onClick={addExperience} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Position
        </Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No experience added</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your work history to showcase your professional journey.</p>
            <Button onClick={addExperience}><Plus className="h-4 w-4 mr-2" /> Add Your First Position</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {data.map((exp, index) => (
            <AccordionItem key={exp.id} value={exp.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{exp.position || 'Untitled Position'}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Briefcase className="h-3 w-3" />
                      {exp.company || 'Company'}
                      {exp.startDate && <span>• {exp.startDate} - {exp.current ? 'Present' : exp.endDate || 'Present'}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveExperience(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveExperience(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async (e) => { e.stopPropagation(); const confirmed = await confirm('Remove Position', 'Remove this position?'); if (confirmed) removeExperience(exp.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Job Title *</Label>
                      <Input value={exp.position} onChange={(e) => updateExperience(exp.id, { position: e.target.value })} placeholder="Software Engineer" className="mt-1" />
                    </div>
                    <div>
                      <Label>Company *</Label>
                      <Input value={exp.company} onChange={(e) => updateExperience(exp.id, { company: e.target.value })} placeholder="Google" className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Location</Label>
                      <Input value={exp.location || ''} onChange={(e) => updateExperience(exp.id, { location: e.target.value })} placeholder="San Francisco, CA" className="mt-1" />
                    </div>
                    <div>
                      <Label>Employment Type</Label>
                      <Select 
                        value={exp.employmentType || ''} 
                        onValueChange={(value) => updateExperience(exp.id, { employmentType: value as Experience['employmentType'] })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full-time">Full-time</SelectItem>
                          <SelectItem value="part-time">Part-time</SelectItem>
                          <SelectItem value="contract">Contract</SelectItem>
                          <SelectItem value="freelance">Freelance</SelectItem>
                          <SelectItem value="internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="month" value={exp.startDate} onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="month" value={exp.endDate || ''} onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })} disabled={exp.current} className="mt-1" />
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox id={`current-${exp.id}`} checked={exp.current} onCheckedChange={(checked) => updateExperience(exp.id, { current: !!checked, endDate: checked ? '' : exp.endDate })} />
                        <Label htmlFor={`current-${exp.id}`} className="text-sm">Currently working here</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={exp.description || ''} onChange={(e) => updateExperience(exp.id, { description: e.target.value })} placeholder="Brief description of your role and responsibilities..." className="mt-1 min-h-20" />
                  </div>

                  <div>
                    <Label>Key Achievements</Label>
                    <div className="space-y-2 mt-2">
                      {exp.highlights?.map((highlight, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded">{highlight}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHighlight(exp.id, i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newHighlight[exp.id] || ''} onChange={(e) => setNewHighlight({ ...newHighlight, [exp.id]: e.target.value })} placeholder="Add an achievement..." onKeyDown={(e) => e.key === 'Enter' && addHighlight(exp.id)} />
                        <Button variant="outline" size="sm" onClick={() => addHighlight(exp.id)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Technologies Used</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {exp.technologies?.map((tech, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {tech}
                          <button onClick={() => removeTechnology(exp.id, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input value={newTech[exp.id] || ''} onChange={(e) => setNewTech({ ...newTech, [exp.id]: e.target.value })} placeholder="Add technology..." onKeyDown={(e) => e.key === 'Enter' && addTechnology(exp.id)} />
                      <Button variant="outline" size="sm" onClick={() => addTechnology(exp.id)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
