/**
 * Storage Mode Configuration
 * 
 * Betta Resume supports two storage modes:
 * 
 * 1. LOCAL MODE - All data stored in browser localStorage
 *    - No account required
 *    - Full feature access
 *    - Data persists only in the same browser
 *    - Private and offline-capable
 * 
 * 2. CLOUD MODE - Data synced to cloud storage
 *    - Requires account authentication
 *    - Access from any device
 *    - Automatic backup
 *    - (Future: may have free tier limitations)
 */

export type StorageMode = 'local' | 'cloud';

// Get current storage mode from localStorage or default to 'local'
export const getStorageMode = (): StorageMode => {
  if (typeof window === 'undefined') return 'local';
  return (localStorage.getItem('betta-storage-mode') as StorageMode) || 'local';
};

// Set storage mode
export const setStorageMode = (mode: StorageMode): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('betta-storage-mode', mode);
};

// Storage mode display info
export const STORAGE_MODE_INFO = {
  local: {
    name: 'Local Mode',
    description: 'Your data stays on this device only',
    icon: 'HardDrive',
    features: [
      'No account required',
      'Full feature access',
      'Data stored in browser',
      'Works offline',
      'Maximum privacy',
    ],
    limitations: [
      'Data only accessible from this browser',
      'Clearing browser data will delete your resumes',
      'No cross-device sync',
    ],
  },
  cloud: {
    name: 'Cloud Mode',
    description: 'Access your resumes from anywhere',
    icon: 'Cloud',
    features: [
      'Access from any device',
      'Automatic cloud backup',
      'Cross-device sync',
      'Account-based storage',
    ],
    limitations: [
      'Requires account sign-up',
      'Requires internet connection for sync',
    ],
  },
} as const;

// Check if cloud mode is available (requires auth configuration)
export const isCloudModeAvailable = (): boolean => {
  const cognitoConfigured = !!(
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID &&
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID
  );
  return cognitoConfigured;
};
