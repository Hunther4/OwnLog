# Recurring Transactions Specification

## Purpose

Recurring transactions let users declare a repeating financial event (salary on the 1st, rent on the 5th, transport every Monday) so the system applies it automatically when the app is opened, keeping the dashboard, balance, and reports accurate without requiring the user to remember to log it. The system stays offline-first: rules live in the local SQLite database, runs are materialised into the regular `transacciones` table so every read path (balance, reports, budgets) keeps working unchanged, and catch-up is bounded to 30 missed runs per rule to keep the device responsive and the data sane after long offline periods.

## Requirements

### Requirement: Create a Recurring Rule

The system MUST allow the user to create a recurring rule with the following fields:
- `monto` (INTEGER, required, non-negative; 1 = 1 peso)
- `categoria_id` (INTEGER, required, FK to `categorias.id`)
- `descripcion` (TEXT, optional)
- `frequency` (TEXT, required, one of `daily`, `weekly`, `monthly`, `custom_days`)
- `interval_days` (INTEGER, optional/nullable; **required** iff `frequency = 'custom_days'`, and MUST be `> 0` when set)
- `start_date` (TEXT, required, `YYYY-MM-DD` in device local time)
- `end_date` (TEXT, optional, `YYYY-MM-DD`; nullable)
- `deleted_at` (TEXT, optional/nullable; ISO 8601 UTC timestamp; non-null = soft-deleted)

The system MUST reject the creation with a validation error when `monto` is missing or negative, when `categoria_id` does not exist, when `frequency` is not one of the four allowed values, when `start_date` is not a valid `YYYY-MM-DD` string, when `end_date` is set and is earlier than `start_date`, when `frequency = 'custom_days'` is submitted without a positive `interval_days`, or when a non-`custom_days` frequency is submitted with a non-null `interval_days`.

The system MUST persist the new rule with `active = 1`, `last_run_date = NULL`, and a server-generated `created_at` timestamp.

#### Scenario: Valid monthly rule
- GIVEN the user opens the Recurring form
- WHEN they submit `monto=250000`, `categoria_id=<Salario>`, `frequency="monthly"`, `start_date="2026-07-01"`, no `end_date`
- THEN the rule is persisted with `active=1`, `last_run_date=NULL`, and a fresh `created_at`
- AND the new rule appears in the Recurring list as active

#### Scenario: Invalid end_date before start_date
- GIVEN the user submits a rule with `start_date="2026-07-10"` and `end_date="2026-07-05"`
- WHEN the system validates the input
- THEN the system rejects the request with a validation error that identifies both fields
- AND no rule is written to the database

#### Scenario: Invalid frequency
- GIVEN the user submits a rule with `frequency="yearly"`
- WHEN the system validates the input
- THEN the system rejects the request with a validation error listing the allowed values
- AND no rule is written to the database

#### Scenario: Negative amount
- GIVEN the user submits a rule with `monto=-100`
- WHEN the system validates the input
- THEN the system rejects the request with a validation error on `monto`
- AND no rule is written to the database

#### Scenario: `custom_days` requires `interval_days > 0`
- GIVEN the user submits a rule with `frequency="custom_days"` and `interval_days=0` (or `interval_days=null`)
- WHEN the system validates the input
- THEN the system rejects the request with a validation error on `interval_days` stating that positive integer is required
- AND no rule is written to the database

#### Scenario: non-`custom_days` with `interval_days` set is rejected
- GIVEN the user submits a rule with `frequency="monthly"` and `interval_days=7`
- WHEN the system validates the input
- THEN the system rejects the request with a validation error stating `interval_days` is only valid for `custom_days`
- AND no rule is written to the database

---

### Requirement: Pause and Resume a Rule

The system MUST allow the user to pause an active rule by setting `active = 0`, and to resume a paused rule by setting `active = 1`.

The system MUST compute the next due date on resume from `last_run_date` (or `start_date` if `last_run_date` is `NULL`), NOT from `now`, so the system does NOT backfill the period the rule was paused.

#### Scenario: Pause stops new runs
- GIVEN an active monthly rule with `start_date="2026-06-01"` and `last_run_date="2026-06-01"`
- WHEN the user pauses the rule on `2026-06-15`
- AND the scheduler tick runs on `2026-07-05`
- THEN no new `transacciones` row is created from that rule
- AND the rule's `last_run_date` remains `"2026-06-01"`

