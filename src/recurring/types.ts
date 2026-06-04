/**
 * Domain types for the Recurring Transactions capability.
 *
 * Field names mirror the SQLite columns exactly (snake_case) so the
 * repository can return rows without renaming.
 */

/** How often a recurring rule should be applied. */
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom_days';

/**
 * A single recurring rule. Mirrors the `recurring_transactions` table
 * column-for-column. `id`, `created_at`, `last_run_date`, `active`, and
 * `deleted_at` are server-managed.
 */
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
  /** ISO 8601 UTC, nullable. Non-null = soft-deleted. */
  deleted_at: string | null;
  /** ISO 8601 UTC. */
  created_at: string;
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

/**
 * Alias for the row type used by the repository and slice. The design
 * (and most existing repository-style code) names this `RecurringRule`;
 * we keep both names so downstream code can pick whichever reads better.
 */
export type RecurringRule = RecurringTransaction;

/**
 * Alias for the input payload. Same rationale as `RecurringRule`.
 */
export type RecurringRuleInput = RecurringTransactionInput;

/**
 * A single materialised run produced by the scheduler. Lives as a row
 * in `transacciones` (with `recurring_id` set to the source rule's id);
 * this struct is what the slice keeps in memory for the upcoming-runs
 * preview and what the scheduler reports in `TickReport`.
 */
export interface RecurringRun {
  ruleId: number;
  /** The due date the run is anchored to, in device local time. */
  fecha_local: string; // YYYY-MM-DD
  /** Amount copied from the rule at materialisation time. */
  monto: number;
}

/**
 * The output of one `RecurringScheduler.runTick()` call (PR #2).
 * Mirrors the shape from design.md §5.2.
 */
export interface TickReport {
  /** `false` if the in-process lock was already held when the tick started. */
  ran: boolean;
  /** Present iff `ran` is false. */
  reason?: 'lock-held';
  /** Runs that were materialised this tick. Empty when `ran` is false. */
  runs: RecurringRun[];
  /**
   * Per-rule skipped counts. The cap (30 missed runs per rule per tick)
   * is the only source of skipped runs in v1.2.20.
   */
  skipped: Array<{ ruleId: number; skipped: number }>;
}

