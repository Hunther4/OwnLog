import SQLiteEngine from '../database/SQLiteEngine';
import { Transaction, TransactionRow } from '../types/master';

/**
 * TransactionRepository
 * Handles all database operations for Transactions.
 * Ensures ACID compliance by using SQLite transactions.
 */
export const TransactionRepository = {
  async getAll(
    filters: { categoryId?: number | null; startDate?: string; endDate?: string } = {},
    limit = 100,
    offset = 0
  ): Promise<Transaction[]> {
    const rows = await SQLiteEngine.getTransactions(filters, limit, offset);
    // Filter out deleted transactions
    const activeRows = rows.filter((row) => row.is_deleted !== 1);
    return activeRows.map((row) => ({
      id: row.id,
      monto: row.monto,
      fecha_utc: row.fecha_utc,
      fecha_local: row.fecha_local,
      categoria_id: row.categoria_id,
      descripcion: row.descripcion,
    }));
  },

  async getLastN(n: number): Promise<Transaction[]> {
    const rows = await SQLiteEngine.getAll<TransactionRow>(
      `SELECT * FROM transacciones WHERE is_deleted = 0 ORDER BY id DESC LIMIT ?`,
      [n]
    );
    return rows.map((row) => ({
      id: row.id,
      monto: row.monto,
      fecha_utc: row.fecha_utc,
      fecha_local: row.fecha_local,
      categoria_id: row.categoria_id,
      descripcion: row.descripcion,
    }));
  },

  async add(tx: Omit<Transaction, 'id'>): Promise<number> {
    return await SQLiteEngine.executeInTransaction(async (db) => {
      const result = await db.runAsync(
        `INSERT INTO transacciones (monto, fecha_utc, fecha_local, categoria_id, descripcion, updated_at)
         VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
        [tx.monto, tx.fecha_utc, tx.fecha_local, tx.categoria_id, tx.descripcion]
      );
      return result.lastInsertRowId;
    });
  },

  async delete(id: number): Promise<void> {
    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync(
        `UPDATE transacciones SET is_deleted = 1, updated_at = strftime('%s','now') WHERE id = ?`,
        [id]
      );
    });
  },

  async update(id: number, updates: Partial<Transaction>): Promise<void> {
    // Whitelist: whitelist de campos permitidos para evitar SQL injection
    const allowedKeys = ['monto', 'fecha_utc', 'fecha_local', 'categoria_id', 'descripcion'];
    const keys = Object.keys(updates).filter((key) => allowedKeys.includes(key));
    if (keys.length === 0) return;

    const setClause = keys.map((key) => `${key} = ?`).join(', ');
    const values = [...keys.map((key) => updates[key as keyof Transaction]), id];

    await SQLiteEngine.executeInTransaction(async (db) => {
      await db.runAsync(
        `UPDATE transacciones SET ${setClause}, updated_at = strftime('%s','now') WHERE id = ?`,
        values
      );
    });
  },

  async getSumForMonth(monthYear: string, categoryId?: number): Promise<number> {
    const firstDay = `${monthYear}-01`;
    const lastDay = new Date(
      parseInt(monthYear.split('-')[0]),
      parseInt(monthYear.split('-')[1]),
      0
    )
      .toISOString()
      .split('T')[0];

    let query = `SELECT SUM(monto) as total FROM transacciones t WHERE t.is_deleted = 0 AND fecha_local >= ? AND fecha_local <= ?`;
    const params: any[] = [firstDay, lastDay];

    if (categoryId) {
      query += ` AND t.categoria_id = ?`;
      params.push(categoryId);
    }

    const result = await SQLiteEngine.getFirst<{ total: number | null }>(query, params);
    return result?.total ?? 0;
  },

  async getMonthlyTotals(monthYear: string): Promise<{ income: number; expense: number }> {
    const firstDay = `${monthYear}-01`;
    const lastDay = new Date(
      parseInt(monthYear.split('-')[0]),
      parseInt(monthYear.split('-')[1]),
      0
    )
      .toISOString()
      .split('T')[0];

    const result = await SQLiteEngine.getFirst<{ income: number | null; expense: number | null }>(
      `
      SELECT 
        COALESCE(SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN c.tipo = 'egreso' THEN t.monto ELSE 0 END), 0) as expense
      FROM transacciones t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.is_deleted = 0 AND fecha_local >= ? AND fecha_local <= ?
    `,
      [firstDay, lastDay]
    );

    return {
      income: result?.income ?? 0,
      expense: result?.expense ?? 0,
    };
  },

  async getTotalBalance(): Promise<number> {
    // Los montos ya tienen el signo correcto en la BD:
    // - Ingresos se guardan como positivos
    // - Egresos se guardan como negativos
    // Solo sumamos directamente
    const result = await SQLiteEngine.getFirst<{ total: number | null }>(`
      SELECT SUM(t.monto) as total
      FROM transacciones t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.is_deleted = 0 AND c.activa = 1
    `);
    return result?.total ?? 0;
  },
};
