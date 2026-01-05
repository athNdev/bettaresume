'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, BookOpen, GripVertical, ChevronUp, ChevronDown, X, ExternalLink } from 'lucide-react';
import type { Publication } from '@/types/resume';
import { createDefaultPublication } from '@/types/resume';

interface PublicationsFormProps {
  data: Publication[];
  onChange: (data: Publication[]) => void;
}

export function PublicationsForm({ data, onChange }: PublicationsFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);
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
    const temp = newData[index]!;
    newData[index] = newData[newIndex]!;
    newData[newIndex] = temp;
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
            <p className="text-sm text-muted-foreground mb-4">Add your research papers, articles, and other publications.</p>
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
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <BookOpen className="h-3 w-3" />
                      {pub.publisher || 'Publisher'}
                      {pub.date && <span>• {pub.date}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); movePublication(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); movePublication(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async (e) => { e.stopPropagation(); const confirmed = await confirm('Remove Publication', 'Remove this publication?'); if (confirmed) removePublication(pub.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div>
                    <Label>Title *</Label>
                    <Input value={pub.title} onChange={(e) => updatePublication(pub.id, { title: e.target.value })} placeholder="Machine Learning in Healthcare" className="mt-1" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Publisher / Journal *</Label>
                      <Input value={pub.publisher} onChange={(e) => updatePublication(pub.id, { publisher: e.target.value })} placeholder="IEEE" className="mt-1" />
                    </div>
                    <div>
                      <Label>Publication Date</Label>
                      <Input type="month" value={pub.date} onChange={(e) => updatePublication(pub.id, { date: e.target.value })} className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Authors</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {pub.authors?.map((author, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {author}
                          <button onClick={() => removeAuthor(pub.id, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input value={newAuthor[pub.id] || ''} onChange={(e) => setNewAuthor({ ...newAuthor, [pub.id]: e.target.value })} placeholder="Add author..." onKeyDown={(e) => e.key === 'Enter' && addAuthor(pub.id)} />
                      <Button variant="outline" size="sm" onClick={() => addAuthor(pub.id)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div>
                    <Label>URL / DOI</Label>
                    <div className="relative mt-1">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={pub.url || ''} onChange={(e) => updatePublication(pub.id, { url: e.target.value })} placeholder="https://doi.org/..." className="pl-9" />
                    </div>
                  </div>

                  <div>
                    <Label>Summary</Label>
                    <Textarea value={pub.summary || ''} onChange={(e) => updatePublication(pub.id, { summary: e.target.value })} placeholder="Brief summary of the publication..." className="mt-1 min-h-20" />
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
