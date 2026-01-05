'use client';

/**
 * Resume Card Component
 * 
 * Displays a resume card with actions.
 */

import { 
  FileText, 
  Archive, 
  MoreHorizontal, 
  Trash2, 
  Copy, 
  Pencil, 
  Download,
  ArchiveRestore,
  GitBranch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { Resume } from '@/types/resume';
import { TEMPLATE_CONFIGS } from '@/types/resume';

interface ResumeCardProps {
  resume: Resume;
  variations: Resume[];
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}

export function ResumeCard({
  resume,
  variations,
  onEdit,
  onDuplicate,
  onExport,
  onArchive,
  onRestore,
  onDelete,
}: ResumeCardProps) {
  const templateConfig = TEMPLATE_CONFIGS[resume.template];

  return (
    <Card className={`group relative transition-all hover:shadow-lg ${resume.isArchived ? 'opacity-60' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="truncate text-lg">{resume.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {templateConfig.name}
              </Badge>
              {resume.variationType === 'variation' && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge variant="outline" className="text-xs">
                      <GitBranch className="mr-1 h-3 w-3" />
                      Variation
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    This is a tailored copy of another resume
                  </TooltipContent>
                </Tooltip>
              )}
              {resume.isArchived && (
                <Badge variant="outline" className="text-xs">
                  <Archive className="mr-1 h-3 w-3" />
                  Archived
                </Badge>
              )}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 h-4 w-4" />
                Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {resume.isArchived ? (
                <DropdownMenuItem onClick={onRestore}>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Restore
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onArchive}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {/* Resume Preview Placeholder */}
        <div 
          className="aspect-[8.5/11] rounded-md border bg-muted/50 flex items-center justify-center cursor-pointer hover:bg-muted/70 transition-colors"
          onClick={onEdit}
        >
          <FileText className="h-12 w-12 text-muted-foreground/50" />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-xs text-muted-foreground">
        <span>
          Updated {new Date(resume.updatedAt).toLocaleDateString()}
        </span>
        {variations.length > 0 && (
          <span>{variations.length} variation{variations.length > 1 ? 's' : ''}</span>
        )}
      </CardFooter>
    </Card>
  );
}
