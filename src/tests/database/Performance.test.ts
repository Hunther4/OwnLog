import SQLiteEngine from '../../database/SQLiteEngine';
import { describe, it, expect, beforeEach } from '@jest/globals';

describe('SQLiteEngine Performance Test - Phase 5', () => {
  beforeEach(async () => {
    await SQLiteEngine.initialize();
    // Clear transactions for a clean test
    await SQLiteEngine.executeSql('DELETE FROM transacciones');
    await SQLiteEngine.executeSql('DELETE FROM categorias');

    // Insert a few categories
    await SQLiteEngine.executeSql(
      'INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa) VALUES (?, ?, ?, ?, ?)',
      ['Food', 'egreso', '🍔', '#FF0000', 1]
    );
    await SQLiteEngine.executeSql(
      'INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa) VALUES (?, ?, ?, ?, ?)',
      ['Salary', 'ingreso', '💰', '#00FF00', 1]
    );
  }, 30000);

  it('should aggregate 5,000 transactions in less than 100ms', async () => {
    const numTransactions = 5000;
    const transactions = [];

    for (let i = 0; i < numTransactions; i++) {
      transactions.push([
        Math.floor(Math.random() * 10000),
        new Date().toISOString(),
        '2026-04-11',
        1, // Food
        `Transaction ${i}`,
      ]);
    }

    // Batch insert for performance
    await SQLiteEngine.executeInTransaction(async (db) => {
      for (const tx of transactions) {
        await db.runAsync(
          'INSERT INTO transacciones (monto, fecha_utc, fecha_local, categoria_id, descripcion) VALUES (?, ?, ?, ?, ?)',
          tx
        );
      }
    });

    const start = performance.now();
    await SQLiteEngine.getSpendingByCategory();
    const end = performance.now();

    const duration = end - start;
    console.log(`Aggregation took ${duration.toFixed(2)}ms for ${numTransactions} transactions`);

    expect(duration).toBeLessThan(100);
  }, 60000);
});
