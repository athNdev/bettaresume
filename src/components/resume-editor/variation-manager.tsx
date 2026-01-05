'use client';

import { useState } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GitBranch, Plus, ChevronDown, Copy, Trash2, RefreshCw, Check } from 'lucide-react';
import type { Resume } from '@/types/resume';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface VariationManagerProps {
  baseResume: Resume;
  variations: Resume[];
  currentResumeId: string;
  onCreateVariation: (name: string, domain?: string) => void;
  onSelectVariation: (id: string) => void;
  onDeleteVariation: (id: string) => void;
  onSyncWithBase?: (variationId: string) => void;
}

export function VariationManager({
  baseResume,
  variations,
  currentResumeId,
  onCreateVariation,
  onSelectVariation,
  onDeleteVariation,
  onSyncWithBase,
}: VariationManagerProps) {
  const confirm = useConfirm();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const currentResume = currentResumeId === baseResume.id 
    ? baseResume 
    : variations.find((v) => v.id === currentResumeId);

  const handleCreate = () => {
    if (!newName.trim()) return;
    onCreateVariation(newName.trim(), newDomain.trim() || undefined);
    setNewName('');
    setNewDomain('');
    setIsCreateOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Current Resume Indicator */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={currentResume?.variationType === 'base' ? 'default' : 'secondary'}
            className="gap-1"
          >
            <GitBranch className="h-3 w-3" />
            {currentResume?.variationType === 'base' ? 'Base' : 'Variation'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          {currentResume?.variationType === 'base'
            ? 'This is the base resume that variations are created from'
            : `Variation of "${baseResume.name}"`}
        </TooltipContent>
      </Tooltip>

      {/* Variation Selector Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <span className="max-w-32 truncate">{currentResume?.name || 'Select'}</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          {/* Base Resume */}
          <DropdownMenuItem
            onClick={() => onSelectVariation(baseResume.id)}
            className={cn(currentResumeId === baseResume.id && 'bg-accent')}
          >
            <div className="flex items-center gap-2 flex-1">
              <GitBranch className="h-4 w-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{baseResume.name}</p>
                <p className="text-xs text-muted-foreground">Base Resume</p>
              </div>
              {currentResumeId === baseResume.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>

          {variations.length > 0 && <DropdownMenuSeparator />}

          {/* Variations */}
          <ScrollArea className={variations.length > 4 ? 'h-48' : ''}>
            {variations.map((variation) => (
              <DropdownMenuItem
                key={variation.id}
                onClick={() => onSelectVariation(variation.id)}
                className={cn(
                  'flex items-center justify-between',
                  currentResumeId === variation.id && 'bg-accent'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{variation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {variation.domain || formatDistanceToNow(new Date(variation.createdAt), { addSuffix: true })}
                  </p>
                </div>
                {currentResumeId === variation.id && (
                  <Check className="h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </ScrollArea>

          <DropdownMenuSeparator />

          {/* Create New Variation */}
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setIsCreateOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Create Variation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Actions for current variation */}
      {currentResume?.variationType === 'variation' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {onSyncWithBase && (
              <DropdownMenuItem onClick={() => onSyncWithBase(currentResumeId)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync with Base
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              className="text-destructive"
              onClick={async () => {
                const confirmed = await confirm('Delete Variation', 'Delete this variation? This cannot be undone.');
                if (confirmed) {
                  onDeleteVariation(currentResumeId);
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Variation
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Create Variation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Variation</DialogTitle>
            <DialogDescription>
              Create a new variation of "{baseResume.name}" to customize for a specific role or company.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Variation Name *</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Software Engineer - Google"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Target Domain (optional)</Label>
              <Input
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                placeholder="e.g., Frontend, Backend, Full Stack"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Helps categorize and filter your variations
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              <GitBranch className="h-4 w-4 mr-2" />
              Create Variation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
