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
import { Plus, Trash2, Award, GripVertical, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react';
import type { Certification } from '@/types/resume';
import { createDefaultCertification } from '@/types/resume';

interface CertificationsFormProps {
  data: Certification[];
  onChange: (data: Certification[]) => void;
}

export function CertificationsForm({ data, onChange }: CertificationsFormProps) {
  const confirm = useConfirm();
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 && data[0]?.id ? [data[0].id] : []);

  const addCertification = () => {
    const newCert = createDefaultCertification();
    onChange([...data, newCert]);
    setExpandedItems([newCert.id]);
  };

  const removeCertification = (id: string) => {
    onChange(data.filter((cert) => cert.id !== id));
  };

  const updateCertification = (id: string, updates: Partial<Certification>) => {
    onChange(data.map((cert) => cert.id === id ? { ...cert, ...updates } : cert));
  };

  const moveCertification = (index: number, direction: 'up' | 'down') => {
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
        <p className="text-sm text-muted-foreground">{data.length} certification{data.length !== 1 ? 's' : ''}</p>
        <Button onClick={addCertification} size="sm"><Plus className="h-4 w-4 mr-2" /> Add Certification</Button>
      </div>

      {data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <Award className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium mb-2">No certifications added</h3>
            <p className="text-sm text-muted-foreground mb-4">Add your professional certifications and credentials.</p>
            <Button onClick={addCertification}><Plus className="h-4 w-4 mr-2" /> Add Your First Certification</Button>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="multiple" value={expandedItems} onValueChange={setExpandedItems} className="space-y-3">
          {data.map((cert, index) => (
            <AccordionItem key={cert.id} value={cert.id} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50">
                <div className="flex items-center gap-3 w-full">
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{cert.name || 'Untitled Certification'}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Award className="h-3 w-3" />
                      {cert.issuer || 'Issuer'}
                      {cert.date && <span>• {cert.date}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveCertification(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveCertification(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={async (e) => { e.stopPropagation(); const confirmed = await confirm('Remove Certification', 'Remove this certification?'); if (confirmed) removeCertification(cert.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Certification Name *</Label>
                      <Input value={cert.name} onChange={(e) => updateCertification(cert.id, { name: e.target.value })} placeholder="AWS Solutions Architect" className="mt-1" />
                    </div>
                    <div>
                      <Label>Issuing Organization *</Label>
                      <Input value={cert.issuer} onChange={(e) => updateCertification(cert.id, { issuer: e.target.value })} placeholder="Amazon Web Services" className="mt-1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Issue Date</Label>
                      <Input type="month" value={cert.date} onChange={(e) => updateCertification(cert.id, { date: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Expiration Date</Label>
                      <Input type="month" value={cert.expirationDate || ''} onChange={(e) => updateCertification(cert.id, { expirationDate: e.target.value })} disabled={cert.noExpiration} className="mt-1" />
                      <div className="flex items-center gap-2 mt-2">
                        <Checkbox id={`no-exp-${cert.id}`} checked={cert.noExpiration} onCheckedChange={(checked) => updateCertification(cert.id, { noExpiration: !!checked, expirationDate: checked ? '' : cert.expirationDate })} />
                        <Label htmlFor={`no-exp-${cert.id}`} className="text-sm">Does not expire</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Credential ID</Label>
                    <Input value={cert.credentialId || ''} onChange={(e) => updateCertification(cert.id, { credentialId: e.target.value })} placeholder="ABC-123-XYZ" className="mt-1" />
                  </div>

                  <div>
                    <Label>Credential URL</Label>
                    <div className="relative mt-1">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={cert.url || ''} onChange={(e) => updateCertification(cert.id, { url: e.target.value })} placeholder="https://credential.net/..." className="pl-9" />
                    </div>
                  </div>

                  <div>
                    <Label>Description (optional)</Label>
                    <Textarea value={cert.description || ''} onChange={(e) => updateCertification(cert.id, { description: e.target.value })} placeholder="Additional details about this certification..." className="mt-1 min-h-15" />
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
