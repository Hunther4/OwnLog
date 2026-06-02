import { documentDirectory, cacheDirectory, copyAsync, moveAsync, getInfoAsync, readAsStringAsync, deleteAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { DatabaseService } from './DatabaseService';
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
      await DatabaseService.checkpoint();

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

      // 3b. Clean up leftover .restoring files from cache
      const restoringPath = `${dbPath}.restoring`;
      await deleteAsync(restoringPath, { idempotent: true });

      // 4. Open native share dialog
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(tempPath, {
        mimeType: 'application/octet-stream',
        dialogTitle: 'Export OwnLog Backup',
        UTI: 'public.database',
      });

      // Clean up temp file from cache after sharing
      await deleteAsync(tempPath, { idempotent: true });

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
      await DatabaseService.vacuum();
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

  /**
   * Restaura la base de datos desde el archivo .bak más reciente.
   *
   * Proceso:
   * 1. Localiza el archivo .bak más reciente.
   * 2. Cierra la conexión activa a la DB.
   * 3. Copia el .bak sobre la DB activa.
   * 4. Reinicia la conexión.
   *
   * Este proceso es ATÓMICO a nivel de archivo — si falla la copia,
   * el archivo original no se toca porque usamos un archivo temporal intermedio.
   */
  async restoreFromLocalBackup(): Promise<BackupResult> {
    const dbName = 'hunther_wallet.db';
    const dbPath = `${documentDir}SQLite/${dbName}`;
    const backupPath = `${dbPath}.bak`;
    const tempPath = `${dbPath}.restoring`;
    const integrityDbName = `${dbName}.integrity`;

    try {
      const backupExists = await getInfoAsync(backupPath);
      if (!backupExists.exists) {
        return {
          success: false,
          message: 'No se encontró ningún respaldo local (.bak).',
        };
      }

      // Validar que el .bak tenga header SQLite válido
      const header = await readAsStringAsync(backupPath, {
        encoding: EncodingType.Base64,
        length: 16,
      });
      if (!header || !header.startsWith('U1FMaXRl')) {
        return {
          success: false,
          message: 'El archivo de respaldo está corrupto (header SQLite inválido).',
        };
      }

      // Integrity check: copy .bak to a temp DB and run PRAGMA integrity_check
      const integrityDbPath = `${documentDir}SQLite/${integrityDbName}`;
      await copyAsync({ from: backupPath, to: integrityDbPath });
      let integrityDb: SQLite.SQLiteDatabase | null = null;
      try {
        integrityDb = await SQLite.openDatabaseAsync(integrityDbName);
        const results = await integrityDb.getAllAsync<{ integrity_check: string }>(
          'PRAGMA integrity_check'
        );
        const isOk = results.length === 1 && results[0]['integrity_check'] === 'ok';
        if (!isOk) {
          const errors = results
            .map((r) => r.integrity_check)
            .filter((v) => v !== 'ok')
            .join('; ');
          throw new Error(`Integrity check failed: ${errors}`);
        }
      } finally {
        if (integrityDb) {
          await integrityDb.closeAsync();
        }
        await deleteAsync(integrityDbPath, { idempotent: true });
      }

      // Cerrar conexión activa
      await SQLiteEngine.close();

      // Atomic restore: copy to .restoring, then moveAsync (rename) to live DB
      await copyAsync({ from: backupPath, to: tempPath });
      await moveAsync({ from: tempPath, to: dbPath });

      // Reiniciar conexión
      await SQLiteEngine.initialize();

      return {
        success: true,
        message: 'Base de datos restaurada exitosamente desde el respaldo local.',
      };
    } catch (error) {
      console.error('[LocalBackupService] Restore failed:', error);

      // Clean up .restoring on failure
      await deleteAsync(tempPath, { idempotent: true });

      // Intentar recuperar la conexión pase lo que pase
      try {
        await SQLiteEngine.initialize();
      } catch (recoveryError) {
        console.error('[LocalBackupService] ❌ Recovery failed:', recoveryError);
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido al restaurar.',
      };
    }
  },
};
