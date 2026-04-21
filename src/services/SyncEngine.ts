import * as FileSystem from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import { AuthService } from './AuthService';
import SQLiteEngine from '../database/SQLiteEngine';

/**
 * SyncEngine
 * Orchestrates the merge process between the local database and the remote backup.
 */
export class SyncEngine {
  private static readonly TEMP_DB_NAME = 'hunther_wallet_temp.db';

  /**
   * Executes the full synchronization flow: Download -> Integrity Check -> Merge -> Cleanup.
   */
  static async sync(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('[SyncEngine] 🚀 Starting synchronization flow...');

      // 1. DOWNLOAD: Get the remote backup to a temporary file
      // We use a hypothetical DriveSyncService for this
      const { DriveSyncService } = await import('./DriveSyncService');
      const downloadResult = await DriveSyncService.downloadBackup();

      if (!downloadResult.success || !downloadResult.tempPath) {
        return { success: false, message: downloadResult.message };
      }

      const tempDbPath = downloadResult.tempPath;

      // 2. INTEGRITY: Check if the downloaded DB is healthy
      const isHealthy = await this.verifyIntegrity(tempDbPath);
      if (!isHealthy) {
        return { success: false, message: 'Remote backup is corrupt. Aborting merge.' };
      }

      // 3. MERGE: The "C++ Merge" using ATTACH DATABASE
      const mergeResult = await this.executeNativeMerge(tempDbPath);
      if (!mergeResult.success) {
        return { success: false, message: mergeResult.message };
      }

      // 4. CLEANUP: Remove the temporary file
      await FileSystem.deleteAsync(tempDbPath, { idempotent: true });

      console.log('[SyncEngine] ✅ Synchronization completed successfully');
      return { success: true, message: 'Data synchronized successfully.' };
    } catch (error) {
      console.error('[SyncEngine] Sync failed:', error);
      return {
        success: false,
        message: `Sync error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Verifies the integrity of the temporary database.
   */
  private static async verifyIntegrity(path: string): Promise<boolean> {
    try {
      // We need a temporary connection to the temp file to run the check
      const db = await SQLite.openDatabaseAsync(path);
      const result = await db.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
      return result?.integrity_check === 'ok';
    } catch (e) {
      console.error('[SyncEngine] Integrity check failed:', e);
      return false;
    }
  }

  /**
   * Performs the LWW merge using ATTACH DATABASE.
   */
  private static async executeNativeMerge(
    tempDbPath: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate tempDbPath to prevent SQL injection
      // Path must be absolute and not contain malicious characters
      if (!tempDbPath || !tempDbPath.startsWith('/')) {
        throw new Error('Invalid temp database path: must be absolute');
      }
      // Escape single quotes in path for SQL
      const safePath = tempDbPath.replace(/'/g, "''");

      await SQLiteEngine.executeInTransaction(async (db) => {
        // Attach the downloaded DB as a separate schema (using escaped path)
        await db.execAsync(`ATTACH DATABASE '${safePath}' AS nube;`);

        // MERGE TRANSACTIONS: LWW (Last Write Wins)
        // 1. Update existing local records if the cloud version is newer
        await db.execAsync(`
          UPDATE transacciones 
          SET monto = (SELECT monto FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id),
              fecha_utc = (SELECT fecha_utc FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id),
              fecha_local = (SELECT fecha_local FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id),
              categoria_id = (SELECT categoria_id FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id),
              descripcion = (SELECT descripcion FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id),
              is_deleted = (SELECT is_deleted FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id),
              updated_at = (SELECT updated_at FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id)
          WHERE id IN (SELECT id FROM nube.transacciones)
          AND (SELECT updated_at FROM nube.transacciones WHERE nube.transacciones.id = transacciones.id) > updated_at;
        `);

        // 2. Insert new records from cloud that don't exist locally
        await db.execAsync(`
          INSERT INTO transacciones (id, monto, fecha_utc, fecha_local, categoria_id, descripcion, updated_at, is_deleted)
          SELECT id, monto, fecha_utc, fecha_local, categoria_id, descripcion, updated_at, is_deleted 
          FROM nube.transacciones 
          WHERE id NOT IN (SELECT id FROM transacciones);
        `);

        // MERGE CATEGORIES: Same logic
        await db.execAsync(`
          UPDATE categorias 
          SET nombre = (SELECT nombre FROM nube.categorias WHERE nube.categorias.id = categorias.id),
              tipo = (SELECT tipo FROM nube.categorias WHERE nube.categorias.id = categorias.id),
              emoji = (SELECT emoji FROM nube.categorias WHERE nube.categorias.id = categorias.id),
              color_hex = (SELECT color_hex FROM nube.categorias WHERE nube.categorias.id = categorias.id),
              activa = (SELECT activa FROM nube.categorias WHERE nube.categorias.id = categorias.id),
              is_deleted = (SELECT is_deleted FROM nube.categorias WHERE nube.categorias.id = categorias.id),
              updated_at = (SELECT updated_at FROM nube.categorias WHERE nube.categorias.id = categorias.id)
          WHERE id IN (SELECT id FROM nube.categorias)
          AND (SELECT updated_at FROM nube.categorias WHERE nube.categorias.id = categorias.id) > updated_at;
        `);

        await db.execAsync(`
          INSERT INTO categorias (id, nombre, tipo, emoji, color_hex, activa, updated_at, is_deleted)
          SELECT id, nombre, tipo, emoji, color_hex, activa, updated_at, is_deleted 
          FROM nube.categorias 
          WHERE id NOT IN (SELECT id FROM categorias);
        `);

        // Detach the remote DB
        await db.execAsync('DETACH DATABASE nube;');
      });

      return { success: true, message: 'Merge completed successfully.' };
    } catch (error) {
      console.error('[SyncEngine] Merge failed:', error);
      return {
        success: false,
        message: `Merge failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}
