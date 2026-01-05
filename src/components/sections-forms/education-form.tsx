'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GraduationCap, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { Education } from '@/types/resume';
import { createDefaultEducation } from '@/types/resume';

interface EducationFormProps {
  data: Education[];
  onChange: (data: Education[]) => void;
}

export function EducationForm({ data, onChange }: EducationFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);
  const [newAchievement, setNewAchievement] = useState<Record<string, string>>({});
  const [newCoursework, setNewCoursework] = useState<Record<string, string>>({});
  const [newHonor, setNewHonor] = useState<Record<string, string>>({});

  const addEducation = () => {
    const newEdu = createDefaultEducation();
    onChange([...data, newEdu]);
    setExpandedItems([newEdu.id]);
  };

  const removeEducation = (id: string) => {
    onChange(data.filter((edu) => edu.id !== id));
  };

  const updateEducation = (id: string, updates: Partial<Education>) => {
    onChange(data.map((edu) => edu.id === id ? { ...edu, ...updates } : edu));
  };

  const moveEducation = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    const temp = newData[index]!;
    newData[index] = newData[newIndex]!;
    newData[newIndex] = temp;
    onChange(newData);
  };

  const addItem = (eduId: string, field: 'achievements' | 'coursework' | 'honors', value: string, setter: React.Dispatch<React.SetStateAction<Record<string, string>>>) => {
    const text = value?.trim();
    if (!text) return;
    const edu = data.find((e) => e.id === eduId);
    if (!edu) return;
    updateEducation(eduId, { [field]: [...(edu[field] || []), text] });
    setter((prev) => ({ ...prev, [eduId]: '' }));
  };

  const removeItem = (eduId: string, field: 'achievements' | 'coursework' | 'honors', index: number) => {
    const edu = data.find((e) => e.id === eduId);
    if (!edu) return;
    updateEducation(eduId, { [field]: edu[field]?.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} education entr{data.length !== 1 ? 'ies' : 'y'}</p>
        <Button onClick={addEducation} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Education</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <GraduationCap className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No education added</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your academic background and qualifications.</p>
            <Button onClick={addEducation}><Plus className="h-4 w-4 mr-2" /> Add Your First Education</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {data.map((edu, index) => (
            <AccordionItem key={edu.id} value={edu.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{edu.degree || 'Degree'} {edu.field && `in ${edu.field}`}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <GraduationCap className="h-3 w-3" />
                      {edu.institution || 'Institution'}
                      {edu.graduationDate && <span>• {edu.graduationDate}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveEducation(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveEducation(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async (e) => { e.stopPropagation(); const confirmed = await confirm('Remove Education', 'Remove this education?'); if (confirmed) removeEducation(edu.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Degree *</Label>
                      <Input value={edu.degree} onChange={(e) => updateEducation(edu.id, { degree: e.target.value })} placeholder="Bachelor of Science" className="mt-1" />
                    </div>
                    <div>
                      <Label>Field of Study *</Label>
                      <Input value={edu.field} onChange={(e) => updateEducation(edu.id, { field: e.target.value })} placeholder="Computer Science" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Institution *</Label>
                    <Input value={edu.institution} onChange={(e) => updateEducation(edu.id, { institution: e.target.value })} placeholder="Stanford University" className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Location</Label>
                      <Input value={edu.location || ''} onChange={(e) => updateEducation(edu.id, { location: e.target.value })} placeholder="Stanford, CA" className="mt-1" />
                    </div>
                    <div>
                      <Label>Graduation Date</Label>
                      <Input type="month" value={edu.graduationDate} onChange={(e) => updateEducation(edu.id, { graduationDate: e.target.value })} className="mt-1" />
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox id={`current-${edu.id}`} checked={edu.current} onCheckedChange={(checked) => updateEducation(edu.id, { current: !!checked })} />
                        <Label htmlFor={`current-${edu.id}`} className="text-sm">Currently enrolled</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>GPA (optional)</Label>
                      <Input value={edu.gpa || ''} onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })} placeholder="3.8/4.0" className="mt-1" />
                    </div>
                    <div>
                      <Label>Start Date (optional)</Label>
                      <Input type="month" value={edu.startDate || ''} onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Achievements</Label>
                    <div className="space-y-2 mt-2">
                      {edu.achievements?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded">{item}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(edu.id, 'achievements', i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newAchievement[edu.id] || ''} onChange={(e) => setNewAchievement({ ...newAchievement, [edu.id]: e.target.value })} placeholder="Add achievement..." onKeyDown={(e) => e.key === 'Enter' && addItem(edu.id, 'achievements', newAchievement[edu.id] || '', setNewAchievement)} />
                        <Button variant="outline" size="sm" onClick={() => addItem(edu.id, 'achievements', newAchievement[edu.id] || '', setNewAchievement)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Relevant Coursework</Label>
                    <div className="space-y-2 mt-2">
                      {edu.coursework?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded">{item}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(edu.id, 'coursework', i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newCoursework[edu.id] || ''} onChange={(e) => setNewCoursework({ ...newCoursework, [edu.id]: e.target.value })} placeholder="Add course..." onKeyDown={(e) => e.key === 'Enter' && addItem(edu.id, 'coursework', newCoursework[edu.id] || '', setNewCoursework)} />
                        <Button variant="outline" size="sm" onClick={() => addItem(edu.id, 'coursework', newCoursework[edu.id] || '', setNewCoursework)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Honors & Awards</Label>
                    <div className="space-y-2 mt-2">
                      {edu.honors?.map((item, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded">{item}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(edu.id, 'honors', i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newHonor[edu.id] || ''} onChange={(e) => setNewHonor({ ...newHonor, [edu.id]: e.target.value })} placeholder="Add honor..." onKeyDown={(e) => e.key === 'Enter' && addItem(edu.id, 'honors', newHonor[edu.id] || '', setNewHonor)} />
                        <Button variant="outline" size="sm" onClick={() => addItem(edu.id, 'honors', newHonor[edu.id] || '', setNewHonor)}><Plus className="h-4 w-4" /></Button>
                      </div>
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
