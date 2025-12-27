'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ImportResume } from '@/components/import/import-resume';
import { ThemeToggle } from '@/components/theme-toggle';
import { ResumeThumbnail } from '@/components/resume/resume-thumbnail';
import { ProtectedRoute, UserMenu } from '@/components/auth';
import { 
  FileText, 
  Plus, 
  Search,
  MoreHorizontal,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  GitBranch,
  Clock,
  Download,
  Upload,
  Loader2,
  Sparkles,
  X,
  ExternalLink,
  Zap,
  FolderOpen,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import { Resume, TEMPLATE_CONFIGS, TemplateType } from '@/types/resume';
import { cn } from '@/lib/utils';

type FilterState = {
  search: string;
  template: string | null;
  showArchived: boolean;
};

export default function Dashboard() {
  const router = useRouter();
  const { 
    resumes, 
    createResume, 
    deleteResume, 
    archiveResume,
    restoreResume,
    duplicateResume,
    _hasHydrated 
  } = useResumeStore();

  // State
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    template: null,
    showArchived: false,
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [loadingResumes, setLoadingResumes] = useState<Set<string>>(new Set());
  const [showImport, setShowImport] = useState(false);
  const [forceHydrated, setForceHydrated] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  // Check localStorage for welcome card dismissal
  useEffect(() => {
    const dismissed = localStorage.getItem('betta-welcome-dismissed');
    if (dismissed === 'true') {
      setShowWelcome(false);
    }
  }, []);

  const dismissWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('betta-welcome-dismissed', 'true');
  };

  // Force hydration after timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!_hasHydrated) setForceHydrated(true);
    }, 2000);
    return () => clearTimeout(timer);
  }, [_hasHydrated]);



  // Filter and sort resumes
  const { baseResumes, recentResumes, stats } = useMemo(() => {
    const bases = resumes.filter(r => !r.baseResumeId);
    const activeCount = bases.filter(r => !r.isArchived).length;
    const archivedCount = bases.filter(r => r.isArchived).length;
    const variationsCount = resumes.filter(r => r.baseResumeId).length;

    // Apply filters
    let filtered = bases;
    
    if (!filters.showArchived) {
      filtered = filtered.filter(r => !r.isArchived);
    } else {
      filtered = filtered.filter(r => r.isArchived);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.metadata?.personalInfo?.fullName?.toLowerCase().includes(query) ||
        r.metadata?.personalInfo?.professionalTitle?.toLowerCase().includes(query) ||
        r.name?.toLowerCase().includes(query) ||
        r.domain?.toLowerCase().includes(query)
      );
    }

    if (filters.template) {
      filtered = filtered.filter(r => r.template === filters.template);
    }

    // Sort by updated date
    const sorted = [...filtered].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Get recent (last 3 updated in past week)
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = sorted
      .filter(r => new Date(r.updatedAt).getTime() > oneWeekAgo)
      .slice(0, 3);

    return {
      baseResumes: sorted,
      recentResumes: recent,
      stats: { total: activeCount, archived: archivedCount, variations: variationsCount }
    };
  }, [resumes, filters]);

  // Get variations for a resume
  const getVariations = useCallback((resumeId: string) => {
    return resumes.filter(r => r.baseResumeId === resumeId);
  }, [resumes]);

  // Handlers
  const handleCreateResume = () => {
    const newId = createResume('New Resume', 'minimal');
    setLoadingResumes(prev => new Set(prev).add(newId));
    router.push(`/editor/${newId}`);
  };

  const handleOpenResume = (id: string) => {
    setLoadingResumes(prev => new Set(prev).add(id));
    router.push(`/editor/${id}`);
  };

  const handleDuplicate = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    const newId = duplicateResume(id, `${resume?.name || 'Resume'} (Copy)`);
    if (newId) {
      setLoadingResumes(prev => new Set(prev).add(newId));
      router.push(`/editor/${newId}`);
    }
  };

  const handleArchive = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    if (resume?.isArchived) {
      restoreResume(id);
    } else {
      archiveResume(id);
    }
  };

  const confirmDelete = (id: string) => {
    setDeleteTargetId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (deleteTargetId) {
      deleteResume(deleteTargetId);
      setDeleteTargetId(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleExportAll = () => {
    const data = JSON.stringify(resumes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-resumes-${format(new Date(), 'yyyy-MM-dd')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAll = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const imported = JSON.parse(text);
        if (Array.isArray(imported)) {
          const store = useResumeStore.getState();
          imported.forEach(resume => {
            if (!store.resumes.find(r => r.id === resume.id)) {
              store.resumes.push(resume);
            }
          });
          useResumeStore.setState({ resumes: [...store.resumes] });
        }
      }
    };
    input.click();
  };

  const clearFilter = (key: keyof FilterState) => {
    setFilters(prev => ({ ...prev, [key]: key === 'showArchived' ? false : key === 'search' ? '' : null }));
  };

  const hasActiveFilters = filters.search || filters.template || filters.showArchived;

  // Loading state
  if (!_hasHydrated && !forceHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Resume Card Component
  const ResumeCard = ({ resume, compact = false }: { resume: Resume; compact?: boolean }) => {
    const variations = getVariations(resume.id);
    const isLoading = loadingResumes.has(resume.id);
    const templateConfig = TEMPLATE_CONFIGS[resume.template as TemplateType];

    return (
      <Card 
        className={cn(
          "group relative overflow-hidden transition-all duration-300",
          "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1",
          "border-border/50 hover:border-primary/20",
          compact ? "p-3" : "p-4"
        )}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        )}

        <div className="flex gap-4">
          {/* Thumbnail */}
          <div 
            className={cn(
              "shrink-0 cursor-pointer rounded-lg overflow-hidden bg-muted/50",
              "ring-1 ring-border/50 transition-all group-hover:ring-primary/20",
              compact ? "w-16 h-20" : "w-24 h-32"
            )}
            onClick={() => handleOpenResume(resume.id)}
          >
            <ResumeThumbnail resume={resume} className="w-full h-full" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <div 
                className="min-w-0 cursor-pointer"
                onClick={() => handleOpenResume(resume.id)}
              >
                <h3 className="font-medium truncate group-hover:text-primary transition-colors">
                  {resume.metadata?.personalInfo?.fullName || resume.name || 'Untitled Resume'}
                </h3>
                {resume.metadata?.personalInfo?.professionalTitle && (
                  <p className="text-sm text-muted-foreground truncate">
                    {resume.metadata.personalInfo.professionalTitle}
                  </p>
                )}
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleOpenResume(resume.id)}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDuplicate(resume.id)}>
                    <Copy className="h-4 w-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleArchive(resume.id)}>
                    {resume.isArchived ? (
                      <>
                        <ArchiveRestore className="h-4 w-4 mr-2" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => confirmDelete(resume.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Meta */}
            <div className="mt-auto pt-2 flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs font-normal">
                {templateConfig?.name || resume.template}
              </Badge>
              
              {variations.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  <GitBranch className="h-3 w-3 mr-1" />
                  {variations.length} version{variations.length !== 1 ? 's' : ''}
                </Badge>
              )}

              <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
              </span>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  // Empty State Component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
        {hasActiveFilters ? (
          <Search className="h-10 w-10 text-primary/60" />
        ) : (
          <FileText className="h-10 w-10 text-primary/60" />
        )}
      </div>
      <h2 className="text-xl font-semibold mb-2">
        {hasActiveFilters ? 'No matches found' : 'No resumes yet'}
      </h2>
      <p className="text-muted-foreground text-center max-w-sm mb-6">
        {hasActiveFilters 
          ? 'Try adjusting your filters or search query'
          : 'Create your first resume and start building your professional profile'
        }
      </p>
      {hasActiveFilters ? (
        <Button 
          variant="outline" 
          onClick={() => setFilters({ search: '', template: null, showArchived: false })}
        >
          <X className="h-4 w-4 mr-2" />
          Clear filters
        </Button>
      ) : (
        <Button onClick={handleCreateResume} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Create your first resume
        </Button>
      )}
    </div>
  );

  return (
    <ProtectedRoute>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* Header */}
          <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
            <div className="max-w-5xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <span className="font-semibold text-lg">Betta Resume</span>
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleImportAll}>
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Import resumes</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={handleExportAll}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export all</TooltipContent>
                  </Tooltip>

                  <ThemeToggle />
                  
                  <div className="w-px h-6 bg-border mx-1" />
                  
                  <UserMenu />
                </div>
              </div>
            </div>
          </header>

          <main className="max-w-5xl mx-auto px-6 py-8">
            {/* Welcome Guide Card */}
            {showWelcome && (
              <Card className="mb-6 p-4 bg-gradient-to-r from-primary/5 via-primary/10 to-blue-500/5 border-primary/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h2 className="font-semibold text-lg">Welcome to Betta Resume</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Create professional, ATS-friendly resumes with powerful versioning for different job applications.
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-8 w-8 -mt-1 -mr-1"
                        onClick={dismissWelcome}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={() => router.push('/guide')}
                      >
                        <BookOpen className="h-4 w-4" />
                        Read the Guide
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          7 templates
                        </span>
                        <span className="flex items-center gap-1">
                          <GitBranch className="h-3 w-3" />
                          Version control
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" />
                          PDF export
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Stats Summary */}
            {stats.total > 0 && (
              <p className="text-sm text-muted-foreground mb-6">
                {stats.total} resume{stats.total !== 1 ? 's' : ''}{stats.variations > 0 ? ` · ${stats.variations} version${stats.variations !== 1 ? 's' : ''}` : ''}
              </p>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <Card 
                className="p-4 cursor-pointer group hover:shadow-md hover:border-primary/30 transition-all"
                onClick={handleCreateResume}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">New Resume</h3>
                    <p className="text-xs text-muted-foreground">Start from scratch</p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-4 cursor-pointer group hover:shadow-md hover:border-primary/30 transition-all"
                onClick={() => setShowImport(!showImport)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                    <FolderOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Import</h3>
                    <p className="text-xs text-muted-foreground">From JSON or PDF</p>
                  </div>
                </div>
              </Card>

              {stats.archived > 0 && (
                <Card 
                  className="p-4 cursor-pointer group hover:shadow-md hover:border-primary/30 transition-all"
                  onClick={() => setFilters(prev => ({ ...prev, showArchived: !prev.showArchived }))}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center group-hover:bg-orange-500/20 transition-colors">
                      <Archive className="h-5 w-5 text-orange-500" />
                    </div>
                    <div>
                      <h3 className="font-medium">Archived</h3>
                      <p className="text-xs text-muted-foreground">{stats.archived} resume{stats.archived !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                </Card>
              )}

              {stats.archived === 0 && (
                <Card className="p-4 group border-dashed">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-muted-foreground">Pro tip</h3>
                      <p className="text-xs text-muted-foreground">Create versions for different roles</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Import Section (collapsible) */}
            {showImport && (
              <div className="mb-8">
                <ImportResume />
              </div>
            )}

            {/* Search & Filters */}
            {(stats.total > 0 || hasActiveFilters) && (
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search resumes..."
                    value={filters.search}
                    onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                    className="pl-9 h-10"
                  />
                  {filters.search && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => clearFilter('search')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {/* Template filter chips */}
                <div className="flex items-center gap-2 flex-wrap">
                  {Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => (
                    <Badge
                      key={key}
                      variant={filters.template === key ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer transition-all",
                        filters.template === key 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-muted"
                      )}
                      onClick={() => setFilters(prev => ({ 
                        ...prev, 
                        template: prev.template === key ? null : key 
                      }))}
                    >
                      {config.name}
                    </Badge>
                  ))}
                </div>

                {/* Active filters indicator */}
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-muted-foreground"
                    onClick={() => setFilters({ search: '', template: null, showArchived: false })}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear all
                  </Button>
                )}
              </div>
            )}

            {/* Archived indicator */}
            {filters.showArchived && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-orange-500/10 rounded-lg">
                <Archive className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium">Viewing archived resumes</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="ml-auto h-7"
                  onClick={() => setFilters(prev => ({ ...prev, showArchived: false }))}
                >
                  Show active
                </Button>
              </div>
            )}

            {/* Recent Section */}
            {!filters.showArchived && !hasActiveFilters && recentResumes.length > 0 && baseResumes.length > 3 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-medium text-muted-foreground">Recently edited</h2>
                </div>
                <div className="grid gap-3">
                  {recentResumes.map(resume => (
                    <ResumeCard key={resume.id} resume={resume} compact />
                  ))}
                </div>
              </div>
            )}

            {/* All Resumes */}
            {baseResumes.length > 0 ? (
              <div>
                {!filters.showArchived && !hasActiveFilters && recentResumes.length > 0 && baseResumes.length > 3 && (
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h2 className="font-medium text-muted-foreground">All resumes</h2>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  {baseResumes.map(resume => (
                    <ResumeCard key={resume.id} resume={resume} />
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState />
            )}
          </main>

          {/* Floating Action Button (mobile) */}
          <Button
            size="lg"
            className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg sm:hidden"
            onClick={handleCreateResume}
          >
            <Plus className="h-6 w-6" />
          </Button>

          {/* Delete Dialog */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete resume?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the resume and all its versions. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </ProtectedRoute>
  );
}
