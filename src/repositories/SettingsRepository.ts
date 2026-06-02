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
    await SQLiteEngine.executeSql(
      `INSERT INTO app_settings (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
  },

  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    if (keys.length === 0) return {};
    const placeholders = keys.map(() => '?').join(',');
    const rows = await SQLiteEngine.getAll<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key IN (${placeholders})`,
      keys
    );
    const results: Record<string, string | null> = {};
    for (const key of keys) {
      results[key] = null;
    }
    for (const row of rows) {
      results[row.key] = row.value;
    }
    return results;
  }
};
