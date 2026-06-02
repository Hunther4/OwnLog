import SQLiteEngine from '../database/SQLiteEngine';
import { TransactionType } from '../types/master';

export interface CategoryReport {
  nombre: string;
  total: number;
  tipo: TransactionType;
  color: string;
}

export interface MonthlyTrend {
  month: string;
  total: number;
}

/**
 * ReportRepository
 * Handles complex aggregation queries for financial reports.
 * Optimized for read-only performance.
 */
export const ReportRepository = {
  async getCategoryTotals(): Promise<CategoryReport[]> {
    const sql = `
      SELECT c.nombre as category, SUM(t.monto) as total, c.tipo
      FROM transacciones t 
      JOIN categorias c ON t.categoria_id = c.id 
      WHERE t.is_deleted = 0 AND c.is_deleted = 0 AND c.activa = 1
      GROUP BY c.id, c.nombre, c.tipo
      ORDER BY total DESC
    `;
    const rows = await SQLiteEngine.getAll<{ category: string; total: number; tipo: TransactionType }>(sql);
    
    const reports = [];
    for (const row of rows) {
      reports.push({
        nombre: row.category,
        total: row.total,
        tipo: row.tipo,
        color: row.tipo === 'ingreso' ? '#4caf50' : '#36A2EB',
      });
    }
    return reports;
  },

  async getMonthlyTrend(): Promise<MonthlyTrend[]> {
    const sql = `
      SELECT 
        strftime('%Y-%m', fecha_local) as month, 
        SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE -t.monto END) as total 
      FROM transacciones t 
      JOIN categorias c ON t.categoria_id = c.id 
      WHERE t.is_deleted = 0 AND c.is_deleted = 0 AND c.activa = 1
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `;
    return await SQLiteEngine.getAll<MonthlyTrend>(sql);
  },
};
