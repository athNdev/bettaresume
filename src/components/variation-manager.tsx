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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Plus, ExternalLink, Trash2, ArrowRight, Briefcase, RefreshCw, Link as LinkIcon, Unlink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { SECTION_CONFIGS } from '@/types/resume';

interface VariationManagerProps {
  resumeId: string;
  variant?: 'button' | 'panel';
}

const TARGET_ROLES = [
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

export function VariationManager({ resumeId, variant = 'button' }: VariationManagerProps) {
  const router = useRouter();
  const { createVariation, getVariations, deleteResume, activeResume, resumes, getSectionLinkStatus, customizeSection, resetSectionToBase, syncLinkedSections } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [targetRole, setTargetRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState('variations');

  // Get the actual base resume ID - if we're viewing a variation, use its baseResumeId
  const isVariation = activeResume?.variationType === 'variation';
  const baseResumeId = isVariation ? activeResume?.baseResumeId : resumeId;
  const baseResume = resumes.find(r => r.id === baseResumeId);
  
  // Get all variations of the base resume
  const variations = getVariations(baseResumeId || resumeId);

  const handleCreate = () => {
    if (!name || !baseResumeId) return;
    const finalRole = targetRole === 'custom' ? customRole : targetRole;
    if (!finalRole) return;
    
    const newId = createVariation(baseResumeId, finalRole, name);
    if (newId) {
      setCreateOpen(false);
      setName('');
      setTargetRole('');
      setCustomRole('');
      router.push(`/editor/${newId}`);
    }
  };

  const handleOpenVariation = (id: string) => {
    setOpen(false);
    router.push(`/editor/${id}`);
  };

  const handleGoToBase = () => {
    if (baseResumeId) {
      setOpen(false);
      router.push(`/editor/${baseResumeId}`);
    }
  };

  // Panel variant - embedded display for left sidebar
  if (variant === 'panel') {
    return (
      <div className="space-y-2">
        {isVariation && baseResume && (
          <div className="p-2 rounded-md border border-dashed border-primary/50 bg-primary/5">
            <p className="text-xs font-medium">Editing a version</p>
            <p className="text-[10px] text-muted-foreground">Based on: {baseResume.name}</p>
            <Button variant="link" size="sm" className="h-5 px-0 text-xs" onClick={handleGoToBase}>
              ← Back to main
            </Button>
          </div>
        )}
        
        {!isVariation && (
          <div className="text-xs text-muted-foreground">
            {variations.length} {variations.length === 1 ? 'version' : 'versions'}
          </div>
        )}
        
        {variations.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1 italic">No versions yet</p>
        ) : (
          <div className="space-y-1">
            {variations.slice(0, 5).map((variation) => {
              const isCurrent = variation.id === resumeId;
              return (
                <button
                  key={variation.id}
                  onClick={() => !isCurrent && handleOpenVariation(variation.id)}
                  className={`w-full text-left p-2 rounded text-xs transition-colors ${
                    isCurrent ? 'bg-primary/10 border border-primary/30' : 'hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{variation.name}</span>
                    {isCurrent && <Badge variant="secondary" className="text-[9px] h-4">Editing</Badge>}
                  </div>
                  <span className="text-[10px] text-muted-foreground capitalize">{variation.domain}</span>
                </button>
              );
            })}
          </div>
        )}
        
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full h-7 text-xs"
          onClick={() => setCreateOpen(true)}
        >
          <Plus className="h-3 w-3 mr-1" />
          New Version
        </Button>
        
        {/* Reuse the create dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Targeted Version</DialogTitle>
              <DialogDescription>
                Create a version of your resume tailored for a specific job or industry.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <Label>Version Name</Label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder="e.g., Google Software Engineer Application" 
                  className="mt-1" 
                />
              </div>

              <div>
                <Label>Target Role / Industry</Label>
                <Select value={targetRole} onValueChange={setTargetRole}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a target" />
                  </SelectTrigger>
                  <SelectContent>
                    {TARGET_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targetRole === 'custom' && (
                <div>
                  <Label>Custom Target</Label>
                  <Input 
                    value={customRole} 
                    onChange={(e) => setCustomRole(e.target.value)} 
                    placeholder="Enter your target role or industry" 
                    className="mt-1" 
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCreate} 
                disabled={!name || (!targetRole || (targetRole === 'custom' && !customRole))}
              >
                Create Copy
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Tailored Copies</span>
            {variations.length > 0 && <Badge variant="secondary" className="ml-1">{variations.length}</Badge>}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Tailored Resume Copies
            </DialogTitle>
            <DialogDescription>
              Create customized copies of your resume for different job applications or industries.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="variations">
                All Copies ({variations.length})
              </TabsTrigger>
              {isVariation && (
                <TabsTrigger value="sync">
                  Sync Status
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="variations" className="space-y-4 mt-4">
              {isVariation && baseResume && (
                <Card className="border-dashed border-primary/50 bg-primary/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Currently editing a tailored copy</p>
                        <p className="text-xs text-muted-foreground">Target: {activeResume.domain}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Base resume: {baseResume.name}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleGoToBase}>
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Go to Base
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {variations.length} tailored {variations.length === 1 ? 'copy' : 'copies'}
                </p>
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Tailored Copy
                </Button>
              </div>

              <ScrollArea className="h-[300px]">
                {variations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground border rounded-lg border-dashed">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No tailored copies yet</p>
                    <p className="text-xs mt-1 mb-4">
                      Create customized copies of your resume for specific job applications
                    </p>
                    <Button variant="outline" onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Copy
                    </Button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {variations.map((variation) => {
                      const isCurrent = variation.id === resumeId;
                      return (
                        <Card 
                          key={variation.id} 
                          className={`cursor-pointer transition-colors ${
                            isCurrent 
                              ? 'border-primary bg-primary/5' 
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => !isCurrent && handleOpenVariation(variation.id)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{variation.name}</span>
                                  <Badge variant="outline">{variation.domain}</Badge>
                                  {isCurrent && (
                                    <Badge variant="default" className="text-xs">Current</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-xs text-muted-foreground">
                                    Updated {formatDistanceToNow(new Date(variation.updatedAt), { addSuffix: true })}
                                  </p>
                                  {variation.lastSyncedAt && (
                                    <>
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <RefreshCw className="h-3 w-3" />
                                        Synced {formatDistanceToNow(new Date(variation.lastSyncedAt), { addSuffix: true })}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {!isCurrent && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleOpenVariation(variation.id); 
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 text-destructive" 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (confirm('Delete this tailored copy? This cannot be undone.')) {
                                      deleteResume(variation.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            {isVariation && (
              <TabsContent value="sync" className="mt-4">
                <div className="space-y-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-medium">Section Link Status</h3>
                          <p className="text-xs text-muted-foreground">
                            Linked sections auto-update when the base resume changes
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            syncLinkedSections(resumeId);
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {activeResume?.sections.map((section) => {
                          const linkStatus = getSectionLinkStatus(resumeId, section.id);
                          const isLinked = linkStatus === 'linked';
                          const sectionTitle = section.content.title || SECTION_CONFIGS[section.type]?.defaultTitle || section.type;
                          
                          return (
                            <div 
                              key={section.id}
                              className={`flex items-center justify-between p-2 rounded-md border ${
                                isLinked ? 'bg-blue-500/5 border-blue-500/20' : 'bg-orange-500/5 border-orange-500/20'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {isLinked ? (
                                  <LinkIcon className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <Unlink className="h-4 w-4 text-orange-500" />
                                )}
                                <span className="text-sm">{sectionTitle}</span>
                                <Badge variant="outline" className={`text-xs ${
                                  isLinked ? 'text-blue-600 border-blue-500/30' : 'text-orange-600 border-orange-500/30'
                                }`}>
                                  {isLinked ? 'Linked' : 'Customized'}
                                </Badge>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (isLinked) {
                                    customizeSection(resumeId, section.id);
                                  } else {
                                    resetSectionToBase(resumeId, section.id);
                                  }
                                }}
                              >
                                {isLinked ? 'Customize' : 'Reset to Base'}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <div className="text-xs text-muted-foreground text-center">
                    <p>🔗 <strong>Linked</strong> sections automatically receive updates from the base resume.</p>
                    <p className="mt-1">✏️ <strong>Customized</strong> sections are independent and will not be affected by base changes.</p>
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Create New Variation Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Tailored Copy</DialogTitle>
            <DialogDescription>
              Create a customized copy of your resume targeted for a specific role or industry.
              You can later sync updates from the original resume.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Copy Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g., Google Software Engineer Application" 
                className="mt-1" 
              />
              <p className="text-xs text-muted-foreground mt-1">
                Give this copy a memorable name to help you identify it later
              </p>
            </div>

            <div>
              <Label>Target Role / Industry</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a target" />
                </SelectTrigger>
                <SelectContent>
                  {TARGET_ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {targetRole === 'custom' && (
              <div>
                <Label>Custom Target</Label>
                <Input 
                  value={customRole} 
                  onChange={(e) => setCustomRole(e.target.value)} 
                  placeholder="Enter your target role or industry" 
                  className="mt-1" 
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreate} 
              disabled={!name || (!targetRole || (targetRole === 'custom' && !customRole))}
            >
              Create Copy
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
