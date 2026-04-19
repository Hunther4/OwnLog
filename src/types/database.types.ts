/**
 * Definiciones de tipos para la base de datos SQLite (Esquema V1).
 * Basado estrictamente en el Blueprint V3.0.
 */

export type TransactionType = 'ingreso' | 'egreso';

export interface Category {
  id: number;
  nombre: string;
  tipo: TransactionType;
  emoji: string;
  color_hex: string;
  activa: number; // BOOLEAN (0 o 1) en SQLite
}

export interface Transaction {
  id: number;
  monto: number; // INTEGER estricto (1 = 1 CLP)
  fecha_utc: string; // ISO-8601
  fecha_local: string; // YYYY-MM-DD
  categoria_id: number;
  descripcion: string | null;
}

export interface BalanceAdjustment {
  id: number;
  timestamp_utc: string;
  saldo_anterior: number;
  saldo_nuevo: number;
  motivo: string;
}
