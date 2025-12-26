'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Award, ExternalLink, ChevronUp, ChevronDown } from 'lucide-react';
import type { Certification } from '@/types/resume';
import { createDefaultCertification } from '@/types/resume';

interface CertificationsFormProps {
  data: Certification[];
  onChange: (data: Certification[]) => void;
}

export function CertificationsForm({ data, onChange }: CertificationsFormProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>(data.length > 0 ? [data[0]?.id] : []);

  const addCertification = () => {
    const newCert = createDefaultCertification();
    onChange([...data, newCert]);
    setExpandedItems([newCert.id]);
  };

  const removeCertification = (id: string) => {
    onChange(data.filter((c) => c.id !== id));
  };

  const updateCertification = (id: string, updates: Partial<Certification>) => {
    onChange(data.map((c) => c.id === id ? { ...c, ...updates } : c));
  };

  const moveCertification = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= data.length) return;
    const newData = [...data];
    [newData[index], newData[newIndex]] = [newData[newIndex], newData[index]];
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
            <p className="text-sm text-muted-foreground mb-4">Add your professional certifications and licenses.</p>
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
                    <div className="text-sm text-muted-foreground">{cert.issuer || 'Issuer'}</div>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveCertification(index, 'up'); }} disabled={index === 0}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); moveCertification(index, 'down'); }} disabled={index === data.length - 1}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Remove this certification?')) removeCertification(cert.id); }}><Trash2 className="h-4 w-4" /></Button>
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
                      <Input type="month" value={cert.issueDate} onChange={(e) => updateCertification(cert.id, { issueDate: e.target.value })} className="mt-1" />
                    </div>
                    <div>
                      <Label>Expiry Date</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Input type="month" value={cert.expiryDate || ''} onChange={(e) => updateCertification(cert.id, { expiryDate: e.target.value })} disabled={cert.noExpiry} className="flex-1" />
                        <div className="flex items-center gap-2">
                          <Switch checked={cert.noExpiry || false} onCheckedChange={(checked) => updateCertification(cert.id, { noExpiry: checked, expiryDate: checked ? '' : cert.expiryDate })} />
                          <Label className="text-sm whitespace-nowrap">No Expiry</Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Credential ID</Label>
                      <Input value={cert.credentialId || ''} onChange={(e) => updateCertification(cert.id, { credentialId: e.target.value })} placeholder="ABC123XYZ" className="mt-1" />
                    </div>
                    <div>
                      <Label>Credential URL</Label>
                      <div className="relative mt-1">
                        <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input value={cert.credentialUrl || ''} onChange={(e) => updateCertification(cert.id, { credentialUrl: e.target.value })} placeholder="https://verify.aws..." className="pl-9" />
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
