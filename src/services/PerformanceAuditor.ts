import SQLiteEngine from '../database/SQLiteEngine';
import { Alert } from 'react-native';

/**
 * PerformanceAuditor is a utility to validate the Non-Functional Requirements (NFR)
 * of the project, specifically for Phase 5: Data Intelligence.
 */
export const PerformanceAuditor = {
  /**
   * Seeds the database with a large number of transactions to simulate high load.
   * WARNING: This will flood the database with fake data.
   */
  async seedStressTestData(count: number = 10000): Promise<void> {
    console.log(`[PerformanceAuditor] Seeding ${count} transactions...`);

    // 1. Ensure we have categories
    const categories = await SQLiteEngine.getAll<any>('SELECT id FROM categorias');
    if (categories.length === 0) {
      throw new Error('No categories found. Please create some categories before seeding.');
    }

    const categoryIds = categories.map((c) => c.id);
    const types = ['ingreso', 'egreso'];

    await SQLiteEngine.executeInTransaction(async (tx) => {
      const batchSize = 500;
      const batches = Math.ceil(count / batchSize);

      for (let batch = 0; batch < batches; batch++) {
        const entries: string[] = [];
        const startIdx = batch * batchSize;
        const endIdx = Math.min(startIdx + batchSize, count);

        for (let i = startIdx; i < endIdx; i++) {
          const monto = Math.floor(Math.random() * 100000);
          const catId = categoryIds[Math.floor(Math.random() * categoryIds.length)];
          const date = new Date(Date.now() - Math.floor(Math.random() * 10000000000))
            .toISOString()
            .split('T')[0];
          entries.push(
            `(${monto}, '${date}', '${date}', ${catId}, 'Stress test transaction ${i}')`
          );
        }

        await tx.runAsync(
          `INSERT INTO transacciones (monto, fecha_utc, fecha_local, categoria_id, descripcion) VALUES ${entries.join(', ')}`
        );
      }
    });

    console.log('[PerformanceAuditor] Seeding complete.');
  },

  /**
   * Measures the execution time of the aggregation queries.
   */
  async validateAggregations(): Promise<{ spendingTime: number; trendTime: number }> {
    console.log('[PerformanceAuditor] Validating aggregation performance...');

    const startSpending = performance.now();
    await SQLiteEngine.getSpendingByCategory();
    const endSpending = performance.now();

    const startTrend = performance.now();
    await SQLiteEngine.getMonthlyTrend();
    const endTrend = performance.now();

    const spendingTime = endSpending - startSpending;
    const trendTime = endTrend - startTrend;

    console.log(`[PerformanceAuditor] SpendingByCategory: ${spendingTime.toFixed(2)}ms`);
    console.log(`[PerformanceAuditor] MonthlyTrend: ${trendTime.toFixed(2)}ms`);

    return { spendingTime, trendTime };
  },

  /**
   * Runs the full audit and shows the result in an Alert.
   */
  async runFullAudit() {
    try {
      await this.seedStressTestData(5000);
      const { spendingTime, trendTime } = await this.validateAggregations();

      const isSpendingOk = spendingTime < 100;
      const isTrendOk = trendTime < 100;

      Alert.alert(
        'Performance Audit Result',
        `Spending Query: ${spendingTime.toFixed(2)}ms ${isSpendingOk ? '✅' : '❌'}\n` +
          `Trend Query: ${trendTime.toFixed(2)}ms ${isTrendOk ? '✅' : '❌'}\n\n` +
          `Status: ${isSpendingOk && isTrendOk ? 'PASSED' : 'FAILED'}`
      );
    } catch (error) {
      Alert.alert('Audit Error', error instanceof Error ? error.message : 'Unknown error');
    }
  },
};