#### Scenario: Resume skips the paused period
- GIVEN the rule from the previous scenario is paused on `2026-06-15` and resumed on `2026-08-20`
- WHEN the scheduler tick runs immediately after resume
- THEN the next due date is computed as one month after `last_run_date = "2026-06-01"`, i.e. `"2026-07-01"`
- AND no run is materialised for `2026-07-01` (it is in the past relative to resume)
- AND the next due date advances to `"2026-08-01"` and then to `"2026-09-01"` going forward
- AND no run is created for the paused window `2026-06-15` … `2026-08-20`

#### Scenario: Toggling is reversible
- GIVEN a paused rule
- WHEN the user toggles it back to active
- THEN the rule's `active` is `1` and the rule appears as active in the Recurring list
- AND no automatic backfill runs are created for the paused period

---

### Requirement: Edit a Rule

The system MUST allow the user to edit the mutable fields of a rule: `monto`, `categoria_id`, `descripcion`, `frequency`, `start_date`, `end_date`, and `active`.

The system MUST NOT change `last_run_date` when the rule is edited. Future scheduled runs MUST use the new parameters; already-materialised runs (rows in `transacciones` linked to this rule via `recurring_id`) MUST be left unchanged.

The system MUST recompute the next due date after the edit using the new parameters, anchored to `last_run_date` (or `start_date` if `last_run_date` is `NULL`).

#### Scenario: Edit amount applies to future runs only
- GIVEN a monthly rule with `monto=1000` that has already produced a run on `"2026-06-01"`
- WHEN the user edits `monto` to `1500` on `"2026-06-10"`
- THEN the existing `transacciones` row for `"2026-06-01"` still shows `monto=1000`
- AND the next scheduled run (and every run after) uses `monto=1500`

#### Scenario: Edit frequency preserves history
- GIVEN a rule currently `frequency="weekly"` with three runs already materialised
- WHEN the user changes `frequency` to `"monthly"`
- THEN the three historical runs remain in `transacciones` untouched
- AND the next due date is computed as one month after `last_run_date` using the monthly rules

#### Scenario: Edit does not re-schedule past runs
- GIVEN any rule with N historical runs already in `transacciones`
- WHEN the user edits any combination of mutable fields
- THEN the system does NOT delete, re-create, or re-date any of the N historical rows

---

### Requirement: Delete a Rule

The system MUST allow the user to delete (cancel) a rule. The system MUST perform a soft delete by setting `active = 0` and a deleted flag (e.g. `deleted_at`) so the row is hidden from active listings and the scheduler MUST skip it.

The system MUST keep all already-generated `transacciones` rows linked to that rule visible, with `recurring_id` preserved, so balance, dashboard, and reports continue to count them.

#### Scenario: Soft delete removes rule from active scheduler
- GIVEN an active rule with five historical runs
- WHEN the user deletes the rule
- THEN the rule no longer appears in the active Recurring list
- AND the scheduler tick on the next boot produces no new runs from that rule
- AND the five historical `transacciones` rows are still present and still summed in the balance

#### Scenario: Soft delete keeps audit trail
- GIVEN a rule that has been soft-deleted
- WHEN the user opens the rule's detail view
- THEN the rule is shown in a "Deleted" state with the deletion date
- AND the linked historical transactions remain accessible from the TransactionsList

#### Scenario: Soft delete sets `deleted_at`, preserves `transacciones` rows
- GIVEN an active rule with five historical `transacciones` rows linked via `recurring_id`
- WHEN the user deletes the rule
- THEN the system sets `deleted_at` to the current UTC ISO 8601 timestamp
- AND the system sets `active = 0`
- AND the rule no longer appears in the active Recurring list (the rule is filtered out by `deleted_at IS NULL`)
- AND the scheduler tick on the next boot produces no new runs from that rule
- AND all five historical `transacciones` rows remain in the table with their original `recurring_id` preserved (the run rows are immutable from the soft delete path)

---

### Requirement: Scheduler Tick

The system MUST execute a scheduler tick on (a) app boot, after the database engine has initialised, and (b) every time `AppState` transitions to `active`.

For each rule with `active = 1` and not deleted whose next due date is `<= now` (in device local time), the scheduler MUST materialise the missed runs as `transacciones` rows, one per due date, and advance the rule's `last_run_date` to the last materialised run.

The scheduler MUST cap the number of materialised runs per rule per tick to `MAX_MISSED = 30`. When the cap is hit while there are still earlier due dates that were skipped, the scheduler MUST advance the next due date to a future value computed from `now` and emit a warning that N runs were skipped for that rule.

