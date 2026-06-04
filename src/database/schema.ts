/**
 * Esquema de Base de Datos V1 - HuntherWallet
 * Única fuente de verdad para sentencias SQL.
 */

export const DATABASE_PRAGMAS = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA synchronous = FULL;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -2000;
  PRAGMA wal_autocheckpoint = 4000;
`;

export const CREATE_TABLES_V1 = `
  -- Tabla de Ajustes de la App y Balance Cacheado
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  -- Tabla de Categorías
  CREATE TABLE IF NOT EXISTS categorias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('ingreso', 'egreso')),
    emoji TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    activa INTEGER DEFAULT 1,
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    is_deleted INTEGER DEFAULT 0
  );

  -- Tabla de Transacciones
  CREATE TABLE IF NOT EXISTS transacciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    monto INTEGER NOT NULL,
    fecha_utc TEXT NOT NULL,
    fecha_local TEXT NOT NULL,
    categoria_id INTEGER NOT NULL,
    descripcion TEXT,
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    is_deleted INTEGER DEFAULT 0,
    FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE RESTRICT
  );

  -- Tabla de Ajustes de Balance (Auditoría/Drift)
  CREATE TABLE IF NOT EXISTS balance_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp_utc TEXT NOT NULL,
    saldo_anterior INTEGER NOT NULL,
    saldo_nuevo INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    updated_at INTEGER DEFAULT (strftime('%s','now')),
    is_deleted INTEGER DEFAULT 0
  );
`;

export const CREATE_INDICES_V1 = `
  -- Índices de rendimiento para dispositivos de gama baja
  CREATE INDEX IF NOT EXISTS idx_transacciones_fecha_local ON transacciones(fecha_local);
  CREATE INDEX IF NOT EXISTS idx_categoria ON transacciones(categoria_id);
  CREATE INDEX IF NOT EXISTS idx_transacciones_active ON transacciones(fecha_local, categoria_id) WHERE is_deleted = 0;
`;

/**
 * Schema v4 — Recurring Transactions (v1.2.20)
 *
 * Single source of truth for the v4 DDL. Kept separate from CREATE_TABLES_V1
 * to preserve the project rule that every migration is a discrete unit
 * (see `database-persistence` delta spec and AGENTS.md "atomic restore").
 */
export const CREATE_TABLES_V4 = `
  -- Tabla de Transacciones Recurrentes (reglas declaradas por el usuario)
  CREATE TABLE IF NOT EXISTS recurring_transactions (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    monto           INTEGER NOT NULL CHECK (monto >= 0),
    categoria_id    INTEGER NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    descripcion     TEXT,
    frequency       TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly','custom_days')),
    interval_days   INTEGER CHECK (interval_days IS NULL OR interval_days > 0),
    start_date      TEXT NOT NULL,
    end_date        TEXT,
    last_run_date   TEXT,
    active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0,1)),
    deleted_at      TEXT,
    created_at      TEXT NOT NULL
  );

  -- Extiende transacciones con la FK opcional a la regla que la generó.
  -- ON DELETE SET NULL: si la regla se borra físicamente, las ejecuciones
  -- históricas siguen visibles y se desvinculan de la regla.
  ALTER TABLE transacciones
    ADD COLUMN recurring_id INTEGER
    REFERENCES recurring_transactions(id) ON DELETE SET NULL;
`;

/**
 * Schema v4 — indices. Se crean todos con `IF NOT EXISTS` para que el
 * bloque sea idempotente si el engine lo re-ejecuta (idempotencia es
 * un requisito del proyecto: ver `MIGRATIONS_V3_TO_V4` y AGENTS.md).
 */
export const CREATE_INDICES_V4 = `
  -- Búsquedas por reglas activas: filtradas por deleted_at IS NULL para
  -- que las reglas soft-deleted no paguen el costo del índice.
  CREATE INDEX IF NOT EXISTS idx_recurring_active
    ON recurring_transactions(active)
    WHERE deleted_at IS NULL;

  -- Búsquedas de ejecuciones por regla.
  CREATE INDEX IF NOT EXISTS idx_tx_recurring_id
    ON transacciones(recurring_id);

  -- Previene doble-emisión cuando dos ticks se pisan (boot + AppState
  -- back-to-back). Parcial: las filas manuales (recurring_id = NULL) no
  -- están restringidas porque NULL nunca es igual a NULL en índices UNIQUE.
  CREATE UNIQUE INDEX IF NOT EXISTS idx_tx_recurring_run
    ON transacciones(recurring_id, fecha_local)
    WHERE recurring_id IS NOT NULL;
`;

/**
 * Sequence of statements that SQLiteEngine executes inside a single
 * `executeInTransaction` call when promoting a v3 database to v4.
 *
 * Order matters:
 *  1. CREATE TABLE recurring_transactions
 *  2. ALTER TABLE transacciones (add recurring_id)
 *  3. CREATE the three indices
 *  4. PRAGMA user_version = 4
 *
 * Every statement is idempotent (CREATE … IF NOT EXISTS, ALTER … ADD
 * COLUMN is not natively idempotent in SQLite, so the engine guards that
 * step with a pragma_table_info check, see SQLiteEngine.migrate).
 */
export const MIGRATIONS_V3_TO_V4: string[] = [
  CREATE_TABLES_V4,
  CREATE_INDICES_V4,
  'PRAGMA user_version = 4;',
];
