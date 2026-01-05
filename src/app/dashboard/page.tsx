'use client';

/**
 * Dashboard Page
 * 
 * Main page showing all resumes with filtering, search, and CRUD actions.
 */

import { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Search, 
  FileText, 
  Archive, 
  Upload,
  X,
  Info
} from 'lucide-react';
import { useResumeStore, useAuthStore } from '@/store';
import { ProtectedRoute } from '@/components/protected-route';
import { ThemeToggle } from '@/components/dashboard/theme-toggle';
import { UserMenu } from '@/components/dashboard/user-menu';
import { ResumeCard } from '@/components/dashboard/resume-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TooltipProvider,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { TEMPLATE_CONFIGS, type TemplateType } from '@/types/resume';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <TooltipProvider>
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </TooltipProvider>
    </ProtectedRoute>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-6 w-20 hidden sm:block" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <Skeleton className="h-10 flex-1 sm:max-w-xs" />
            <Skeleton className="h-10 w-35" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ResumeCardSkeleton key={i} />
          ))}
        </div>
      </main>
    </div>
  );
}

function ResumeCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-8 rounded-md" />
      </div>
      <Skeleton className="aspect-[8.5/11] w-full rounded-md" />
      <div className="flex justify-between mt-4">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { 
    resumes, 
    createResume, 
    deleteResume, 
    duplicateResume, 
    archiveResume, 
    restoreResume,
    exportToJSON,
    importFromJSON,
    getVariations,
    _hasHydrated,
  } = useResumeStore();

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | 'all'>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [newResumeName, setNewResumeName] = useState('');
  const [newResumeTemplate, setNewResumeTemplate] = useState<TemplateType>('modern');
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(true);

  // Filtered resumes - must be before any conditional returns (Rules of Hooks)
  const filteredResumes = useMemo(() => {
    if (!_hasHydrated) return [];
    return resumes.filter(resume => {
      // Filter by archived status
      if (!showArchived && resume.isArchived) return false;
      if (showArchived && !resume.isArchived) return false;

      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const nameMatch = resume.name.toLowerCase().includes(query);
        const domainMatch = resume.domain?.toLowerCase().includes(query);
        const tagsMatch = resume.tags?.some(tag => tag.toLowerCase().includes(query));
        if (!nameMatch && !domainMatch && !tagsMatch) return false;
      }

      // Filter by template
      if (selectedTemplate !== 'all' && resume.template !== selectedTemplate) return false;

      return true;
    });
  }, [resumes, searchQuery, showArchived, selectedTemplate, _hasHydrated]);

  // Stats - also must be before conditional returns
  const totalResumes = useMemo(() => resumes.filter(r => !r.isArchived).length, [resumes]);
  const archivedResumes = useMemo(() => resumes.filter(r => r.isArchived).length, [resumes]);
  const variationCount = useMemo(() => resumes.filter(r => r.variationType === 'variation').length, [resumes]);

  // Show skeleton while hydrating
  if (!_hasHydrated) {
    return <DashboardSkeleton />;
  }

  // Handlers
  const handleCreateResume = () => {
    if (!newResumeName.trim()) return;
    const id = createResume(newResumeName.trim(), newResumeTemplate);
    setIsCreateDialogOpen(false);
    setNewResumeName('');
    router.push(`/editor/${id}`);
  };

  const handleDeleteResume = () => {
    if (resumeToDelete) {
      deleteResume(resumeToDelete);
      setResumeToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleDuplicateResume = (id: string, name: string) => {
    const newId = duplicateResume(id, `${name} (copy)`);
    if (newId) {
      router.push(`/editor/${newId}`);
    }
  };

  const handleExportResume = (id: string, name: string) => {
    const json = exportToJSON(id);
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.toLowerCase().replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleImportResume = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const id = importFromJSON(text);
        if (id) {
          router.push(`/editor/${id}`);
        }
      }
    };
    input.click();
  };

  // Loading state
  if (!_hasHydrated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xl font-bold">
              Betta Resume
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleImportResume}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Resume
            </Button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Guide */}
        {showWelcomeGuide && totalResumes === 0 && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-4"
                onClick={() => setShowWelcomeGuide(false)}
              >
                <X className="h-4 w-4" />
              </Button>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                Welcome to Betta Resume!
              </CardTitle>
              <CardDescription>
                Get started by creating your first resume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="mb-2 font-medium">1. Create a Resume</h4>
                  <p className="text-sm text-muted-foreground">
                    Click &quot;New Resume&quot; to start building your professional resume.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="mb-2 font-medium">2. Customize Sections</h4>
                  <p className="text-sm text-muted-foreground">
                    Add your experience, education, skills, and more.
                  </p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <h4 className="mb-2 font-medium">3. Export & Share</h4>
                  <p className="text-sm text-muted-foreground">
                    Download your resume as PDF or share it online.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Resume
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-4">
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search resumes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showArchived ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
            >
              <Archive className="mr-2 h-4 w-4" />
              {showArchived ? 'Showing Archived' : 'Show Archived'}
            </Button>
          </div>
        </div>

        {/* Resume Grid */}
        {filteredResumes.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredResumes.map((resume) => (
              <ResumeCard
                key={resume.id}
                resume={resume}
                variations={getVariations(resume.id)}
                onEdit={() => router.push(`/editor/${resume.id}`)}
                onDuplicate={() => handleDuplicateResume(resume.id, resume.name)}
                onExport={() => handleExportResume(resume.id, resume.name)}
                onArchive={() => archiveResume(resume.id)}
                onRestore={() => restoreResume(resume.id)}
                onDelete={() => {
                  setResumeToDelete(resume.id);
                  setIsDeleteDialogOpen(true);
                }}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            showArchived={showArchived}
            searchQuery={searchQuery}
            onCreateNew={() => setIsCreateDialogOpen(true)}
          />
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Resume</DialogTitle>
            <DialogDescription>
              Give your resume a name and choose a template to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Resume Name</Label>
              <Input
                id="name"
                placeholder="e.g., Software Engineer Resume"
                value={newResumeName}
                onChange={(e) => setNewResumeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleCreateResume();
                  }
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="template">Template</Label>
              <Select
                value={newResumeTemplate}
                onValueChange={(value) => setNewResumeTemplate(value as TemplateType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {TEMPLATE_CONFIGS[newResumeTemplate] && (
                <p className="text-xs text-muted-foreground">
                  {TEMPLATE_CONFIGS[newResumeTemplate].description}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateResume} disabled={!newResumeName.trim()}>
              Create Resume
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteResume}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  showArchived: boolean;
  searchQuery: string;
  onCreateNew: () => void;
}

function EmptyState({ showArchived, searchQuery, onCreateNew }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <FileText className="mb-4 h-16 w-16 text-muted-foreground/50" />
      <h3 className="mb-2 text-lg font-semibold">
        {searchQuery
          ? 'No resumes found'
          : showArchived
          ? 'No archived resumes'
          : 'No resumes yet'}
      </h3>
      <p className="mb-6 text-sm text-muted-foreground max-w-sm">
        {searchQuery
          ? `No resumes match "${searchQuery}". Try a different search term.`
          : showArchived
          ? 'You haven\'t archived any resumes yet.'
          : 'Create your first resume to get started building your professional profile.'}
      </p>
      {!showArchived && !searchQuery && (
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Your First Resume
        </Button>
      )}
    </div>
  );
}
