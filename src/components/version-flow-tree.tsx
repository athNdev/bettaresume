'use client';

import { useMemo, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
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
} from '@/components/ui/dialog';
import { 
  GitBranch, 
  Clock, 
  Undo2, 
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
      className={`px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px] cursor-pointer transition-all hover:shadow-xl ${
        data.isActive 
          ? 'bg-indigo-500/15 border-indigo-500 dark:bg-indigo-500/25' 
          : 'bg-card border-border hover:border-indigo-500/50'
      }`}
      onClick={data.onClick}
    >
      {/* Source handle for versions going down */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-indigo-500 !w-3 !h-3" />
      {/* Source handle for variations going right */}
      <Handle type="source" position={Position.Right} id="right" className="!bg-green-500 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        {data.isActive ? (
          <CheckCircle2 className="h-4 w-4 text-indigo-500 fill-indigo-500/20" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-semibold text-sm">{data.label}</span>
      </div>
      <div className="flex items-center justify-between">
        <Badge className="text-[10px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30">v{data.version}</Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(parseISO(data.updatedAt), { addSuffix: true })}
        </span>
      </div>
      {data.isActive && (
        <div className="mt-2 pt-2 border-t border-indigo-500/30 text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
          Currently Editing
        </div>
      )}
    </div>
  );
}

// Custom node for version history (on central vein)
function VersionNode({ data }: { data: { version: number; description: string; createdAt: string; onRestore?: () => void } }) {
  return (
    <div className="px-3 py-2 rounded-md border-2 bg-indigo-500/10 border-indigo-500/40 dark:bg-indigo-500/20 min-w-[180px] shadow-md">
      {/* Target from above */}
      <Handle type="target" position={Position.Top} className="!bg-indigo-500 !w-2.5 !h-2.5" />
      {/* Source to below */}
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-indigo-500 !w-2.5 !h-2.5" />
      {/* Source to right for variations */}
      <Handle type="source" position={Position.Right} id="right" className="!bg-green-500 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-3 w-3 text-indigo-500" />
        <span className="font-medium text-xs text-indigo-600 dark:text-indigo-400">Version {data.version}</span>
      </div>
      <p className="text-[10px] text-muted-foreground truncate mb-2" title={data.description}>
        {data.description || 'No description'}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {format(parseISO(data.createdAt), 'MMM d, yyyy')}
        </span>
        {data.onRestore && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 px-2 text-[10px] hover:bg-indigo-500/20"
            onClick={(e) => {
              e.stopPropagation();
              data.onRestore?.();
            }}
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Restore
          </Button>
        )}
      </div>
    </div>
  );
}

