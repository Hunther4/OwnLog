/**
 * HUNTHERWALLET MASTER TYPES
 * The single source of truth for the entire application.
 * 
 * Architecture:
 * - Domain Types: Used by UI and Business Logic (Clean types).
 * - Persistence Types: Mirror SQLite rows (Database types).
 * - Store Types: State and Actions for Zustand.
 */

// ==========================================
// 1. GLOBAL & SHARED TYPES
// ==========================================

export type TransactionType = 'ingreso' | 'egreso';
export type ThemeMode = 'light' | 'dark' | 'purple';
export type Currency = 'CLP' | 'USD' | 'EUR';

// ==========================================
// 2. DOMAIN TYPES (The "Clean" Truth)
// ==========================================

export interface Category {
  id: number;
  nombre: string;
  tipo: TransactionType;
  emoji: string;
  color_hex: string;
  activa: boolean;
}

export interface Transaction {
  id: number;
  monto: number; // Integer representing minimum currency unit (1 = 1 CLP)
  fecha_utc: string; // ISO-8601 UTC timestamp
  fecha_local: string; // YYYY-MM-DD local date
  categoria_id: number;
  descripcion: string | null;
}

export interface QuickAction {
  id: number;
  label: string;
  amount: number;
  category_name: string;
}

export interface QuickActionRow {
  id: number;
  label: string;
  amount: number;
  category_name: string;
}

export interface AppSettings {
  key: string;
  value: string;
}

// ==========================================
// 3. PERSISTENCE TYPES (The "Database" Truth)
// ==========================================

export interface CategoryRow {
  id: number;
  nombre: string;
  tipo: TransactionType;
  emoji: string;
  color_hex: string;
  activa: number; // SQLite BOOLEAN is 0 or 1
  updated_at: number;
  is_deleted: number;
}

export interface TransactionRow {
  id: number;
  monto: number;
  fecha_utc: string;
  fecha_local: string;
  categoria_id: number;
  descripcion: string | null;
  updated_at: number;
  is_deleted: number;
}

export interface QuickActionRow {
  id: number;
  label: string;
  amount: number;
  category_name: string;
}

export interface BalanceAdjustmentRow {
  id: number;
  timestamp_utc: string;
  saldo_anterior: number;
  saldo_nuevo: number;
  motivo: string;
}

export interface AppSettingsRow {
  key: string;
  value: string;
}

// ==========================================
// 4. STORE TYPES (State & Actions)
// ==========================================

export interface FinanceState {
  transactions: {
    ids: number[];
    entities: Record<number, Transaction>;
  };
  filteredIds: number[];
  filters: {
    categoryId: number | null;
    startDate?: string;
    endDate?: string;
  };
  categories: Category[];
  quickActions: QuickAction[];
  currentBalance: number;
  currency: Currency;
  isDbInitialized: boolean;
  isInitializing: boolean;
  lastError: string | null;
  reports: {
    categoryTotals: { nombre: string; total: number; color: string; tipo: TransactionType }[];
    monthlyTrend: { month: string; total: number }[];
  };
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
  _lastTransactionTime: number;
}

export interface FinanceActions {
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<number>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<void>;
  deleteCategory: (id: number) => Promise<void>;
  hydrate: () => Promise<void>;
  prefetchPredictiveData: () => Promise<void>;
  fetchReports: () => Promise<void>;
  setFilters: (
    newFilters: Partial<{ categoryId: number | null; startDate?: string; endDate?: string }>
  ) => Promise<void>;
  setCurrency: (currency: Currency) => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  syncBalance: () => Promise<void>;
  loadQuickActions: () => Promise<void>;
  updateQuickAction: (id: number, updates: Partial<QuickAction>) => Promise<void>;
  getSpendingForCategoryInMonth: (categoryId: number) => Promise<number>;
  getBudgetForCategory: (categoryId: number) => Promise<number | null>;
  setBudget: (categoryId: number, amount: number) => Promise<void>;
  fetchTransactionsPaged: () => Promise<number>;
  incrementAppOpens: () => Promise<number>;
  setDbInitialized: (value: boolean) => void;
  clearError: () => void;
  setInitialBalance: (amount: number) => Promise<void>;
  resetAllData: () => Promise<void>;
}

export type FinanceStore = FinanceState & FinanceActions;
