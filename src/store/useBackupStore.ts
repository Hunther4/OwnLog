import { create } from 'zustand';

export type BackupStatus = 'idle' | 'backing-up' | 'restoring' | 'error' | 'success';

interface BackupState {
  isAuth: boolean;
  lastBackupDate: string | null;
  backupStatus: BackupStatus;
  errorMessage: string | null;
  cloudAuthStatus: 'unknown' | 'authenticated' | 'error';
  cloudUser: { email: string; name?: string } | null;
  backgroundSyncEnabled: boolean;

  setAuth: (isAuth: boolean) => void;
  setLastBackupDate: (date: string | null) => void;
  setBackupStatus: (status: BackupStatus, error?: string) => void;
  resetStatus: () => void;
  setCloudAuthStatus: (status: BackupState['cloudAuthStatus']) => void;
  setCloudUser: (user: BackupState['cloudUser']) => void;
  setBackgroundSyncEnabled: (enabled: boolean) => void;
}

export const useBackupStore = create<BackupState>((set) => ({
  isAuth: false,
  lastBackupDate: null,
  backupStatus: 'idle',
  errorMessage: null,
  backgroundSyncEnabled: false,
  cloudAuthStatus: 'unknown',
  cloudUser: null,
  setAuth: (isAuth) => set({ isAuth }),

  setLastBackupDate: (lastBackupDate) => set({ lastBackupDate }),

  setBackupStatus: (status, error: string | undefined = undefined) =>
    set({
      backupStatus: status,
      errorMessage: error,
    }),

  resetStatus: () =>
    set({
      backupStatus: 'idle',
      errorMessage: null,
    }),

  setCloudAuthStatus: (cloudAuthStatus) => set({ cloudAuthStatus }),

  setCloudUser: (cloudUser) => set({ cloudUser }),
  setBackgroundSyncEnabled: (enabled) => set({ backgroundSyncEnabled: enabled }),
}));
