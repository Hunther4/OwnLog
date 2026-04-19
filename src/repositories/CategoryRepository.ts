import SQLiteEngine from '../database/SQLiteEngine';
import { Category, CategoryRow } from '../types/master';

/**
 * CategoryRepository
 * Handles all database operations for Categories.
 */
export const CategoryRepository = {
  async getAll(): Promise<Category[]> {
    const rows = await SQLiteEngine.getAll<CategoryRow>('SELECT * FROM categorias WHERE is_deleted = 0');
    return rows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      tipo: row.tipo,
      emoji: row.emoji,
      color_hex: row.color_hex,
      activa: row.activa === 1,
    }));
  },

  async add(category: Omit<Category, 'id'>): Promise<number> {
    return await SQLiteEngine.executeInTransaction(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa, updated_at) VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
        [category.nombre, category.tipo, category.emoji, category.color_hex, category.activa ? 1 : 0]
      );
      return result.lastInsertRowId;
    });
  },

  async update(id: number, updates: Partial<Category>): Promise<void> {
    // Whitelist: whitelist de campos permitidos para evitar SQL injection
    const allowedKeys = ['nombre', 'tipo', 'emoji', 'color_hex', 'activa'];
    const keys = Object.keys(updates).filter((key) => allowedKeys.includes(key));
    if (keys.length === 0) return;

    // Handle boolean to number conversion for 'activa'
    const processedUpdates: Record<string, any> = {};
    keys.forEach(key => {
      const val = updates[key as keyof Category];
      if (key === 'activa' && typeof val === 'boolean') {
        processedUpdates[key] = val ? 1 : 0;
      } else {
        processedUpdates[key] = val;
      }
    });

    const setClause = Object.keys(processedUpdates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(processedUpdates), id];

    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync(`UPDATE categorias SET ${setClause}, updated_at = strftime('%s','now') WHERE id = ?`, values);
    });
  },

  async delete(id: number): Promise<void> {
    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync('UPDATE categorias SET is_deleted = 1, updated_at = strftime(\'%s\',\'now\') WHERE id = ?', [id]);
    });
  },
};
