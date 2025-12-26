'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge,
  Clock,
  FileText,
  Undo2,
  ChevronRight,
  ChevronDown,
  Circle,
  Layers,
  CheckCircle2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Resume, ResumeVersion } from '@/types/resume';

interface VersionTreeProps {
  resumeId: string;
}

interface TreeNode {
  id: string;
  type: 'version' | 'variation' | 'current';
  label: string;
  description?: string;
  timestamp: string;
  version?: number;
  domain?: string;
  children: TreeNode[];
  data?: ResumeVersion | Resume;
  isActive?: boolean;
}

export function VersionTree({ resumeId }: VersionTreeProps) {
  const router = useRouter();
  const { activeResume, resumes, getVersions, getVariations, restoreVersion, setActiveResume } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root', 'versions', 'variations']));

  // Determine if we're viewing a variation, and get the base resume ID
  const isVariation = activeResume?.variationType === 'variation';
  const baseResumeId = isVariation ? activeResume?.baseResumeId || resumeId : resumeId;
  const baseResume = isVariation ? resumes.find(r => r.id === baseResumeId) : activeResume;

  // Always get versions and variations from the BASE resume
  const resumeVersions = useMemo(() => getVersions(baseResumeId), [baseResumeId, getVersions]);
  const variations = useMemo(() => getVariations(baseResumeId), [baseResumeId, getVariations]);

  // Build tree structure
  const treeData = useMemo((): TreeNode => {
    // Root is always the BASE resume
    const root: TreeNode = {
      id: 'root',
      type: 'current',
      label: baseResume?.name || 'Resume',
      description: `Base resume (v${baseResume?.version || 1})${isVariation ? ' - Click to edit' : ''}`,
      timestamp: baseResume?.updatedAt || new Date().toISOString(),
      version: baseResume?.version,
      children: [],
      data: baseResume as Resume,
    };

    // Add version history branch
    if (resumeVersions.length > 0) {
      const versionBranch: TreeNode = {
        id: 'versions',
        type: 'version',
        label: 'Version History',
        description: `${resumeVersions.length} saved version${resumeVersions.length !== 1 ? 's' : ''}`,
        timestamp: resumeVersions[0]?.createdAt || '',
        children: resumeVersions.map((v) => ({
          id: v.id,
          type: 'version' as const,
          label: `Version ${v.version}`,
          description: v.changeDescription || 'No description',
          timestamp: v.createdAt,
          version: v.version,
          children: [],
          data: v,
        })),
      };
      root.children.push(versionBranch);
    }

    // Add variations branch (including current if we're on a variation)
    const allVariations = variations;
    if (allVariations.length > 0) {
      const variationBranch: TreeNode = {
        id: 'variations',
        type: 'variation',
        label: 'Variations',
        description: `${allVariations.length} domain variation${allVariations.length !== 1 ? 's' : ''}`,
        timestamp: allVariations[0]?.createdAt || '',
        children: allVariations.map((v) => ({
          id: v.id,
          type: 'variation' as const,
          label: v.name,
          description: v.domain || 'Custom variation',
          timestamp: v.createdAt,
          domain: v.domain,
          children: [],
          data: v,
          // Mark if this is the currently active variation
          isActive: v.id === activeResume?.id,
        })),
      };
      root.children.push(variationBranch);
    }

    return root;
  }, [baseResume, isVariation, resumeVersions, variations, activeResume?.id]);

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const handleRestoreVersion = (versionId: string) => {
    if (!baseResumeId) return;
    restoreVersion(baseResumeId, versionId);
  };

  const handleSwitchToVariation = (variationId: string) => {
    setActiveResume(variationId);
    router.push(`/editor/${variationId}`);
    setOpen(false);
  };

  const handleGoToBase = () => {
    if (baseResumeId && baseResumeId !== resumeId) {
      setActiveResume(baseResumeId);
      router.push(`/editor/${baseResumeId}`);
      setOpen(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(parseISO(timestamp), 'MMM d, yyyy h:mm a');
    } catch {
      return timestamp;
    }
  };

  const getNodeIcon = (node: TreeNode) => {
    if (node.isActive) {
      return <CheckCircle2 className="h-3 w-3 fill-green-500 text-green-500" />;
    }
    if (node.type === 'current') {
      return <Circle className="h-3 w-3 fill-primary text-primary" />;
    }
    if (node.id === 'versions') {
      return <GitCommit className="h-3.5 w-3.5 text-blue-500" />;
    }
    if (node.id === 'variations') {
      return <GitBranch className="h-3.5 w-3.5 text-green-500" />;
    }
    if (node.type === 'version') {
      return <Clock className="h-3 w-3 text-blue-400" />;
    }
    if (node.type === 'variation') {
      return <FileText className="h-3 w-3 text-green-400" />;
    }
    return <Circle className="h-3 w-3" />;
  };

  const renderTreeNode = (node: TreeNode, depth: number = 0, isLast: boolean = true, parentLines: boolean[] = []) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isRoot = depth === 0;
    const isBranch = node.id === 'versions' || node.id === 'variations';
    const isCurrentlyActive = node.isActive || (isRoot && !isVariation);

    return (
      <div key={node.id} className="select-none">
        {/* Node row */}
        <div
          className={`flex items-start gap-1 py-1.5 px-2 rounded-md transition-colors ${
            !isBranch ? 'hover:bg-muted/50 cursor-pointer' : ''
          } ${isRoot ? 'mb-2 border bg-muted/30' : ''} ${isCurrentlyActive && !isRoot ? 'bg-primary/10 border border-primary/30' : ''}`}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(node.id);
            } else if (isRoot && isVariation) {
              handleGoToBase();
            }
          }}
        >
          {/* Tree lines */}
          <div className="flex items-center h-6 flex-shrink-0">
            {/* Indent based on depth */}
            {parentLines.map((showLine, i) => (
              <div key={i} className="w-4 h-6 flex justify-center">
                {showLine && <div className="w-px h-full bg-border" />}
              </div>
            ))}
            
            {/* Branch connector */}
            {depth > 0 && (
              <div className="w-4 h-6 flex items-center">
                <div className={`w-4 h-px bg-border ${!isLast ? '' : ''}`} />
                {!isLast && <div className="absolute w-px h-3 bg-border translate-y-3" />}
              </div>
            )}

            {/* Expand/collapse indicator */}
            {hasChildren ? (
              <button
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpand(node.id);
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-4 h-4 flex items-center justify-center">
                {getNodeIcon(node)}
              </div>
            )}
          </div>

          {/* Node content */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            {hasChildren && (
              <span className="flex-shrink-0">{getNodeIcon(node)}</span>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${isRoot ? 'text-base' : ''}`}>
                  {node.label}
                </span>
                {node.domain && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 flex-shrink-0">
                    {node.domain}
                  </Badge>
                )}
                {node.version && !isBranch && !isRoot && (
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 flex-shrink-0">
                    v{node.version}
                  </Badge>
                )}
              </div>
              {node.description && (
                <p className="text-xs text-muted-foreground truncate">{node.description}</p>
              )}
            </div>

            {/* Actions */}
            {!isRoot && !isBranch && (
              <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {node.type === 'version' && node.data && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestoreVersion(node.id);
                        }}
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Restore this version</TooltipContent>
                  </Tooltip>
                )}
                {node.type === 'variation' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSwitchToVariation(node.id);
                        }}
                      >
                        <GitMerge className="h-3 w-3" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Switch to this variation</TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}

            {/* Timestamp */}
            {node.timestamp && !isRoot && !isBranch && (
              <span className="text-[10px] text-muted-foreground flex-shrink-0 hidden sm:block">
                {formatTimestamp(node.timestamp)}
              </span>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="relative">
            {/* Vertical line connecting children */}
            <div 
              className="absolute left-[18px] top-0 bottom-2 w-px bg-border"
              style={{ marginLeft: `${depth * 16}px` }}
            />
            {node.children.map((child, index) => (
              <div key={child.id} className="group">
                {renderTreeNode(
                  child,
                  depth + 1,
                  index === node.children.length - 1,
                  [...parentLines, !isLast]
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const totalItems = resumeVersions.length + variations.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
          {totalItems > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
              {totalItems}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version & Variation Tree
          </DialogTitle>
          <DialogDescription>
            View and manage your resume&apos;s version history and variations
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {totalItems === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">No versions or variations yet</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Save versions to track changes over time, or create variations for different job domains.
              </p>
            </div>
          ) : (
            <div className="py-2">
              {renderTreeNode(treeData)}
            </div>
          )}
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Circle className="h-2.5 w-2.5 fill-primary text-primary" />
            <span>Current</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitCommit className="h-3 w-3 text-blue-500" />
            <span>Versions</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GitBranch className="h-3 w-3 text-green-500" />
            <span>Variations</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
