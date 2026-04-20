import { documentDirectory, cacheDirectory, copyAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import SQLiteEngine from '../database/SQLiteEngine';

// Get FS paths correctly
const documentDir = documentDirectory || '';
const cacheDir = cacheDirectory || '';

export interface BackupResult {
  success: boolean;
  message: string;
  path?: string;
}

/**
 * Service responsible for local data resilience operations.
 * Handles the consistent export of the SQLite database and disk optimization.
 */
export const LocalBackupService = {
  /**
   * Exports the current database to a shareable file.
   * Ensures consistency by performing a WAL checkpoint before copying.
   */
  async exportDatabase(): Promise<BackupResult> {
    try {
      // 1. Force WAL checkpoint to merge journal into main .db file
      await SQLiteEngine.checkpoint();

      // 2. Define paths
      // The main DB path in expo-sqlite is usually 'SQLite/hunther_wallet.db'
      // but the absolute path depends on the OS. We use FileSystem.documentDirectory.
      const dbName = 'hunther_wallet.db';
      const dbPath = `${documentDir}SQLite/${dbName}`;
      const tempPath = `${cacheDir}${dbName}.bak`;

      // 3. Copy DB to cache directory to ensure it's shareable
      await copyAsync({
        from: dbPath,
        to: tempPath,
      });

      // 4. Open native share dialog
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(tempPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Export OwnLog Backup',
        UTI: 'public.database',
      });

      return {
        success: true,
        message: 'Database exported successfully',
        path: tempPath,
      };
    } catch (error) {
      console.error('[LocalBackupService] Export failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown export error',
      };
    }
  },

  /**
   * Optimizes the database by running the VACUUM command.
   */
  async optimizeDatabase(): Promise<BackupResult> {
    try {
      await SQLiteEngine.vacuum();
      return {
        success: true,
        message: 'Database optimized and defragmented successfully',
      };
    } catch (error) {
      console.error('[LocalBackupService] Optimization failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown optimization error',
      };
    }
  },
};
