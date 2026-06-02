import SQLiteEngine from '../database/SQLiteEngine';
import { QuickAction, QuickActionRow } from '../types/master';

/**
 * QuickActionRepository
 * Handles all database operations for Quick Actions.
 * Ensures ACID compliance using SQLite transactions.
 */
export const QuickActionRepository = {
  async getAll(): Promise<QuickAction[]> {
    const rows = await SQLiteEngine.getAll<QuickActionRow>('SELECT * FROM quick_actions WHERE is_deleted = 0');
    const actions = [];
    for (const row of rows) {
      actions.push({
        id: row.id,
        label: row.label,
        amount: row.amount,
        category_name: row.category_name,
      });
    }
    return actions;
  },

  async add(action: Omit<QuickAction, 'id'>): Promise<number> {
    const result: any = await SQLiteEngine.executeSql(
      `INSERT INTO quick_actions (label, amount, category_name) VALUES (?, ?, ?)`,
      [action.label, action.amount, action.category_name]
    );
    return result.lastInsertRowId;
  },

  async update(id: number, updates: Partial<QuickAction>): Promise<void> {
    // Whitelist to prevent prototype pollution
    const allowedKeys = ['label', 'amount', 'category_name'];
    const keys: string[] = [];
    for (const k of Object.keys(updates)) {
      if (allowedKeys.includes(k)) {
        keys.push(k);
      }
    }
    if (keys.length === 0) return;

    const setParts = [];
    for (const key of keys) {
      setParts.push(`${key} = ?`);
    }
    const setClause = setParts.join(', ');
    const values: (string | number)[] = [];
    for (const key of keys) {
      values.push(updates[key as keyof typeof updates] as string | number);
    }
    values.push(id);

    await SQLiteEngine.executeSql(`UPDATE quick_actions SET ${setClause} WHERE id = ?`, values);
  },

  async delete(id: number): Promise<void> {
    await SQLiteEngine.executeSql('UPDATE quick_actions SET is_deleted = 1 WHERE id = ?', [id]);
  },
};
