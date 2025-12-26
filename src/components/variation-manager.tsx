'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { GitBranch, Plus, ExternalLink, Trash2, RefreshCw, ArrowRight } from 'lucide-react';

interface VariationManagerProps {
  resumeId: string;
}

const COMMON_DOMAINS = [
  { value: 'software', label: 'Software Engineering' },
  { value: 'data', label: 'Data Science / Analytics' },
  { value: 'product', label: 'Product Management' },
  { value: 'design', label: 'Design / UX' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'sales', label: 'Sales' },
  { value: 'finance', label: 'Finance' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'education', label: 'Education' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'startup', label: 'Startup' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'custom', label: 'Custom...' },
];

export function VariationManager({ resumeId }: VariationManagerProps) {
  const router = useRouter();
  const { createVariation, getVariations, deleteResume, syncWithBase, activeResume } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [customDomain, setCustomDomain] = useState('');
  const [name, setName] = useState('');

  const variations = getVariations(resumeId);
  const isVariation = activeResume?.variationType === 'variation';

  const handleCreate = () => {
    if (!name) return;
    const finalDomain = domain === 'custom' ? customDomain : domain;
    if (!finalDomain) return;
    
    const newId = createVariation(resumeId, finalDomain, name);
    if (newId) {
      setCreateOpen(false);
      setName('');
      setDomain('');
      setCustomDomain('');
      router.push(`/editor/${newId}`);
    }
  };

  const handleOpenVariation = (id: string) => {
    setOpen(false);
    router.push(`/editor/${id}`);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <GitBranch className="h-4 w-4" />
            <span className="hidden sm:inline">Variations</span>
            {variations.length > 0 && <Badge variant="secondary" className="ml-1">{variations.length}</Badge>}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Resume Variations
            </DialogTitle>
            <DialogDescription>
              Create tailored versions of your resume for different job types or industries.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {isVariation && (
              <Card className="border-dashed border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Currently editing a variation</p>
                      <p className="text-xs text-muted-foreground">Domain: {activeResume.domain}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => syncWithBase(resumeId)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync with Base
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">{variations.length} variation{variations.length !== 1 ? 's' : ''}</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Variation
              </Button>
            </div>

            <ScrollArea className="h-[300px]">
              {variations.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                  <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No variations yet</p>
                  <p className="text-xs mt-1 mb-4">Create variations to tailor your resume for different opportunities</p>
                  <Button variant="outline" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Variation
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3">
                  {variations.map((variation) => (
                    <Card key={variation.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => handleOpenVariation(variation.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{variation.name}</span>
                              <Badge variant="outline">{variation.domain}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Last updated {new Date(variation.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenVariation(variation.id); }}>
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); if (confirm('Delete this variation?')) deleteResume(variation.id); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Variation</DialogTitle>
            <DialogDescription>
              Create a tailored version of this resume for a specific domain or industry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Variation Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., Software Engineer - Google" 
                className="mt-1" 
              />
            </div>

            <div>
              <Label>Target Domain</Label>
              <Select value={domain} onValueChange={setDomain}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a domain" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_DOMAINS.map((d) => (
                    <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {domain === 'custom' && (
              <div>
                <Label>Custom Domain</Label>
                <Input 
                  value={customDomain} 
                  onChange={(e) => setCustomDomain(e.target.value)} 
                  placeholder="Enter custom domain" 
                  className="mt-1" 
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name || (!domain || (domain === 'custom' && !customDomain))}>
              Create Variation
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
