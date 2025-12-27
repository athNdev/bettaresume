'use client';

import { useResumeStore } from '@/store/resume-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronRight, 
  FileText, 
  Copy,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

interface ResumeBreadcrumbProps {
  resumeId: string;
}

export function ResumeBreadcrumb({ resumeId: _resumeId }: ResumeBreadcrumbProps) {
  const router = useRouter();
  const { activeResume, resumes } = useResumeStore();

  if (!activeResume) return null;

  const isVariation = activeResume.variationType === 'variation';
  const baseResume = isVariation 
    ? resumes.find(r => r.id === activeResume.baseResumeId) 
    : null;

  const handleGoToBase = () => {
    if (baseResume) {
      router.push(`/editor/${baseResume.id}`);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Base resume or current resume */}
      {isVariation && baseResume ? (
        <>
          {/* Base resume link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleGoToBase}
              >
                <FileText className="h-3 w-3 mr-1" />
                {baseResume.name}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Go to base resume</TooltipContent>
          </Tooltip>

          <ChevronRight className="h-3 w-3 text-muted-foreground" />

          {/* Current variation */}
          <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-md">
            <Copy className="h-3.5 w-3.5 text-emerald-500" />
            <span className="font-medium text-xs text-emerald-700 dark:text-emerald-400">{activeResume.name}</span>
            {activeResume.domain && (
              <Badge variant="outline" className="h-4 text-[9px] px-1 border-emerald-500/50 text-emerald-600 dark:text-emerald-400">
                {activeResume.domain}
              </Badge>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Base resume (not a variation) */}
          <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/30 px-2.5 py-1 rounded-md">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span className="font-medium text-xs text-blue-700 dark:text-blue-400">{activeResume.name}</span>
          </div>
        </>
      )}

      {/* Sync status for variations */}
      {isVariation && activeResume.lastSyncedAt && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/80 border border-border">
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                Updated {formatDistanceToNow(new Date(activeResume.lastSyncedAt), { addSuffix: true })}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>Last pulled updates from base resume</TooltipContent>
        </Tooltip>
      )}

      {/* Type badge */}
      {isVariation ? (
        <Badge className="h-5 text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30">
          <Copy className="h-3 w-3 mr-1" />
          Tailored Copy
        </Badge>
      ) : (
        <Badge className="h-5 text-[10px] bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/30">
          <FileText className="h-3 w-3 mr-1" />
          Base Resume
        </Badge>
      )}
    </div>
  );
}
