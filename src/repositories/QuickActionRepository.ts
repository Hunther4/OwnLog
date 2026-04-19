import SQLiteEngine from '../database/SQLiteEngine';
import { QuickAction, QuickActionRow } from '../types/master';

/**
 * QuickActionRepository
 * Handles all database operations for Quick Actions.
 * Ensures ACID compliance using SQLite transactions.
 */
export const QuickActionRepository = {
  async getAll(): Promise<QuickAction[]> {
    const rows = await SQLiteEngine.getAll<QuickActionRow>('SELECT * FROM quick_actions');
    return rows.map((row) => ({
      id: row.id,
      label: row.label,
      amount: row.amount,
      category_name: row.category_name,
    }));
  },

  async add(action: Omit<QuickAction, 'id'>): Promise<number> {
    return await SQLiteEngine.executeInTransaction(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO quick_actions (label, amount, category_name) VALUES (?, ?, ?)`,
        [action.label, action.amount, action.category_name]
      );
      return result.lastInsertRowId;
    });
  },

  async update(id: number, updates: Partial<QuickAction>): Promise<void> {
    // Whitelist to prevent prototype pollution
    const allowedKeys = ['label', 'amount', 'category_name'];
    const keys = Object.keys(updates).filter((k) => allowedKeys.includes(k));
    if (keys.length === 0) return;

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), id];

    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync(`UPDATE quick_actions SET ${setClause} WHERE id = ?`, values);
    });
  },

  async delete(id: number): Promise<void> {
    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync('DELETE FROM quick_actions WHERE id = ?', [id]);
    });
  },
};
