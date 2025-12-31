'use client';

import { useState, useEffect } from 'react';
import { useSyncStatus } from '@/components/sync-provider';
import { checkBackendHealth } from '@/lib/sync';
import { Cloud, CloudOff, HardDrive, RefreshCw, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SyncStatusProps {
  className?: string;
  showLabel?: boolean;
}

/**
 * SyncStatus Component
 * 
 * Shows the current storage mode (dev/prod) and sync status.
 * Useful for debugging and showing users where their data is stored.
 */
export function SyncStatus({ className, showLabel = false }: SyncStatusProps) {
  const { storageMode, backendStatus, isInitialized } = useSyncStatus();
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  
  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      await checkBackendHealth();
      setLastChecked(new Date());
    } finally {
      setIsChecking(false);
    }
  };
  
  // Auto-check on mount in prod mode
  useEffect(() => {
    if (storageMode === 'prod') {
      handleCheckConnection();
    }
  }, [storageMode]);
  
  const getStatusIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    if (storageMode === 'dev') {
      return <HardDrive className="h-4 w-4 text-muted-foreground" />;
    }
    
    if (backendStatus === 'online') {
      return <Cloud className="h-4 w-4 text-green-500" />;
    }
    
    if (backendStatus === 'offline') {
      return <CloudOff className="h-4 w-4 text-yellow-500" />;
    }
    
    return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  };
  
  const getStatusText = () => {
    if (!isInitialized) return 'Initializing...';
    
    if (storageMode === 'dev') {
      return 'Dev Mode';
    }
    
    if (backendStatus === 'online') {
      return 'Synced';
    }
    
    if (backendStatus === 'offline') {
      return 'Offline';
    }
    
    return 'Checking...';
  };
  
  const getStatusDescription = () => {
    if (storageMode === 'dev') {
      return 'Development mode: Data is stored in your browser only.';
    }
    
    if (backendStatus === 'online') {
      return 'Your data is synced to the server. Changes are saved automatically.';
    }
    
    if (backendStatus === 'offline') {
      return 'Server is offline. Changes are saved locally and will sync when reconnected.';
    }
    
    return 'Checking connection status...';
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-2', className)}
            onClick={handleCheckConnection}
            disabled={isChecking}
          >
            {getStatusIcon()}
            {showLabel && (
              <span className="text-xs">{getStatusText()}</span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="font-medium">{getStatusText()}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {getStatusDescription()}
            </p>
            {lastChecked && (
              <p className="text-xs text-muted-foreground">
                Last checked: {lastChecked.toLocaleTimeString()}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * SyncStatusBadge Component
 * 
 * A simpler badge version for inline use.
 */
export function SyncStatusBadge({ className }: { className?: string }) {
  const { storageMode, backendStatus, isInitialized } = useSyncStatus();
  
  if (!isInitialized) return null;
  
  const isOnline = storageMode === 'prod' && backendStatus === 'online';
  
  return (
    <div className={cn('flex items-center gap-1.5 text-xs', className)}>
      <span className={cn(
        'h-2 w-2 rounded-full',
        isOnline ? 'bg-green-500' : 'bg-yellow-500'
      )} />
      <span className="text-muted-foreground">
        {isOnline ? 'Synced' : 'Dev'}
      </span>
    </div>
  );
}
