'use client';

import { useState, useCallback } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { useAutoSave, useBeforeUnload } from '@/hooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { SaveStatusIndicator } from '@/components/ui/save-status-indicator';
import { Plus, Trash2, Heart, GripVertical, ChevronUp, ChevronDown, X } from 'lucide-react';
import type { Volunteer } from '@/types/resume';
import { createDefaultVolunteer } from '@/types/resume';

interface VolunteerFormProps {
  data: Volunteer[];
  onChange: (data: Volunteer[]) => Promise<void>;
  title?: string;
}

export function VolunteerForm({ data, onChange, title }: VolunteerFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);
  const [newHighlight, setNewHighlight] = useState<Record<string, string>>({});

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

  const addVolunteer = useCallback(() => {
    const newVol = createDefaultVolunteer();
    setLocalData(prev => [...prev, newVol]);
    setExpandedItems([newVol.id]);
  }, [setLocalData]);

  const removeVolunteer = useCallback((id: string) => {
    setLocalData(prev => prev.filter((v) => v.id !== id));
  }, [setLocalData]);

  const updateVolunteer = useCallback((id: string, updates: Partial<Volunteer>) => {
    setLocalData(prev => prev.map((v) => v.id === id ? { ...v, ...updates } : v));
  }, [setLocalData]);

  const moveVolunteer = useCallback((index: number, direction: 'up' | 'down') => {
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

  const addHighlight = useCallback((volId: string) => {
    const text = newHighlight[volId]?.trim();
    if (!text) return;
    const vol = localData.find((v) => v.id === volId);
    if (!vol) return;
    updateVolunteer(volId, { highlights: [...(vol.highlights || []), text] });
    setNewHighlight(prev => ({ ...prev, [volId]: '' }));
  }, [newHighlight, localData, updateVolunteer]);

  const removeHighlight = useCallback((volId: string, index: number) => {
    const vol = localData.find((v) => v.id === volId);
    if (!vol) return;
    updateVolunteer(volId, { highlights: vol.highlights?.filter((_, i) => i !== index) });
  }, [localData, updateVolunteer]);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-2 -mx-4 -mt-4 mb-4 flex items-center justify-between min-h-10">
        <div className="flex items-center gap-3">
          {title && <h3 className="font-semibold">{title}</h3>}
          <SaveStatusIndicator status={status} error={error} onRetry={retrySave} />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">{localData.length} volunteer experience{localData.length !== 1 ? 's' : ''}</p>
          <Button onClick={addVolunteer} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Volunteer</Button>
        </div>
      </div>

      {localData.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Heart className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No volunteer experience added</h3>
            <p className="text-sm text-muted-foreground mb-4">Share your community involvement and volunteer work.</p>
            <Button onClick={addVolunteer}><Plus className="h-4 w-4 mr-2" /> Add Your First Volunteer Experience</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {localData.map((vol, index) => (
            <AccordionItem key={vol.id} value={vol.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center">
                <AccordionTrigger className="flex-1 px-4 py-3 hover:no-underline hover:bg-muted/50">
                  <div className="flex items-center gap-3 w-full">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{vol.role || 'Untitled Role'}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Heart className="h-3 w-3" />
                        {vol.organization || 'Organization'}
                        {vol.startDate && <span>• {vol.startDate} - {vol.current ? 'Present' : vol.endDate || 'Present'}</span>}
                      </div>
                    </div>
                  </div>
                </AccordionTrigger>
                <div className="flex items-center gap-1 px-2">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveVolunteer(index, 'up')} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveVolunteer(index, 'down')} disabled={index === localData.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async () => { const confirmed = await confirm('Remove Volunteer Experience', 'Remove this volunteer experience?'); if (confirmed) removeVolunteer(vol.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Role *</Label>
                      <Input value={vol.role} onChange={(e) => updateVolunteer(vol.id, { role: e.target.value })} placeholder="Volunteer Coordinator" className="mt-1" />
                    </div>
                    <div>
                      <Label>Organization *</Label>
                      <Input value={vol.organization} onChange={(e) => updateVolunteer(vol.id, { organization: e.target.value })} placeholder="Red Cross" className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Location</Label>
                      <Input value={vol.location || ''} onChange={(e) => updateVolunteer(vol.id, { location: e.target.value })} placeholder="City, State" className="mt-1" />
                    </div>
                    <div>
                      <Label>Cause</Label>
                      <Input value={vol.cause || ''} onChange={(e) => updateVolunteer(vol.id, { cause: e.target.value })} placeholder="Disaster Relief" className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="month" value={vol.startDate || ''} onChange={(e) => updateVolunteer(vol.id, { startDate: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="month" value={vol.endDate || ''} onChange={(e) => updateVolunteer(vol.id, { endDate: e.target.value })} disabled={vol.current} className="mt-1" />
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox id={`current-${vol.id}`} checked={vol.current} onCheckedChange={(checked) => updateVolunteer(vol.id, { current: !!checked })} />
                        <Label htmlFor={`current-${vol.id}`} className="text-sm">Currently volunteering</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={vol.description || ''} onChange={(e) => updateVolunteer(vol.id, { description: e.target.value })} placeholder="Describe your volunteer work..." className="mt-1 min-h-20" />
                  </div>

                  <div>
                    <Label>Key Achievements</Label>
                    <div className="space-y-2 mt-2">
                      {vol.highlights?.map((highlight, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded">{highlight}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHighlight(vol.id, i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newHighlight[vol.id] || ''} onChange={(e) => setNewHighlight({ ...newHighlight, [vol.id]: e.target.value })} placeholder="Add achievement..." onKeyDown={(e) => e.key === 'Enter' && addHighlight(vol.id)} />
                        <Button variant="outline" size="sm" onClick={() => addHighlight(vol.id)}><Plus className="h-4 w-4" /></Button>
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
