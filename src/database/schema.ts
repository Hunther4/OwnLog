/**
 * Esquema de Base de Datos V1 - HuntherWallet
 * Única fuente de verdad para sentencias SQL.
 */

export const DATABASE_PRAGMAS = `
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
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
`;
