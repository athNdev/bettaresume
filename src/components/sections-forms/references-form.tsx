'use client';

import { useState, useCallback } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { useAutoSave, useBeforeUnload } from '@/hooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { Plus, Trash2, Users, GripVertical, ChevronUp, ChevronDown, Mail, Phone } from 'lucide-react';
import type { Reference } from '@/types/resume';
import { createDefaultReference } from '@/types/resume';

interface ReferencesFormProps {
  data: Reference[];
  onChange: (data: Reference[]) => Promise<void>;
  title?: string;
}

export function ReferencesForm({ data, onChange, title }: ReferencesFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);

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

  const addReference = useCallback(() => {
    const newRef = createDefaultReference();
    setLocalData(prev => [...prev, newRef]);
    setExpandedItems([newRef.id]);
  }, [setLocalData]);

  const removeReference = useCallback((id: string) => {
    setLocalData(prev => prev.filter((r) => r.id !== id));
  }, [setLocalData]);

  const updateReference = useCallback((id: string, updates: Partial<Reference>) => {
    setLocalData(prev => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
  }, [setLocalData]);

  const moveReference = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localData.length) return;
    setLocalData(prev => {
      const newData = [...prev];
      const temp = newData[index]!;
      newData[index] = newData[newIndex]!;
      newData[newIndex] = temp;
      return newData;
    });
  }, [localData.length, setLocalData]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 -mx-4 -mt-4 mb-4 flex items-center justify-between min-h-10">
        <div className="flex items-center gap-3">
          {title && <h3 className="font-semibold">{title}</h3>}
          <SaveStatusIndicator status={status} error={error} onRetry={retrySave} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{localData.length} reference{localData.length !== 1 ? 's' : ''}</p>
          <Button onClick={addReference} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Reference</Button>
        </div>
      </div>

      {localData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No references added</h3>
            <p className="text-sm text-muted-foreground mb-4">Add professional references who can vouch for your qualifications.</p>
            <Button onClick={addReference}><Plus className="h-4 w-4 mr-2" /> Add Your First Reference</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {localData.map((ref, index) => (
            <AccordionItem key={ref.id} value={ref.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center">
                <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 w-full">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{ref.name || 'Untitled Reference'}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        {ref.position || 'Position'} {ref.company && `at ${ref.company}`}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <div className="flex items-center gap-1 px-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveReference(index, 'up')} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveReference(index, 'down')} disabled={index === localData.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { const confirmed = await confirm('Remove Reference', 'Remove this reference?'); if (confirmed) removeReference(ref.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name *</Label>
                      <Input value={ref.name} onChange={(e) => updateReference(ref.id, { name: e.target.value })} placeholder="John Smith" className="mt-1" />
                    </div>
                    <div>
                      <Label>Position / Title *</Label>
                      <Input value={ref.position} onChange={(e) => updateReference(ref.id, { position: e.target.value })} placeholder="Senior Manager" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Company / Organization</Label>
                    <Input value={ref.company || ''} onChange={(e) => updateReference(ref.id, { company: e.target.value })} placeholder="Acme Corp" className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <div className="relative mt-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={ref.email || ''} onChange={(e) => updateReference(ref.id, { email: e.target.value })} placeholder="john@company.com" className="pl-9" />
                      </div>
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <div className="relative mt-1">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={ref.phone || ''} onChange={(e) => updateReference(ref.id, { phone: e.target.value })} placeholder="+1 (555) 123-4567" className="pl-9" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Relationship</Label>
                    <Input value={ref.relationship || ''} onChange={(e) => updateReference(ref.id, { relationship: e.target.value })} placeholder="Former supervisor for 3 years" className="mt-1" />
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
