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
    const transactions = [];
    for (const row of rows) {
      transactions.push({
        id: row.id,
        monto: row.monto,
        fecha_utc: row.fecha_utc,
        fecha_local: row.fecha_local,
        categoria_id: row.categoria_id,
        descripcion: row.descripcion,
      });
    }
    return transactions;
  },

  async getExportData(): Promise<{ date: string; category: string; amount: number; description: string | null; type: string }[]> {
    return await SQLiteEngine.getAll<{
      date: string;
      category: string;
      amount: number;
      description: string | null;
      type: string;
    }>(`
      SELECT t.fecha_local as date, c.nombre as category, t.monto as amount, t.descripcion as description, c.tipo as type
      FROM transacciones t
      JOIN categorias c ON t.categoria_id = c.id
      WHERE t.is_deleted = 0 AND c.is_deleted = 0
      ORDER BY t.fecha_local DESC
    `);
  },

  async getLastN(n: number): Promise<Transaction[]> {
    const rows = await SQLiteEngine.getAll<TransactionRow>(
      `SELECT * FROM transacciones WHERE is_deleted = 0 ORDER BY id DESC LIMIT ?`,
      [n]
    );
    const transactions = [];
    for (const row of rows) {
      transactions.push({
        id: row.id,
        monto: row.monto,
        fecha_utc: row.fecha_utc,
        fecha_local: row.fecha_local,
        categoria_id: row.categoria_id,
        descripcion: row.descripcion,
      });
    }
    return transactions;
  },

  async add(tx: Omit<Transaction, 'id'>): Promise<number> {
    const result: any = await SQLiteEngine.executeSql(
      `INSERT INTO transacciones (monto, fecha_utc, fecha_local, categoria_id, descripcion, updated_at)
       VALUES (?, ?, ?, ?, ?, strftime('%s','now'))`,
      [tx.monto, tx.fecha_utc, tx.fecha_local, tx.categoria_id, tx.descripcion]
    );
    return result.lastInsertRowId;
  },

  async delete(id: number): Promise<void> {
    await SQLiteEngine.executeSql(
      `UPDATE transacciones SET is_deleted = 1, updated_at = strftime('%s','now') WHERE id = ?`,
      [id]
    );
  },

  async update(id: number, updates: Partial<Transaction>): Promise<void> {
    // Whitelist: whitelist de campos permitidos para evitar SQL injection
    const allowedKeys = ['monto', 'fecha_utc', 'fecha_local', 'categoria_id', 'descripcion'];
    const keys: string[] = [];
    for (const key of Object.keys(updates)) {
      if (allowedKeys.includes(key)) {
        keys.push(key);
      }
    }
    if (keys.length === 0) return;

    const setParts = [];
    for (const key of keys) {
      setParts.push(`${key} = ?`);
    }
    const setClause = setParts.join(', ');

    const values: any[] = [];
    for (const key of keys) {
      values.push(updates[key as keyof Transaction]);
    }
    values.push(id);

    await SQLiteEngine.executeSql(
      `UPDATE transacciones SET ${setClause}, updated_at = strftime('%s','now') WHERE id = ?`,
      values
    );
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
      WHERE t.is_deleted = 0 AND c.is_deleted = 0 AND c.activa = 1 AND fecha_local >= ? AND fecha_local <= ?
    `,
      [firstDay, lastDay]
    );

    return {
      income: result?.income ?? 0,
      expense: result?.expense ?? 0,
    };
  },

  async getTotalBalance(): Promise<number> {
    const result = await SQLiteEngine.getFirst<{ total: number | null }>(`
      SELECT SUM(
        CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE -t.monto END
      ) as total
      FROM transacciones t
      INNER JOIN categorias c ON t.categoria_id = c.id
      WHERE t.is_deleted = 0 AND c.is_deleted = 0 AND c.activa = 1
    `);
    return result?.total ?? 0;
  },

  async getSpendingForCategoryInMonth(monthYear: string, categoryId: number): Promise<number> {
    const firstDay = `${monthYear}-01`;
    const lastDay = new Date(
      parseInt(monthYear.split('-')[0]),
      parseInt(monthYear.split('-')[1]),
      0
    )
      .toISOString()
      .split('T')[0];

    const result = await SQLiteEngine.getFirst<{ total: number | null }>(
      `SELECT SUM(monto) as total FROM transacciones
       WHERE categoria_id = ? AND fecha_local >= ? AND fecha_local <= ? AND is_deleted = 0`,
      [categoryId, firstDay, lastDay]
    );
    return result?.total ?? 0;
  },
};
