'use client';

import { useResumeStore } from '@/store/resume-store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  ChevronRight, 
  FileText, 
  GitBranch, 
  History
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
    <div className="flex items-center gap-1 text-sm">
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
          <div className="flex items-center gap-1.5 bg-primary/10 px-2 py-0.5 rounded-md">
            <GitBranch className="h-3 w-3 text-primary" />
            <span className="font-medium text-xs">{activeResume.name}</span>
            <Badge variant="secondary" className="h-4 text-[10px] px-1">
              {activeResume.domain}
            </Badge>
          </div>
        </>
      ) : (
        <>
          {/* Base resume (not a variation) */}
          <div className="flex items-center gap-1.5 bg-muted px-2 py-0.5 rounded-md">
            <FileText className="h-3 w-3 text-muted-foreground" />
            <span className="font-medium text-xs">{activeResume.name}</span>
          </div>
        </>
      )}

      {/* Version indicator */}
      <div className="flex items-center gap-1 ml-2">
        <History className="h-3 w-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">v{activeResume.version}</span>
      </div>

      {/* Variation type badge */}
      {isVariation && (
        <Badge variant="outline" className="ml-2 h-5 text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400">
          Variation
        </Badge>
      )}
      {!isVariation && (
        <Badge variant="outline" className="ml-2 h-5 text-[10px] border-blue-500/50 text-blue-600 dark:text-blue-400">
          Base
        </Badge>
      )}
    </div>
  );
}
