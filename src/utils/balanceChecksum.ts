import { TransactionRepository } from '../repositories/TransactionRepository';
import { SettingsRepository } from '../repositories/SettingsRepository';
import { log, warn } from './log';

/**
 * Calculates the actual balance by summing all transactions with proper sign.
 * @returns The computed balance in CLP (integer).
 */
export async function computeActualBalance(): Promise<number> {
  return await TransactionRepository.getTotalBalance();
}

/**
 * Retrieves the cached balance stored in app_settings.
 * @returns The cached balance in CLP (integer), or 0 if not set.
 */
export async function getCachedBalance(): Promise<number> {
  const value = await SettingsRepository.getSetting('cached_balance');
  if (!value) return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Updates the cached balance in app_settings.
 * @param balance New balance value in CLP (integer).
 */
export async function setCachedBalance(balance: number): Promise<void> {
  await SettingsRepository.setSetting('cached_balance', balance.toString());
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
    if (drift > 1) {
      warn(
        `[Balance Audit] Drift detected: computed=${computed} CLP, cached=${cached} CLP, drift=${drift} CLP`
      );
      return false;
    }
    log(`[Balance Audit] OK (computed=${computed} CLP, cached=${cached} CLP)`);
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
  log(`[Balance Audit] Reconciled cached balance to ${computed} CLP`);
}

export default {
  auditBalance,
  reconcileBalance,
  computeActualBalance,
  getCachedBalance,
  setCachedBalance,
};
