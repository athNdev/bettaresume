'use client';

import { useState } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, RotateCcw, Trash2, Plus, Clock, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface VersionManagerProps {
  resumeId: string;
}

export function VersionManager({ resumeId }: VersionManagerProps) {
  const { createVersion, getVersions, restoreVersion, deleteVersion, activeResume } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const versions = getVersions(resumeId);

  const handleCreateVersion = () => {
    createVersion(resumeId, description || undefined);
    setDescription('');
  };

  const handleRestore = (versionId: string) => {
    restoreVersion(resumeId, versionId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">Versions</span>
          {versions.length > 0 && <Badge variant="secondary" className="ml-1">{versions.length}</Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            Create snapshots of your resume and restore previous versions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input 
              placeholder="Version description (optional)" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateVersion()}
            />
            <Button onClick={handleCreateVersion}>
              <Plus className="h-4 w-4 mr-2" />
              Save Version
            </Button>
          </div>

          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Current Version</span>
                <Badge>v{activeResume?.version}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Last saved {formatDistanceToNow(new Date(activeResume?.updatedAt || ''), { addSuffix: true })}
              </p>
            </div>

            <ScrollArea className="h-[300px]">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No saved versions yet</p>
                  <p className="text-xs mt-1">Save a version to track your changes over time</p>
                </div>
              ) : (
                <div className="divide-y">
                  {versions.map((version) => (
                    <div key={version.id} className="p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Version {version.version}</span>
                            {version.autoSaved && <Badge variant="outline" className="text-xs">Auto-saved</Badge>}
                          </div>
                          {version.changeDescription && (
                            <p className="text-sm text-muted-foreground mt-1">{version.changeDescription}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleRestore(version.id)}>
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete version?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete version {version.version}. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteVersion(version.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
