'use client';

import { useState } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileStack, 
  Plus, 
  Pencil, 
  Trash2, 
  MoreVertical,
  GripVertical,
  FileText,
  Check,
  X,
} from 'lucide-react';

interface PageManagerProps {
  resumeId: string;
  activePage?: string;
  onPageChange?: (pageId: string | undefined) => void;
  variant?: 'button' | 'panel';
}

export function PageManager({ resumeId, activePage, onPageChange, variant = 'button' }: PageManagerProps) {
  const { activeResume, addPage, deletePage, updatePage, reorderPages } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

  if (!activeResume) return null;

  const pages = activeResume.pages || [];
  const sectionsWithoutPage = activeResume.sections.filter(s => !s.pageId && s.visible);

  const handleAddPage = () => {
    if (newPageName.trim()) {
      const pageId = addPage(resumeId, newPageName.trim());
      setNewPageName('');
      onPageChange?.(pageId);
    }
  };

  const handleStartEdit = (pageId: string, currentName: string) => {
    setEditingPageId(pageId);
    setEditedName(currentName);
  };

  const handleSaveEdit = () => {
    if (editingPageId && editedName.trim()) {
      updatePage(resumeId, editingPageId, { name: editedName.trim() });
    }
    setEditingPageId(null);
    setEditedName('');
  };

  const handleCancelEdit = () => {
    setEditingPageId(null);
    setEditedName('');
  };

  const handleDeletePage = () => {
    if (pageToDelete) {
      deletePage(resumeId, pageToDelete);
      if (activePage === pageToDelete) {
        onPageChange?.(undefined);
      }
    }
    setDeleteDialogOpen(false);
    setPageToDelete(null);
  };

  const confirmDelete = (pageId: string) => {
    setPageToDelete(pageId);
    setDeleteDialogOpen(true);
  };

  // Panel variant - simple button that opens the dialog
  const triggerButton = variant === 'panel' ? (
    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
      <FileStack className="h-4 w-4" />
      <span>Pages</span>
      {pages.length > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] ml-auto">
          {pages.length + 1}
        </Badge>
      )}
    </Button>
  ) : (
    <Button variant="outline" size="sm" className="gap-2">
      <FileStack className="h-4 w-4" />
      <span className="hidden sm:inline">Pages</span>
      {pages.length > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {pages.length + 1}
        </Badge>
      )}
    </Button>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileStack className="h-5 w-5" />
              Manage Pages
            </DialogTitle>
            <DialogDescription>
              Organize your resume across multiple pages.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add new page */}
            <div className="flex gap-2">
              <Input
                placeholder="New page name..."
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
              />
              <Button onClick={handleAddPage} disabled={!newPageName.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>

            {/* Page list */}
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {/* Main page (always exists) */}
                <div
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-colors cursor-pointer ${
                    !activePage
                      ? 'bg-primary/10 border-primary/30'
                      : 'hover:bg-accent/50 border-border'
                  }`}
                  onClick={() => onPageChange?.(undefined)}
                >
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 font-medium">Page 1 (Main)</span>
                  <Badge variant="outline" className="text-[10px]">
                    {sectionsWithoutPage.length} sections
                  </Badge>
                </div>

                {/* Additional pages */}
                {pages.sort((a, b) => a.order - b.order).map((page, index) => {
                  const pageSections = activeResume.sections.filter(s => s.pageId === page.id && s.visible);
                  const isEditing = editingPageId === page.id;

                  return (
                    <div
                      key={page.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                        activePage === page.id
                          ? 'bg-primary/10 border-primary/30'
                          : 'hover:bg-accent/50 border-border'
                      }`}
                    >
                      <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                      
                      {isEditing ? (
                        <div className="flex-1 flex items-center gap-2">
                          <Input
                            value={editedName}
                            onChange={(e) => setEditedName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit();
                              if (e.key === 'Escape') handleCancelEdit();
                            }}
                            className="h-7 text-sm"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            className="flex-1 text-left font-medium"
                            onClick={() => onPageChange?.(page.id)}
                          >
                            Page {index + 2}: {page.name}
                          </button>
                          <Badge variant="outline" className="text-[10px]">
                            {pageSections.length} sections
                          </Badge>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleStartEdit(page.id, page.name)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => confirmDelete(page.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {pages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Your resume is currently single-page. Add pages to organize content across multiple pages.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page?</AlertDialogTitle>
            <AlertDialogDescription>
              Sections on this page will be moved back to the main page. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePage} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
