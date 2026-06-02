import SQLiteEngine from '../database/SQLiteEngine';
import { Category, CategoryRow } from '../types/master';

/**
 * CategoryRepository
 * Handles all database operations for Categories.
 */
export const CategoryRepository = {
  async getAll(): Promise<Category[]> {
    const rows = await SQLiteEngine.getAll<CategoryRow>('SELECT * FROM categorias WHERE is_deleted = 0');
    const categories = [];
    for (const row of rows) {
      categories.push({
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        emoji: row.emoji,
        color_hex: row.color_hex,
        activa: row.activa === 1,
      });
    }
    return categories;
  },

  async add(category: Omit<Category, 'id'>): Promise<number> {
    const result: any = await SQLiteEngine.executeSql(
      `INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa, updated_at) VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
      [category.nombre, category.tipo, category.emoji, category.color_hex, category.activa ? 1 : 0]
    );
    return result.lastInsertRowId;
  },

  async update(id: number, updates: Partial<Category>): Promise<void> {
    // Whitelist: whitelist de campos permitidos para evitar SQL injection
    // NOTE: 'tipo' is excluded — changing it would flip historical transaction signs
    const allowedKeys = ['nombre', 'emoji', 'color_hex', 'activa'];
    const keys: string[] = [];
    for (const key of Object.keys(updates)) {
      if (allowedKeys.includes(key)) {
        keys.push(key);
      }
    }
    if (keys.length === 0) return;

    // Handle boolean to number conversion for 'activa'
    const processedUpdates: Record<string, any> = {};
    for (const key of keys) {
      const val = updates[key as keyof Category];
      if (key === 'activa' && typeof val === 'boolean') {
        processedUpdates[key] = val ? 1 : 0;
      } else {
        processedUpdates[key] = val;
      }
    }

    const setParts = [];
    for (const key of Object.keys(processedUpdates)) {
      setParts.push(`${key} = ?`);
    }
    const setClause = setParts.join(', ');
    const values = [...Object.values(processedUpdates), id];

    await SQLiteEngine.executeSql(
      `UPDATE categorias SET ${setClause}, updated_at = strftime('%s','now') WHERE id = ?`,
      values
    );
  },

  async delete(id: number): Promise<void> {
    await SQLiteEngine.deleteCategory(id);
  },
};
