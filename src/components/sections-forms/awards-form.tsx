'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Trophy, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import type { Award } from '@/types/resume';
import { createDefaultAward } from '@/types/resume';

interface AwardsFormProps {
  data: Award[];
  onChange: (data: Award[]) => void;
}

export function AwardsForm({ data, onChange }: AwardsFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);

  const addAward = () => {
    const newAward = createDefaultAward();
    onChange([...data, newAward]);
    setExpandedItems([newAward.id]);
  };

  const removeAward = (id: string) => {
    onChange(data.filter((a) => a.id !== id));
  };

  const updateAward = (id: string, updates: Partial<Award>) => {
    onChange(data.map((a) => a.id === id ? { ...a, ...updates } : a));
  };

  const moveAward = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    const temp = newData[index]!;
    newData[index] = newData[newIndex]!;
    newData[newIndex] = temp;
    onChange(newData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} award{data.length !== 1 ? 's' : ''}</p>
        <Button onClick={addAward} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Award</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No awards added</h3>
            <p className="text-sm text-muted-foreground mb-4">Showcase your recognitions and achievements.</p>
            <Button onClick={addAward}><Plus className="h-4 w-4 mr-2" /> Add Your First Award</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {data.map((award, index) => (
            <AccordionItem key={award.id} value={award.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{award.title || 'Untitled Award'}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Trophy className="h-3 w-3" />
                      {award.issuer || 'Issuer'}
                      {award.date && <span>• {award.date}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveAward(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveAward(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async (e) => { e.stopPropagation(); const confirmed = await confirm('Remove Award', 'Remove this award?'); if (confirmed) removeAward(award.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Award Title *</Label>
                      <Input value={award.title} onChange={(e) => updateAward(award.id, { title: e.target.value })} placeholder="Employee of the Year" className="mt-1" />
                    </div>
                    <div>
                      <Label>Issuing Organization *</Label>
                      <Input value={award.issuer} onChange={(e) => updateAward(award.id, { issuer: e.target.value })} placeholder="Company Name" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Date Received</Label>
                    <Input type="month" value={award.date} onChange={(e) => updateAward(award.id, { date: e.target.value })} className="mt-1 w-48" />
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={award.description || ''} onChange={(e) => updateAward(award.id, { description: e.target.value })} placeholder="Describe what this award was for and why it was significant..." className="mt-1 min-h-20" />
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
