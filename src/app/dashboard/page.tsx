'use client';

import { useState, useMemo, useTransition } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ImportResume } from '@/components/import/import-resume';
import { ThemeToggle } from '@/components/theme-toggle';
import { ResumeThumbnail } from '@/components/resume/resume-thumbnail';
import { 
  FileText, 
  Plus, 
  Search,
  MoreVertical,
  Copy,
  Archive,
  ArchiveRestore,
  Trash2,
  GitBranch,
  LayoutGrid,
  List,
  Clock,
  Download,
  Upload,
  ChevronRight,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { Resume, TEMPLATE_CONFIGS, TemplateType } from '@/types/resume';

type ViewMode = 'grid' | 'list';
type SortOption = 'updated' | 'created' | 'name';
type FilterTab = 'all' | 'archived';

export default function Dashboard() {
  const router = useRouter();
  const { 
    resumes, 
    createResume, 
    setActiveResume, 
    deleteResume,
    duplicateResume,
    archiveResume,
    restoreResume,
    exportAllToJSON,
    importAllFromJSON
  } = useResumeStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('updated');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [expandedResumes, setExpandedResumes] = useState<Set<string>>(new Set());
  const [loadingResumeId, setLoadingResumeId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Get base resumes (not variations)
  const baseResumes = useMemo(() => 
    resumes.filter(r => r.variationType !== 'variation'), 
    [resumes]
  );

  // Get variations grouped by base resume
  const variationsByBase = useMemo(() => {
    const map = new Map<string, Resume[]>();
    resumes.filter(r => r.variationType === 'variation').forEach(r => {
      const baseId = r.baseResumeId || '';
      if (!map.has(baseId)) map.set(baseId, []);
      map.get(baseId)!.push(r);
    });
    return map;
  }, [resumes]);

  // Stats
  const stats = useMemo(() => ({
    total: baseResumes.filter(r => !r.isArchived).length,
    variations: resumes.filter(r => r.variationType === 'variation').length,
    archived: baseResumes.filter(r => r.isArchived).length
  }), [baseResumes, resumes]);

  // Filter and sort base resumes only
  const filteredResumes = useMemo(() => {
    let result = [...baseResumes];

    // Filter by tab
    if (filterTab === 'archived') {
      result = result.filter(r => r.isArchived);
    } else {
      result = result.filter(r => !r.isArchived);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(r => 
        r.name.toLowerCase().includes(query) ||
        r.domain?.toLowerCase().includes(query) ||
        r.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Template filter
    if (selectedTemplate !== 'all') {
      result = result.filter(r => r.template === selectedTemplate);
    }

    // Sort
    switch (sortBy) {
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'created':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'updated':
      default:
        result.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    return result;
  }, [baseResumes, filterTab, searchQuery, selectedTemplate, sortBy]);

  const toggleExpanded = (id: string) => {
    const newSet = new Set(expandedResumes);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedResumes(newSet);
  };

  const handleCreateResume = () => {
    const id = createResume('New Resume', 'minimal');
    setActiveResume(id);
    router.push(`/editor/${id}`);
  };

  const handleOpenResume = (id: string) => {
    setLoadingResumeId(id);
    setActiveResume(id);
    startTransition(() => {
      router.push(`/editor/${id}`);
    });
  };

  const handleDuplicate = (id: string) => {
    const resume = resumes.find(r => r.id === id);
    const newName = resume ? `${resume.name} (Copy)` : 'Resume Copy';
    const newId = duplicateResume(id, newName);
    if (newId) {
      setActiveResume(newId);
      router.push(`/editor/${newId}`);
    }
  };

  const handleArchive = (id: string) => {
    archiveResume(id);
  };

  const handleRestore = (id: string) => {
    restoreResume(id);
  };

  const confirmDelete = (id: string) => {
    setResumeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (resumeToDelete) {
      deleteResume(resumeToDelete);
      setResumeToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleExportAll = () => {
    const data = exportAllToJSON();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-resumes-${new Date().toISOString().split('T')[0]}.json`;
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
        importAllFromJSON(text);
      }
    };
    input.click();
  };

  // Resume Card with nested variations and thumbnail preview
  const ResumeCard = ({ resume }: { resume: Resume }) => {
    const templateConfig = TEMPLATE_CONFIGS[resume.template as TemplateType];
    const variations = variationsByBase.get(resume.id) || [];
    const hasVariations = variations.length > 0;
    const isExpanded = expandedResumes.has(resume.id);
    const isLoading = loadingResumeId === resume.id && isPending;
    
    return (
      <div className="space-y-1">
        <Card
          className={`group hover:shadow-lg transition-all cursor-pointer relative overflow-hidden ${
            resume.isArchived ? 'opacity-60' : ''
          } ${isLoading ? 'pointer-events-none' : ''}`}
          onClick={() => handleOpenResume(resume.id)}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}
          
          {/* Thumbnail Preview */}
          <div className="relative h-48 bg-white overflow-hidden border-b">
            <ResumeThumbnail resume={resume} className="h-full" />
            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background/80 to-transparent" />
            
            {/* Template badge on thumbnail */}
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 text-xs capitalize opacity-90"
            >
              {resume.template}
            </Badge>
            
            {/* Variations indicator */}
            {hasVariations && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleExpanded(resume.id); }}
                className="absolute top-2 left-2 flex items-center gap-1 bg-background/90 hover:bg-background px-2 py-1 rounded-md text-xs"
              >
                {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                <GitBranch className="w-3 h-3" />
                <span>{variations.length}</span>
              </button>
            )}
          </div>
          
          {/* Card Content */}
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-1 h-5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: templateConfig?.defaultColors?.primary || '#3b82f6' }}
                  />
                  <span className="font-medium truncate text-sm">{resume.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 ml-3">
                  <span>v{resume.version}</span>
                  <span>·</span>
                  <span>{resume.sections.filter(s => s.visible).length} sections</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0 -mt-1">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenResume(resume.id); }}>
                    <FileText className="w-4 h-4 mr-2" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(resume.id); }}>
                    <Copy className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {resume.isArchived ? (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRestore(resume.id); }}>
                      <ArchiveRestore className="w-4 h-4 mr-2" />
                      Restore
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(resume.id); }}>
                      <Archive className="w-4 h-4 mr-2" />
                      Archive
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={(e) => { e.stopPropagation(); confirmDelete(resume.id); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Nested variations */}
        {hasVariations && isExpanded && (
          <div className="ml-6 space-y-1 border-l-2 border-muted pl-3">
            {variations.map(variation => {
              const isVariationLoading = loadingResumeId === variation.id && isPending;
              return (
              <Card
                key={variation.id}
                className={`group hover:shadow-sm transition-all cursor-pointer bg-muted/30 relative ${isVariationLoading ? 'pointer-events-none' : ''}`}
                onClick={() => handleOpenResume(variation.id)}
              >
                {isVariationLoading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-3">
                    <GitBranch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{variation.name}</span>
                        {variation.domain && (
                          <Badge variant="outline" className="text-xs">
                            {variation.domain}
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(variation.updatedAt), { addSuffix: true })}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenResume(variation.id); }}>
                          <FileText className="w-4 h-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(variation.id); }}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); confirmDelete(variation.id); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            )})}
          </div>
        )}
      </div>
    );
  };

  // List view item
  const ResumeListItem = ({ resume }: { resume: Resume }) => {
    const templateConfig = TEMPLATE_CONFIGS[resume.template as TemplateType];
    const variations = variationsByBase.get(resume.id) || [];
    const hasVariations = variations.length > 0;
    const isExpanded = expandedResumes.has(resume.id);
    const isLoading = loadingResumeId === resume.id && isPending;
    
    return (
      <div className="space-y-0.5">
        <div
          className={`group flex items-center gap-3 p-2.5 border rounded-lg hover:shadow-sm transition-all cursor-pointer relative ${
            resume.isArchived ? 'opacity-60' : ''
          } ${isLoading ? 'pointer-events-none' : ''}`}
          onClick={() => handleOpenResume(resume.id)}
        >
          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
          {hasVariations && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpanded(resume.id); }}
              className="p-0.5 hover:bg-muted rounded"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <div 
            className="w-1 h-8 rounded-full" 
            style={{ backgroundColor: templateConfig?.defaultColors?.primary || '#3b82f6' }}
          />
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate">{resume.name}</span>
              {hasVariations && (
                <Badge variant="secondary" className="text-xs">
                  <GitBranch className="w-3 h-3 mr-1" />
                  {variations.length}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="capitalize">{resume.template}</span>
            <span>v{resume.version}</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(resume.updatedAt), { addSuffix: true })}
            </span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenResume(resume.id); }}>
                <FileText className="w-4 h-4 mr-2" />Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(resume.id); }}>
                <Copy className="w-4 h-4 mr-2" />Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {resume.isArchived ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRestore(resume.id); }}>
                  <ArchiveRestore className="w-4 h-4 mr-2" />Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchive(resume.id); }}>
                  <Archive className="w-4 h-4 mr-2" />Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); confirmDelete(resume.id); }}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nested variations in list view */}
        {hasVariations && isExpanded && (
          <div className="ml-8 space-y-0.5 border-l-2 border-muted pl-3">
            {variations.map(variation => {
              const isVariationLoading = loadingResumeId === variation.id && isPending;
              return (
              <div
                key={variation.id}
                className={`group flex items-center gap-3 p-2 border rounded-lg hover:shadow-sm transition-all cursor-pointer bg-muted/30 relative ${isVariationLoading ? 'pointer-events-none' : ''}`}
                onClick={() => handleOpenResume(variation.id)}
              >
                {isVariationLoading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg z-10">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                )}
                <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-sm font-medium truncate flex-1">{variation.name}</span>
                {variation.domain && (
                  <Badge variant="outline" className="text-xs">{variation.domain}</Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(variation.updatedAt), { addSuffix: true })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 h-7 w-7 p-0">
                      <MoreVertical className="w-3.5 h-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleOpenResume(variation.id); }}>
                      <FileText className="w-4 h-4 mr-2" />Open
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDuplicate(variation.id); }}>
                      <Copy className="w-4 h-4 mr-2" />Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); confirmDelete(variation.id); }}>
                      <Trash2 className="w-4 h-4 mr-2" />Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )})}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Betta Resume</h1>
              <span className="text-sm text-muted-foreground">
                {stats.total} resume{stats.total !== 1 ? 's' : ''}
                {stats.variations > 0 && ` · ${stats.variations} variation${stats.variations !== 1 ? 's' : ''}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleImportAll}>
                <Upload className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleExportAll}>
                <Download className="w-4 h-4" />
              </Button>
              <ThemeToggle />
              <Button size="sm" onClick={handleCreateResume}>
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Filters Row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          
          <Tabs value={filterTab} onValueChange={(v) => setFilterTab(v as FilterTab)}>
            <TabsList className="h-9">
              <TabsTrigger value="all" className="text-xs">Active</TabsTrigger>
              <TabsTrigger value="archived" className="text-xs">Archived ({stats.archived})</TabsTrigger>
            </TabsList>
          </Tabs>

          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Template" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Object.entries(TEMPLATE_CONFIGS).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="updated">Updated</SelectItem>
              <SelectItem value="created">Created</SelectItem>
              <SelectItem value="name">Name</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 rounded-r-none"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              className="h-9 rounded-l-none"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Import Section */}
        <div className="mb-4">
          <ImportResume />
        </div>

        {/* Resume List */}
        {filteredResumes.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-muted-foreground" />
              <div>
                <h2 className="text-lg font-medium mb-1">
                  {searchQuery || selectedTemplate !== 'all'
                    ? 'No matching resumes'
                    : filterTab === 'archived'
                    ? 'No archived resumes'
                    : 'No resumes yet'}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery || selectedTemplate !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Get started by creating your first resume'}
                </p>
                {!searchQuery && selectedTemplate === 'all' && filterTab !== 'archived' && (
                  <Button size="sm" onClick={handleCreateResume}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create Resume
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredResumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredResumes.map((resume) => (
              <ResumeListItem key={resume.id} resume={resume} />
            ))}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
