'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SaveStatus } from '@/hooks/use-auto-save';

interface SaveStatusIndicatorProps {
  /** Current save status */
  status: SaveStatus;
  /** Error message if status is 'error' */
  error?: string | null;
  /** Callback to retry failed save */
  onRetry?: () => void;
  /** Additional class names */
  className?: string;
}

/**
 * Subtle indicator showing auto-save status.
 * Always reserves space to prevent layout shifts.
 * 
 * States:
 * - idle: Hidden (nothing to show)
 * - dirty: Hidden (change detected but debounce not fired yet)
 * - saving: "Saving..." with spinner
 * - saved: "Saved ✓" (fades after 2s)
 * - error: "Save failed" with retry button
 */
export function SaveStatusIndicator({
  status,
  error,
  onRetry,
  className,
}: SaveStatusIndicatorProps) {
  const [displayState, setDisplayState] = useState<'hidden' | 'saving' | 'saved' | 'error'>('hidden');
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timers
  const clearTimers = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // Handle status changes - only depends on status prop
  useEffect(() => {
    clearTimers();
    setIsAnimatingOut(false);

    if (status === 'saving') {
      setDisplayState('saving');
    } else if (status === 'saved') {
      setDisplayState('saved');
      // Auto-hide after 2 seconds
      timerRef.current = setTimeout(() => {
        setIsAnimatingOut(true);
        // After animation completes, hide
        timerRef.current = setTimeout(() => {
          setDisplayState('hidden');
          setIsAnimatingOut(false);
        }, 300);
      }, 1700);
    } else if (status === 'error') {
      setDisplayState('error');
    } else {
      // idle or dirty - hide immediately (no animation needed for these states)
      setDisplayState('hidden');
    }

    return clearTimers;
  }, [status]);

  const isVisible = displayState !== 'hidden';

  return (
    <div
      className={cn(
        'relative flex items-center justify-end min-w-[80px] h-5',
        className
      )}
    >
      <div
        className={cn(
          'absolute right-0 flex items-center gap-2 text-sm transition-all duration-300',
          isVisible && !isAnimatingOut ? 'opacity-100' : 'opacity-0',
          'transform-gpu pointer-events-auto'
        )}
        aria-hidden={!isVisible}
      >
        {displayState === 'saving' && (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
            <span className="text-muted-foreground whitespace-nowrap">Saving...</span>
          </>
        )}

        {displayState === 'saved' && (
          <>
            <Check className="h-3.5 w-3.5 text-green-600 dark:text-green-500" />
            <span className="text-green-600 dark:text-green-500 whitespace-nowrap">Saved</span>
          </>
        )}

        {displayState === 'error' && (
          <>
            <AlertCircle className="h-3.5 w-3.5 text-destructive" />
            <span className="text-destructive whitespace-nowrap">Save failed</span>
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                className="h-6 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