// Custom node for variations (branching off the vein)
function VariationNode({ data }: { data: { name: string; domain: string; updatedAt: string; isActive: boolean; onClick?: () => void } }) {
  return (
    <div 
      className={`px-3 py-2 rounded-md border-2 shadow-md min-w-[160px] cursor-pointer transition-all hover:shadow-lg ${
        data.isActive 
          ? 'bg-green-500/20 border-green-500 dark:bg-green-500/30' 
          : 'bg-green-500/10 border-green-500/40 dark:bg-green-500/20 hover:border-green-500/70'
      }`}
      onClick={data.onClick}
    >
      <Handle type="target" position={Position.Left} className="!bg-green-500 !w-2.5 !h-2.5" />
      <div className="flex items-center gap-2 mb-1">
        {data.isActive ? (
          <CheckCircle2 className="h-3 w-3 text-green-500 fill-green-500/20" />
        ) : (
          <GitBranch className="h-3 w-3 text-green-500" />
        )}
        <span className="font-medium text-xs truncate">{data.name}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[9px] h-4 border-green-500/50 text-green-600 dark:text-green-400">
          {data.domain}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {formatDistanceToNow(parseISO(data.updatedAt), { addSuffix: true })}
        </span>
      </div>
      {data.isActive && (
        <div className="mt-1.5 pt-1.5 border-t border-green-500/30 text-[10px] text-green-600 dark:text-green-400 font-medium">
          Currently Editing
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
  const { activeResume, resumes, getVersions, getVariations, restoreVersion, setActiveResume } = useResumeStore();
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

  const handleRestoreVersion = useCallback((versionId: string) => {
    restoreVersion(baseResumeId, versionId);
  }, [baseResumeId, restoreVersion]);

  // Build nodes and edges
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const CENTER_X = 300;
    const VERTICAL_SPACING = 120;
    const VARIATION_OFFSET_X = 250;
    
    // Base resume node at top of central vein
    if (baseResume) {
      nodes.push({
        id: 'base',
        type: 'base',
        position: { x: CENTER_X, y: 50 },
        data: {
          label: baseResume.name,
          version: baseResume.version,
          updatedAt: baseResume.updatedAt,
          isActive: !isVariation,
          onClick: () => handleGoToResume(baseResume.id),
        },
      });
    }

    // Versions along the CENTRAL VEIN (vertical spine)
    resumeVersions.forEach((version, index) => {
      const nodeId = `version-${version.id}`;
      const yPos = 200 + index * VERTICAL_SPACING;
      
      nodes.push({
        id: nodeId,
        type: 'version',
        position: { x: CENTER_X, y: yPos },
        data: {
          version: version.version,
          description: version.changeDescription || 'No description',
          createdAt: version.createdAt,
          onRestore: () => handleRestoreVersion(version.id),
        },
      });

      // Edge connecting versions along the central vein
      if (index === 0) {
        edges.push({
          id: `edge-base-${nodeId}`,
          source: 'base',
          sourceHandle: 'bottom',
          target: nodeId,
          type: 'straight',
          style: { stroke: '#6366f1', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        });
      } else {
        edges.push({
          id: `edge-version-${index}`,
          source: `version-${resumeVersions[index - 1].id}`,
          sourceHandle: 'bottom',
          target: nodeId,
          type: 'straight',
          style: { stroke: '#6366f1', strokeWidth: 3 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
        });
      }
    });

    // Variations branching OUT to the right from their source version
    variations.forEach((variation) => {
      const nodeId = `variation-${variation.id}`;
      
      // Find which version this variation was created from
      const createdFromVersion = variation.createdFromVersion || baseResume?.version || 1;
      
      // Find the source node (either a version node or base)
      let sourceNodeId = 'base';
      let sourceY = 50; // Base Y position
      
      // Find the matching version node
      const sourceVersionIndex = resumeVersions.findIndex(v => v.version === createdFromVersion);
      if (sourceVersionIndex !== -1) {
        sourceNodeId = `version-${resumeVersions[sourceVersionIndex].id}`;
        sourceY = 200 + sourceVersionIndex * VERTICAL_SPACING;
      }
      
      // Position variation at the same Y level as its source
      const yPos = sourceY + 30; // Slight offset for visual clarity
      
      nodes.push({
        id: nodeId,
        type: 'variation',
        position: { x: CENTER_X + VARIATION_OFFSET_X, y: yPos },
        data: {
          name: variation.name,
          domain: variation.domain || 'Custom',
          updatedAt: variation.updatedAt,
          isActive: variation.id === activeResume?.id,
          onClick: () => handleGoToResume(variation.id),
        },
      });

      // Edge from source version to variation (horizontal branch)
      edges.push({
        id: `edge-${sourceNodeId}-${nodeId}`,
        source: sourceNodeId,
        sourceHandle: 'right',
        target: nodeId,
        type: 'straight',
        style: { stroke: '#22c55e', strokeWidth: 2 },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
      });
    });

    return { nodes, edges };
  }, [baseResume, resumeVersions, variations, isVariation, activeResume?.id, handleGoToResume, handleRestoreVersion]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

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
      <DialogContent className="sm:max-w-[800px] h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version & Variation Tree
          </DialogTitle>
          <DialogDescription>
            Visual history of your resume versions and variations. Click on any node to navigate.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 border rounded-lg overflow-hidden bg-muted/20">
          {totalItems === 0 && !baseResume ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-2">No versions or variations yet</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                Save versions to track changes over time, or create variations for different job domains.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.4 }}
              minZoom={0.5}
              maxZoom={1.5}
              defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
              proOptions={{ hideAttribution: true }}
              className="[&_.react-flow__controls]:!bg-zinc-800 [&_.react-flow__controls]:!border-zinc-700 [&_.react-flow__controls-button]:!bg-zinc-800 [&_.react-flow__controls-button]:!border-zinc-700 [&_.react-flow__controls-button]:!fill-zinc-300 [&_.react-flow__controls-button:hover]:!bg-zinc-700"
            >
              <Background color="hsl(var(--border))" gap={20} size={1} />
              <Controls 
                showInteractive={false}
              />
            </ReactFlow>
          )}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Central Vein (Base + Versions)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Variations</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <CheckCircle2 className="h-3 w-3 text-indigo-500" />
            <span>Currently Active</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
