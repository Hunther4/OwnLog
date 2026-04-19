import SQLiteEngine from '../database/SQLiteEngine';
import { AppSettingsRow } from '../types/master';

/**
 * SettingsRepository
 * Handles all key-value pairs in app_settings.
 */
export const SettingsRepository = {
  async getSetting(key: string): Promise<string | null> {
    const row = await SQLiteEngine.getFirst<AppSettingsRow>(
      `SELECT value FROM app_settings WHERE key = ?`, 
      [key]
    );
    return row?.value ?? null;
  },

  async setSetting(key: string, value: string): Promise<void> {
    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync(
        `INSERT INTO app_settings (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [key, value]
      );
    });
  },

  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const results: Record<string, string | null> = {};
    for (const key of keys) {
      results[key] = await this.getSetting(key);
    }
    return results;
  }
};
