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
      WHERE t.is_deleted = 0
      GROUP BY c.id 
      ORDER BY total DESC
    `;
    const rows = await SQLiteEngine.getAll<{ category: string; total: number; tipo: TransactionType }>(sql);
    
    return rows.map((row, index) => ({
      nombre: row.category,
      total: row.total,
      tipo: row.tipo,
      color: row.tipo === 'ingreso' ? '#4caf50' : '#36A2EB', // Base color, can be further refined by category
    }));
  },

  async getMonthlyTrend(): Promise<MonthlyTrend[]> {
    // Los montos ya tienen signo correcto, solo sumar directamente
    const sql = `
      SELECT 
        strftime('%Y-%m', fecha_local) as month, 
        SUM(t.monto) as total 
      FROM transacciones t 
      JOIN categorias c ON t.categoria_id = c.id 
      WHERE t.is_deleted = 0
      GROUP BY month 
      ORDER BY month DESC 
      LIMIT 6
    `;
    return await SQLiteEngine.getAll<MonthlyTrend>(sql);
  },
};
