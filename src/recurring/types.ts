/**
 * Domain types for the Recurring Transactions capability.
 *
 * The minimal type contract that `RecurringRepository` depends on lives
 * here. PR #1 only needs `RecurringTransaction`, `Frequency`, and
 * `RecurringTransactionInput` — additional types (`RecurringRun`,
 * `TickReport`, etc.) land in Task 1.3.
 *
 * Field names mirror the SQLite columns exactly (snake_case) so the
 * repository can return rows without renaming.
 */

export type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom_days';

export interface RecurringTransaction {
  id: number;
  /** Amount in the minimum currency unit (1 = 1 peso). Never a float. */
  monto: number;
  categoria_id: number;
  descripcion: string | null;
  frequency: Frequency;
  /** Required iff `frequency === 'custom_days'`. NULL otherwise. */
  interval_days: number | null;
  start_date: string; // YYYY-MM-DD local
  end_date: string | null; // YYYY-MM-DD local, nullable
  last_run_date: string | null; // YYYY-MM-DD local, nullable
  active: 0 | 1;
  deleted_at: string | null; // ISO 8601 UTC, nullable. Non-null = soft-deleted.
  created_at: string; // ISO 8601 UTC
}

/**
 * Payload accepted by `RecurringRepository.add` and
 * `RecurringRepository.update`. Strips server-managed and lifecycle
 * fields from the full row type so callers cannot accidentally overwrite
 * `id`, `created_at`, `last_run_date`, `active`, or `deleted_at`.
 */
export type RecurringTransactionInput = Omit<
  RecurringTransaction,
  'id' | 'created_at' | 'last_run_date' | 'active' | 'deleted_at'
>;
