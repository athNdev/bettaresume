'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Users, Mail, Phone, Linkedin, EyeOff } from 'lucide-react';
import type { Reference } from '@/types/resume';
import { createDefaultReference } from '@/types/resume';

interface ReferencesFormProps {
  data: Reference[];
  onChange: (data: Reference[]) => void;
}

export function ReferencesForm({ data, onChange }: ReferencesFormProps) {
  const addReference = () => {
    onChange([...data, createDefaultReference()]);
  };

  const removeReference = (id: string) => {
    onChange(data.filter((r) => r.id !== id));
  };

  const updateReference = (id: string, updates: Partial<Reference>) => {
    onChange(data.map((r) => r.id === id ? { ...r, ...updates } : r));
  };

  const hiddenCount = data.filter((r) => r.isHidden).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.length} reference{data.length !== 1 ? 's' : ''}
          {hiddenCount > 0 && ` (${hiddenCount} hidden)`}
        </p>
        <Button onClick={addReference} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Reference</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No references added</h3>
            <p className="text-sm text-muted-foreground mb-4">Add professional references who can vouch for your work.</p>
            <Button onClick={addReference}><Plus className="h-4 w-4 mr-2" /> Add Your First Reference</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((ref) => (
            <Card key={ref.id} className={ref.isHidden ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Switch checked={ref.isHidden || false} onCheckedChange={(checked) => updateReference(ref.id, { isHidden: checked })} />
                      <Label className="text-sm flex items-center gap-1">
                        <EyeOff className="h-3 w-3" />
                        Hide (Available upon request)
                      </Label>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm('Remove this reference?')) removeReference(ref.id); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name *</Label>
                      <Input value={ref.name} onChange={(e) => updateReference(ref.id, { name: e.target.value })} placeholder="John Smith" className="mt-1" />
                    </div>
                    <div>
                      <Label>Title *</Label>
                      <Input value={ref.title} onChange={(e) => updateReference(ref.id, { title: e.target.value })} placeholder="Senior Manager" className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Company *</Label>
                      <Input value={ref.company} onChange={(e) => updateReference(ref.id, { company: e.target.value })} placeholder="Google" className="mt-1" />
                    </div>
                    <div>
                      <Label>Relationship *</Label>
                      <Input value={ref.relationship} onChange={(e) => updateReference(ref.id, { relationship: e.target.value })} placeholder="Former Manager" className="mt-1" />
                    </div>
                  </div>

                  {!ref.isHidden && (
                    <div className="grid grid-cols-3 gap-4">
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
                      <div>
                        <Label>LinkedIn</Label>
                        <div className="relative mt-1">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input value={ref.linkedin || ''} onChange={(e) => updateReference(ref.id, { linkedin: e.target.value })} placeholder="linkedin.com/in/..." className="pl-9" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {data.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Tip: Toggle &quot;Hide&quot; to show &quot;References available upon request&quot; instead of full contact details.
        </p>
      )}
    </div>
  );
}
