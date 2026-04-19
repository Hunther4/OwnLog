import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SQLite from 'expo-sqlite';
import SQLiteEngine from '../database/SQLiteEngine';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { auditBalance, reconcileBalance, computeActualBalance } from '../utils/balanceChecksum';
import {
  Category,
  Transaction,
  FinanceStore,
  QuickAction,
  CategoryRow,
  TransactionRow,
  QuickActionRow,
  Currency,
} from '../types/master';
import { ThemeMode } from '../theme/theme';

// Helper to convert database row to Category (activa number → boolean)
function rowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    nombre: row.nombre,
    tipo: row.tipo,
    emoji: row.emoji,
    color_hex: row.color_hex,
    activa: row.activa === 1,
  };
}

// Helper to convert database row to Transaction
function rowToTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    monto: row.monto,
    fecha_utc: row.fecha_utc,
    fecha_local: row.fecha_local,
    categoria_id: row.categoria_id,
    descripcion: row.descripcion,
  };
}

const CATEGORY_PALETTE = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40'];

function getCategoryColor(index: number): string {
  return CATEGORY_PALETTE[index % CATEGORY_PALETTE.length];
}

// Helper to convert Transaction to database row (for insertion)
function transactionToRow(tx: Omit<Transaction, 'id'>): Omit<TransactionRow, 'id'> {
  return {
    monto: tx.monto,
    fecha_utc: tx.fecha_utc,
    fecha_local: tx.fecha_local,
    categoria_id: tx.categoria_id,
    descripcion: tx.descripcion,
    updated_at: Math.floor(Date.now() / 1000),
    is_deleted: 0,
  };
}

/**
 * Zustand store for finance data with optimistic updates.
 */