The scheduler MUST run each rule's catch-up inside a single SQL transaction so the rule's `last_run_date` update and all inserted `transacciones` rows are atomic.

#### Scenario: On-boot catch-up
- GIVEN a daily rule with `start_date="2026-05-30"` that has not been run yet
- AND the app was closed between `2026-05-30` and `2026-06-03` (5 days)
- WHEN the app is opened on `2026-06-03`
- THEN the scheduler creates exactly 5 new `transacciones` rows, one for each of `"2026-05-30"`, `"2026-05-31"`, `"2026-06-01"`, `"2026-06-02"`, `"2026-06-03"`
- AND the rule's `last_run_date` is updated to `"2026-06-03"`

#### Scenario: AppState active tick
- GIVEN the app is open and `AppState` transitions from `background` to `active`
- AND there is a rule whose next due date is `<= now`
- WHEN the foreground tick runs
- THEN due runs are materialised exactly as on boot

#### Scenario: Cap of 30 missed runs
- GIVEN a daily rule that has not been run for 45 days
- WHEN the scheduler tick runs
- THEN exactly 30 `transacciones` rows are created (the 30 most recent missed days)
- AND the rule's next due date is set to `now + 1 day` (or the equivalent next valid date for the frequency)
- AND a warning is recorded stating 15 runs were skipped for that rule

#### Scenario: No double-run on concurrent triggers
- GIVEN the scheduler tick is triggered twice in quick succession (e.g. boot + AppState active)
- WHEN both ticks attempt to materialise the same due run
- THEN only one `transacciones` row is created per due date
- AND the rule's `last_run_date` advances exactly once

---

### Requirement: Month-End Clamping

For rules with `frequency = "monthly"`, the system MUST run the rule on the specified day of the month. When the specified day does not exist in a given month (e.g. day 31 in February), the system MUST clamp the run to the last valid day of that month.

The system MUST continue using the originally specified day for subsequent months (no permanent shift to the last day of the month).

#### Scenario: Day 31 in February (non-leap year)
- GIVEN a monthly rule with `start_date="2026-01-31"`
- WHEN the scheduler processes the run that would fall in February 2026 (a non-leap year)
- THEN the run is materialised with `fecha_local = "2026-02-28"` (last day of February 2026)
- AND the next run is computed for `"2026-03-31"`

#### Scenario: Day 31 in February (leap year)
- GIVEN the same rule as above
- WHEN the scheduler processes the run that would fall in February 2028 (a leap year)
- THEN the run is materialised with `fecha_local = "2026-02-29"` of that leap year
- AND the next run is computed for the following month using the original day-of-month

---

### Requirement: Run Materialisation as Transactions

The system MUST create a regular row in the `transacciones` table for each materialised run, with `recurring_id` set to the source rule's `id` and the other fields populated from the rule (`monto`, `categoria_id`, `descripcion`).

The run's `fecha_local` MUST be the due date of the run (in device local time), NOT the time the scheduler actually executed.

The system MUST NOT change the schema, read paths, or balance calculation logic of the existing `transacciones` table: generated runs are indistinguishable from manual ones except for the non-null `recurring_id` column.

#### Scenario: Materialised run links back to the rule
- GIVEN an active monthly rule
- WHEN the scheduler materialises a run for `"2026-07-01"`
- THEN a new `transacciones` row exists with `fecha_local = "2026-07-01"`, `monto` matching the rule, `categoria_id` matching the rule, and `recurring_id` equal to the rule's `id`

#### Scenario: Balance reflects generated runs
- GIVEN a user has zero manual transactions and one active rule
- WHEN the scheduler has materialised three runs
- THEN the dashboard balance equals the sum of those three runs
- AND the read paths (balance, reports, budgets) see the generated runs with no code change

---

### Requirement: Editing a Past Run Does Not Re-Schedule

The system MUST treat `transacciones` rows as immutable from the scheduler's point of view: if a user edits or deletes a row in `transacciones` that has `recurring_id IS NOT NULL`, the scheduler MUST NOT use that change to adjust the rule's `last_run_date`, `start_date`, or next due date.

The scheduler's only inputs for "what is the next due date" are the rule's own fields and `last_run_date`.

