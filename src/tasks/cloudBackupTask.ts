import * as TaskManager from 'expo-task-manager';
import * as Network from 'expo-network';
import * as BackgroundFetch from 'expo-background-fetch';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { useBackupStore } from '../store/useBackupStore';

export const CLOUD_BACKUP_TASK = 'CLOUD_BACKUP_TASK';

/**
 * Core logic for the background backup task.
 * Implements fail-fast checks to minimize battery impact and avoid Android task termination.
 */
export async function performCloudBackupTask(taskData: { force?: boolean }) {
  try {
    // 1. Network Connectivity Check (Fail-Fast)
    const networkState = await Network.getNetworkStateAsync();
    const isWifi = networkState.type === Network.NetworkStateType.WIFI;
    
    if (!isWifi) {
      if (taskData.force) throw new Error('BACKUP_REQUIRES_WIFI');
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 2. State Validation (Fail-Fast)
    const { cloudAuthStatus, backgroundSyncEnabled } = useBackupStore.getState();
    if (cloudAuthStatus !== 'authenticated') {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }
    if (!backgroundSyncEnabled) {
      return BackgroundFetch.BackgroundFetchResult.NoData;
    }

    // 3. Execute Backup
    // Note: performCloudBackup handles its own internal timeout and memory safety
    await GoogleDriveService.performCloudBackup();
    
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (error) {
    console.error('[CloudBackupTask] Error executing background backup:', error);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
}

// Define the task in the global scope for Expo Task Manager
TaskManager.defineTask(CLOUD_BACKUP_TASK, async () => {
  return await performCloudBackupTask({ force: false });
});