export const useFinanceStore = create<FinanceStore>()((set, get) => ({
  // Initial state
  transactions: { ids: [], entities: {} },
  filteredIds: [],
  filters: {
    categoryId: null,
    startDate: undefined,
    endDate: undefined,
  },
  categories: [],
  quickActions: [],
  currentBalance: 0,
  currency: 'CLP',
  isDbInitialized: false,
  isInitializing: false,
  lastError: null,
  _lastTransactionTime: 0, // Para rate limit
  reports: {
    categoryTotals: [],
    monthlyTrend: [],
  },
  themeMode: 'dark',
  hapticsEnabled: false,

  // Action: hydrate store from SQLite database
  hydrate: async () => {
    const engine = SQLiteEngine;
    console.log('[useFinanceStore] 💧 Starting hydration...');
    set({ isInitializing: true, lastError: null });
    try {
      console.log('[useFinanceStore] 📦 Loading categories...');
      const categoryRows = await engine.getAll<CategoryRow>('SELECT * FROM categorias');
      const categories = categoryRows.map(rowToCategory);
      console.log(`[useFinanceStore] ✅ Loaded ${categories.length} categories`);

      console.log('[useFinanceStore] 📦 Loading transactions...');
      const transactionRows = await engine.getAll<TransactionRow>(
        'SELECT * FROM transacciones ORDER BY fecha_local DESC'
      );
      const transactions = transactionRows.map(rowToTransaction);
      console.log(`[useFinanceStore] ✅ Loaded ${transactions.length} transactions`);

      console.log('[useFinanceStore] 💰 Loading balance...');
      const cachedBalanceSql = `SELECT value FROM app_settings WHERE key = 'cached_balance'`;
      const cachedRow = await engine.getFirst<{ value: string }>(cachedBalanceSql);
      let currentBalance = 0;
      if (cachedRow) {
        const parsed = parseInt(cachedRow.value, 10);
        if (!isNaN(parsed)) currentBalance = parsed;
      } else {
        console.log('[useFinanceStore] ℹ️ No cached balance found, computing from sum...');
        const sumSql = `
            SELECT SUM(
              CASE
                WHEN c.tipo = 'ingreso' THEN t.monto
                ELSE -t.monto
              END
            ) as total
            FROM transacciones t
            INNER JOIN categorias c ON t.categoria_id = c.id
            WHERE c.activa = 1
          `;
        const sumResult = await engine.getFirst<{ total: number | null }>(sumSql);
        currentBalance = sumResult?.total ?? 0;
        await engine.executeSql(
          `INSERT INTO app_settings (key, value) VALUES ('cached_balance', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [currentBalance.toString()]
        );
      }
      console.log(`[useFinanceStore] ✅ Current balance: ${currentBalance}`);

      console.log('[useFinanceStore] 🎨 Loading theme mode...');
      const themeModeSql = `SELECT value FROM app_settings WHERE key = 'theme_mode'`;
      const themeRow = await engine.getFirst<{ value: string }>(themeModeSql);
      const themeMode = themeRow?.value === 'dark' ? 'dark' : 'light';
      console.log(`[useFinanceStore] ✅ Theme mode: ${themeMode}`);

      console.log('[useFinanceStore] 💵 Loading currency...');
      const currencySql = `SELECT value FROM app_settings WHERE key = 'selected_currency'`;
      const currencyRow = await engine.getFirst<{ value: string }>(currencySql);
      const currency = (currencyRow?.value as Currency) || 'CLP';
      console.log(`[useFinanceStore] ✅ Currency: ${currency}`);

      console.log('[useFinanceStore] ⚡ Loading quick actions...');
      const quickActionRows = await engine.getAll<QuickActionRow>('SELECT * FROM quick_actions');
      const quickActions = quickActionRows.map((row) => ({
        id: row.id,
        label: row.label,
        amount: row.amount,
        category_name: row.category_name,
      }));
      console.log(`[useFinanceStore] ✅ Loaded ${quickActions.length} quick actions`);

      console.log('[useFinanceStore] 📳 Loading haptics setting...');
      const hapticsSql = `SELECT value FROM app_settings WHERE key = 'haptics_enabled'`;
      const hapticsRow = await engine.getFirst<{ value: string }>(hapticsSql);
      const hapticsEnabled = hapticsRow?.value === 'true';
      console.log(`[useFinanceStore] ✅ Haptics enabled: ${hapticsEnabled}`);

      console.log('[useFinanceStore] ✅ Hydration complete');
      const txIds = transactions.map((t) => t.id);
      const txEntities: Record<number, Transaction> = {};
      transactions.forEach((t) => {
        txEntities[t.id] = t;
      });
      set({
        categories,
        transactions: { ids: txIds, entities: txEntities },
        filteredIds: txIds,
        currentBalance,
        themeMode,
        currency,
        hapticsEnabled,
        quickActions,
        isInitializing: false,
      });
    } catch (error) {
      console.error('[useFinanceStore] ❌ Failed to hydrate:', error);
      set({
        isInitializing: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  },

  // Action: update filters and fetch matching transactions
  setFilters: async (
    newFilters: Partial<{ categoryId: number | null; startDate?: string; endDate?: string }>
  ) => {
    const engine = SQLiteEngine;
    const currentFilters = { ...get().filters, ...newFilters };

    try {
      // Reset to page 0 and load first 100
      const rows = await engine.getTransactions(currentFilters, 100, 0);
      const filteredTransactions = rows.map(rowToTransaction);
      const filteredIds = filteredTransactions.map((t) => t.id);
      const filteredEntities: Record<number, Transaction> = {};
      filteredTransactions.forEach((t) => {
        filteredEntities[t.id] = t;
      });

      set({
        filters: currentFilters,
        filteredIds,
        transactions: {
          ...get().transactions,
          entities: { ...get().transactions.entities, ...filteredEntities },
        },
      });
    } catch (error) {
      console.error('[useFinanceStore] Failed to fetch filtered transactions:', error);
      set({ lastError: 'Failed to update filters' });
    }
  },

  fetchTransactionsPaged: async () => {
    const engine = SQLiteEngine;
    const { filters, filteredIds } = get();
    const offset = filteredIds.length;

    try {
      const rows = await engine.getTransactions(filters, 100, offset);
      const newTransactions = rows.map(rowToTransaction);
      const newIds = newTransactions.map((t) => t.id);
      const newEntities: Record<number, Transaction> = {};
      newTransactions.forEach((t) => {
        newEntities[t.id] = t;
      });

      set((state) => ({
        filteredIds: [...state.filteredIds, ...newIds],
        transactions: {
          ...state.transactions,
          ids: [...state.transactions.ids, ...newIds],
          entities: { ...state.transactions.entities, ...newEntities },
        },
      }));
      return newTransactions.length;
    } catch (error) {
      console.error('[useFinanceStore] Failed to fetch paged transactions:', error);
      set({ lastError: 'Failed to load more transactions' });
      return 0;
    }
  },

  // Action: add a new category
  addCategory: async (category: Omit<Category, 'id'>) => {
    const engine = SQLiteEngine;
    const result = await engine.executeSql(
      `INSERT INTO categorias (nombre, tipo, emoji, color_hex, activa) VALUES (?, ?, ?, ?, ?)`,
      [category.nombre, category.tipo, category.emoji, category.color_hex, category.activa ? 1 : 0]
    );
    const id = result.lastInsertRowId;
    set((state) => ({
      categories: [...state.categories, { ...category, id }],
    }));
    return id;
  },

  // Action: update an existing category
  updateCategory: async (id: number, updates: Partial<Category>) => {
    const engine = SQLiteEngine;
    const state = get();
    const currentCategory = state.categories.find((c) => c.id === id);
    if (!currentCategory) throw new Error('Category not found');

    const updatedCategory = { ...currentCategory, ...updates };

    await engine.executeSql(
      `UPDATE categorias SET nombre = ?, tipo = ?, emoji = ?, color_hex = ?, activa = ? WHERE id = ?`,
      [
        updatedCategory.nombre,
        updatedCategory.tipo,
        updatedCategory.emoji,
        updatedCategory.color_hex,
        updatedCategory.activa ? 1 : 0,
        id,
      ]
    );

    set((state) => ({
      categories: state.categories.map((c) => (c.id === id ? updatedCategory : c)),
    }));
    if (updates.activa !== undefined) {
      await get().syncBalance();
    }
  },

  deleteCategory: async (id: number) => {
    const engine = SQLiteEngine;
    try {
      await engine.deleteCategory(id);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
      }));
      await get().syncBalance();
    } catch (error) {
      console.error('[useFinanceStore] Failed to delete category:', error);
      set({ lastError: 'Failed to delete category' });
      throw error;
    }
  },

  addTransaction: async (tx: Omit<Transaction, 'id'>) => {
    // Rate limit: solo 1 transacción cada 3 segundos
    const now = Date.now();
    if (get()._lastTransactionTime && now - get()._lastTransactionTime < 3000) {
      throw new Error('Espera un momento antes de agregar otra transacción');
    }
    set({ _lastTransactionTime: now });
    
    const engine = SQLiteEngine;
    const state = get();

    // Find category to determine sign
    const category = state.categories.find((c) => c.id === tx.categoria_id);
    if (!category) {
      throw new Error(`Category ${tx.categoria_id} not found in store`);
    }
    const delta = category.tipo === 'ingreso' ? tx.monto : -tx.monto;

    // Use a unique temporary ID to avoid collisions during concurrent adds
    const tempId = -(Date.now() + Math.random());
    const newTransaction: Transaction = {
      ...tx,
      id: tempId,
    };

    // Compute the new balance BEFORE optimistic update to avoid race condition
    const newBalance = state.currentBalance + delta;

    // 1. Optimistic update: add to store immediately
    set((state) => ({
      transactions: {
        ids: [newTransaction.id, ...state.transactions.ids],
        entities: { [newTransaction.id]: newTransaction, ...state.transactions.entities },
      },
      currentBalance: newBalance,
    }));

    try {
      // 2. Persist to SQLite within a transaction
      await engine.executeInTransaction(async (db) => {
        // Insert transaction
        const result = await db.runAsync(
          `INSERT INTO transacciones (monto, fecha_utc, fecha_local, categoria_id, descripcion)
             VALUES (?, ?, ?, ?, ?)`,
          [tx.monto, tx.fecha_utc, tx.fecha_local, tx.categoria_id, tx.descripcion]
        );
        // Get the generated ID
        const insertId = result.lastInsertRowId;
        if (typeof insertId !== 'number') {
          throw new Error('Failed to retrieve transaction ID');
        }

        // Update cached balance using the computed balance directly
        await db.runAsync(
          `INSERT INTO app_settings (key, value) VALUES ('cached_balance', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [newBalance.toString()]
        );

        // 3. Update store with real ID (balance already correct)
        const updatedEntity = state.transactions.entities[tempId];
        if (updatedEntity) {
          const updatedTx = { ...updatedEntity, id: insertId };
          set((state) => ({
            transactions: {
              ids: state.transactions.ids.map((id) => (id === tempId ? insertId : id)),
              entities: {
                ...state.transactions.entities,
                [insertId]: updatedTx,
                [tempId]: undefined as unknown as Transaction,
              },
            },
          }));
        }
        // Refresh filtered list to include the new transaction if it matches current filters
        await get().setFilters(get().filters);
      });
    } catch (error) {
      console.error('[useFinanceStore] Failed to add transaction:', error);
      // 4. Surgical Rollback: remove only the added transaction and reverse balance delta
      const { [tempId]: removed, ...remainingEntities } = state.transactions.entities;
      set((state) => ({
        transactions: {
          ids: state.transactions.ids.filter((id) => id !== tempId),
          entities: remainingEntities,
        },
        currentBalance: state.currentBalance - delta,
        lastError: error instanceof Error ? error.message : 'Database error',
      }));
      throw error;
    }
  },

  // Action: delete a transaction with optimistic update
  deleteTransaction: async (id: number) => {
    const engine = SQLiteEngine;
    const state = get();
    // Find transaction to compute delta
    const tx = state.transactions.entities[id];
    if (!tx) {
      throw new Error(`Transaction ${id} not found`);
    }
    // Find category to determine sign
    const category = state.categories.find((c) => c.id === tx.categoria_id);
    if (!category) {
      throw new Error(`Category ${tx.categoria_id} not found in store`);
    }
    const delta = category.tipo === 'ingreso' ? tx.monto : -tx.monto;

    // 1. Optimistic removal and balance update
    set((state) => ({
      transactions: {
        ids: state.transactions.ids.filter((tid) => tid !== id),
        entities: Object.fromEntries(
          Object.entries(state.transactions.entities).filter(([key]) => Number(key) !== id)
        ) as Record<number, Transaction>,
      },
      currentBalance: state.currentBalance - delta,
    }));

    try {
      // 2. Delete from SQLite within transaction
      await engine.executeInTransaction(async (db) => {
        await db.runAsync('DELETE FROM transacciones WHERE id = ?', [id]);
        // Update cached balance using the latest store balance
        const currentBalance = get().currentBalance;
        await db.runAsync(
          `INSERT INTO app_settings (key, value) VALUES ('cached_balance', ?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [currentBalance.toString()]
        );
        // 3. No need to update store again (already updated optimistically)
        await get().setFilters(get().filters);
      });
    } catch (error) {
      console.error('[useFinanceStore] Failed to delete transaction:', error);
      // 4. Surgical Rollback: re-insert the deleted transaction and reverse balance delta
      set((state) => ({
        transactions: {
          ids: [id, ...state.transactions.ids],
          entities: { [id]: tx, ...state.transactions.entities },
        },
        currentBalance: state.currentBalance + delta,
        lastError: error instanceof Error ? error.message : 'Database error',
      }));
      throw error;
    }
  },

  // Action: update an existing transaction
  updateTransaction: async (id: number, updates: Partial<Transaction>) => {
    await TransactionRepository.update(id, updates);
    // Refresh transactions from DB
    const transactions = await TransactionRepository.getAll();
    set({ transactions });
  },

  // Action: clear last error
  clearError: () => set({ lastError: null }),

  setDbInitialized: (value: boolean) => set({ isDbInitialized: value }),

  syncBalance: async () => {
    try {
      await reconcileBalance();
      const computed = await computeActualBalance();
      set({ currentBalance: computed });
    } catch (error) {
      console.error('[useFinanceStore] Failed to sync balance:', error);
      set({ lastError: 'Failed to sync balance' });
    }
  },

  loadQuickActions: async () => {
    const engine = SQLiteEngine;
    try {
      const rows = await engine.getAll<QuickActionRow>('SELECT * FROM quick_actions');
      set({ quickActions: rows as QuickAction[] });
    } catch (error) {
      console.error('[useFinanceStore] Failed to load quick actions:', error);
    }
  },

  updateQuickAction: async (id: number, updates: Partial<QuickAction>) => {
    const engine = SQLiteEngine;
    try {
      const current = get().quickActions.find((q) => q.id === id);
      if (!current) throw new Error('Quick action not found');

      const updated = { ...current, ...updates };
      await engine.executeSql(
        `UPDATE quick_actions SET label = ?, amount = ?, category_name = ? WHERE id = ?`,
        [updated.label, updated.amount, updated.category_name, id]
      );
      set((state) => ({
        quickActions: state.quickActions.map((q) => (q.id === id ? updated : q)),
      }));
    } catch (error) {
      console.error('[useFinanceStore] Failed to update quick action:', error);
      set({ lastError: 'Failed to update quick action' });
    }
  },

  setThemeMode: async (mode: ThemeMode) => {
    const engine = SQLiteEngine;
    try {
      await engine.executeSql(
        `INSERT INTO app_settings (key, value) VALUES ('theme_mode', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [mode]
      );
      set({ themeMode: mode });
    } catch (error) {
      console.error('[useFinanceStore] Failed to set theme mode:', error);
      set({ lastError: 'Failed to save theme preference' });
    }
  },

  setCurrency: async (currency: Currency) => {
    const engine = SQLiteEngine;
    try {
      await engine.executeSql(
        `INSERT INTO app_settings (key, value) VALUES ('selected_currency', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [currency]
      );
      set({ currency });
    } catch (error) {
      console.error('[useFinanceStore] Failed to set currency:', error);
      set({ lastError: 'Failed to save currency preference' });
    }
  },

  setHapticsEnabled: async (enabled: boolean) => {
    const engine = SQLiteEngine;
    try {
      await engine.executeSql(
        `INSERT INTO app_settings (key, value) VALUES ('haptics_enabled', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [enabled ? 'true' : 'false']
      );
      set({ hapticsEnabled: enabled });
    } catch (error) {
      console.error('[useFinanceStore] Failed to set haptics preference:', error);
      set({ lastError: 'Failed to save haptics preference' });
    }
  },

  incrementAppOpens: async () => {
    const engine = SQLiteEngine;
    try {
      const row = await engine.getFirst<{ value: string }>(
        `SELECT value FROM app_settings WHERE key = 'app_open_count'`
      );
      const currentCount = row ? parseInt(row.value, 10) : 0;
      const newCount = currentCount + 1;

      await engine.executeSql(
        `INSERT INTO app_settings (key, value) VALUES ('app_open_count', ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
        [newCount.toString()]
      );
      return newCount;
    } catch (error) {
      console.error('[useFinanceStore] Failed to increment app opens:', error);
      return 0;
    }
  },

  setBudget: async (categoryId: number, amount: number) => {
    const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    try {
      await SQLiteEngine.setBudget(categoryId, amount, monthYear);
    } catch (error) {
      console.error('[useFinanceStore] Failed to set budget:', error);
      set({ lastError: 'Failed to save budget' });
    }
  },

  getBudgetForCategory: async (categoryId: number) => {
    const monthYear = new Date().toISOString().slice(0, 7);
    return await SQLiteEngine.getBudget(categoryId, monthYear);
  },

  getSpendingForCategoryInMonth: async (categoryId: number) => {
    const monthYear = new Date().toISOString().slice(0, 7);
    return await SQLiteEngine.getSpendingForCategoryInMonth(categoryId, monthYear);
  },

  resetAllData: async () => {
    try {
      await SQLiteEngine.resetDatabase();
      // Re-hydrate to get the seeded categories and reset balance
      await get().hydrate();
      set({ lastError: null });
    } catch (error) {
      console.error('[useFinanceStore] Failed to reset all data:', error);
      set({ lastError: 'Failed to reset data' });
      throw error;
    }
  },

  // Note: setInitialBalance is now handled by useBoundStore
  // This store delegates to useBoundStore for consistency

  // Action: prefetch predictive data for faster UI
  prefetchPredictiveData: async () => {
    // Implementation handled by useBoundStore
    console.log('[useFinanceStore] prefetchPredictiveData called - use useBoundStore instead');
  },

  // Action: set initial balance (for first-time setup)
  setInitialBalance: async (amount: number) => {
    set({ currentBalance: amount });
  },

  // Action: fetch aggregated data for reports
  fetchReports: async () => {
    if (!get().isDbInitialized) {
      console.error('[useFinanceStore] fetchReports called before DB initialization');
      set({ lastError: 'Database not initialized' });
      return;
    }
    const engine = SQLiteEngine;
    try {
      const [categoryTotals, monthlyTrend] = await Promise.all([
        engine.getCategoryTotals(),
        engine.getMonthlyTrend(),
      ]);

      const transformedCategoryTotals = categoryTotals.map((item, index) => ({
        nombre: item.category,
        total: item.total,
        tipo: item.tipo,
        color: item.tipo === 'ingreso' ? '#4caf50' : getCategoryColor(index),
      }));

      set((state) => ({
        reports: {
          categoryTotals: transformedCategoryTotals,
          monthlyTrend,
        },
      }));
    } catch (error) {
      console.error('[useFinanceStore] Failed to fetch reports:', error);
      set({
        lastError: error instanceof Error ? error.message : 'Failed to fetch reports',
      });
      throw error;
    }
  },

  // Action: Calculate totals for the current month
  getMonthlySummary: async () => {
    const engine = SQLiteEngine;
    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      const sql = `
        SELECT 
          SUM(CASE WHEN c.tipo = 'ingreso' THEN t.monto ELSE 0 END) as income,
          SUM(CASE WHEN c.tipo = 'egreso' THEN t.monto ELSE 0 END) as expense
        FROM transacciones t
        JOIN categorias c ON t.categoria_id = c.id
        WHERE t.fecha_local >= ? AND t.fecha_local <= ?
      `;

      const result = await engine.getFirst<{ income: number; expense: number }>(sql, [
        firstDayOfMonth,
        lastDayOfMonth,
      ]);

      return {
        income: result?.income ?? 0,
        expense: result?.expense ?? 0,
      };
    } catch (error) {
      console.error('[useFinanceStore] Failed to get monthly summary:', error);
      return { income: 0, expense: 0 };
    }
  },
}));
