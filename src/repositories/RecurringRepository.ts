import SQLiteEngine from '../database/SQLiteEngine';
import {
  RecurringTransaction,
  RecurringTransactionInput,
} from '../recurring/types';

/**
 * RecurringRepository — handles all database operations for the
 * `recurring_transactions` table introduced in schema v4.
 *
 * Conventions (mirroring `TransactionRepository`):
 *  - Uses `SQLiteEngine.runAsync` / `getFirstAsync` / `getAllAsync`
 *    for normal CRUD so writes are batched under WAL.
 *  - No UI / Zustand imports — pure persistence layer.
 *  - Snake-case field names preserved end-to-end (no remap).
 *  - `monto` is INTEGER throughout (1 = 1 peso, never a float).
 */
export const RecurringRepository = {
  /**
   * Insert a new rule. The server manages `id`, `created_at`,
   * `last_run_date`, `active` (defaults to 1), and `deleted_at`
   * (defaults to NULL).
   */
  async add(input: RecurringTransactionInput): Promise<number> {
    const result: any = await SQLiteEngine.executeSql(
      `INSERT INTO recurring_transactions
         (monto, categoria_id, descripcion, frequency, interval_days,
          start_date, end_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.monto,
        input.categoria_id,
        input.descripcion,
        input.frequency,
        input.interval_days,
        input.start_date,
        input.end_date,
        // created_at is server-managed; fall back to the local UTC ISO
        // string if the caller didn't supply one (the input type omits
        // it, but tests may inject it via casts).
        new Date().toISOString(),
      ]
    );
    return result.lastInsertRowId;
  },

  /** Every non-deleted rule, newest first. */
  async getAll(): Promise<RecurringTransaction[]> {
    return await SQLiteEngine.getAll<RecurringTransaction>(
      `SELECT * FROM recurring_transactions
        WHERE deleted_at IS NULL
        ORDER BY id DESC`
    );
  },

  /** Active (not paused, not soft-deleted) rules. Drives the scheduler. */
  async getActive(): Promise<RecurringTransaction[]> {
    return await SQLiteEngine.getAll<RecurringTransaction>(
      `SELECT * FROM recurring_transactions
        WHERE active = 1
          AND deleted_at IS NULL
        ORDER BY id DESC`
    );
  },

  async getById(id: number): Promise<RecurringTransaction | null> {
    return await SQLiteEngine.getFirst<RecurringTransaction>(
      `SELECT * FROM recurring_transactions WHERE id = ?`,
      [id]
    );
  },

  /**
   * Update a subset of mutable fields. The whitelist mirrors the
   * `RecurringTransactionInput` shape — lifecycle and audit fields
   * (`id`, `created_at`, `last_run_date`, `deleted_at`) are explicitly
   * rejected so callers cannot bypass the dedicated actions
   * (`softDelete`, `markRun`, etc.).
   */
  async update(
    id: number,
    fields: Partial<RecurringTransactionInput>
  ): Promise<void> {
    const allowedKeys: Array<keyof RecurringTransactionInput> = [
      'monto',
      'categoria_id',
      'descripcion',
      'frequency',
      'interval_days',
      'start_date',
      'end_date',
    ];
    const keys: string[] = [];
    const values: unknown[] = [];
    for (const key of allowedKeys) {
      if (key in fields && (fields as Record<string, unknown>)[key] !== undefined) {
        keys.push(`${key} = ?`);
        values.push((fields as Record<string, unknown>)[key]);
      }
    }
    if (keys.length === 0) return;
    values.push(id);
    await SQLiteEngine.executeSql(
      `UPDATE recurring_transactions SET ${keys.join(', ')} WHERE id = ?`,
      values
    );
  },

  /**
   * Soft delete: stamp `deleted_at` (defaults to current UTC) and flip
   * `active` to 0 in a single statement. The historical `transacciones`
   * rows linked via `recurring_id` are preserved (the FK uses
   * `ON DELETE SET NULL` and we never physically delete rules here).
   */
  async softDelete(id: number, deletedAt: string = new Date().toISOString()): Promise<void> {
    await SQLiteEngine.executeSql(
      `UPDATE recurring_transactions
          SET deleted_at = ?,
              active     = 0
        WHERE id = ?`,
      [deletedAt, id]
    );
  },

  /** Pause (false) or resume (true) a rule without touching deleted_at. */
  async toggle(id: number, active: boolean): Promise<void> {
    await SQLiteEngine.executeSql(
      `UPDATE recurring_transactions
          SET active = ?
        WHERE id = ?`,
      [active ? 1 : 0, id]
    );
  },

  /**
   * Atomic `last_run_date` bump. Called by the scheduler tick (PR #2)
   * inside the same transaction that inserts the `transacciones` rows
   * for the materialised runs.
   */
  async markRun(id: number, runDate: string): Promise<void> {
    await SQLiteEngine.executeSql(
      `UPDATE recurring_transactions
          SET last_run_date = ?
        WHERE id = ?`,
      [runDate, id]
    );
  },
};

export default RecurringRepository;
