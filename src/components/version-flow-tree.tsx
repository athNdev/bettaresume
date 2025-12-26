'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  Position,
  Handle,
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  GitBranch, 
  Clock, 
  Undo2, 
  Trash2,
  Layers,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

interface VersionFlowTreeProps {
  resumeId: string;
}

// Custom node for the base/current resume (top of central vein)
function BaseNode({ data }: { data: { label: string; version: number; updatedAt: string; isActive: boolean; onClick?: () => void } }) {
  return (
    <div 
      className={`rounded-xl border shadow-lg w-[260px] cursor-pointer transition-all hover:shadow-xl hover:scale-[1.01] bg-card ${
        data.isActive 
          ? 'border-emerald-500 ring-1 ring-emerald-500/20' 
          : 'border-border hover:border-muted-foreground/50'
      }`}
      onClick={data.onClick}
    >
      {/* Source handle for versions going down - centered */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-muted-foreground !w-3 !h-3 !border-2 !border-card" style={{ left: '50%' }} />
      {/* Source handle for variations going right - vertically centered */}
      <Handle type="source" position={Position.Right} id="right" className="!bg-emerald-500 !w-3 !h-3 !border-2 !border-card" style={{ top: '50%' }} />
      
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          {data.isActive ? (
            <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          ) : (
            <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
              <Circle className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <span className="font-semibold text-sm text-foreground truncate">{data.label}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2 py-0.5 rounded">v{data.version}</span>
        <span className="text-[11px] text-muted-foreground">
          {formatDistanceToNow(parseISO(data.updatedAt), { addSuffix: true })}
        </span>
      </div>
      
      {data.isActive && (
        <div className="px-4 py-2 border-t border-border text-[11px] text-emerald-500 font-medium">
          ✓ Currently Editing
        </div>
      )}
    </div>
  );
}

// Custom node for version history (on central vein)
function VersionNode({ data }: { data: { version: number; description: string; createdAt: string; variationCount: number; isCurrent: boolean; onSwitchTo?: () => void; onDelete?: () => void } }) {
  return (
    <div className={`rounded-lg border w-[240px] shadow-lg transition-all hover:shadow-xl bg-card ${
      data.isCurrent 
        ? 'border-blue-500 ring-1 ring-blue-500/20' 
        : 'border-border hover:border-muted-foreground/50'
    }`}>
      {/* Target from above - centered */}
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2.5 !h-2.5 !border-2 !border-card" style={{ left: '50%' }} />
      {/* Source to below - centered */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-muted-foreground !w-2.5 !h-2.5 !border-2 !border-card" style={{ left: '50%' }} />
      {/* Source to right for variations - vertically centered */}
      <Handle type="source" position={Position.Right} id="right" className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-card" style={{ top: '50%' }} />
      
      {/* Header */}
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.isCurrent ? (
            <div className="w-5 h-5 rounded bg-blue-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-3 w-3 text-blue-500" />
            </div>
          ) : (
            <div className="w-5 h-5 rounded bg-secondary flex items-center justify-center">
              <Clock className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <span className="font-medium text-sm text-foreground">v{data.version}</span>
          {data.isCurrent && (
            <span className="text-[9px] font-medium text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">CURRENT</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">
          {format(parseISO(data.createdAt), 'MMM d')}
        </span>
      </div>
      
      {/* Content */}
      <div className="px-3 py-2">
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed" title={data.description}>
          {data.description || 'No description'}
        </p>
      </div>
      
      {/* Actions */}
      <div className="px-2 py-1.5 border-t border-border flex items-center justify-end gap-1">
        {data.onSwitchTo && (
          <button 
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-secondary-foreground bg-secondary hover:bg-muted rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              data.onSwitchTo?.();
            }}
          >
            <Undo2 className="h-3 w-3" />
            Switch
          </button>
        )}
        {data.onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button 
                className="inline-flex items-center justify-center w-6 h-6 text-muted-foreground hover:text-red-500 hover:bg-secondary rounded transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Version {data.version}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete version {data.version}.
                  {data.variationCount > 0 && (
                    <span className="block mt-2 font-semibold text-red-500">
                      ⚠️ This will also delete {data.variationCount} variation{data.variationCount > 1 ? 's' : ''} created from this version!
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-500 hover:bg-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    data.onDelete?.();
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

// Custom node for variations (branching off the vein)
function VariationNode({ data }: { data: { name: string; domain: string; updatedAt: string; isActive: boolean; onClick?: () => void } }) {
  return (
    <div 
      className={`rounded-lg border shadow-md w-[200px] cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] bg-card ${
        data.isActive 
          ? 'border-emerald-500 ring-1 ring-emerald-500/20' 
          : 'border-border hover:border-emerald-500/50'
      }`}
      onClick={data.onClick}
    >
      <Handle 
        type="target" 
        position={Position.Left} 
        className="!bg-emerald-500 !w-2.5 !h-2.5 !border-2 !border-card" 
        style={{ top: '50%' }}
      />
      
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          {data.isActive ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          ) : (
            <GitBranch className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          )}
          <span className="font-medium text-xs text-foreground truncate">{data.name}</span>
        </div>
      </div>
      
      {/* Content */}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded truncate">
          {data.domain}
        </span>
        <span className="text-[10px] text-muted-foreground flex-shrink-0">
          {formatDistanceToNow(parseISO(data.updatedAt), { addSuffix: true })}
        </span>
      </div>
      
      {data.isActive && (
        <div className="px-3 py-1.5 border-t border-border text-[10px] text-emerald-500 font-medium">
          ✓ Editing
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  base: BaseNode,
  version: VersionNode,
  variation: VariationNode,
};

export function VersionFlowTree({ resumeId }: VersionFlowTreeProps) {
  const router = useRouter();
  const { activeResume, resumes, getVersions, getVariations, switchToVersion, deleteVersionWithVariations, setActiveResume } = useResumeStore();
  const [open, setOpen] = useState(false);

  // Determine base resume
  const isVariation = activeResume?.variationType === 'variation';
  const baseResumeId = isVariation ? activeResume?.baseResumeId || resumeId : resumeId;
  const baseResume = resumes.find(r => r.id === baseResumeId);

  const resumeVersions = useMemo(() => getVersions(baseResumeId), [baseResumeId, getVersions]);
  const variations = useMemo(() => getVariations(baseResumeId), [baseResumeId, getVariations]);

  const handleGoToResume = useCallback((id: string) => {
    setActiveResume(id);
    router.push(`/editor/${id}`);
    setOpen(false);
  }, [router, setActiveResume]);

  const handleSwitchToVersion = useCallback((versionId: string) => {
    const restoredResumeId = switchToVersion(baseResumeId, versionId);
    if (restoredResumeId) {
      toast.success('Switched to version successfully');
      // If we're not already on that resume, navigate to it
      if (restoredResumeId !== resumeId) {
        router.push(`/editor/${restoredResumeId}`);
      }
      // Close the dialog - the resume content is already updated
      setOpen(false);
    } else {
      toast.error('Cannot switch to this version - no saved data available');
    }
  }, [baseResumeId, switchToVersion, router, resumeId]);

  const handleDeleteVersion = useCallback((versionId: string) => {
    deleteVersionWithVariations(versionId);
  }, [deleteVersionWithVariations]);

  // Helper to count variations for a version
  const getVariationCountForVersion = useCallback((versionNum: number) => {
    return variations.filter(v => v.createdFromVersion === versionNum).length;
  }, [variations]);

  // Build nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const CENTER_X = 100;
    const VERTICAL_SPACING = 140;
    const VARIATION_OFFSET_X = 360;
    const BASE_WIDTH = 260;
    const VERSION_WIDTH = 240;
    
    // Base resume node at top of central vein
    if (baseResume) {
      nodes.push({
        id: 'base',
        type: 'base',
        position: { x: CENTER_X, y: 40 },
        data: {
          label: baseResume.name,
          version: baseResume.version,
          updatedAt: baseResume.updatedAt,
          isActive: !isVariation,
          onClick: () => handleGoToResume(baseResume.id),
        },
      });
    }

    // Versions along the CENTRAL VEIN (vertical spine) - sorted by version descending (newest first)
    const sortedVersions = [...resumeVersions].sort((a, b) => b.version - a.version);
    
    sortedVersions.forEach((version, index) => {
      const nodeId = `version-${version.id}`;
      const yPos = 220 + index * VERTICAL_SPACING;
      
      // Check if this version is currently being viewed
      // Use currentVersionId to track which saved version we're viewing
      const isCurrent = !isVariation && activeResume?.currentVersionId === version.id;
      
      nodes.push({
        id: nodeId,
        type: 'version',
        // Center version nodes under base node (both have same center now)
        position: { x: CENTER_X + (BASE_WIDTH - VERSION_WIDTH) / 2, y: yPos },
        data: {
          version: version.version,
          description: version.changeDescription || 'No description',
          createdAt: version.createdAt,
          variationCount: getVariationCountForVersion(version.version),
          isCurrent,
          onSwitchTo: () => handleSwitchToVersion(version.id),
          onDelete: () => handleDeleteVersion(version.id),
        },
      });

      // Edge connecting versions along the central vein - use straight for vertical alignment
      if (index === 0) {
        edges.push({
          id: `edge-base-${nodeId}`,
          source: 'base',
          sourceHandle: 'bottom',
          target: nodeId,
          type: 'straight',
          style: { stroke: '#71717a', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a', width: 16, height: 16 },
        });
      } else {
        edges.push({
          id: `edge-version-${index}`,
          source: `version-${sortedVersions[index - 1].id}`,
          sourceHandle: 'bottom',
          target: nodeId,
          type: 'straight',
          style: { stroke: '#71717a', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a', width: 16, height: 16 },
        });
      }
    });

    // Variations branching OUT to the right from their source version
    // Group variations by their source version for cleaner layout
    const variationsByVersion = new Map<number, typeof variations>();
    variations.forEach(v => {
      const fromVersion = v.createdFromVersion || baseResume?.version || 1;
      if (!variationsByVersion.has(fromVersion)) {
        variationsByVersion.set(fromVersion, []);
      }
      variationsByVersion.get(fromVersion)!.push(v);
    });

    // COLLISION-PROOF LAYOUT ALGORITHM
    // Track all occupied Y ranges for variations to prevent overlaps
    const VARIATION_HEIGHT = 85; // Approximate height of variation card
    const VARIATION_MARGIN = 15; // Minimum gap between cards
    const occupiedRanges: { start: number; end: number }[] = [];
    
    // Helper function to check if a Y position collides with existing cards
    const findAvailableY = (idealY: number): number => {
      const cardStart = idealY;
      const cardEnd = idealY + VARIATION_HEIGHT;
      
      // Check for collisions and find next available spot
      let proposedY = idealY;
      let hasCollision = true;
      
      while (hasCollision) {
        hasCollision = false;
        const proposedStart = proposedY;
        const proposedEnd = proposedY + VARIATION_HEIGHT;
        
        for (const range of occupiedRanges) {
          // Check if there's any overlap
          if (!(proposedEnd + VARIATION_MARGIN < range.start || proposedStart > range.end + VARIATION_MARGIN)) {
            // Collision detected, move below this card
            proposedY = range.end + VARIATION_MARGIN;
            hasCollision = true;
            break;
          }
        }
      }
      
      return proposedY;
    };

    // Sort variations by their source version (highest first) for cleaner lines
    const sortedVariations = [...variations].sort((a, b) => {
      const aVersion = a.createdFromVersion || baseResume?.version || 1;
      const bVersion = b.createdFromVersion || baseResume?.version || 1;
      if (aVersion !== bVersion) return bVersion - aVersion; // Higher versions first
      return a.name.localeCompare(b.name); // Then alphabetically
    });

    sortedVariations.forEach((variation) => {
      const nodeId = `variation-${variation.id}`;
      
      // Find which version this variation was created from
      const createdFromVersion = variation.createdFromVersion || baseResume?.version || 1;
      
      // Find the source node (either a version node or base)
      let sourceNodeId = 'base';
      let sourceY = 40; // Base Y position
      
      // Find the matching version node in sorted versions
      const sourceVersionIndex = sortedVersions.findIndex(v => v.version === createdFromVersion);
      if (sourceVersionIndex !== -1) {
        sourceNodeId = `version-${sortedVersions[sourceVersionIndex].id}`;
        sourceY = 220 + sourceVersionIndex * VERTICAL_SPACING;
      }
      
      // Find the ideal Y (aligned with source) and then find available slot
      const idealY = sourceY;
      const actualY = findAvailableY(idealY);
      
      // Register this position as occupied
      occupiedRanges.push({ start: actualY, end: actualY + VARIATION_HEIGHT });
      // Keep ranges sorted for efficient collision detection
      occupiedRanges.sort((a, b) => a.start - b.start);
      
      nodes.push({
        id: nodeId,
        type: 'variation',
        position: { x: CENTER_X + VARIATION_OFFSET_X, y: actualY },
        data: {
          name: variation.name,
          domain: variation.domain || 'Custom',
          updatedAt: variation.updatedAt,
          isActive: variation.id === activeResume?.id,
          onClick: () => handleGoToResume(variation.id),
        },
      });

      // Edge from source version to variation - use smoothstep for clean routing
      edges.push({
        id: `edge-${sourceNodeId}-${nodeId}`,
        source: sourceNodeId,
        sourceHandle: 'right',
        target: nodeId,
        type: 'smoothstep',
        style: { stroke: '#10b981', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981', width: 16, height: 16 },
      });
    });

    return { nodes, edges };
  }, [baseResume, resumeVersions, variations, isVariation, activeResume?.id, activeResume?.currentVersionId, handleGoToResume, handleSwitchToVersion, handleDeleteVersion, getVariationCountForVersion]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes - must use useEffect for side effects
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const totalItems = resumeVersions.length + variations.length;
  const hasOnlyBaseNode = totalItems === 0 && baseResume;

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
      <DialogContent className="max-w-[95vw] w-[1200px] h-[85vh] max-h-[900px] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version & Variation Tree
          </DialogTitle>
          <DialogDescription>
            Visual history of your resume versions and variations. Click on any node to navigate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 border border-border rounded-xl overflow-hidden bg-background relative">
          {!baseResume ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">No resume loaded</p>
            </div>
          ) : (
            <>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2, minZoom: 0.4, maxZoom: 1 }}
                minZoom={0.2}
                maxZoom={1.5}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: false,
                }}
                connectionLineType={ConnectionLineType.SmoothStep}
                proOptions={{ hideAttribution: true }}
                className="[&_.react-flow__controls]:!bg-secondary [&_.react-flow__controls]:!border-border [&_.react-flow__controls]:!rounded-lg [&_.react-flow__controls-button]:!bg-secondary [&_.react-flow__controls-button]:!border-border [&_.react-flow__controls-button]:!fill-muted-foreground [&_.react-flow__controls-button:hover]:!bg-muted"
              >
                <Background 
                  color="hsl(var(--muted-foreground))" 
                  gap={24} 
                  size={1}
                  style={{ opacity: 0.2 }}
                />
                <Controls 
                  showInteractive={false}
                  position="bottom-left"
                  className="!shadow-lg"
                />
              </ReactFlow>
              {/* Hint when no versions/variations saved yet */}
              {hasOnlyBaseNode && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card/90 backdrop-blur-sm border rounded-lg px-4 py-2 text-xs text-muted-foreground shadow-lg">
                  💡 Use <span className="font-medium text-foreground">Save Version</span> or <span className="font-medium text-foreground">Create Variation</span> to build your history tree
                </div>
              )}
            </>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-8 pt-3 border-t text-xs text-muted-foreground flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-muted-foreground" />
            <span>Versions</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>Variations</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>Currently Active</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
