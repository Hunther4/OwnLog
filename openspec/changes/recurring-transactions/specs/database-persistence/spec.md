# Database Persistence Delta — Recurring Transactions

## Purpose

This delta extends the existing `database-persistence` capability to support schema version 4, adding the `recurring_transactions` table and the `transacciones.recurring_id` foreign key required by the `recurring-transactions` capability. All changes are additive and backward-compatible: existing v3 databases must upgrade without data loss, and a v4 database must remain readable by a v3 engine that simply ignores the new structures.

## MODIFIED Requirements

### Requirement: Schema Migrations

The system MUST support a migration mechanism to incrementally update the database schema version.

The system MUST treat every migration as additive by default: a migration from version `N` to `N+1` MUST only perform `CREATE TABLE`, `CREATE INDEX`, and `ALTER TABLE ... ADD COLUMN` operations that are safe to apply on a database created at version `N`. The system MUST NOT perform destructive operations (`DROP`, `RENAME` of existing columns, data truncation) as part of a version bump.

The system MUST run every migration step inside a single SQL transaction. If any statement in the migration fails, the system MUST roll back the entire migration and preserve the database at the previous version intact (no partial application, no orphaned tables or columns).

The system MUST run `PRAGMA integrity_check` after a successful migration and refuse to commit the new version if integrity is not OK.

#### Scenario: Automatic Upgrade
- GIVEN a database at version 1 and a migration script available for version 2
- WHEN the engine initializes
- THEN the migration is applied and the internal version is updated to 2

#### Scenario: Additive migration to v4
- GIVEN a database at version 3 with existing `transacciones` and `categorias` rows
- WHEN the engine initializes and the v3→v4 migration runs
- THEN the migration:
  1. `CREATE TABLE recurring_transactions` with the columns and constraints defined in the `Schema v4 (Recurring Tables)` requirement
  2. `ALTER TABLE transacciones ADD COLUMN recurring_id INTEGER` (nullable, no default other than `NULL`)
  3. `CREATE INDEX idx_recurring_active ON recurring_transactions(active) WHERE deleted_at IS NULL`
  4. `CREATE INDEX idx_tx_recurring_id ON transacciones(recurring_id)`
  5. `CREATE UNIQUE INDEX idx_tx_recurring_run ON transacciones(recurring_id, fecha_local) WHERE recurring_id IS NOT NULL`
- AND the migration does NOT rename, drop, or modify any existing column on `transacciones` or `categorias`
- AND existing rows in `transacciones` have `recurring_id = NULL` after the migration

#### Scenario: Failed migration preserves v3 state
- GIVEN a database at version 3
- WHEN the v3→v4 migration is started and one of its statements fails (e.g. simulated `CREATE TABLE` collision)
- THEN the system rolls back the entire transaction
- AND the database remains at version 3 with all original tables, columns, indices, and rows intact
- AND the engine surfaces the error so the caller can decide whether to retry

#### Scenario: Integrity check after migration
- GIVEN a v3 database that has been migrated to v4
- WHEN `PRAGMA integrity_check` runs
- THEN it returns `ok`
- AND only then is the user_version bumped to 4

#### Scenario: Rollback by code revert is safe
- GIVEN a database at v4
- WHEN a build of the app is shipped that does not contain the v4 code (and therefore does not declare a v4 migration)
- THEN the engine starts up against the v4 database without errors
- AND all reads on the existing tables (`transacciones`, `categorias`) still work
- AND the `recurring_transactions` table sits unused and the `recurring_id` column is always `NULL`

## ADDED Requirements

### Requirement: Schema v4 (Recurring Tables)

The system MUST provide the following database structures when the engine version is 4 or higher.

The `recurring_transactions` table MUST be defined as:

