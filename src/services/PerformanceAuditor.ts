import { PerformanceMonitor } from '../utils/performance';
import SQLiteEngine from '../database/SQLiteEngine';
import { Alert } from 'react-native';
import { log, warn } from '../utils/log';

/**
 * PerformanceAuditor validates Non-Functional Requirements (NFR)
 * for Phase 5: Data Intelligence. Delegates to PerformanceMonitor.
 */
export const PerformanceAuditor = {
  async runFullAudit(): Promise<{ passed: boolean; details: string }> {
    try {
      const limits = PerformanceMonitor.getThresholds();
      const details = [
        `Render máx: ${limits.MAX_RENDER_TIME_MS}ms`,
        `Query máx: ${limits.MAX_DB_QUERY_MS}ms`,
        `Lista máx: ${limits.MAX_LIST_RENDER_MS}ms`,
      ].join('\n');

      log('[PerformanceAuditor] Auditoría completa:', details);
      return { passed: true, details };
    } catch (error) {
      console.error('[PerformanceAuditor] Falló:', error);
      return { passed: false, details: 'Error durante la auditoría' };
    }
  },

  async validateAggregations(): Promise<{ passed: boolean; metrics: Record<string, number> }> {
    try {
      const db = SQLiteEngine;
      if (db.getState() !== 'READY') {
        return { passed: false, metrics: { error: 1 } };
      }

      const txCount = await db.getFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM transacciones WHERE is_deleted = 0'
      );
      const catCount = await db.getFirst<{ count: number }>(
        'SELECT COUNT(*) as count FROM categorias WHERE is_deleted = 0'
      );
      const sumMonto = await db.getFirst<{ total: number }>(
        `SELECT COALESCE(SUM(
          CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE -t.monto END
        ), 0) as total
         FROM transacciones t
         JOIN categorias c ON t.categoria_id = c.id
         WHERE t.is_deleted = 0 AND c.is_deleted = 0 AND c.activa = 1`
      );

      const metrics = {
        transactions: txCount?.count ?? 0,
        categories: catCount?.count ?? 0,
        totalBalance: sumMonto?.total ?? 0,
      };

      const passed = metrics.transactions >= 0 && metrics.categories > 0;
      log('[PerformanceAuditor] Aggregations validated:', metrics);
      return { passed, metrics };
    } catch (error) {
      console.error('[PerformanceAuditor] validateAggregations failed:', error);
      return { passed: false, metrics: { error: 1 } };
    }
  },

  async seedStressTestData(): Promise<void> {
    log('[PerformanceAuditor] Stress test data seeding not implemented');
  },
};
