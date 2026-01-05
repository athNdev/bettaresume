'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Rocket, GripVertical, ChevronUp, ChevronDown, X, ExternalLink } from 'lucide-react';
import type { Project } from '@/types/resume';
import { createDefaultProject } from '@/types/resume';

interface ProjectsFormProps {
  data: Project[];
  onChange: (data: Project[]) => void;
}

export function ProjectsForm({ data, onChange }: ProjectsFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);
  const [newTech, setNewTech] = useState<Record<string, string>>({});
  const [newHighlight, setNewHighlight] = useState<Record<string, string>>({});

  const addProject = () => {
    const newProj = createDefaultProject();
    onChange([...data, newProj]);
    setExpandedItems([newProj.id]);
  };

  const removeProject = (id: string) => {
    onChange(data.filter((p) => p.id !== id));
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    onChange(data.map((p) => p.id === id ? { ...p, ...updates } : p));
  };

  const moveProject = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    const temp = newData[index]!;
    newData[index] = newData[newIndex]!;
    newData[newIndex] = temp;
    onChange(newData);
  };

  const addTechnology = (projId: string) => {
    const text = newTech[projId]?.trim();
    if (!text) return;
    const proj = data.find((p) => p.id === projId);
    if (!proj) return;
    updateProject(projId, { technologies: [...(proj.technologies || []), text] });
    setNewTech({ ...newTech, [projId]: '' });
  };

  const removeTechnology = (projId: string, index: number) => {
    const proj = data.find((p) => p.id === projId);
    if (!proj) return;
    updateProject(projId, { technologies: proj.technologies?.filter((_, i) => i !== index) });
  };

  const addHighlight = (projId: string) => {
    const text = newHighlight[projId]?.trim();
    if (!text) return;
    const proj = data.find((p) => p.id === projId);
    if (!proj) return;
    updateProject(projId, { highlights: [...(proj.highlights || []), text] });
    setNewHighlight({ ...newHighlight, [projId]: '' });
  };

  const removeHighlight = (projId: string, index: number) => {
    const proj = data.find((p) => p.id === projId);
    if (!proj) return;
    updateProject(projId, { highlights: proj.highlights?.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{data.length} project{data.length !== 1 ? 's' : ''}</p>
        <Button onClick={addProject} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Project</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Rocket className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No projects added</h3>
            <p className="text-sm text-muted-foreground mb-4">Showcase your personal and professional projects.</p>
            <Button onClick={addProject}><Plus className="h-4 w-4 mr-2" /> Add Your First Project</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {data.map((proj, index) => (
            <AccordionItem key={proj.id} value={proj.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{proj.name || 'Untitled Project'}</div>
                    <div className="text-sm text-muted-foreground">
                      {proj.technologies?.slice(0, 3).join(', ')}
                      {proj.technologies && proj.technologies.length > 3 && ` +${proj.technologies.length - 3}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveProject(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveProject(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async (e) => { e.stopPropagation(); const confirmed = await confirm('Remove Project', 'Remove this project?'); if (confirmed) removeProject(proj.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Project Name *</Label>
                      <Input value={proj.name} onChange={(e) => updateProject(proj.id, { name: e.target.value })} placeholder="My Awesome Project" className="mt-1" />
                    </div>
                    <div>
                      <Label>Role</Label>
                      <Input value={proj.role || ''} onChange={(e) => updateProject(proj.id, { role: e.target.value })} placeholder="Lead Developer" className="mt-1" />
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <Textarea value={proj.description} onChange={(e) => updateProject(proj.id, { description: e.target.value })} placeholder="Describe the project, its purpose, and your contributions..." className="mt-1 min-h-20" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Start Date</Label>
                      <Input type="month" value={proj.startDate || ''} onChange={(e) => updateProject(proj.id, { startDate: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>End Date</Label>
                      <Input type="month" value={proj.endDate || ''} onChange={(e) => updateProject(proj.id, { endDate: e.target.value })} disabled={proj.current} className="mt-1" />
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox id={`current-${proj.id}`} checked={proj.current} onCheckedChange={(checked) => updateProject(proj.id, { current: !!checked })} />
                        <Label htmlFor={`current-${proj.id}`} className="text-sm">Ongoing project</Label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Live URL</Label>
                      <div className="relative mt-1">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={proj.url || ''} onChange={(e) => updateProject(proj.id, { url: e.target.value })} placeholder="https://project.com" className="pl-9" />
                      </div>
                    </div>
                    <div>
                      <Label>Repository URL</Label>
                      <div className="relative mt-1">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={proj.github || ''} onChange={(e) => updateProject(proj.id, { github: e.target.value })} placeholder="https://github.com/..." className="pl-9" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Technologies</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {proj.technologies?.map((tech, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {tech}
                          <button onClick={() => removeTechnology(proj.id, i)} className="ml-1 hover:text-destructive"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Input value={newTech[proj.id] || ''} onChange={(e) => setNewTech({ ...newTech, [proj.id]: e.target.value })} placeholder="Add technology..." onKeyDown={(e) => e.key === 'Enter' && addTechnology(proj.id)} />
                      <Button variant="outline" size="sm" onClick={() => addTechnology(proj.id)}><Plus className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div>
                    <Label>Key Features / Highlights</Label>
                    <div className="space-y-2 mt-2">
                      {proj.highlights?.map((highlight, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-sm flex-1 bg-muted px-3 py-1.5 rounded">{highlight}</span>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeHighlight(proj.id, i)}><X className="h-3 w-3" /></Button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input value={newHighlight[proj.id] || ''} onChange={(e) => setNewHighlight({ ...newHighlight, [proj.id]: e.target.value })} placeholder="Add highlight..." onKeyDown={(e) => e.key === 'Enter' && addHighlight(proj.id)} />
                        <Button variant="outline" size="sm" onClick={() => addHighlight(proj.id)}><Plus className="h-4 w-4" /></Button>
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
