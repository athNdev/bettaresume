'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, BookOpen, ExternalLink, X, ChevronUp, ChevronDown } from 'lucide-react';
import type { Publication } from '@/types/resume';
import { createDefaultPublication } from '@/types/resume';

interface PublicationsFormProps {
  data: Publication[];
  onChange: (data: Publication[]) => void;
}

export function PublicationsForm({ data, onChange }: PublicationsFormProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 ? [data[0]?.id] : []);
  const [newAuthor, setNewAuthor] = useState<Record<string, string>>({});

  const addPublication = () => {
    const newPub = createDefaultPublication();
    onChange([...data, newPub]);
    setExpandedItems([newPub.id]);
  };

  const removePublication = (id: string) => {
    onChange(data.filter((p) => p.id !== id));
  };

  const updatePublication = (id: string, updates: Partial<Publication>) => {
    onChange(data.map((p) => p.id === id ? { ...p, ...updates } : p));
  };

  const movePublication = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    [newData[index], newData[newIndex]] = [newData[newIndex], newData[index]];
    onChange(newData);
  };

  const addAuthor = (pubId: string) => {
    const text = newAuthor[pubId]?.trim();
    if (!text) return;
    const pub = data.find((p) => p.id === pubId);
    if (!pub) return;
    updatePublication(pubId, { authors: [...(pub.authors || []), text] });
    setNewAuthor({ ...newAuthor, [pubId]: '' });
  };

  const removeAuthor = (pubId: string, index: number) => {
    const pub = data.find((p) => p.id === pubId);
    if (!pub) return;
    updatePublication(pubId, { authors: pub.authors?.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} publication{data.length !== 1 ? 's' : ''}</p>
        <Button onClick={addPublication} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Publication</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No publications added</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your published works, papers, and articles.</p>
            <Button onClick={addPublication}><Plus className="h-4 w-4 mr-2" /> Add Your First Publication</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {data.map((pub, index) => (
            <AccordionItem key={pub.id} value={pub.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{pub.title || 'Untitled Publication'}</div>
                    <div className="text-sm text-muted-foreground">{pub.publisher || 'Publisher'}</div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); movePublication(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); movePublication(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Remove this publication?')) removePublication(pub.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={pub.title} onChange={(e) => updatePublication(pub.id, { title: e.target.value })} placeholder="Publication Title" className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Publisher / Journal *</Label>
                      <Input value={pub.publisher} onChange={(e) => updatePublication(pub.id, { publisher: e.target.value })} placeholder="Nature, IEEE, etc." className="mt-1" />
                    </div>
                    <div>
                      <Label>Publication Date</Label>
                      <Input type="month" value={pub.date} onChange={(e) => updatePublication(pub.id, { date: e.target.value })} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Co-Authors</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-2">
                        {pub.authors?.map((author, idx) => (
                          <Badge key={idx} variant="secondary" className="gap-1">
                            {author}
                            <button onClick={() => removeAuthor(pub.id, idx)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newAuthor[pub.id] || ''} onChange={(e) => setNewAuthor({ ...newAuthor, [pub.id]: e.target.value })} placeholder="Add co-author name" onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAuthor(pub.id))} />
                        <Button variant="outline" onClick={() => addAuthor(pub.id)}><Plus className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>URL</Label>
                    <div className="relative mt-1">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={pub.url || ''} onChange={(e) => updatePublication(pub.id, { url: e.target.value })} placeholder="https://..." className="pl-9" />
                    </div>
                  </div>

                  <div>
                    <Label>Description / Abstract</Label>
                    <Textarea value={pub.description || ''} onChange={(e) => updatePublication(pub.id, { description: e.target.value })} placeholder="Brief description or abstract..." className="mt-1" />
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
