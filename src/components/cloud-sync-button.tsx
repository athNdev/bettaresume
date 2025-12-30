'use client';

import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResumeStore } from '@/store/resume-store';
import { useAuthStore } from '@/store/auth-store';
import { getOrCreateUser } from '@/lib/resume-api';

export function CloudSyncButton() {
  const { cloudSync, enableCloudSync, disableCloudSync, syncToCloud, fetchFromCloud } = useResumeStore();
  const { user, isAuthenticated } = useAuthStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-enable cloud sync if user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.email && !cloudSync.isEnabled) {
      handleConnect(user.email);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.email, cloudSync.isEnabled]);

  const handleConnect = async (userEmail: string) => {
    setIsConnecting(true);
    setError(null);

    try {
      const apiUser = await getOrCreateUser(userEmail);
      if (apiUser) {
        enableCloudSync(apiUser.id);
        await fetchFromCloud();
        setIsDialogOpen(false);
      } else {
        setError('Failed to connect to cloud. Please try again.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSync = async () => {
    await syncToCloud();
  };

  const handleDisconnect = () => {
    disableCloudSync();
  };

  if (!cloudSync.isEnabled) {
    return (
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <CloudOff className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Cloud</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Cloud Sync</DialogTitle>
            <DialogDescription>
              Sync your resumes to the cloud to access them from anywhere and keep them backed up.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => handleConnect(email)}
              disabled={!email || isConnecting}
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Cloud className="h-4 w-4 mr-2" />
                  Connect
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={cloudSync.isSyncing}
              className="gap-2"
            >
              {cloudSync.isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : cloudSync.error ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Cloud className="h-4 w-4 text-green-500" />
              )}
              <span className="hidden sm:inline">
                {cloudSync.isSyncing ? 'Syncing...' : 'Synced'}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {cloudSync.error ? (
              <p className="text-destructive">{cloudSync.error}</p>
            ) : cloudSync.lastSyncedAt ? (
              <p>Last synced: {new Date(cloudSync.lastSyncedAt).toLocaleString()}</p>
            ) : (
              <p>Click to sync</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDisconnect}
              className="h-8 w-8"
            >
              <CloudOff className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Disconnect cloud sync</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
