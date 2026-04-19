import { ThemeMode } from '../theme/theme';

/**
 * Core finance types for HuntherWallet.
 * Aligns with database schema but includes UI-specific fields.
 */

export type TransactionType = 'ingreso' | 'egreso';

export interface Category {
  id: number;
  nombre: string;
  tipo: TransactionType;
  emoji: string;
  color_hex: string;
  activa: boolean; // Converted from number (0/1)
  budget?: number;
  cycle?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface QuickAction {
  id: number;
  label: string;
  amount: number;
  category_name: string;
}

export interface Transaction {
  id: number;
  monto: number; // Integer representing CLP (1 = 1 CLP)
  fecha_utc: string; // ISO-8601 UTC timestamp
  fecha_local: string; // YYYY-MM-DD local date
  categoria_id: number;
  descripcion: string | null;
}

export interface AppSettings {
  key: string;
  value: string;
}

// Helper types for store state
export interface FinanceState {
  transactions: Transaction[];
  filteredTransactions: Transaction[];
  filters: {
    categoryId: number | null;
    startDate?: string;
    endDate?: string;
  };
  categories: Category[];
  quickActions: QuickAction[];
  currentBalance: number; // CLP integer
  currency: 'CLP' | 'USD' | 'EUR';
  isDbInitialized: boolean;
  isInitializing: boolean;
  lastError: string | null;
  reports: {
    categoryTotals: { nombre: string; total: number; color: string }[];
    monthlyTrend: { month: string; total: number }[];
  };
  themeMode: ThemeMode;
  hapticsEnabled: boolean;
}

// Actions that modify the store
export interface FinanceActions {
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
  updateTransaction: (id: number, updates: Partial<Transaction>) => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  updateCategory: (id: number, updates: Partial<Category>) => Promise<void>;
  hydrate: () => Promise<void>;
  fetchReports: () => Promise<void>;
  setFilters: (
    newFilters: Partial<{ categoryId: number | null; startDate?: string; endDate?: string }>
  ) => Promise<void>;
  setCurrency: (currency: 'CLP' | 'USD' | 'EUR') => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
  syncBalance: () => Promise<void>;
  loadQuickActions: () => Promise<void>;
  updateQuickAction: (id: number, updates: Partial<QuickAction>) => Promise<void>;
  getSpendingForCategoryInMonth: (categoryId: number) => Promise<number>;
  fetchTransactionsPaged: () => Promise<number>;
  incrementAppOpens: () => Promise<number>;
  setDbInitialized: (value: boolean) => void;
  clearError: () => void;
}

// Combined store type
export type FinanceStore = FinanceState & FinanceActions;
