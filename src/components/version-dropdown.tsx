'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronDown, 
  FileText, 
  Copy, 
  Pencil, 
  Check, 
  X, 
  Plus,
  Trash2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VersionDropdownProps {
  resumeId: string;
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

export function VersionDropdown({ resumeId }: VersionDropdownProps) {
  const router = useRouter();
  const { activeResume, resumes, getVariations, updateResume, createVariation, deleteResume } = useResumeStore();
  
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isEditingTrigger, setIsEditingTrigger] = useState(false);
  const [triggerEditName, setTriggerEditName] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newVersionName, setNewVersionName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerInputRef = useRef<HTMLInputElement>(null);
  
  if (!activeResume) return null;
  
  // Determine if current resume is base or variation
  const isVariation = activeResume.variationType === 'variation';
  const baseResumeId = isVariation ? activeResume.baseResumeId : resumeId;
  const baseResume = isVariation ? resumes.find(r => r.id === activeResume.baseResumeId) : activeResume;
  
  // Get all variations of the base resume
  const variations = getVariations(baseResumeId || resumeId);
  
  // Handle navigation to a version
  const handleNavigate = (id: string) => {
    if (id !== resumeId) {
      setIsOpen(false);
      router.push(`/editor/${id}`);
    }
  };
  
  // Start editing a version name in dropdown
  const handleStartEdit = (id: string, currentName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  // Save edited name
  const handleSaveEdit = (id: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (editingName.trim() && editingName !== resumes.find(r => r.id === id)?.name) {
      updateResume(id, { name: editingName.trim() });
    }
    setEditingId(null);
    setEditingName('');
  };
  
  // Cancel editing
  const handleCancelEdit = (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setEditingId(null);
    setEditingName('');
  };
  
  // Start editing trigger name
  const handleStartTriggerEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setTriggerEditName(activeResume.name);
    setIsEditingTrigger(true);
    setTimeout(() => triggerInputRef.current?.focus(), 0);
  };
  
  // Save trigger name
  const handleSaveTriggerEdit = () => {
    if (triggerEditName.trim() && triggerEditName !== activeResume.name) {
      updateResume(resumeId, { name: triggerEditName.trim() });
    }
    setIsEditingTrigger(false);
    setTriggerEditName('');
  };
  
  // Cancel trigger edit
  const handleCancelTriggerEdit = () => {
    setIsEditingTrigger(false);
    setTriggerEditName('');
  };
  
  // Create new version
  const handleCreateVersion = () => {
    if (!newVersionName || !baseResumeId) return;
    const finalRole = targetRole === 'custom' ? customRole : targetRole;
    if (!finalRole) return;
    
    const newId = createVariation(baseResumeId, finalRole, newVersionName);
    if (newId) {
      setCreateDialogOpen(false);
      setNewVersionName('');
      setTargetRole('');
      setCustomRole('');
      router.push(`/editor/${newId}`);
    }
  };
  
  // Delete version
  const handleDeleteVersion = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm('Delete this version? This cannot be undone.')) {
      deleteResume(id);
      // If we deleted the current version, go to base
      if (id === resumeId && baseResumeId) {
        router.push(`/editor/${baseResumeId}`);
      }
    }
  };
  
  // Determine badge style based on type
  const isCurrentBase = !isVariation;
  
  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center">
          {isEditingTrigger ? (
            <div className="flex items-center gap-1">
              <Input
                ref={triggerInputRef}
                value={triggerEditName}
                onChange={(e) => setTriggerEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTriggerEdit();
                  if (e.key === 'Escape') handleCancelTriggerEdit();
                }}
                onBlur={handleSaveTriggerEdit}
                className="h-7 w-48 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleSaveTriggerEdit}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={handleCancelTriggerEdit}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`gap-2 ${isCurrentBase 
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20' 
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'}`}
                >
                  {isCurrentBase ? (
                    <FileText className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span className="max-w-[150px] truncate">{activeResume.name}</span>
                  {!isCurrentBase && activeResume.domain && (
                    <Badge variant="outline" className="h-4 text-[9px] px-1 border-emerald-500/50">
                      {activeResume.domain}
                    </Badge>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleStartTriggerEdit}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rename</TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
        
        <DropdownMenuContent align="start" className="w-72">
          {/* Base Resume */}
          {baseResume && (
            <>
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Base Resume
              </div>
              <div
                className={`mx-1 rounded-md ${baseResumeId === resumeId ? 'bg-blue-500/10' : 'hover:bg-accent'}`}
              >
                {editingId === baseResumeId ? (
                  <div className="flex items-center gap-1 p-2" onClick={(e) => e.stopPropagation()}>
                    <Input
                      ref={inputRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(baseResumeId!);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      className="h-7 flex-1 text-sm"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={(e) => handleSaveEdit(baseResumeId!, e)}
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      onClick={handleCancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer p-2"
                    onClick={() => handleNavigate(baseResumeId!)}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      <span className="truncate">{baseResume.name}</span>
                      {baseResumeId === resumeId && (
                        <Badge variant="secondary" className="text-[9px] h-4 shrink-0">Current</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                      onClick={(e) => handleStartEdit(baseResumeId!, baseResume.name, e)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </DropdownMenuItem>
                )}
              </div>
            </>
          )}
          
          {/* Versions */}
          {variations.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Versions</span>
                <Badge variant="secondary" className="text-[9px] h-4">{variations.length}</Badge>
              </div>
              {variations.map((variation) => {
                const isCurrent = variation.id === resumeId;
                return (
                  <div
                    key={variation.id}
                    className={`mx-1 rounded-md ${isCurrent ? 'bg-emerald-500/10' : 'hover:bg-accent'}`}
                  >
                    {editingId === variation.id ? (
                      <div className="flex items-center gap-1 p-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          ref={inputRef}
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(variation.id);
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="h-7 flex-1 text-sm"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={(e) => handleSaveEdit(variation.id, e)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={handleCancelEdit}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <DropdownMenuItem
                        className="flex items-center justify-between cursor-pointer p-2 group"
                        onClick={() => handleNavigate(variation.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Copy className="h-4 w-4 text-emerald-500 shrink-0" />
                            <span className="truncate">{variation.name}</span>
                            {isCurrent && (
                              <Badge variant="secondary" className="text-[9px] h-4 shrink-0">Current</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 ml-6 mt-0.5">
                            <Badge variant="outline" className="text-[9px] h-4 px-1">
                              {variation.domain}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(variation.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={(e) => handleStartEdit(variation.id, variation.name, e)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive hover:text-destructive"
                            onClick={(e) => handleDeleteVersion(variation.id, e)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </DropdownMenuItem>
                    )}
                  </div>
                );
              })}
            </>
          )}
          
          <DropdownMenuSeparator />
          
          {/* Create New Version */}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              setIsOpen(false);
              setCreateDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Version
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Create Version Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a targeted version of your resume for a specific job or industry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Version Name</Label>
              <Input 
                value={newVersionName} 
                onChange={(e) => setNewVersionName(e.target.value)} 
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
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateVersion} 
              disabled={!newVersionName || (!targetRole || (targetRole === 'custom' && !customRole))}
            >
              Create Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
