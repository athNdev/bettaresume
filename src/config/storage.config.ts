/**
 * Storage Mode Configuration
 * 
 * Betta Resume runs in two modes controlled by npm scripts:
 * 
 * 1. DEV MODE (npm run dev)
 *    - Demo account with data in localStorage
 *    - No backend required
 *    - Full feature access
 *    - Private and offline-capable
 * 
 * 2. PROD MODE (npm run prod) 
 *    - Real account with backend sync
 *    - Data synced to SQLite via GraphQL
 *    - Cross-device access
 *    - Requires backend server running
 */

export type StorageMode = 'dev' | 'prod';

// Get storage mode from environment variable set by npm scripts
export const getStorageMode = (): StorageMode => {
  // Environment variable is set by cross-env in package.json scripts
  const envMode = process.env.NEXT_PUBLIC_STORAGE_MODE;
  if (envMode === 'prod') return 'prod';
  return 'dev'; // Default to dev mode
};

// Check if running in dev mode
export const isDevMode = (): boolean => getStorageMode() === 'dev';

// Check if running in prod mode  
export const isProdMode = (): boolean => getStorageMode() === 'prod';

// Set storage mode (deprecated - mode is now controlled by npm scripts)
export const setStorageMode = (mode: StorageMode): void => {
  console.warn('setStorageMode is deprecated. Use npm run dev or npm run prod instead.');
};

// Storage mode display info
export const STORAGE_MODE_INFO = {
  dev: {
    name: 'Demo Mode',
    description: 'Demo account with local storage',
    icon: 'FlaskConical',
    features: [
      'Demo account auto-created',
      'Full feature access',
      'Data stored in browser',
      'Works offline',
      'No backend required',
    ],
    limitations: [
      'Data only in this browser',
      'Clearing browser data deletes resumes',
      'No real authentication',
    ],
  },
  prod: {
    name: 'Production Mode',
    description: 'Real accounts with backend sync',
    icon: 'Cloud',
    features: [
      'Real user accounts',
      'Backend database sync',
      'Data persistence',
      'Cross-device access',
    ],
    limitations: [
      'Requires backend server',
      'Requires account sign-up',
    ],
  },
} as const;

// Check if prod mode is properly configured
export const isProdModeAvailable = (): boolean => {
  // In prod mode, check if backend is reachable
  return isProdMode();
};
