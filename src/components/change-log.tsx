'use client';

import { useState } from 'react';
import { useResumeStore } from '@/store/resume-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { 
  History, 
  Plus, 
  Trash2, 
  FileDown, 
  FileUp, 
  Copy, 
  GitBranch, 
  Palette,
  RefreshCw,
  CheckCircle2,
  Settings,
  Layers,
  FileEdit
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { ActivityAction } from '@/types/resume';

interface ChangeLogProps {
  resumeId: string;
  variant?: 'button' | 'panel';
}

// Map action types to icons and colors
const ACTION_CONFIG: Record<ActivityAction, { icon: React.ComponentType<{ className?: string }>; color: string; label: string }> = {
  created: { icon: Plus, color: 'text-green-500', label: 'Created' },
  updated: { icon: RefreshCw, color: 'text-blue-500', label: 'Updated' },
  deleted: { icon: Trash2, color: 'text-red-500', label: 'Deleted' },
  exported: { icon: FileDown, color: 'text-purple-500', label: 'Exported' },
  imported: { icon: FileUp, color: 'text-orange-500', label: 'Imported' },
  duplicated: { icon: Copy, color: 'text-cyan-500', label: 'Duplicated' },
  variation_created: { icon: GitBranch, color: 'text-indigo-500', label: 'Tailored Copy Created' },
  synced_with_base: { icon: RefreshCw, color: 'text-teal-500', label: 'Pulled Updates' },
  sync_conflicts_resolved: { icon: CheckCircle2, color: 'text-emerald-500', label: 'Reviewed & Updated' },
  section_added: { icon: Plus, color: 'text-green-400', label: 'Section Added' },
  section_removed: { icon: Trash2, color: 'text-red-400', label: 'Section Removed' },
  template_changed: { icon: Palette, color: 'text-pink-500', label: 'Template Changed' },
  settings_changed: { icon: Settings, color: 'text-gray-500', label: 'Settings Changed' },
  section_updated: { icon: FileEdit, color: 'text-blue-400', label: 'Section Updated' },
};

export function ChangeLog({ resumeId, variant = 'button' }: ChangeLogProps) {
  const { getActivityLog, activeResume } = useResumeStore();
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Get activity log for this resume (and include base resume if this is a variation)
  const isVariation = activeResume?.variationType === 'variation';
  const baseResumeId = isVariation ? activeResume?.baseResumeId : undefined;
  
  // Get logs for current resume
  let activities = getActivityLog(resumeId).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  // If showing all, also include base resume activities
  if (showAll && baseResumeId) {
    const baseActivities = getActivityLog(baseResumeId);
    activities = [...activities, ...baseActivities].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const date = format(new Date(activity.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, typeof activities>);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    }
    if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    return format(date, 'MMMM d, yyyy');
  };

  // Panel variant - embedded display for left sidebar
  if (variant === 'panel') {
    const recentActivities = activities.slice(0, 8);
    
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          {activities.length} {activities.length === 1 ? 'change' : 'changes'}
        </div>
        
        {recentActivities.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1 italic">No activity yet</p>
        ) : (
          <div className="space-y-0.5">
            {recentActivities.map((activity) => {
              const config = ACTION_CONFIG[activity.action];
              const Icon = config?.icon || RefreshCw;
              
              return (
                <div key={activity.id} className="flex items-start gap-2 py-1.5 px-1 rounded hover:bg-accent/50">
                  <Icon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${config?.color || 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] truncate">{activity.description}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {activities.length > 8 && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full h-7 text-xs"
            onClick={() => setOpen(true)}
          >
            View All ({activities.length})
          </Button>
        )}
        
        {/* Reuse the dialog for full history */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Change History
              </DialogTitle>
              <DialogDescription>
                A timeline of all changes made to this resume.
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="h-[400px] pr-4">
              {Object.entries(groupedActivities).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No changes recorded yet</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                    <div key={date}>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                        {formatDate(date)}
                      </h4>
                      <div className="space-y-2 ml-2 border-l-2 border-border pl-4">
                        {dayActivities.map((activity) => {
                          const config = ACTION_CONFIG[activity.action];
                          const Icon = config?.icon || RefreshCw;
                          
                          return (
                            <div key={activity.id} className="relative">
                              <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-background border-2 border-border flex items-center justify-center">
                                <div className={`w-1.5 h-1.5 rounded-full ${config?.color.replace('text-', 'bg-') || 'bg-gray-500'}`} />
                              </div>
                              <div className="flex items-start gap-3 py-1">
                                <Icon className={`h-4 w-4 mt-0.5 ${config?.color || 'text-muted-foreground'}`} />
                                <div className="flex-1">
                                  <p className="text-sm">{activity.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(activity.timestamp), 'h:mm a')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
          {activities.length > 0 && (
            <Badge variant="secondary" className="ml-1">{activities.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Change History
          </DialogTitle>
          <DialogDescription>
            A timeline of all changes made to this resume.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isVariation && (
            <div className="flex items-center justify-between">
              <Button
                variant={showAll ? "default" : "outline"}
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                <Layers className="h-4 w-4 mr-2" />
                {showAll ? 'Showing All Changes' : 'Show Base Resume Changes'}
              </Button>
            </div>
          )}

          <ScrollArea className="h-[400px] pr-4">
            {Object.keys(groupedActivities).length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No changes recorded yet</p>
                <p className="text-xs mt-1">Changes to your resume will appear here</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedActivities).map(([date, dayActivities]) => (
                  <div key={date}>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3 sticky top-0 bg-background py-1">
                      {formatDate(date)}
                    </h3>
                    <div className="space-y-2 relative">
                      {/* Timeline line */}
                      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />
                      
                      {dayActivities.map((activity) => {
                        const config = ACTION_CONFIG[activity.action];
                        const Icon = config?.icon || History;
                        const isFromBase = activity.resumeId !== resumeId;
                        
                        return (
                          <div 
                            key={activity.id} 
                            className={`flex items-start gap-3 relative pl-7 py-2 rounded-lg transition-colors hover:bg-muted/50 ${
                              isFromBase ? 'opacity-70' : ''
                            }`}
                          >
                            {/* Timeline dot */}
                            <div className={`absolute left-0 top-3 w-6 h-6 rounded-full border-2 border-background bg-muted flex items-center justify-center ${config?.color}`}>
                              <Icon className="h-3 w-3" />
                            </div>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">
                                  {activity.description}
                                </span>
                                {isFromBase && (
                                  <Badge variant="outline" className="text-xs">
                                    Base Resume
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {format(new Date(activity.timestamp), 'h:mm a')} · {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
