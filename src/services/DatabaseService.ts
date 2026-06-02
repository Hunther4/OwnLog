import { documentDirectory, readDirectoryAsync, deleteAsync } from 'expo-file-system/legacy';
import * as SQLite from 'expo-sqlite';
import SQLiteEngine from '../database/SQLiteEngine';
import { log, warn } from '../utils/log';

/**
 * DatabaseService
 * High-level service for database maintenance and lifecycle operations.
 * Wraps SQLiteEngine to maintain decoupling between domain services and the DB engine.
 */
export const DatabaseService = {
  /**
   * Opens a temporary database connection for external files (e.g., for integrity checks).
   */
  async openTemporaryDatabase(path: string): Promise<SQLite.SQLiteDatabase> {
    return await SQLite.openDatabaseAsync(path);
  },

  /**
   * Cleans up all old .bak database files to save space.
   */
  async cleanupBackups(): Promise<void> {
    const dbPath = (await SQLiteEngine.getUserVersion()) // just to ensure it's initialized
      ? `${documentDirectory}SQLite/hunther_wallet.db`
      : '';
    
    if (!dbPath) return;
    
    try {
      const files = await readDirectoryAsync(`${documentDirectory}SQLite/`);
      const backups = files.filter(f => f.endsWith('.bak'));
      for (const file of backups) {
        await deleteAsync(`${documentDirectory}SQLite/${file}`, { idempotent: true });
      }
      log(`[DatabaseService] Cleaned up ${backups.length} backup files`);
    } catch (error) {
      console.error('[DatabaseService] Backup cleanup failed:', error);
    }
  },

  /**
   * Closes the active database connection.
   */
  async close(): Promise<void> {
    await SQLiteEngine.close();
  },

  /**
   * Retrieves the current user_version of the database.
   */
  async getUserVersion(): Promise<number> {
    return await SQLiteEngine.getUserVersion();
  },

  /**
   * Forces a WAL checkpoint to merge the journal into the main database file.
   * Essential before backups to ensure the .db file is complete.
   */
  async checkpoint(): Promise<void> {
    await SQLiteEngine.checkpoint();
  },

  /**
   * Optimizes the database by running the VACUUM command.
   * Reduces file size and defragments the database.
   */
  async vacuum(): Promise<void> {
    await SQLiteEngine.vacuum();
  },

  /**
   * Initializes the database, runs migrations, and seeds initial data.
   */
  async initialize(): Promise<void> {
    await SQLiteEngine.initialize();
  },

  /**
   * Completely resets the database to its initial state.
   * Use with extreme caution.
   */
  async reset(): Promise<void> {
    await SQLiteEngine.resetDatabase();
  },
};