#### Scenario: Deleting a historical run does not move the schedule
- GIVEN a rule with three historical runs, the most recent dated `"2026-06-01"`
- WHEN the user deletes the `transacciones` row for `"2026-05-01"`
- THEN the rule's `last_run_date` remains `"2026-06-01"`
- AND the next due date is still one period after `"2026-06-01"`

#### Scenario: Editing a historical run's amount does not move the schedule
- GIVEN the same rule as above
- WHEN the user edits the `monto` of the run dated `"2026-05-01"` from `1000` to `9999`
- THEN the rule's `last_run_date` is unchanged
- AND the next scheduled run still uses the rule's current `monto`, not the edited run's value

---

### Requirement: Pause Does Not Backfill on Resume

The system MUST NOT backfill the paused period when an inactive rule is reactivated. The next due date MUST be computed from `last_run_date` (or `start_date` if `last_run_date` is `NULL`) using the rule's frequency, regardless of how long the rule was paused.

#### Scenario: Long pause, short frequency
- GIVEN a daily rule with `last_run_date = "2026-01-01"` and `active = 0` (paused on `"2026-01-02"`)
- WHEN the user resumes the rule on `"2026-06-01"`
- THEN the next due date is computed as `"2026-01-01" + 1 day = "2026-01-02"`
- AND because that date is in the past, the scheduler immediately materialises runs forward, advancing the schedule, but no runs are created for the paused window `2026-01-02 … 2026-06-01`
- AND the schedule stabilises at the first future due date after `"2026-06-01"`

#### Scenario: Pause then resume within the same period
- GIVEN a monthly rule with `last_run_date = "2026-05-01"` and `active = 0` from `"2026-05-15"` to `"2026-05-25"`
- WHEN the rule is resumed on `"2026-05-25"`
- THEN the next due date is `"2026-06-01"`
- AND no run is created for `"2026-05-01"` again (it is already in `last_run_date`)

---

### Requirement: Upcoming Runs Preview

The system MUST provide a list of upcoming runs for the next 30 days (inclusive of `today`) for all active, non-deleted rules. The list MUST include: rule id, rule description, amount, category, and the run's `fecha_local`.

The preview MUST NOT materialise any `transacciones` rows. It is a read-only computation.

#### Scenario: Monthly rule with one run in the next 30 days
- GIVEN today is `"2026-06-03"` and a monthly rule with `frequency="monthly"`, `start_date="2026-05-01"`, and `last_run_date="2026-05-01"`
- WHEN the preview is requested
- THEN the preview contains exactly one entry for that rule: `"2026-06-01"`

#### Scenario: Daily rule with 30 runs in the next 30 days
- GIVEN today is `"2026-06-03"` and a daily rule with `start_date="2026-06-01"` and `last_run_date="2026-06-02"`
- WHEN the preview is requested
- THEN the preview contains 30 entries for that rule, one per day from `"2026-06-03"` to `"2026-07-02"`

#### Scenario: Paused rule excluded from preview
- GIVEN a rule with `active = 0`
- WHEN the preview is requested
- THEN that rule is NOT included in the upcoming runs list

#### Scenario: Rule past its end_date excluded from preview
- GIVEN a rule with `end_date = "2026-06-01"` and `today = "2026-06-15"`
- WHEN the preview is requested
- THEN that rule is NOT included in the upcoming runs list

---

### Requirement: Atomic `last_run_date` Update

The system MUST update the rule's `last_run_date` as part of the same SQL transaction that inserts the corresponding `transacciones` row. If the transaction fails (any reason), the inserted `transacciones` row MUST be rolled back AND the rule's `last_run_date` MUST remain unchanged.

The system MUST use a unique index on `(recurring_id, fecha_local)` in `transacciones` to prevent duplicate runs even if two scheduler ticks race (boot and AppState active back-to-back).

#### Scenario: Failed insert rolls back the rule update
- GIVEN a rule is due to run
- WHEN the scheduler opens a transaction, inserts the `transacciones` row, and the rule update fails (e.g. constraint violation)
- THEN the entire transaction is rolled back
- AND no `transacciones` row remains
- AND the rule's `last_run_date` is unchanged

#### Scenario: Duplicate due date caught by unique index
- GIVEN a rule with no `last_run_date` and a daily `start_date="2026-06-01"`
- WHEN two scheduler ticks attempt to insert a `transacciones` row for `"2026-06-01"` for the same rule
- THEN the second insert fails with a unique constraint violation
- AND the rule's `last_run_date` is set to `"2026-06-01"` exactly once
- AND the scheduler logs the duplicate and advances the schedule
