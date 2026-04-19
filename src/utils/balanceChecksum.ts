import SQLiteEngine from '../database/SQLiteEngine';

/**
 * Calculates the actual balance by summing all transactions with proper sign.
 * @returns The computed balance in CLP (integer).
 */
export async function computeActualBalance(): Promise<number> {
  const engine = SQLiteEngine;
  const sql = `
    SELECT SUM(
      CASE
        WHEN c.tipo = 'ingreso' THEN t.monto
        ELSE -t.monto
      END
    ) as total
    FROM transacciones t
    INNER JOIN categorias c ON t.categoria_id = c.id
    WHERE c.activa = 1
  `;
  const result = await engine.getFirst<{ total: number | null }>(sql);
  // If no transactions, SUM returns null
  return result?.total ?? 0;
}

/**
 * Retrieves the cached balance stored in app_settings.
 * @returns The cached balance in CLP (integer), or 0 if not set.
 */
export async function getCachedBalance(): Promise<number> {
  const engine = SQLiteEngine;
  const sql = `SELECT value FROM app_settings WHERE key = 'cached_balance'`;
  const row = await engine.getFirst<{ value: string }>(sql);
  if (!row) return 0;
  const parsed = parseInt(row.value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Updates the cached balance in app_settings.
 * @param balance New balance value in CLP (integer).
 */
export async function setCachedBalance(balance: number): Promise<void> {
  const engine = SQLiteEngine;
  const sql = `
    INSERT INTO app_settings (key, value)
    VALUES ('cached_balance', ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `;
  await engine.executeSql(sql, [balance.toString()]);
}

/**
 * Performs a silent audit of the balance integrity.
 * Compares the computed sum of all transactions with the cached balance.
 * Logs a warning if a drift greater than 1 CLP is detected.
 * @returns true if audit passes (drift ≤ 1 CLP), false otherwise.
 */
export async function auditBalance(): Promise<boolean> {
  try {
    const computed = await computeActualBalance();
    const cached = await getCachedBalance();
    const drift = Math.abs(computed - cached);
    if (drift > 0) {
      console.warn(
        `[Balance Audit] Drift detected: computed=${computed} CLP, cached=${cached} CLP, drift=${drift} CLP`
      );
      return false;
    }
    console.log(`[Balance Audit] OK (computed=${computed} CLP, cached=${cached} CLP)`);
    return true;
  } catch (error) {
    console.error('[Balance Audit] Failed to perform audit:', error);
    return false;
  }
}

/**
 * Convenience function to update the cached balance to match the computed balance.
 * Use this to fix drift automatically (e.g., after a drift is detected).
 */
export async function reconcileBalance(): Promise<void> {
  const computed = await computeActualBalance();
  await setCachedBalance(computed);
  console.log(`[Balance Audit] Reconciled cached balance to ${computed} CLP`);
}

export default {
  auditBalance,
  reconcileBalance,
  computeActualBalance,
  getCachedBalance,
  setCachedBalance,
};
