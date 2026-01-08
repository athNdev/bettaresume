'use client';

import { Button } from '@/components/ui/button';
import { Save, X } from 'lucide-react';

interface FormSaveBarProps {
  hasChanges: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}

export function FormSaveBar({ hasChanges, isSaving, onSave, onDiscard }: FormSaveBarProps) {
  if (!hasChanges) return null;

  return (
    <div className="sticky top-0 z-10 bg-accent/90 backdrop-blur border-b px-4 py-2 -mx-4 -mt-4 mb-4 flex items-center justify-between">
      <span className="text-sm font-medium">Unsaved changes</span>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDiscard}
          disabled={isSaving}
        >
          <X className="h-4 w-4 mr-1" />
          Discard
        </Button>
        <Button 
          size="sm" 
          onClick={onSave}
          disabled={isSaving}
        >
          <Save className="h-4 w-4 mr-1" />
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