| Column          | Type            | Constraints                                                                                  |
|-----------------|-----------------|----------------------------------------------------------------------------------------------|
| `id`            | `INTEGER`       | `PRIMARY KEY AUTOINCREMENT`                                                                  |
| `monto`         | `INTEGER`       | `NOT NULL`                                                                                   |
| `categoria_id`  | `INTEGER`       | `NOT NULL`, `REFERENCES categorias(id) ON DELETE RESTRICT`                                   |
| `descripcion`   | `TEXT`          | nullable                                                                                     |
| `frequency`     | `TEXT`          | `NOT NULL`, `CHECK(frequency IN ('daily','weekly','monthly','custom_days'))`                  |
| `interval_days` | `INTEGER`       | nullable, `CHECK(interval_days IS NULL OR interval_days > 0)` — only used when `frequency='custom_days'` |
| `start_date`    | `TEXT`          | `NOT NULL`, `YYYY-MM-DD` local time                                                          |
| `end_date`      | `TEXT`          | nullable, `YYYY-MM-DD` local time                                                            |
| `last_run_date` | `TEXT`          | nullable, `YYYY-MM-DD` local time                                                            |
| `active`        | `INTEGER`       | `NOT NULL DEFAULT 1`, value is `0` or `1`                                                    |
| `deleted_at`    | `TEXT`          | nullable, ISO 8601 UTC timestamp; non-null value means the rule is soft-deleted              |
| `created_at`    | `TEXT`          | `NOT NULL`, ISO 8601 string in UTC                                                           |

The `transacciones` table MUST be extended with:

| Column         | Type      | Constraints                                                       |
|----------------|-----------|-------------------------------------------------------------------|
| `recurring_id` | `INTEGER` | nullable, `REFERENCES recurring_transactions(id) ON DELETE SET NULL` |

The system MUST create the following indices when migrating to v4:
- `idx_recurring_active` on `recurring_transactions(active)` with the partial predicate `WHERE deleted_at IS NULL`, for active rule lookups
- `idx_tx_recurring_id` on `transacciones(recurring_id)` for run-by-rule queries
- `idx_tx_recurring_run` — a partial **unique** index on `transacciones(recurring_id, fecha_local)` with the partial predicate `WHERE recurring_id IS NOT NULL`, to prevent double-runs when two scheduler ticks race (boot + `AppState` active back-to-back). The `WHERE recurring_id IS NOT NULL` predicate keeps the index sparse: manual `transacciones` rows (with `recurring_id = NULL`) are NOT constrained because `NULL` is never equal to `NULL` in SQLite unique indices.

#### Scenario: Recurring rule is persisted
- GIVEN a v4 database
- WHEN the application inserts a row into `recurring_transactions` with valid values
- THEN the row is stored with an auto-generated `id`
- AND a follow-up `SELECT` returns the same row

#### Scenario: Foreign key to categorias enforced
- GIVEN a v4 database with `PRAGMA foreign_keys = ON`
- WHEN the application attempts to insert a `recurring_transactions` row with a `categoria_id` that does not exist in `categorias`
- THEN the insert fails with a foreign key constraint violation
- AND no row is written

#### Scenario: Frequency CHECK constraint
- GIVEN a v4 database
- WHEN the application attempts to insert a `recurring_transactions` row with `frequency = "yearly"`
- THEN the insert fails with a CHECK constraint violation
- AND no row is written

#### Scenario: New `recurring_id` column is nullable
- GIVEN a v4 database
- WHEN the application reads existing `transacciones` rows (migrated from v3)
- THEN `recurring_id` is `NULL` for every row that was not created by a recurring rule

#### Scenario: `ON DELETE SET NULL` preserves historical transactions
- GIVEN a v4 database with a `recurring_transactions` row that has 5 generated `transacciones` rows linked via `recurring_id`
- WHEN the application deletes the `recurring_transactions` row directly (bypassing the soft-delete path that the application uses)
- THEN the 5 `transacciones` rows remain
- AND their `recurring_id` is set to `NULL` (not deleted)

#### Scenario: Indices exist
- GIVEN a v4 database
- WHEN `PRAGMA index_list('recurring_transactions')` and `PRAGMA index_list('transacciones')` are queried
- THEN `idx_recurring_active` and `idx_tx_recurring_id` and `idx_tx_recurring_run` are all reported

#### Scenario: Partial unique index prevents double-run
- GIVEN a v4 database with a `recurring_transactions` row that has id `R`
- AND a `transacciones` row with `(recurring_id = R, fecha_local = "2026-06-01")` already exists
- WHEN the application attempts to insert a second `transacciones` row with `(recurring_id = R, fecha_local = "2026-06-01")`
- THEN the insert fails with a UNIQUE constraint violation against `idx_tx_recurring_run`
- AND the existing `transacciones` row is unchanged

#### Scenario: Partial unique index does not constrain manual transactions
- GIVEN a v4 database
- WHEN the application inserts two `transacciones` rows with `recurring_id = NULL` and the same `fecha_local`
- THEN both rows are accepted (the partial index's `WHERE recurring_id IS NOT NULL` predicate excludes them)
